import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  buildMultiPileEnvelopeInputSignature,
  defaultMultiPileGeoArrSettings,
  extractMultiPileGeoArrSettingsFromLegacyState,
  hydrateMultiPileStructTypeSettingsWithProjectAssignments,
  MULTI_PILE_STANDARD_PILE_DIAMETERS_MM,
  MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
  MultiPileEnvelopeRunSummary,
  MultiPileEnvelopeSnapshot,
  MultiPileEnvelopeSnapshotSchema,
  MultiPileGeneratedPile,
  MultiPileGeoArrSettings,
  MultiPileGeoResultRow,
  MultiPileGeoResultRowSchema,
  MultiPileGeoTypeSettings,
  MultiPileJoint,
  MultiPileJointLoadRow,
  MultiPilePileTypeDefinition,
  MultiPileProjectSpecifics,
  MultiPileState,
  MultiPileStateSchema,
  normalizeMultiPileSelectedCombinationIds,
  normalizeMultiPileGeoArrSettings,
  ProjectLoadDefinition,
} from '@eng/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CalcEngineClient } from '../calculations/calc-engine.client';
import { SnapshotService } from '../calculations/snapshot.service';
import {
  getProjectLoadDefinitionFromLegacyMultiPileMetadata,
  getProjectLoadDefinitionFromProjectMetadata,
  normalizeProjectLoadDefinition,
} from '../projects/project-load-definition.adapter';
import {
  getHydratedProjectMetadata,
  getProjectSpecificsFromProjectMetadata,
} from '../projects/project-specifics.adapter';

const MULTI_PILE_CALC_TYPE = 'multi_pile_envelope';
const ZERO_TOLERANCE = 1e-9;
const DEFAULT_PILE_SIZE_PRESET = String(MULTI_PILE_STANDARD_PILE_DIAMETERS_MM[2] ?? 600);
const MULTI_PILE_STRUCT_DESIGNER_UI_STATE_KEY = 'multiPileStructDesigner';

const DEFAULT_PILE_TYPE: MultiPilePileTypeDefinition = {
  id: 'BP1',
  displayName: 'BP1',
  sizePreset: DEFAULT_PILE_SIZE_PRESET,
  useCustom: false,
  customMm: 600,
  Dmm: 600,
  nominalDiameterMm: 600,
  eoop: 0.075,
  eoopM: 0.075,
  compressionUltimateMin: null,
  compressionUltimateMax: null,
  tensionUltimateMin: null,
  tensionUltimateMax: null,
  active: true,
  order: 0,
};

const DEFAULT_JOINT: MultiPileJoint = {
  id: 'J1',
  jointDisplayName: '',
  x: 0,
  y: 0,
  z: 0,
  supportCount: 1,
  noOfSupports: 1,
  pileTypeId: DEFAULT_PILE_TYPE.id,
  assignmentMode: 'manual',
  active: true,
  order: 0,
};

@Injectable()
export class MultiPileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calcEngineClient: CalcEngineClient,
    private readonly snapshotService: SnapshotService,
  ) {}

  async getState(pileGroupId: string, projectId: string): Promise<MultiPileState> {
    const pileGroup = await this.getPileGroup(pileGroupId, projectId);
    const projectContext = await this.getProjectContext(projectId);

    return this.extractState(
      pileGroup.metadata,
      projectContext.projectLoadDefinition,
      projectContext.projectSpecifics,
    );
  }

  async saveState(
    pileGroupId: string,
    projectId: string,
    rawState: unknown,
  ): Promise<MultiPileState> {
    const pileGroup = await this.getPileGroup(pileGroupId, projectId);
    const projectContext = await this.getProjectContext(projectId);

    const fallbackLoadDefinition =
      projectContext.projectLoadDefinition ??
      getProjectLoadDefinitionFromLegacyMultiPileMetadata(pileGroup.metadata);
    const state = this.normalizeState(
      rawState,
      fallbackLoadDefinition,
      projectContext.projectSpecifics,
    );
    const persistedState = this.clearCalculatedGeoResults(state);
    const nextMetadata = this.withMultiPileMetadata(
      pileGroup.metadata,
      this.persistentState(persistedState, projectContext.projectLoadDefinition === null),
    );

    await this.prisma.pileGroup.update({
      where: { id: pileGroupId },
      data: { metadata: nextMetadata },
    });

    return persistedState;
  }

  async runEnvelope(
    pileGroupId: string,
    projectId: string,
    userId: string,
    rawState?: unknown,
  ): Promise<MultiPileEnvelopeRunSummary> {
    const [pileGroup, projectContext] = await Promise.all([
      this.getPileGroup(pileGroupId, projectId),
      this.getProjectContext(projectId),
    ]);
    const projectLoadDefinition =
      projectContext.projectLoadDefinition ??
      getProjectLoadDefinitionFromLegacyMultiPileMetadata(pileGroup.metadata);
    const projectSpecifics = projectContext.projectSpecifics;
    const state =
      rawState === undefined
        ? this.extractState(pileGroup.metadata, projectLoadDefinition, projectSpecifics)
        : this.normalizeState(rawState, projectLoadDefinition, projectSpecifics);
    const envelopeState = this.applyEnvelopeSelection(state);
    const inputSignature = buildMultiPileEnvelopeInputSignature(state);
    const requestPayload = {
      calcType: MULTI_PILE_CALC_TYPE,
      inputs: {},
      loadCombinations: [],
      rulePack: {
        id: 'multi-pile-envelope',
        standardCode: 'MULTI_PILE',
        version: '1',
        rules: {},
      },
      standardsRefs: [],
      payload: {
        pileGroupId,
        projectId,
        multiPile: envelopeState,
        projectSpecifics,
      },
    };

    const snapshotData = this.snapshotService.buildSnapshotData({
      inputs: {},
      standardsRefs: [],
      rulePack: requestPayload.rulePack,
      loadCombinations: [],
      payload: requestPayload.payload,
    });

    const run = await this.prisma.calculationRun.create({
      data: {
        projectId,
        elementId: null,
        calcType: MULTI_PILE_CALC_TYPE,
        status: 'running',
        requestSnapshot: requestPayload,
        requestHash: snapshotData.combinedHash,
        notes: this.multiPileRunNote(pileGroupId),
        createdBy: userId,
      },
    });

    try {
      const result = await this.calcEngineClient.runCalculation(requestPayload);
      const status = result.errors && result.errors.length > 0 ? 'failed' : 'completed';
      const nextState = this.withEnvelopeRunContext(
        this.mergeCalculatedGeoResults(state, this.extractGeoResults(result.artifacts)),
        {
          runId: run.id,
          createdAt: run.createdAt.toISOString(),
          inputSignature,
        },
      );

      const updatedRun = await this.prisma.calculationRun.update({
        where: { id: run.id },
        data: {
          status,
          resultSnapshot: result,
          durationMs: Math.round(result.durationMs),
        },
      });

      await this.prisma.pileGroup.update({
        where: { id: pileGroupId },
        data: {
          metadata: this.withMultiPileMetadata(
            pileGroup.metadata,
            this.persistentState(nextState, projectContext.projectLoadDefinition === null),
          ),
        },
      });

      await this.snapshotService.createSnapshot(run.id, snapshotData, {
        outputs: result.outputs,
        steps: result.steps,
        artifacts: result.artifacts ?? {},
      });

      return this.toRunSummary(updatedRun, result);
    } catch (error) {
      await this.prisma.calculationRun.update({
        where: { id: run.id },
        data: { status: 'failed' },
      });
      await this.snapshotService.createSnapshot(run.id, snapshotData);
      throw error;
    }
  }

  async getLatestEnvelopeRun(
    pileGroupId: string,
    projectId: string,
  ): Promise<MultiPileEnvelopeRunSummary | null> {
    const run = await this.prisma.calculationRun.findFirst({
      where: {
        projectId,
        calcType: MULTI_PILE_CALC_TYPE,
        OR: [{ elementId: pileGroupId }, { notes: this.multiPileRunNote(pileGroupId) }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!run) {
      return null;
    }

    return this.toRunSummary(run, run.resultSnapshot);
  }

  private async getPileGroup(pileGroupId: string, projectId: string) {
    const pileGroup = await this.prisma.pileGroup.findFirst({
      where: { id: pileGroupId, projectId },
    });
    if (!pileGroup) {
      throw new NotFoundException('Pile group not found');
    }
    return pileGroup;
  }

  private async getProjectContext(projectId: string): Promise<{
    projectLoadDefinition: ProjectLoadDefinition | null;
    projectSpecifics: MultiPileProjectSpecifics | null;
  }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
      select: {
        code: true,
        name: true,
        metadata: true,
        pileGroups: { select: { metadata: true } },
      },
    });

    if (!project) {
      return {
        projectLoadDefinition: null,
        projectSpecifics: null,
      };
    }

    const fallback = {
      projectName: project.name,
      ...(project.code ? { projectNumber: project.code } : {}),
    };
    const hydratedMetadata = getHydratedProjectMetadata(
      project.metadata,
      project.pileGroups,
      fallback,
    );

    return {
      projectLoadDefinition: getProjectLoadDefinitionFromProjectMetadata(project.metadata),
      projectSpecifics: getProjectSpecificsFromProjectMetadata(hydratedMetadata, fallback),
    };
  }

  private extractState(
    metadata: unknown,
    projectLoadDefinition: ProjectLoadDefinition | null,
    projectSpecifics: MultiPileProjectSpecifics | null,
  ): MultiPileState {
    const record = this.objectValue(metadata);
    const legacyLoadDefinition = getProjectLoadDefinitionFromLegacyMultiPileMetadata(metadata);
    return this.normalizeState(
      record.multiPile,
      projectLoadDefinition ?? legacyLoadDefinition,
      projectSpecifics,
    );
  }

  private withMultiPileMetadata(
    metadata: unknown,
    state: Record<string, unknown>,
  ): Record<string, unknown> {
    const base = this.objectValue(metadata);
    return { ...base, multiPile: state };
  }

  private normalizeState(
    rawState: unknown,
    projectLoadDefinition: ProjectLoadDefinition | null,
    projectSpecifics: MultiPileProjectSpecifics | null,
  ): MultiPileState {
    const state = this.objectValue(rawState);
    const loadDefinition = projectLoadDefinition ?? this.legacyLoadDefinitionFromState(state);
    const loadPatterns = loadDefinition.loadCases.map((loadCase) => ({
      id: loadCase.id,
      displayName: loadCase.name,
      patternType: loadCase.type,
      reversible: loadCase.reversible,
      enabled: loadCase.enabled,
      order: loadCase.order,
    }));
    const pileTypes = this.normalizePileTypes(state.pileTypes);
    const geoArrSettings = this.normalizeGeoArrSettings(state, projectSpecifics);
    const geoTypeSettings = this.normalizeGeoTypeSettings(state.geoTypeSettings, pileTypes);
    const joints = this.normalizeJoints(state.joints, pileTypes, state.generatedPiles);
    const generatedPiles = this.generatePiles(joints);
    const jointLoads = this.normalizeJointLoads(state.jointLoads, joints, loadPatterns);
    const geoResults = this.normalizeGeoResults(state.geoResults, joints, generatedPiles);
    const combinationLibrary = loadDefinition.loadCombinations.map((combination) => ({
      id: combination.id,
      builtinKey: combination.builtinKey,
      displayName: combination.name,
      source: combination.source,
      kind: combination.kind,
      enabled: combination.enabled,
      includeInEnvelope: combination.includeInEnvelope,
      reference: combination.reference,
      family: combination.family,
      reversibleAware: combination.reversibleAware,
      terms: combination.factors?.map((factor) => ({
        patternId: factor.loadCaseId,
        factor: factor.factor,
      })),
      childCombinationIds: combination.childCombinationIds,
      expressionSummary: combination.expressionSummary,
      order: combination.order,
    }));
    const selectedCombinations = normalizeMultiPileSelectedCombinationIds(
      Array.isArray(state.selectedCombinations) ? state.selectedCombinations : undefined,
      combinationLibrary,
    );

    return MultiPileStateSchema.parse({
      version: 1,
      combinationSettings: loadDefinition.combinationSettings,
      pileTypes,
      geoArrSettings,
      geoTypeSettings,
      geoResults,
      joints,
      generatedPiles,
      loadPatterns,
      jointLoads,
      combinationLibrary,
      selectedCombinations,
      uiState: this.normalizeUiState(state, pileTypes, projectSpecifics),
    });
  }

  private normalizeUiState(
    state: Record<string, unknown>,
    pileTypes: MultiPilePileTypeDefinition[],
    projectSpecifics: MultiPileProjectSpecifics | null,
  ): Record<string, unknown> {
    const uiState = this.objectValue(state.uiState);
    const structUiState = this.objectValue(uiState[MULTI_PILE_STRUCT_DESIGNER_UI_STATE_KEY]);
    const structTypeSettings = this.objectValue(structUiState.typeSettingsByTypeId);
    const legacyStructTypeSettings = this.objectValue(state.structTypeSettings);
    const nextTypeSettingsByTypeId = Object.fromEntries(
      pileTypes.map((pileType) => {
        const currentSettings = this.objectValue(structTypeSettings[pileType.id]);
        const legacySettings = this.objectValue(legacyStructTypeSettings[pileType.id]);
        const mergedSettings = {
          ...legacySettings,
          ...currentSettings,
          typeId: pileType.id,
          linkedDmm: pileType.Dmm,
        };

        return [
          pileType.id,
          hydrateMultiPileStructTypeSettingsWithProjectAssignments(
            mergedSettings,
            projectSpecifics,
          ),
        ];
      }),
    );

    return {
      ...uiState,
      [MULTI_PILE_STRUCT_DESIGNER_UI_STATE_KEY]: {
        ...structUiState,
        typeSettingsByTypeId: nextTypeSettingsByTypeId,
      },
    };
  }

  private legacyLoadDefinitionFromState(state: Record<string, unknown>): ProjectLoadDefinition {
    return normalizeProjectLoadDefinition({
      combinationSettings: state.combinationSettings,
      loadCases: state.loadPatterns,
      loadCombinations: state.combinationLibrary,
    });
  }

  private persistentState(
    state: MultiPileState,
    includeLegacyProjectOwnedLoads: boolean,
  ): Record<string, unknown> {
    const baseState: Record<string, unknown> = {
      version: state.version,
      pileTypes: state.pileTypes,
      geoArrSettings: state.geoArrSettings,
      geoTypeSettings: state.geoTypeSettings,
      geoResults: state.geoResults,
      joints: state.joints,
      generatedPiles: state.generatedPiles,
      jointLoads: state.jointLoads,
      selectedCombinations: state.selectedCombinations,
      uiState: state.uiState ?? {},
    };

    if (includeLegacyProjectOwnedLoads) {
      baseState.combinationSettings = state.combinationSettings;
      baseState.loadPatterns = state.loadPatterns;
      baseState.combinationLibrary = state.combinationLibrary;
    }

    return baseState;
  }

  private normalizePileTypes(raw: unknown): MultiPilePileTypeDefinition[] {
    const rows = Array.isArray(raw) ? raw : [];
    const seen = new Set<string>();
    const source = rows.length ? rows : [DEFAULT_PILE_TYPE];
    const presetOptions = MULTI_PILE_STANDARD_PILE_DIAMETERS_MM.map(String);

    return source.map((value, index) => {
      const row = this.objectValue(value);
      const fallbackId = index === 0 ? DEFAULT_PILE_TYPE.id : `BP${index + 1}`;
      const id = this.uniqueId(seen, this.stringValue(row.id, fallbackId));
      const rawDiameter = this.numberValue(
        row.Dmm ?? row.resolvedDiameterMm ?? row.nominalDiameterMm,
        DEFAULT_PILE_TYPE.Dmm,
        { min: 50 },
      );
      const rawSizePreset = this.stringValue(
        row.sizePreset ??
          row.standardSizePreset ??
          row.presetSize ??
          row.standardSize ??
          rawDiameter,
        DEFAULT_PILE_SIZE_PRESET,
      );
      let sizePreset = presetOptions.includes(rawSizePreset)
        ? rawSizePreset
        : presetOptions.includes(String(rawDiameter))
          ? String(rawDiameter)
          : DEFAULT_PILE_SIZE_PRESET;

      let useCustom =
        row.useCustom === undefined
          ? Boolean(row.useCustomDiameter ?? row.customDiameterEnabled)
          : Boolean(row.useCustom);

      if (!presetOptions.includes(String(rawDiameter)) && !useCustom) {
        useCustom = true;
      }

      const presetMm = this.numberValue(sizePreset, DEFAULT_PILE_TYPE.Dmm, { min: 50 });
      const customMm = this.numberValue(
        row.customMm ?? row.customDiameterMm ?? rawDiameter ?? presetMm,
        presetMm,
        { min: 50 },
      );
      const Dmm = useCustom ? customMm : presetMm;
      sizePreset = presetOptions.includes(sizePreset) ? sizePreset : String(presetMm);
      const eoop = this.numberValue(row.eoop ?? row.eoopM, DEFAULT_PILE_TYPE.eoop, { min: 0 });

      return {
        id,
        displayName: this.stringValue(row.displayName ?? row.name ?? row.label, id),
        sizePreset,
        useCustom,
        customMm,
        Dmm,
        nominalDiameterMm: Dmm,
        eoop,
        eoopM: eoop,
        compressionUltimateMin: this.nullableNumberValue(row.compressionUltimateMin, { min: 0 }),
        compressionUltimateMax: this.nullableNumberValue(row.compressionUltimateMax, { min: 0 }),
        tensionUltimateMin: this.nullableNumberValue(row.tensionUltimateMin, { min: 0 }),
        tensionUltimateMax: this.nullableNumberValue(row.tensionUltimateMax, { min: 0 }),
        active: row.active === undefined ? true : Boolean(row.active),
        order: index,
      };
    });
  }

  private normalizeGeoArrSettings(
    state: Record<string, unknown>,
    projectSpecifics: MultiPileProjectSpecifics | null,
  ): MultiPileGeoArrSettings {
    const projectArrAssessment = projectSpecifics?.geotechnicalBasis?.arrAssessment;
    if (projectArrAssessment) {
      return normalizeMultiPileGeoArrSettings(projectArrAssessment);
    }

    return extractMultiPileGeoArrSettingsFromLegacyState(state) ?? defaultMultiPileGeoArrSettings();
  }

  private normalizeGeoResults(
    raw: unknown,
    joints: MultiPileJoint[],
    generatedPiles: MultiPileGeneratedPile[],
  ): Record<string, MultiPileGeoResultRow> {
    const source =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const representativePileByJoint = new Map<string, string>();

    generatedPiles.forEach((pile) => {
      const existing = representativePileByJoint.get(pile.parentJointId);
      if (existing) {
        return;
      }
      representativePileByJoint.set(pile.parentJointId, pile.id);
    });

    return Object.fromEntries(
      joints.flatMap((joint) => {
        const parsed = MultiPileGeoResultRowSchema.safeParse(source[joint.id]);
        if (!parsed.success) {
          return [];
        }

        const row = parsed.data;
        if (row.typeId !== joint.pileTypeId) {
          return [];
        }

        return [
          [
            joint.id,
            {
              ...row,
              jointId: joint.id,
              ...((joint.displayName || joint.jointDisplayName) && !row.jointDisplayName
                ? { jointDisplayName: joint.displayName || joint.jointDisplayName }
                : {}),
              pileId: row.pileId || representativePileByJoint.get(joint.id) || row.pileId,
            },
          ],
        ];
      }),
    );
  }

  private normalizeGeoTypeSettings(
    raw: unknown,
    pileTypes: MultiPilePileTypeDefinition[],
  ): Record<string, MultiPileGeoTypeSettings> {
    const source =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

    return Object.fromEntries(
      pileTypes.map((pileType) => [
        pileType.id,
        this.normalizeSingleGeoTypeSettings(source[pileType.id], pileType),
      ]),
    );
  }

  private normalizeSingleGeoTypeSettings(
    raw: unknown,
    pileType: MultiPilePileTypeDefinition,
  ): MultiPileGeoTypeSettings {
    const row =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const defaults = this.defaultGeoTypeSettings(pileType);

    return {
      ...defaults,
      typeId: pileType.id,
      linkedDmm: this.numberValue(row.linkedDmm, pileType.Dmm, { min: 0 }),
      redundancy: row.redundancy === 'HIGH' ? 'HIGH' : 'LOW',
      shaftRedComp: this.numberValue(row.shaftRedComp, defaults.shaftRedComp, { min: 0 }),
      shaftRedTen: this.numberValue(row.shaftRedTen, defaults.shaftRedTen, { min: 0 }),
      useNnf: Boolean(row.useNnf),
      Nnf: this.numberValue(row.Nnf, defaults.Nnf, { min: 0 }),
      s1H: this.numberValue(row.s1H, defaults.s1H, { min: 0 }),
      s1qs: this.numberValue(row.s1qs, defaults.s1qs, { min: 0 }),
      s1MaterialId: this.stringValue(row.s1MaterialId, ''),
      s2H: this.numberValue(row.s2H, defaults.s2H, { min: 0 }),
      s2qs: this.numberValue(row.s2qs, defaults.s2qs, { min: 0 }),
      s2MaterialId: this.stringValue(row.s2MaterialId, ''),
      s3H: this.numberValue(row.s3H, defaults.s3H, { min: 0 }),
      s3qs: this.numberValue(row.s3qs, defaults.s3qs, { min: 0 }),
      s3MaterialId: this.stringValue(row.s3MaterialId, ''),
      Ls: this.numberValue(row.Ls, defaults.Ls, { min: 0 }),
      useLsMinOverride: Boolean(row.useLsMinOverride),
      LsMinOverride: this.numberValue(row.LsMinOverride, defaults.LsMinOverride, { min: 0 }),
      qsRock: this.numberValue(row.qsRock, defaults.qsRock, { min: 0 }),
      qbRock: this.numberValue(row.qbRock, defaults.qbRock, { min: 0 }),
      foundingMaterialId: this.stringValue(row.foundingMaterialId, ''),
      useBase: row.useBase === 'NO' ? 'NO' : 'YES',
      LsMode: row.LsMode === 'auto' || row.LsMode === 'manual' ? row.LsMode : 'pending',
      LsSolved: this.numberValue(row.LsSolved, defaults.LsSolved, { min: 0 }),
      LsManual: this.numberValue(row.LsManual, defaults.LsManual, { min: 0 }),
      LsAdopted: this.numberValue(row.LsAdopted, defaults.LsAdopted, { min: 0 }),
      socketOverrideEnabled: Boolean(row.socketOverrideEnabled),
    };
  }

  private defaultGeoTypeSettings(pileType: MultiPilePileTypeDefinition): MultiPileGeoTypeSettings {
    return {
      typeId: pileType.id,
      linkedDmm: pileType.Dmm,
      redundancy: 'LOW',
      shaftRedComp: 1,
      shaftRedTen: 0.5,
      useNnf: false,
      Nnf: 0,
      s1H: 0,
      s1qs: 0,
      s1MaterialId: '',
      s2H: 0,
      s2qs: 0,
      s2MaterialId: '',
      s3H: 0,
      s3qs: 0,
      s3MaterialId: '',
      Ls: 0,
      useLsMinOverride: false,
      LsMinOverride: 0,
      qsRock: 0,
      qbRock: 0,
      foundingMaterialId: '',
      useBase: 'YES',
      LsMode: 'pending',
      LsSolved: 0,
      LsManual: 0,
      LsAdopted: 0,
      socketOverrideEnabled: false,
    };
  }

  private normalizeJoints(
    raw: unknown,
    pileTypes: MultiPilePileTypeDefinition[],
    rawGeneratedPiles: unknown,
  ): MultiPileJoint[] {
    const rows = Array.isArray(raw) ? raw : [];
    const seen = new Set<string>();
    const defaultPileTypeId = pileTypes[0]?.id ?? DEFAULT_PILE_TYPE.id;
    const source = rows.length ? rows : [{ ...DEFAULT_JOINT, pileTypeId: defaultPileTypeId }];
    const pileTypeIds = new Set(pileTypes.map((pileType) => pileType.id));
    const generatedPileTypeById = new Map<string, string>();

    if (Array.isArray(rawGeneratedPiles)) {
      rawGeneratedPiles.forEach((value) => {
        const row = this.objectValue(value);
        const pileId = this.stringValue(row.id, '');
        const pileTypeId = this.stringValue(row.pileTypeId ?? row.typeId ?? row.type, '');
        if (!pileId || !pileTypeId) {
          return;
        }
        generatedPileTypeById.set(pileId, pileTypeId);
      });
    }

    return source.map((value, index) => {
      const row = this.objectValue(value);
      const fallbackId = index === 0 ? DEFAULT_JOINT.id : `J${index + 1}`;
      const id = this.uniqueId(seen, this.stringValue(row.id, fallbackId));
      const displayName = this.optionalStringValue(
        row.jointDisplayName ?? row.displayName ?? row.name ?? row.label,
      );
      const supportCount = Math.max(
        1,
        Math.round(this.numberValue(row.supportCount ?? row.noOfSupports, 1, { min: 1 })),
      );
      const explicitPileTypeFieldPresent = [
        'pileTypeId',
        'assignedPileTypeId',
        'typeId',
        'type',
      ].some((field) => Object.prototype.hasOwnProperty.call(row, field));
      const rawLinkedPileId = this.stringValue(row.pile ?? row.pileId, '');
      const linkedPileTypeId = rawLinkedPileId
        ? (generatedPileTypeById.get(rawLinkedPileId) ?? '')
        : '';
      const rawPileTypeId = this.stringValue(
        row.pileTypeId ?? row.assignedPileTypeId ?? row.typeId ?? row.type ?? linkedPileTypeId,
        '',
      );
      let pileTypeId = defaultPileTypeId;

      if (explicitPileTypeFieldPresent || linkedPileTypeId) {
        if (!rawPileTypeId || rawPileTypeId === MULTI_PILE_UNASSIGNED_PILE_TYPE_ID) {
          pileTypeId = MULTI_PILE_UNASSIGNED_PILE_TYPE_ID;
        } else {
          pileTypeId = pileTypeIds.has(rawPileTypeId)
            ? rawPileTypeId
            : MULTI_PILE_UNASSIGNED_PILE_TYPE_ID;
        }
      }

      return {
        id,
        ...(displayName ? { displayName } : {}),
        ...(displayName ? { jointDisplayName: displayName } : {}),
        x: this.numberValue(row.x, 0),
        y: this.numberValue(row.y, 0),
        z: this.numberValue(row.z, 0),
        supportCount,
        noOfSupports: supportCount,
        pileTypeId,
        assignmentMode: row.assignmentMode === 'auto' ? 'auto' : 'manual',
        active: row.active === undefined ? true : Boolean(row.active),
        order: index,
      };
    });
  }

  private generatePiles(joints: MultiPileJoint[]): MultiPileGeneratedPile[] {
    const usedIds = new Set<string>();
    const piles: MultiPileGeneratedPile[] = [];

    joints.forEach((joint) => {
      if (joint.pileTypeId === MULTI_PILE_UNASSIGNED_PILE_TYPE_ID) {
        return;
      }
      for (let supportIndex = 1; supportIndex <= joint.supportCount; supportIndex++) {
        const baseId = `${joint.id}-P${supportIndex}`;
        const id = this.uniqueId(usedIds, baseId);
        piles.push({
          id,
          parentJointId: joint.id,
          supportIndex,
          supportCount: joint.supportCount,
          pileTypeId: joint.pileTypeId,
        });
      }
    });

    return piles;
  }

  private normalizeJointLoads(
    raw: unknown,
    joints: MultiPileJoint[],
    loadPatterns: MultiPileState['loadPatterns'],
  ): MultiPileJointLoadRow[] {
    const rows = Array.isArray(raw) ? raw : [];
    const jointIds = new Set(joints.map((joint) => joint.id));
    const patternIds = new Set(loadPatterns.map((pattern) => pattern.id));
    const deduped = new Map<string, MultiPileJointLoadRow>();

    rows.forEach((value) => {
      const row = this.objectValue(value);
      const jointId = this.stringValue(row.jointId, '');
      const patternId = this.stringValue(row.patternId, '');
      if (!jointIds.has(jointId) || !patternIds.has(patternId)) {
        return;
      }

      const normalized: MultiPileJointLoadRow = {
        jointId,
        patternId,
        p: this.numberValue(row.p, 0),
        vx: this.numberValue(row.vx, 0),
        vy: this.numberValue(row.vy, 0),
        mx: this.numberValue(row.mx, 0),
        my: this.numberValue(row.my, 0),
        mz: this.numberValue(row.mz, 0),
      };

      if (this.isZeroLoadRow(normalized)) {
        return;
      }

      deduped.set(`${jointId}::${patternId}`, normalized);
    });

    return Array.from(deduped.values()).sort((left, right) => {
      if (left.jointId !== right.jointId) return left.jointId.localeCompare(right.jointId);
      return left.patternId.localeCompare(right.patternId);
    });
  }

  private clearCalculatedGeoResults(state: MultiPileState): MultiPileState {
    return {
      ...state,
      geoTypeSettings: Object.fromEntries(
        Object.entries(state.geoTypeSettings).map(([typeId, settings]) => {
          const adopted =
            settings.socketOverrideEnabled && settings.LsManual > 0 ? settings.LsManual : 0;
          const mode =
            settings.socketOverrideEnabled && settings.LsManual > 0 ? 'manual' : 'pending';
          return [
            typeId,
            {
              ...settings,
              Ls: adopted,
              LsSolved: 0,
              LsAdopted: adopted,
              LsMode: mode,
            },
          ];
        }),
      ),
      geoResults: {},
    };
  }

  private applyEnvelopeSelection(state: MultiPileState): MultiPileState {
    const selectedIds = new Set(
      normalizeMultiPileSelectedCombinationIds(
        state.selectedCombinations,
        state.combinationLibrary,
      ),
    );

    return {
      ...state,
      selectedCombinations: Array.from(selectedIds),
      combinationLibrary: state.combinationLibrary.map((combination) => ({
        ...combination,
        includeInEnvelope: combination.enabled && selectedIds.has(combination.id),
      })),
    };
  }

  private mergeCalculatedGeoResults(state: MultiPileState, rawGeoResults: unknown): MultiPileState {
    return {
      ...state,
      geoResults: this.normalizeGeoResults(rawGeoResults, state.joints, state.generatedPiles),
    };
  }

  private withEnvelopeRunContext(
    state: MultiPileState,
    context: { runId: string; createdAt: string; inputSignature: string },
  ): MultiPileState {
    return {
      ...state,
      uiState: {
        ...this.objectValue(state.uiState),
        envelope: {
          ...this.objectValue(this.objectValue(state.uiState).envelope),
          lastRunId: context.runId,
          lastRunAt: context.createdAt,
          lastRunInputSignature: context.inputSignature,
        },
      },
    };
  }

  private extractGeoResults(artifacts: unknown): unknown {
    const artifactRecord = this.objectValue(artifacts);
    const multiPileGeo = this.objectValue(artifactRecord.multiPileGeo);
    if (
      multiPileGeo.rows &&
      typeof multiPileGeo.rows === 'object' &&
      !Array.isArray(multiPileGeo.rows)
    ) {
      return multiPileGeo.rows;
    }
    return artifactRecord.multiPileGeo;
  }

  private toRunSummary(
    run: {
      id: string;
      status: string;
      createdAt: Date;
      durationMs?: number | null;
      resultSnapshot?: unknown;
    },
    result: unknown,
  ): MultiPileEnvelopeRunSummary {
    const resultRecord = this.objectValue(result);
    const envelope = this.extractEnvelope(resultRecord);
    const warnings = this.messageArray(resultRecord.warnings);
    const errors = this.messageArray(resultRecord.errors);

    return {
      runId: run.id,
      status: run.status,
      createdAt: run.createdAt.toISOString(),
      ...(run.durationMs != null ? { durationMs: run.durationMs } : {}),
      ...(envelope ? { envelope } : {}),
      ...(warnings.length ? { warnings } : {}),
      ...(errors.length ? { errors } : {}),
    };
  }

  private extractEnvelope(result: unknown): MultiPileEnvelopeSnapshot | undefined {
    const resultRecord = this.objectValue(result);
    const artifacts = this.objectValue(resultRecord.artifacts);
    const multiPileEnvelope = artifacts.multiPileEnvelope;
    const parsed = MultiPileEnvelopeSnapshotSchema.safeParse(multiPileEnvelope);
    return parsed.success ? parsed.data : undefined;
  }

  private multiPileRunNote(pileGroupId: string): string {
    return `multi-pile:${pileGroupId}`;
  }

  private messageArray(value: unknown): { code: string; message: string; clauseRef?: string }[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.objectValue(item))
      .filter((item) => item.code && item.message)
      .map((item) => ({
        code: String(item.code),
        message: String(item.message),
        ...(item.clauseRef ? { clauseRef: String(item.clauseRef) } : {}),
      }));
  }

  private isZeroLoadRow(row: MultiPileJointLoadRow): boolean {
    return (
      Math.abs(row.p) <= ZERO_TOLERANCE &&
      Math.abs(row.vx) <= ZERO_TOLERANCE &&
      Math.abs(row.vy) <= ZERO_TOLERANCE &&
      Math.abs(row.mx) <= ZERO_TOLERANCE &&
      Math.abs(row.my) <= ZERO_TOLERANCE &&
      Math.abs(row.mz) <= ZERO_TOLERANCE
    );
  }

  private objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringValue(value: unknown, fallback: string): string {
    const candidate = String(value ?? '').trim();
    return candidate || fallback;
  }

  private optionalStringValue(value: unknown): string | undefined {
    const candidate = String(value ?? '').trim();
    return candidate || undefined;
  }

  private numberValue(
    value: unknown,
    fallback: number,
    opts?: { min?: number; max?: number },
  ): number {
    const candidate = Number(value);
    if (!Number.isFinite(candidate)) {
      return fallback;
    }
    if (opts?.min !== undefined && candidate < opts.min) {
      return opts.min;
    }
    if (opts?.max !== undefined && candidate > opts.max) {
      return opts.max;
    }
    return candidate;
  }

  private nullableNumberValue(
    value: unknown,
    opts?: { min?: number; max?: number },
  ): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const candidate = Number(value);
    if (!Number.isFinite(candidate)) {
      return null;
    }
    if (opts?.min !== undefined && candidate < opts.min) {
      return opts.min;
    }
    if (opts?.max !== undefined && candidate > opts.max) {
      return opts.max;
    }
    return candidate;
  }

  private uniqueId(seen: Set<string>, base: string): string {
    let candidate = base || randomUUID();
    let suffix = 2;
    while (seen.has(candidate)) {
      candidate = `${base}_${suffix++}`;
    }
    seen.add(candidate);
    return candidate;
  }
}
