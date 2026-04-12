import { Injectable } from '@nestjs/common';
import {
  buildMultiPileEnvelopeInputSignature,
  MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
  type MultiPileEnvelopeRunSummary,
  type MultiPileJoint,
  type MultiPilePileTypeDefinition,
  type MultiPileProjectSpecifics,
  type MultiPileState,
  type ProjectLoadDefinition,
} from '@eng/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RequestUser } from '../../auth/decorators/current-user.decorator';
import { MultiPileService } from '../../pile-groups/multi-pile.service';
import {
  getProjectLoadDefinitionFromLegacyPileGroups,
  getProjectLoadDefinitionFromProjectMetadata,
} from '../../projects/project-load-definition.adapter';
import {
  getHydratedProjectMetadata,
  getProjectSpecificsFromProjectMetadata,
} from '../../projects/project-specifics.adapter';
import {
  type AiAssistantMode,
  type AiAssistantQuickAction,
  type RespondAiAssistantDto,
} from '../dto/respond-ai-assistant.dto';

type AssistantProjectSnapshot = {
  id: string;
  name: string;
  code: string;
  status: string;
  updatedAt: string;
} | null;

type AssistantPileGroupSnapshot = {
  id: string;
  name: string;
  description: string | null;
} | null;

type AgentToolResult = {
  toolName:
    | 'getCurrentPageContext'
    | 'getProjectSummary'
    | 'getMultiPileWorkspaceSummary'
    | 'getPileTypeRangeSummary'
    | 'getJointRangeMatchingSummary'
    | 'getAiReportSummary'
    | 'getExtractedParameterTablesSummary'
    | 'getStandardsMappingSummary';
  title: string;
  summary: string[];
  data: Record<string, unknown>;
};

type LoadedProjectContext = {
  project: {
    id: string;
    name: string;
    code: string;
    status: string;
    updatedAt: Date;
    standardAssignments: Array<{ id: string }>;
    pileGroups: Array<{ id: string; metadata: unknown }>;
  };
  projectSpecifics: MultiPileProjectSpecifics;
  loadDefinition: ProjectLoadDefinition | null;
  referencesSummary: ReturnType<typeof summarizeProjectReferences>;
  structuralDefaultsSummary: ReturnType<typeof summarizeProjectStructuralDefaults>;
  geotechnicalSummary: ReturnType<typeof summarizeProjectGeotechnical>;
  missingSetupAreas: string[];
};

type LoadedMultiPileContext = {
  state: MultiPileState;
  latestRun: MultiPileEnvelopeRunSummary | null;
  envelopeStatus: ReturnType<typeof deriveEnvelopeSnapshotStatus>;
};

type LoadedAiReportContext = {
  selectedDocument: {
    id: string;
    filename: string;
    status: string;
    pileGroupName: string | null;
    updatedAt: Date;
    latestRun: {
      id: string;
      status: string;
      model: string;
      createdAt: Date;
      resultJson: unknown;
    } | null;
  } | null;
  extractionSummary: ReturnType<typeof summarizeExtractionResult>;
  parameterTablesSummary: ReturnType<typeof summarizeExtractedParameterTables>;
  standardsMappingSummary: ReturnType<typeof summarizeStandardsMapping>;
};

type AiAgentPromptContextParams = {
  mode: AiAssistantMode;
  quickAction: AiAssistantQuickAction;
  pageContext: RespondAiAssistantDto['pageContext'];
  projectSnapshot: AssistantProjectSnapshot;
  pileGroupSnapshot: AssistantPileGroupSnapshot;
  toolResults: AgentToolResult[];
};

@Injectable()
export class AiAgentOrchestrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly multiPileService: MultiPileService,
  ) {}

  async buildPromptContext({
    user,
    dto,
    projectId,
    pileGroupId,
    projectSnapshot,
    pileGroupSnapshot,
  }: {
    user: RequestUser & { organisationId: string };
    dto: RespondAiAssistantDto;
    projectId: string | null;
    pileGroupId: string | null;
    projectSnapshot: AssistantProjectSnapshot;
    pileGroupSnapshot: AssistantPileGroupSnapshot;
  }) {
    const quickAction = dto.quickAction ?? 'review_page';
    const projectContextPromise = projectId
      ? this.loadProjectContext(projectId)
      : Promise.resolve<LoadedProjectContext | null>(null);
    const multiPileContextPromise =
      projectId && pileGroupId && dto.pageContext.pageKind === 'multi_pile'
        ? this.loadMultiPileContext(projectId, pileGroupId)
        : Promise.resolve<LoadedMultiPileContext | null>(null);
    const aiReportContextPromise =
      projectId && dto.pageContext.pageKind === 'ai_reports'
        ? this.loadAiReportContext(user.organisationId, projectId, dto.pageContext)
        : Promise.resolve<LoadedAiReportContext | null>(null);

    const [projectContext, multiPileContext, aiReportContext] = await Promise.all([
      projectContextPromise,
      multiPileContextPromise,
      aiReportContextPromise,
    ]);

    const toolResults: AgentToolResult[] = [];
    const toolSequence = this.planToolSequence({
      pageKind: dto.pageContext.pageKind,
      hasProjectScope: projectContext !== null,
      hasMultiPileScope: multiPileContext !== null,
      hasAiReportScope: aiReportContext !== null,
    });

    for (const toolName of toolSequence) {
      const toolResult = this.runTool({
        toolName,
        dto,
        quickAction,
        projectContext,
        multiPileContext,
        aiReportContext,
      });
      if (toolResult) {
        toolResults.push(toolResult);
      }
    }

    return buildAgentPromptContext({
      mode: dto.mode ?? 'agent',
      quickAction,
      pageContext: dto.pageContext,
      projectSnapshot,
      pileGroupSnapshot,
      toolResults,
    });
  }

  private planToolSequence({
    pageKind,
    hasProjectScope,
    hasMultiPileScope,
    hasAiReportScope,
  }: {
    pageKind: string;
    hasProjectScope: boolean;
    hasMultiPileScope: boolean;
    hasAiReportScope: boolean;
  }): AgentToolResult['toolName'][] {
    const tools: AgentToolResult['toolName'][] = ['getCurrentPageContext'];

    if (hasProjectScope) {
      tools.push('getProjectSummary');
    }

    if (pageKind === 'multi_pile' && hasMultiPileScope) {
      tools.push('getMultiPileWorkspaceSummary');
      tools.push('getPileTypeRangeSummary');
      tools.push('getJointRangeMatchingSummary');
    }

    if (pageKind === 'ai_reports' && hasAiReportScope) {
      tools.push('getAiReportSummary');
      tools.push('getExtractedParameterTablesSummary');
      tools.push('getStandardsMappingSummary');
    }

    return tools;
  }

  private runTool({
    toolName,
    dto,
    quickAction,
    projectContext,
    multiPileContext,
    aiReportContext,
  }: {
    toolName: AgentToolResult['toolName'];
    dto: RespondAiAssistantDto;
    quickAction: AiAssistantQuickAction;
    projectContext: LoadedProjectContext | null;
    multiPileContext: LoadedMultiPileContext | null;
    aiReportContext: LoadedAiReportContext | null;
  }) {
    switch (toolName) {
      case 'getCurrentPageContext':
        return this.getCurrentPageContextTool(dto.pageContext, quickAction);
      case 'getProjectSummary':
        return projectContext ? this.getProjectSummaryTool(projectContext) : null;
      case 'getMultiPileWorkspaceSummary':
        return multiPileContext
          ? this.getMultiPileWorkspaceSummaryTool(dto.pageContext, multiPileContext)
          : null;
      case 'getPileTypeRangeSummary':
        return multiPileContext ? this.getPileTypeRangeSummaryTool(multiPileContext) : null;
      case 'getJointRangeMatchingSummary':
        return multiPileContext ? this.getJointRangeMatchingSummaryTool(multiPileContext) : null;
      case 'getAiReportSummary':
        return aiReportContext ? this.getAiReportSummaryTool(aiReportContext) : null;
      case 'getExtractedParameterTablesSummary':
        return aiReportContext
          ? this.getExtractedParameterTablesSummaryTool(aiReportContext)
          : null;
      case 'getStandardsMappingSummary':
        return aiReportContext ? this.getStandardsMappingSummaryTool(aiReportContext) : null;
      default:
        return null;
    }
  }

  private getCurrentPageContextTool(
    pageContext: RespondAiAssistantDto['pageContext'],
    quickAction: AiAssistantQuickAction,
  ): AgentToolResult {
    const pageSpecificData = objectValue(pageContext.pageSpecificData);
    const assistantGuidance = objectValue(pageSpecificData.assistantGuidance);
    const activeTabContext = objectValue(pageSpecificData.activeTabContext);
    const currentState = stringArrayValue(assistantGuidance.currentState);
    const missingInputs = stringArrayValue(assistantGuidance.missingInputs);
    const likelyBlockers = stringArrayValue(assistantGuidance.likelyBlockers);
    const nextActions = stringArrayValue(assistantGuidance.nextActions);
    const visibleBlockers = uniqueText([
      ...(pageContext.visibleErrors ?? []),
      ...missingInputs.slice(0, 4),
      ...likelyBlockers.slice(0, 4),
    ]);

    return {
      toolName: 'getCurrentPageContext',
      title: 'Current page context',
      summary: compactText([
        `${pageContext.pageTitle} (${pageContext.pageKind}) on ${pageContext.route}`,
        `Quick action focus: ${describeAssistantQuickAction(quickAction)}`,
        currentState[0] ?? null,
        visibleBlockers.length > 0
          ? `${visibleBlockers.length} visible blocker${visibleBlockers.length === 1 ? '' : 's'} are surfaced on the page`
          : 'No visible blockers are currently surfaced from the page context',
        activeTabContext.label ? `Active tab context: ${activeTabContext.label}` : null,
      ]),
      data: {
        route: pageContext.route,
        pageKind: pageContext.pageKind,
        pageTitle: pageContext.pageTitle,
        saveState: pageContext.saveState ?? 'unknown',
        keyFacts: pageContext.keyFacts,
        visibleWarnings: pageContext.visibleWarnings,
        visibleErrors: pageContext.visibleErrors,
        visibleBlockers,
        currentState,
        missingInputs,
        likelyBlockers,
        suggestedNextSteps: nextActions,
        activeTabContext: Object.keys(activeTabContext).length > 0 ? activeTabContext : null,
      },
    };
  }

  private getProjectSummaryTool(projectContext: LoadedProjectContext): AgentToolResult {
    const { project, referencesSummary, structuralDefaultsSummary, geotechnicalSummary } =
      projectContext;
    const loadCaseCount = projectContext.loadDefinition?.loadCases.length ?? 0;
    const loadCombinationCount = projectContext.loadDefinition?.loadCombinations.length ?? 0;

    return {
      toolName: 'getProjectSummary',
      title: 'Project setup summary',
      summary: compactText([
        `${project.code} is ${project.status.replace(/_/g, ' ')} with ${project.standardAssignments.length} assigned standard${project.standardAssignments.length === 1 ? '' : 's'}`,
        `References: ${referencesSummary.totalReferences} active, ${referencesSummary.includedInReportCount} included in report output`,
        `Structural defaults: ${structuralDefaultsSummary.configuredLibraries}/4 libraries configured with ${structuralDefaultsSummary.activeRows} active rows`,
        `Geotechnical library: ${geotechnicalSummary.activeMaterials} active material${geotechnicalSummary.activeMaterials === 1 ? '' : 's'} and ARR ${geotechnicalSummary.arrReady ? 'ready' : 'not ready'}`,
        `Load library: ${loadCaseCount} load case${loadCaseCount === 1 ? '' : 's'} and ${loadCombinationCount} load combination${loadCombinationCount === 1 ? '' : 's'}`,
        projectContext.missingSetupAreas.length > 0
          ? `${projectContext.missingSetupAreas.length} setup gap${projectContext.missingSetupAreas.length === 1 ? '' : 's'} remain visible`
          : 'No major setup gaps are obvious from the stored project summary',
      ]),
      data: {
        projectCode: project.code,
        projectName: project.name,
        projectStatus: project.status,
        updatedAt: project.updatedAt.toISOString(),
        standardsAssignedCount: project.standardAssignments.length,
        pileGroupsCount: project.pileGroups.length,
        referencesSummary,
        structuralDefaultsSummary,
        geotechnicalSummary,
        loadLibrarySummary: {
          loadCases: loadCaseCount,
          loadCombinations: loadCombinationCount,
        },
        missingSetupAreas: projectContext.missingSetupAreas,
      },
    };
  }

  private getMultiPileWorkspaceSummaryTool(
    pageContext: RespondAiAssistantDto['pageContext'],
    multiPileContext: LoadedMultiPileContext,
  ): AgentToolResult {
    const { state, latestRun, envelopeStatus } = multiPileContext;
    const pageSpecificData = objectValue(pageContext.pageSpecificData);
    const activeTab = stringValue(pageSpecificData.activeTab);
    const activeTabContext = objectValue(pageSpecificData.activeTabContext);
    const activePileTypeId = stringValue(activeTabContext.activePileTypeId) || null;
    const derivedPileCount = deriveGeneratedPileCount(state);
    const manualJointCount = state.joints.filter(
      (joint) => joint.assignmentMode === 'manual',
    ).length;
    const autoJointCount = state.joints.filter((joint) => joint.assignmentMode === 'auto').length;
    const unassignedJointCount = state.joints.filter(
      (joint) => joint.pileTypeId === MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
    ).length;

    return {
      toolName: 'getMultiPileWorkspaceSummary',
      title: 'Multi-Pile workspace summary',
      summary: compactText([
        `${state.pileTypes.length} pile type${state.pileTypes.length === 1 ? '' : 's'} · ${state.joints.length} joint${state.joints.length === 1 ? '' : 's'} · ${derivedPileCount} derived pile${derivedPileCount === 1 ? '' : 's'}`,
        `Save state is ${pageContext.saveState ?? 'unknown'} and the active tab is ${activeTab || 'not specified'}`,
        latestRun
          ? `Latest run status is ${latestRun.status}`
          : 'No latest envelope run is stored yet',
        `Envelope snapshot state is ${envelopeStatus.state}`,
        `${manualJointCount} manual joint${manualJointCount === 1 ? '' : 's'} · ${autoJointCount} auto joint${autoJointCount === 1 ? '' : 's'} · ${unassignedJointCount} unassigned joint${unassignedJointCount === 1 ? '' : 's'}`,
        activePileTypeId ? `Active pile type focus is ${activePileTypeId}` : null,
      ]),
      data: {
        pileTypeCount: state.pileTypes.length,
        jointCount: state.joints.length,
        derivedPileCount,
        selectedCombinationCount: state.selectedCombinations.length,
        saveState: pageContext.saveState ?? 'unknown',
        runStatus: latestRun?.status ?? 'not_run',
        envelopeSnapshotState: envelopeStatus.state,
        envelopeSnapshotDetail: envelopeStatus.detail,
        activeTab: activeTab || null,
        activePileTypeId,
        jointAssignmentCounts: {
          manual: manualJointCount,
          auto: autoJointCount,
          unassigned: unassignedJointCount,
        },
      },
    };
  }

  private getPileTypeRangeSummaryTool(multiPileContext: LoadedMultiPileContext): AgentToolResult {
    const types = multiPileContext.state.pileTypes.map((pileType) => {
      const rangeSummary = summarizePileTypeUltimateRange(pileType);
      const linkedJointCount = multiPileContext.state.joints.filter(
        (joint) => joint.pileTypeId === pileType.id,
      ).length;

      return {
        pileTypeId: pileType.id,
        displayName: pileType.displayName,
        active: pileType.active !== false,
        linkedJointCount,
        compressionRange: {
          min: pileType.compressionUltimateMin,
          max: pileType.compressionUltimateMax,
        },
        tensionRange: {
          min: pileType.tensionUltimateMin,
          max: pileType.tensionUltimateMax,
        },
        rangeState: rangeSummary.label,
        rangeDetail: rangeSummary.detail,
        participatesInAutoMatching: rangeSummary.participatesInAutoMatching,
      };
    });
    const readyTypes = types.filter((row) => row.participatesInAutoMatching);
    const incompleteTypes = types.filter(
      (row) => !row.participatesInAutoMatching && row.rangeState !== 'No range data',
    );
    const noRangeTypes = types.filter((row) => row.rangeState === 'No range data');

    return {
      toolName: 'getPileTypeRangeSummary',
      title: 'Pile type authored range summary',
      summary: compactText([
        `${readyTypes.length} pile type${readyTypes.length === 1 ? '' : 's'} can currently participate in auto-matching`,
        incompleteTypes.length > 0
          ? `${incompleteTypes.length} pile type${incompleteTypes.length === 1 ? '' : 's'} have partial range authoring`
          : null,
        noRangeTypes.length > 0
          ? `${noRangeTypes.length} pile type${noRangeTypes.length === 1 ? '' : 's'} have no authored range coverage`
          : null,
      ]),
      data: {
        pileTypeCount: types.length,
        autoMatchReadyCount: readyTypes.length,
        partialRangeCount: incompleteTypes.length,
        noRangeCount: noRangeTypes.length,
        pileTypes: types,
      },
    };
  }

  private getJointRangeMatchingSummaryTool(
    multiPileContext: LoadedMultiPileContext,
  ): AgentToolResult {
    const pileTypeById = new Map(
      multiPileContext.state.pileTypes.map((pileType) => [pileType.id, pileType]),
    );
    const rows = multiPileContext.state.joints.map((joint) => {
      const extremes = deriveJointEnvelopeExtremes(multiPileContext.latestRun, joint.id);
      const currentType = pileTypeById.get(joint.pileTypeId) ?? null;
      const suggestedType = findSuggestedPileTypeForEnvelopeExtremes(
        multiPileContext.state.pileTypes,
        extremes,
      );
      const currentTypeMatchStatus = evaluatePileTypeRangeMatch(
        currentType,
        extremes,
        multiPileContext.envelopeStatus.state,
      );
      const noMatchingType =
        extremes !== null &&
        multiPileContext.envelopeStatus.state === 'ready' &&
        suggestedType === null;

      return {
        jointId: joint.id,
        jointLabel: jointDisplayLabel(joint),
        assignmentMode: joint.assignmentMode,
        currentPileTypeId: joint.pileTypeId,
        currentPileTypeLabel:
          currentType?.displayName && currentType.displayName !== currentType.id
            ? `${currentType.id} — ${currentType.displayName}`
            : (currentType?.id ?? joint.pileTypeId),
        suggestedPileTypeId: suggestedType?.id ?? null,
        maxCompression: extremes?.maxCompression ?? null,
        maxTension: extremes?.maxTension ?? null,
        currentTypeMatchStatus,
        noMatchingType,
        needsAssignment: joint.pileTypeId === MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
        manualOverride: joint.assignmentMode === 'manual',
        suggestionDiffersFromCurrent:
          suggestedType != null &&
          joint.pileTypeId !== MULTI_PILE_UNASSIGNED_PILE_TYPE_ID &&
          joint.pileTypeId !== suggestedType.id,
      };
    });

    const outsideRange = rows.filter((row) => row.currentTypeMatchStatus === 'outside-range');
    const noMatchingType = rows.filter((row) => row.noMatchingType);
    const manualOverride = rows.filter((row) => row.manualOverride);
    const needsAssignment = rows.filter((row) => row.needsAssignment);

    return {
      toolName: 'getJointRangeMatchingSummary',
      title: 'Joint range matching summary',
      summary: compactText([
        `Envelope snapshot state is ${multiPileContext.envelopeStatus.state}`,
        outsideRange.length > 0
          ? `${outsideRange.length} joint${outsideRange.length === 1 ? '' : 's'} sit outside the authored range of their current type`
          : null,
        noMatchingType.length > 0
          ? `${noMatchingType.length} joint${noMatchingType.length === 1 ? '' : 's'} have no matching active type for the current envelope extremes`
          : null,
        manualOverride.length > 0
          ? `${manualOverride.length} joint${manualOverride.length === 1 ? '' : 's'} are still manual override`
          : null,
        needsAssignment.length > 0
          ? `${needsAssignment.length} joint${needsAssignment.length === 1 ? '' : 's'} still need a pile type assignment`
          : null,
      ]),
      data: {
        envelopeSnapshotState: multiPileContext.envelopeStatus.state,
        envelopeSnapshotDetail: multiPileContext.envelopeStatus.detail,
        jointCount: rows.length,
        outsideCurrentTypeRangeJointIds: outsideRange.map((row) => row.jointId),
        noMatchingTypeJointIds: noMatchingType.map((row) => row.jointId),
        manualOverrideJointIds: manualOverride.map((row) => row.jointId),
        unassignedJointIds: needsAssignment.map((row) => row.jointId),
        joints: rows.slice(0, 60),
      },
    };
  }

  private getAiReportSummaryTool(aiReportContext: LoadedAiReportContext): AgentToolResult {
    const document = aiReportContext.selectedDocument;
    const extractionSummary = aiReportContext.extractionSummary;

    return {
      toolName: 'getAiReportSummary',
      title: 'AI report summary',
      summary: compactText([
        document
          ? `Selected document is ${document.filename} with status ${document.status.replace(/_/g, ' ')}`
          : 'No AI report is currently selected in project scope',
        extractionSummary.documentFamily
          ? `Document family is ${extractionSummary.documentFamily}`
          : null,
        extractionSummary.reportTitle ? `Report title: ${extractionSummary.reportTitle}` : null,
        extractionSummary.extractionSections.length > 0
          ? `Extracted sections: ${extractionSummary.extractionSections.join(', ')}`
          : null,
        extractionSummary.tableLabels.length > 0
          ? `Visible parameter tables: ${extractionSummary.tableLabels.join(', ')}`
          : null,
      ]),
      data: {
        selectedDocument:
          document == null
            ? null
            : {
                id: document.id,
                filename: document.filename,
                status: document.status,
                pileGroupName: document.pileGroupName,
                latestRunStatus: document.latestRun?.status ?? null,
              },
        extractionSummary,
      },
    };
  }

  private getExtractedParameterTablesSummaryTool(
    aiReportContext: LoadedAiReportContext,
  ): AgentToolResult {
    const summary = aiReportContext.parameterTablesSummary;

    return {
      toolName: 'getExtractedParameterTablesSummary',
      title: 'Extracted parameter tables summary',
      summary: compactText([
        summary.tableCount > 0
          ? `${summary.tableCount} structured parameter table${summary.tableCount === 1 ? '' : 's'} are available`
          : 'No structured parameter tables are available on the selected extraction',
        summary.keyValues.length > 0
          ? `${summary.keyValues.length} key bearing or adhesion value${summary.keyValues.length === 1 ? '' : 's'} were surfaced from structured tables`
          : null,
      ]),
      data: summary,
    };
  }

  private getStandardsMappingSummaryTool(aiReportContext: LoadedAiReportContext): AgentToolResult {
    const summary = aiReportContext.standardsMappingSummary;

    return {
      toolName: 'getStandardsMappingSummary',
      title: 'Standards mapping summary',
      summary: compactText([
        summary.present
          ? `AS 2159 mapping is present with ${summary.mappedClauseRefs.length} mapped clause${summary.mappedClauseRefs.length === 1 ? '' : 's'}`
          : 'No AS 2159 mapping is attached to the selected extraction',
        summary.parameterMappingSummaries.length > 0
          ? `${summary.parameterMappingSummaries.length} high-level parameter relevance summary${summary.parameterMappingSummaries.length === 1 ? '' : 's'} are available`
          : null,
      ]),
      data: summary,
    };
  }

  private async loadProjectContext(projectId: string): Promise<LoadedProjectContext | null> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        metadata: true,
        updatedAt: true,
        standardAssignments: { select: { id: true } },
        pileGroups: { select: { id: true, metadata: true } },
      },
    });

    if (!project) {
      return null;
    }

    const fallback = { projectName: project.name, projectNumber: project.code };
    const hydratedMetadata = getHydratedProjectMetadata(
      project.metadata,
      project.pileGroups,
      fallback,
    );
    const projectSpecifics =
      getProjectSpecificsFromProjectMetadata(hydratedMetadata, fallback) ??
      getProjectSpecificsFromProjectMetadata({ projectSpecifics: {} }, fallback);
    if (!projectSpecifics) {
      return null;
    }

    const loadDefinition =
      getProjectLoadDefinitionFromProjectMetadata(project.metadata) ??
      getProjectLoadDefinitionFromLegacyPileGroups(project.pileGroups);
    const referencesSummary = summarizeProjectReferences(projectSpecifics);
    const structuralDefaultsSummary = summarizeProjectStructuralDefaults(projectSpecifics);
    const geotechnicalSummary = summarizeProjectGeotechnical(projectSpecifics);

    return {
      project,
      projectSpecifics,
      loadDefinition,
      referencesSummary,
      structuralDefaultsSummary,
      geotechnicalSummary,
      missingSetupAreas: deriveProjectMissingSetupAreas({
        standardsAssignedCount: project.standardAssignments.length,
        referencesSummary,
        structuralDefaultsSummary,
        geotechnicalSummary,
        loadDefinition,
      }),
    };
  }

  private async loadMultiPileContext(
    projectId: string,
    pileGroupId: string,
  ): Promise<LoadedMultiPileContext | null> {
    const [state, latestRun] = await Promise.all([
      this.multiPileService.getState(pileGroupId, projectId),
      this.multiPileService.getLatestEnvelopeRun(pileGroupId, projectId),
    ]);

    return {
      state,
      latestRun,
      envelopeStatus: deriveEnvelopeSnapshotStatus(state, latestRun),
    };
  }

  private async loadAiReportContext(
    organisationId: string,
    projectId: string,
    pageContext: RespondAiAssistantDto['pageContext'],
  ): Promise<LoadedAiReportContext | null> {
    const pageSpecificData = objectValue(pageContext.pageSpecificData);
    const selectedDocumentId = getNestedString(
      objectValue(pageSpecificData.selectedDocument),
      'id',
    );
    const selectedDocument =
      (selectedDocumentId
        ? await this.prisma.aiDocument.findFirst({
            where: {
              id: selectedDocumentId,
              organisationId,
              projectId,
            },
            include: {
              pileGroup: { select: { name: true } },
              extractionRuns: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          })
        : null) ??
      (await this.prisma.aiDocument.findFirst({
        where: {
          organisationId,
          projectId,
        },
        include: {
          pileGroup: { select: { name: true } },
          extractionRuns: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      }));

    if (!selectedDocument) {
      return {
        selectedDocument: null,
        extractionSummary: emptyExtractionSummary(),
        parameterTablesSummary: emptyParameterTablesSummary(),
        standardsMappingSummary: emptyStandardsMappingSummary(),
      };
    }

    const latestRun = selectedDocument.extractionRuns[0] ?? null;
    const extractionSummary = summarizeExtractionResult(latestRun?.resultJson);

    return {
      selectedDocument: {
        id: selectedDocument.id,
        filename: selectedDocument.filename,
        status: selectedDocument.status,
        pileGroupName: selectedDocument.pileGroup?.name ?? null,
        updatedAt: selectedDocument.updatedAt,
        latestRun:
          latestRun == null
            ? null
            : {
                id: latestRun.id,
                status: latestRun.status,
                model: latestRun.model,
                createdAt: latestRun.createdAt,
                resultJson: latestRun.resultJson,
              },
      },
      extractionSummary,
      parameterTablesSummary: summarizeExtractedParameterTables(latestRun?.resultJson),
      standardsMappingSummary: summarizeStandardsMapping(latestRun?.resultJson),
    };
  }
}

function buildAgentPromptContext({
  mode,
  quickAction,
  pageContext,
  projectSnapshot,
  pileGroupSnapshot,
  toolResults,
}: AiAgentPromptContextParams) {
  const payload = {
    mode,
    quickAction,
    quickActionFocus: describeAssistantQuickAction(quickAction),
    pageContext,
    projectSnapshot,
    pileGroupSnapshot,
    toolResults,
  };

  return [
    'Agent mode is a read-only beta path for the floating assistant in an engineering SaaS app.',
    'Work in two steps: first inspect the gathered tool outputs, then synthesize the answer.',
    'Treat getCurrentPageContext as the source of truth for visible UI facts.',
    'Treat getProjectSummary, getMultiPileWorkspaceSummary, getPileTypeRangeSummary, getJointRangeMatchingSummary, getAiReportSummary, getExtractedParameterTablesSummary, and getStandardsMappingSummary as read-only internal tool outputs.',
    'Use toolFindings for the most relevant cross-tool observations.',
    'Keep visiblePageFacts limited to direct facts from tool outputs.',
    'Keep inferredLikelyIssues limited to cautious workflow inferences grounded in the tool outputs.',
    'Keep standardsReferenceNotes clearly separate from authored project values and report-derived facts.',
    'Never claim that data was saved, a run was triggered, a form was updated, or an assignment was changed.',
    'Never invent engineering values. If a value is absent from the tool outputs, say that clearly.',
    'For Multi-Pile, distinguish current authored assignment, suggested type matching, stale or missing envelope data, and manual overrides.',
    'For AI Reports, distinguish report-derived extraction facts from AS 2159 mapping.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
}

function describeAssistantQuickAction(quickAction: AiAssistantQuickAction) {
  switch (quickAction) {
    case 'review_page':
      return 'Review the page, summarize what is visible, identify likely workflow gaps, and suggest next steps.';
    case 'explain_page':
      return 'Explain what this page is for and what the current state is showing.';
    case 'find_missing_inputs':
      return 'Start with the most relevant current state facts, then identify likely missing inputs or unresolved prerequisites.';
    case 'suggest_next_steps':
      return 'Suggest practical next steps that the user can take from the current page without making direct edits.';
    case 'suggest_fields':
      return 'Suggest grounded field values for the current page only when they come directly from current context, reports, or internal read-only tools.';
    default:
      return 'Provide read-only help grounded in the current page context.';
  }
}

function summarizeProjectReferences(projectSpecifics: MultiPileProjectSpecifics) {
  const activeReferences = projectSpecifics.references.filter((reference) => reference.active);
  const includedInReportCount = activeReferences.filter(
    (reference) => reference.includeInReport,
  ).length;
  const primaryGeotechnicalReference = activeReferences.find(
    (reference) => reference.primaryGeotechnical,
  );
  const primaryStructuralReference = activeReferences.find(
    (reference) => reference.primaryStructuralReference,
  );

  return {
    totalReferences: activeReferences.length,
    inactiveReferences: projectSpecifics.references.length - activeReferences.length,
    includedInReportCount,
    primaryGeotechnicalTitle: primaryGeotechnicalReference
      ? resolveProjectReferenceLabel(primaryGeotechnicalReference)
      : 'Not set',
    primaryStructuralTitle: primaryStructuralReference
      ? resolveProjectReferenceLabel(primaryStructuralReference)
      : 'Not set',
  };
}

function summarizeProjectStructuralDefaults(projectSpecifics: MultiPileProjectSpecifics) {
  const concreteClasses = summarizeStructuralLibrary(
    projectSpecifics.structuralDefaults.concreteClasses,
  );
  const reinforcementGrades = summarizeStructuralLibrary(
    projectSpecifics.structuralDefaults.reinforcementGrades,
  );
  const tendonGrades = summarizeStructuralLibrary(projectSpecifics.structuralDefaults.tendonGrades);
  const coverDurabilityClasses = summarizeStructuralLibrary(
    projectSpecifics.structuralDefaults.coverDurabilityClasses,
  );

  return {
    totalRows:
      concreteClasses.totalRows +
      reinforcementGrades.totalRows +
      tendonGrades.totalRows +
      coverDurabilityClasses.totalRows,
    activeRows:
      concreteClasses.activeRows +
      reinforcementGrades.activeRows +
      tendonGrades.activeRows +
      coverDurabilityClasses.activeRows,
    configuredLibraries: [
      concreteClasses,
      reinforcementGrades,
      tendonGrades,
      coverDurabilityClasses,
    ].filter((library) => library.totalRows > 0).length,
    concreteClasses,
    reinforcementGrades,
    tendonGrades,
    coverDurabilityClasses,
  };
}

function summarizeProjectGeotechnical(projectSpecifics: MultiPileProjectSpecifics) {
  const activeReferences = projectSpecifics.references.filter(
    (reference) => reference.active && reference.documentType === 'Geotechnical Report',
  );
  const activeReference =
    activeReferences.find(
      (reference) => reference.id === projectSpecifics.geotechnicalMaterials.activeReferenceId,
    ) ?? null;
  const activeMaterials = projectSpecifics.geotechnicalMaterials.materials.filter(
    (material) => material.includeInProject !== false,
  );
  const arrAssessment = projectSpecifics.geotechnicalBasis.arrAssessment;
  const arrReady = arrAssessment.weightTotal > 0 && Number.isFinite(arrAssessment.arrValue);

  return {
    activeReferenceTitle: activeReference
      ? resolveProjectReferenceLabel(activeReference)
      : activeReferences.length > 0
        ? 'No active geotechnical report selected'
        : 'No geotechnical report references yet',
    hasGeotechnicalReferences: activeReferences.length > 0,
    totalMaterials: projectSpecifics.geotechnicalMaterials.materials.length,
    activeMaterials: activeMaterials.length,
    templateState: projectSpecifics.geotechnicalMaterials.templateState,
    arrBandSummary: arrAssessment.arrBand || 'Not recorded',
    arrValueSummary: Number.isFinite(arrAssessment.arrValue)
      ? arrAssessment.arrValue.toFixed(3)
      : 'Not recorded',
    socketAssumptionsSummary:
      projectSpecifics.geotechnicalBasis.defaultSocketAssumptions.trim() || 'Not recorded',
    foundingSummary: projectSpecifics.geotechnicalBasis.foundingNotes.trim() || 'Not recorded',
    arrReady,
  };
}

function summarizeStructuralLibrary(rows: Array<{ active: boolean }>) {
  return {
    totalRows: rows.length,
    activeRows: rows.filter((row) => row.active !== false).length,
  };
}

function deriveProjectMissingSetupAreas({
  standardsAssignedCount,
  referencesSummary,
  structuralDefaultsSummary,
  geotechnicalSummary,
  loadDefinition,
}: {
  standardsAssignedCount: number;
  referencesSummary: ReturnType<typeof summarizeProjectReferences>;
  structuralDefaultsSummary: ReturnType<typeof summarizeProjectStructuralDefaults>;
  geotechnicalSummary: ReturnType<typeof summarizeProjectGeotechnical>;
  loadDefinition: ProjectLoadDefinition | null;
}) {
  const loadCaseCount = loadDefinition?.loadCases.length ?? 0;
  const loadCombinationCount = loadDefinition?.loadCombinations.length ?? 0;

  return compactText([
    standardsAssignedCount === 0 ? 'Standards are not assigned to the project yet' : null,
    referencesSummary.totalReferences === 0 ? 'Project references are still empty' : null,
    referencesSummary.totalReferences > 0 &&
    referencesSummary.primaryGeotechnicalTitle === 'Not set'
      ? 'Primary geotechnical reference is not identified yet'
      : null,
    referencesSummary.totalReferences > 0 && referencesSummary.primaryStructuralTitle === 'Not set'
      ? 'Primary structural reference is not identified yet'
      : null,
    structuralDefaultsSummary.configuredLibraries === 0
      ? 'Project structural default libraries are not configured yet'
      : structuralDefaultsSummary.configuredLibraries < 4
        ? 'Project structural default libraries are only partially configured'
        : null,
    !geotechnicalSummary.hasGeotechnicalReferences
      ? 'No geotechnical report reference is recorded yet'
      : null,
    geotechnicalSummary.activeReferenceTitle === 'No active geotechnical report selected'
      ? 'An active geotechnical source reference still needs to be selected'
      : null,
    geotechnicalSummary.activeMaterials === 0
      ? 'Project geotechnical material rows are still missing'
      : null,
    !geotechnicalSummary.arrReady ? 'ARR / phi_g assessment is not ready yet' : null,
    loadCaseCount === 0 ? 'Shared project load cases are not configured yet' : null,
    loadCombinationCount === 0 ? 'Shared project load combinations are not configured yet' : null,
  ]);
}

function deriveEnvelopeSnapshotStatus(
  state: Pick<
    MultiPileState,
    | 'combinationSettings'
    | 'pileTypes'
    | 'joints'
    | 'loadPatterns'
    | 'jointLoads'
    | 'combinationLibrary'
    | 'selectedCombinations'
    | 'uiState'
  >,
  latestRun: MultiPileEnvelopeRunSummary | null,
) {
  if (!latestRun) {
    return {
      state: 'missing' as const,
      detail: 'No persisted envelope snapshot exists for this pile group yet.',
    };
  }

  if (latestRun.status !== 'completed' || !latestRun.envelope) {
    return {
      state: 'failed' as const,
      detail:
        latestRun.status === 'failed'
          ? 'The latest envelope run failed.'
          : 'A completed envelope snapshot is not available yet.',
    };
  }

  const currentInputSignature = buildMultiPileEnvelopeInputSignature(state);
  const envelopeContext = objectValue(objectValue(state.uiState).envelope);
  const lastRunInputSignature = stringValue(envelopeContext.lastRunInputSignature);

  if (!lastRunInputSignature || lastRunInputSignature !== currentInputSignature) {
    return {
      state: 'stale' as const,
      detail: 'The current Multi-Pile state differs from the latest completed envelope run.',
    };
  }

  return {
    state: 'ready' as const,
    detail: `Snapshot matches the current saved Multi-Pile state from ${latestRun.createdAt}.`,
  };
}

function summarizePileTypeUltimateRange(
  pileType: Pick<
    MultiPilePileTypeDefinition,
    | 'compressionUltimateMin'
    | 'compressionUltimateMax'
    | 'tensionUltimateMin'
    | 'tensionUltimateMax'
  >,
) {
  const hasCompressionBounds =
    pileType.compressionUltimateMin != null || pileType.compressionUltimateMax != null;
  const hasTensionBounds =
    pileType.tensionUltimateMin != null || pileType.tensionUltimateMax != null;

  if (hasCompressionBounds && hasTensionBounds) {
    return {
      participatesInAutoMatching: true,
      label: 'Ready',
      detail: 'Compression and uplift ranges can participate in auto-matching.',
    };
  }

  if (!hasCompressionBounds && !hasTensionBounds) {
    return {
      participatesInAutoMatching: false,
      label: 'No range data',
      detail: 'Add at least one compression bound and one uplift bound for auto-matching.',
    };
  }

  return {
    participatesInAutoMatching: false,
    label: hasCompressionBounds ? 'Tension range missing' : 'Compression range missing',
    detail: hasCompressionBounds
      ? 'Add at least one uplift bound for this type to participate in auto-matching.'
      : 'Add at least one compression bound for this type to participate in auto-matching.',
  };
}

function deriveJointEnvelopeExtremes(
  latestRun: MultiPileEnvelopeRunSummary | null,
  jointId: string,
) {
  const row = latestRun?.envelope?.jointResults.find((candidate) => candidate.jointId === jointId);
  if (!row) {
    return null;
  }

  return {
    maxCompression: Math.max(row.nMax.value, 0),
    maxTension: Math.abs(Math.min(row.nMin.value, 0)),
  };
}

function findSuggestedPileTypeForEnvelopeExtremes(
  pileTypes: readonly MultiPilePileTypeDefinition[],
  extremes: { maxCompression: number; maxTension: number } | null,
) {
  if (!extremes) {
    return null;
  }

  return (
    pileTypes
      .filter((pileType) => {
        if (!pileType.active) {
          return false;
        }

        if (!summarizePileTypeUltimateRange(pileType).participatesInAutoMatching) {
          return false;
        }

        return (
          withinUltimateRange(
            extremes.maxCompression,
            pileType.compressionUltimateMin,
            pileType.compressionUltimateMax,
          ) &&
          withinUltimateRange(
            extremes.maxTension,
            pileType.tensionUltimateMin,
            pileType.tensionUltimateMax,
          )
        );
      })
      .slice()
      .sort((left, right) => {
        const sizeDelta = pileTypeSizeForOrdering(left) - pileTypeSizeForOrdering(right);
        if (Math.abs(sizeDelta) > 1e-9) {
          return sizeDelta;
        }

        const diameterDelta = left.Dmm - right.Dmm;
        if (Math.abs(diameterDelta) > 1e-9) {
          return diameterDelta;
        }

        return left.id.localeCompare(right.id);
      })[0] ?? null
  );
}

function evaluatePileTypeRangeMatch(
  pileType: MultiPilePileTypeDefinition | null,
  extremes: { maxCompression: number; maxTension: number } | null,
  envelopeState: 'ready' | 'missing' | 'stale' | 'failed',
) {
  if (!pileType) {
    return 'missing-type';
  }

  if (envelopeState === 'missing' || envelopeState === 'failed' || !extremes) {
    return 'no-envelope-data';
  }

  if (envelopeState === 'stale') {
    return 'stale-envelope';
  }

  if (!summarizePileTypeUltimateRange(pileType).participatesInAutoMatching) {
    return 'no-range-data';
  }

  return withinUltimateRange(
    extremes.maxCompression,
    pileType.compressionUltimateMin,
    pileType.compressionUltimateMax,
  ) &&
    withinUltimateRange(
      extremes.maxTension,
      pileType.tensionUltimateMin,
      pileType.tensionUltimateMax,
    )
    ? 'match'
    : 'outside-range';
}

function summarizeExtractionResult(value: unknown) {
  const record = objectValue(value);
  const tables = arrayValue(record.geotechnicalParameterTables);

  return {
    documentFamily: getNestedString(objectValue(record.documentFamily), 'value'),
    reportTitle: getNestedString(objectValue(record.reportTitle), 'value'),
    projectSummary: getNestedString(objectValue(record.projectSummary), 'value'),
    extractionSections: buildExtractionSections(record),
    hasGeotechnicalParameterTables: tables.length > 0,
    tableLabels: tables
      .map((table) => stringValue(objectValue(table).tableLabel))
      .filter((label) => label.length > 0)
      .slice(0, 8),
    hasStandardsMapping:
      record.standardsMapping != null &&
      typeof record.standardsMapping === 'object' &&
      !Array.isArray(record.standardsMapping),
  };
}

function emptyExtractionSummary() {
  return {
    documentFamily: null,
    reportTitle: null,
    projectSummary: null,
    extractionSections: [] as string[],
    hasGeotechnicalParameterTables: false,
    tableLabels: [] as string[],
    hasStandardsMapping: false,
  };
}

function summarizeExtractedParameterTables(value: unknown) {
  const record = objectValue(value);
  const tables = arrayValue(record.geotechnicalParameterTables).map(objectValue);
  const keyValues: string[] = [];

  for (const table of tables) {
    const tableLabel = stringValue(table.tableLabel) || 'Unlabelled table';
    const rows = arrayValue(table.rows).map(objectValue);

    for (const row of rows) {
      const rowLabel =
        stringValue(row.rowLabel) ||
        stringValue(row.unitCode) ||
        stringValue(row.foundingStrata) ||
        'Unlabelled row';
      const keyValueCandidates = [
        ['end bearing ultimate', numberValue(row.endBearingUltimateKPa), 'kPa'],
        ['end bearing allowable', numberValue(row.endBearingAllowableKPa), 'kPa'],
        [
          'shaft adhesion compression ultimate',
          numberValue(row.shaftAdhesionCompressionUltimateKPa),
          'kPa',
        ],
        [
          'shaft adhesion compression allowable',
          numberValue(row.shaftAdhesionCompressionAllowableKPa),
          'kPa',
        ],
        [
          'shaft adhesion tension ultimate',
          numberValue(row.shaftAdhesionTensionUltimateKPa),
          'kPa',
        ],
      ] as const;

      for (const [label, numeric, unit] of keyValueCandidates) {
        if (numeric == null) {
          continue;
        }
        keyValues.push(`${tableLabel} · ${rowLabel}: ${label} ${formatNumeric(numeric)} ${unit}`);
        if (keyValues.length >= 16) {
          break;
        }
      }

      if (keyValues.length >= 16) {
        break;
      }
    }

    if (keyValues.length >= 16) {
      break;
    }
  }

  return {
    tableCount: tables.length,
    tableLabels: tables
      .map((table) => stringValue(table.tableLabel))
      .filter((label) => label.length > 0)
      .slice(0, 8),
    rowCounts: tables.slice(0, 8).map((table) => ({
      tableLabel: stringValue(table.tableLabel) || 'Unlabelled table',
      rowCount: arrayValue(table.rows).length,
    })),
    keyValues,
  };
}

function emptyParameterTablesSummary() {
  return {
    tableCount: 0,
    tableLabels: [] as string[],
    rowCounts: [] as Array<{ tableLabel: string; rowCount: number }>,
    keyValues: [] as string[],
  };
}

function summarizeStandardsMapping(value: unknown) {
  const record = objectValue(value);
  const mapping = objectValue(record.standardsMapping);
  if (Object.keys(mapping).length === 0) {
    return emptyStandardsMappingSummary();
  }

  const relevantClauses = arrayValue(mapping.relevantClauses).map(objectValue);
  const parameterMappings = arrayValue(mapping.parameterMappings).map(objectValue);

  return {
    present: true,
    mappedClauseRefs: relevantClauses
      .map((clause) => stringValue(clause.clause))
      .filter((clause) => clause.length > 0)
      .slice(0, 12),
    clauseSummaries: relevantClauses.slice(0, 8).map((clause) => ({
      clause: stringValue(clause.clause) || 'Clause not set',
      title: stringValue(clause.title) || 'Untitled clause',
      summary: stringValue(clause.summary) || 'No clause summary available',
    })),
    parameterMappingSummaries: parameterMappings.slice(0, 8).map((mappingRow) => ({
      extractedValueLabel:
        stringValue(mappingRow.extractedValueLabel) || 'Unlabelled extracted value',
      possibleAs2159Concept: stringValue(mappingRow.possibleAs2159Concept) || 'Concept not set',
      relatedClauses: stringArrayValue(mappingRow.relatedClauses),
      rationale: stringValue(mappingRow.rationale) || 'No rationale provided',
      confidence: numberValue(mappingRow.confidence),
    })),
    notes: stringArrayValue(mapping.notes).slice(0, 8),
  };
}

function emptyStandardsMappingSummary() {
  return {
    present: false,
    mappedClauseRefs: [] as string[],
    clauseSummaries: [] as Array<{
      clause: string;
      title: string;
      summary: string;
    }>,
    parameterMappingSummaries: [] as Array<{
      extractedValueLabel: string;
      possibleAs2159Concept: string;
      relatedClauses: string[];
      rationale: string;
      confidence: number | null;
    }>,
    notes: [] as string[],
  };
}

function buildExtractionSections(record: Record<string, unknown>) {
  const sections: string[] = [];

  if (getNestedString(objectValue(record.reportMetadata), 'projectNumber')) {
    sections.push('Report metadata');
  }
  if (getNestedString(objectValue(record.investigationBasis), 'purposeScope')) {
    sections.push('Investigation basis');
  }
  if (arrayValue(objectValue(record.groundModel).boreholes).length > 0) {
    sections.push('Ground model');
  }
  if (countNestedFindings(record, ['groundwater', 'observedConditions']) > 0) {
    sections.push('Groundwater observations');
  }
  if (arrayValue(objectValue(record.shallowFoundationBearingTable).rows).length > 0) {
    sections.push('Shallow foundations');
  }
  if (countNestedFindings(record, ['geotechnicalBasis', 'foundingNotes']) > 0) {
    sections.push('Founding notes');
  }
  if (
    countNestedFindings(record, ['pileConstruction', 'suitableMethods']) > 0 ||
    countNestedFindings(record, ['pileConstruction', 'constructionControls']) > 0
  ) {
    sections.push('Deep foundations / piles');
  }
  if (countNestedFindings(record, ['reportSections', 'siteClassification']) > 0) {
    sections.push('Site classification');
  }
  if (countNestedFindings(record, ['reportSections', 'limitations']) > 0) {
    sections.push('Limitations');
  }
  if (countNestedFindings(record, ['structuralDefaults', 'concreteMentions']) > 0) {
    sections.push('Structural defaults');
  }
  if (countNestedFindings(record, ['loadMentions', 'loadCases']) > 0) {
    sections.push('Load mentions');
  }

  return sections;
}

function countNestedFindings(record: Record<string, unknown>, path: [string, string]) {
  const root = objectValue(record[path[0]]);
  return arrayValue(root[path[1]]).length;
}

function deriveGeneratedPileCount(state: MultiPileState) {
  if (Array.isArray(state.generatedPiles) && state.generatedPiles.length > 0) {
    return state.generatedPiles.length;
  }

  return state.joints
    .filter((joint) => joint.pileTypeId !== MULTI_PILE_UNASSIGNED_PILE_TYPE_ID)
    .reduce((sum, joint) => sum + Math.max(1, joint.supportCount || joint.noOfSupports || 1), 0);
}

function withinUltimateRange(value: number, min: number | null, max: number | null) {
  if (min != null && value < min) {
    return false;
  }
  if (max != null && value > max) {
    return false;
  }
  return true;
}

function pileTypeSizeForOrdering(
  pileType: Pick<
    MultiPilePileTypeDefinition,
    'sizePreset' | 'useCustom' | 'customMm' | 'nominalDiameterMm'
  >,
) {
  if (pileType.useCustom && pileType.customMm > 0) {
    return pileType.customMm;
  }

  const presetSize = Number(pileType.sizePreset);
  if (Number.isFinite(presetSize) && presetSize > 0) {
    return presetSize;
  }
  return pileType.customMm || pileType.nominalDiameterMm || 0;
}

function jointDisplayLabel(joint: Pick<MultiPileJoint, 'id' | 'displayName' | 'jointDisplayName'>) {
  return joint.jointDisplayName || joint.displayName || joint.id;
}

function resolveProjectReferenceLabel(reference: {
  title: string;
  referenceId: string;
  documentNumber: string;
}) {
  return (
    reference.title || reference.referenceId || reference.documentNumber || 'Untitled reference'
  );
}

function compactText(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function uniqueText(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
}

function objectValue(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function arrayValue(raw: unknown) {
  return Array.isArray(raw) ? raw : [];
}

function stringValue(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : '';
}

function stringArrayValue(raw: unknown) {
  return arrayValue(raw)
    .map((value) => stringValue(value))
    .filter((value) => value.length > 0);
}

function getNestedString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberValue(raw: unknown) {
  if (raw == null || raw === '') {
    return null;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumeric(value: number) {
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
