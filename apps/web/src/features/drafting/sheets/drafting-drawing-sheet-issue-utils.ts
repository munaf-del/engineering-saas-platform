import type {
  DraftingDrawingSheetDefinition,
  DraftingDrawingSheetIssue,
  DraftingDrawingSheetIssueObjectSnapshot,
  DraftingDrawingSheetIssueStatus,
  DraftingDrawingSheetIssueUnderlaySnapshot,
  DraftingDrawingSheetTemplateSnapshot,
  DraftingLayer,
  DraftingModel,
  DraftingObject,
  DraftingRevisionBlockMetadata,
  DraftingTitleBlockMetadata,
  DraftingUnderlay,
} from '@eng/shared';
import { adaptGenericTemplateToSharedDefinition } from '@/features/templates/adapters/generic-template-render-model';
import {
  coerceRootSheetTemplateDocument,
  type RootSheetTemplate,
} from '@/features/templates/root-sheet-template-types';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import {
  getDrawingSheetDefinitions,
  getDrawingSheetVisibleObjects,
  getDrawingSheetVisibleUnderlays,
} from './drafting-drawing-sheet-utils';

export type CreateDraftingDrawingSheetIssueSnapshotArgs = {
  id: string;
  issueDate?: string;
  issueNumber: string;
  issuedBy?: string | null;
  notes?: string;
  purpose: string;
  revision: string;
  rootTemplatesById?: ReadonlyMap<string, RootSheetTemplate>;
  sheetIds?: string[];
  status?: DraftingDrawingSheetIssueStatus;
};

export type DraftingDrawingSheetIssueComparison = {
  hasDrift: boolean;
  titleRevision: {
    hasDrift: boolean;
    messages: string[];
  };
  sheets: Array<{
    hasDrift: boolean;
    issuedSheetId: string;
    issuedSheetLabel: string;
    layerFilterChanged: boolean;
    messages: string[];
    templateChanged: boolean;
    viewport: {
      centerChanged: boolean;
      fitModeChanged: boolean;
      rotationChanged: boolean;
      scaleChanged: boolean;
    };
  }>;
  objects: {
    added: string[];
    changed: string[];
    removed: string[];
  };
  underlays: {
    added: string[];
    changed: string[];
    removed: string[];
  };
  limitations: string[];
};

export type DraftingDrawingSheetIssueManifest = {
  comparison: DraftingDrawingSheetIssueComparison;
  issue: Pick<
    DraftingDrawingSheetIssue,
    | 'createdAt'
    | 'id'
    | 'issueDate'
    | 'issueNumber'
    | 'issuedBy'
    | 'notes'
    | 'purpose'
    | 'revision'
    | 'status'
    | 'updatedAt'
  >;
  lockedDrawingSheets: DraftingDrawingSheetIssue['lockedDrawingSheets'];
  lockedObjects: Array<Omit<DraftingDrawingSheetIssueObjectSnapshot, 'renderedState'>>;
  lockedRevisionBlock: DraftingRevisionBlockMetadata;
  lockedTemplateMetadata: Array<{
    sheetId: string;
    sheetName: string;
    templateSnapshot: DraftingDrawingSheetTemplateSnapshot | null;
  }>;
  lockedTitleBlock: DraftingTitleBlockMetadata;
  lockedUnderlays: DraftingDrawingSheetIssue['lockedUnderlays'];
};

export function getDrawingSheetIssues(model: DraftingModel) {
  return model.drawingSheetIssues ?? [];
}

export function addDrawingSheetIssue(
  model: DraftingModel,
  issue: DraftingDrawingSheetIssue,
): DraftingModel {
  return {
    ...model,
    drawingSheetIssues: [...getDrawingSheetIssues(model), issue],
  };
}

export function createDraftingDrawingSheetIssueSnapshot(
  model: DraftingModel,
  args: CreateDraftingDrawingSheetIssueSnapshotArgs,
): DraftingDrawingSheetIssue {
  const now = args.issueDate ?? new Date().toISOString();
  const sheetIds =
    args.sheetIds && args.sheetIds.length > 0
      ? args.sheetIds
      : getDrawingSheetDefinitions(model).map((sheet) => sheet.id);
  const sheetIdSet = new Set(sheetIds);
  const lockedDrawingSheets = getDrawingSheetDefinitions(model)
    .filter((sheet) => sheetIdSet.has(sheet.id))
    .map((sheet) => cloneDrawingSheetDefinition(sheet, args.rootTemplatesById));
  const lockedObjects = collectLockedObjects(model, lockedDrawingSheets);
  const lockedUnderlays = collectLockedUnderlays(model, lockedDrawingSheets);

  return {
    id: args.id,
    issueNumber: args.issueNumber,
    revision: args.revision,
    issueDate: now,
    ...(args.issuedBy ? { issuedBy: args.issuedBy } : {}),
    purpose: args.purpose,
    status: args.status ?? 'issued',
    ...(args.notes ? { notes: args.notes } : {}),
    sheetIds: lockedDrawingSheets.map((sheet) => sheet.id),
    lockedTitleBlock: clonePlain(model.titleBlock ?? {}),
    lockedRevisionBlock: {
      currentRevision: model.revisionBlock?.currentRevision,
      revisions: (model.revisionBlock?.revisions ?? []).map((row) => ({ ...row })),
    },
    lockedDrawingSheets,
    lockedObjects,
    lockedUnderlays,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildIssuedDrawingModel(
  liveModel: DraftingModel,
  issue: DraftingDrawingSheetIssue,
): DraftingModel {
  return {
    ...liveModel,
    titleBlock: clonePlain(issue.lockedTitleBlock),
    revisionBlock: {
      currentRevision: issue.lockedRevisionBlock.currentRevision,
      revisions: issue.lockedRevisionBlock.revisions.map((row) => ({ ...row })),
    },
    drawingSheets: issue.lockedDrawingSheets.map((sheet) => clonePlain(sheet)),
    objects: issue.lockedObjects
      .map((snapshot) => snapshot.renderedState)
      .filter((object): object is Record<string, unknown> => Boolean(object))
      .map((object) => clonePlain(object) as DraftingObject),
    underlays: issue.lockedUnderlays.map((underlay) => toDraftingUnderlay(underlay, issue)),
  };
}

export function compareDraftingDrawingSheetIssue(
  model: DraftingModel,
  issue: DraftingDrawingSheetIssue,
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate> = new Map(),
): DraftingDrawingSheetIssueComparison {
  const titleRevisionMessages: string[] = [];
  if (!sameJson(model.titleBlock ?? {}, issue.lockedTitleBlock)) {
    titleRevisionMessages.push('Live title block metadata differs from the issued snapshot.');
  }
  if (!sameJson(model.revisionBlock ?? { revisions: [] }, issue.lockedRevisionBlock)) {
    titleRevisionMessages.push('Live revision block metadata differs from the issued snapshot.');
  }

  const liveSheetsById = new Map(
    getDrawingSheetDefinitions(model).map((sheet) => [sheet.id, sheet]),
  );
  const sheets = issue.lockedDrawingSheets.map((lockedSheet) => {
    const liveSheet = liveSheetsById.get(lockedSheet.id) ?? null;
    const messages: string[] = [];
    const viewport = {
      centerChanged: false,
      fitModeChanged: false,
      rotationChanged: false,
      scaleChanged: false,
    };
    let layerFilterChanged = false;
    let templateChanged = false;

    if (!liveSheet) {
      messages.push('Live sheet definition has been removed.');
    } else {
      viewport.centerChanged = !sameJson(liveSheet.viewport.center, lockedSheet.viewport.center);
      viewport.scaleChanged = liveSheet.viewport.scale !== lockedSheet.viewport.scale;
      viewport.rotationChanged =
        (liveSheet.viewport.rotationDeg ?? 0) !== (lockedSheet.viewport.rotationDeg ?? 0);
      viewport.fitModeChanged = liveSheet.viewport.fitMode !== lockedSheet.viewport.fitMode;
      layerFilterChanged = !sameJson(liveSheet.layerFilter ?? {}, lockedSheet.layerFilter ?? {});
      templateChanged = !sameJson(
        resolveDrawingSheetTemplateSnapshot(liveSheet, rootTemplatesById),
        lockedSheet.templateSnapshot ?? null,
      );

      if (
        liveSheet.name !== lockedSheet.name ||
        liveSheet.sheetNumber !== lockedSheet.sheetNumber ||
        liveSheet.pageSize !== lockedSheet.pageSize ||
        liveSheet.orientation !== lockedSheet.orientation ||
        liveSheet.scaleLabel !== lockedSheet.scaleLabel ||
        liveSheet.includeUnderlays !== lockedSheet.includeUnderlays ||
        liveSheet.includeGrid !== lockedSheet.includeGrid ||
        liveSheet.includeObjectLabels !== lockedSheet.includeObjectLabels
      ) {
        messages.push('Live sheet definition metadata differs from the issued snapshot.');
      }
      if (Object.values(viewport).some(Boolean)) {
        messages.push('Live viewport differs from the issued snapshot.');
      }
      if (layerFilterChanged) {
        messages.push('Live layer filter differs from the issued snapshot.');
      }
      if (templateChanged) {
        messages.push(
          'Live template binding or resolved template differs from the issued snapshot.',
        );
      }
    }

    return {
      hasDrift:
        messages.length > 0 ||
        layerFilterChanged ||
        templateChanged ||
        Object.values(viewport).some(Boolean),
      issuedSheetId: lockedSheet.id,
      issuedSheetLabel: `${lockedSheet.sheetNumber} - ${lockedSheet.name}`,
      layerFilterChanged,
      messages,
      templateChanged,
      viewport,
    };
  });

  const objects = compareObjectSnapshots(model, issue);
  const underlays = compareUnderlaySnapshots(model, issue);
  const limitations: string[] = [];
  if (issue.lockedObjects.some((snapshot) => !snapshot.renderedState)) {
    limitations.push('One or more legacy object snapshots did not include full rendered state.');
  }

  const comparison = {
    hasDrift:
      titleRevisionMessages.length > 0 ||
      sheets.some((sheet) => sheet.hasDrift) ||
      objects.added.length > 0 ||
      objects.changed.length > 0 ||
      objects.removed.length > 0 ||
      underlays.added.length > 0 ||
      underlays.changed.length > 0 ||
      underlays.removed.length > 0,
    titleRevision: {
      hasDrift: titleRevisionMessages.length > 0,
      messages: titleRevisionMessages,
    },
    sheets,
    objects,
    underlays,
    limitations,
  };

  return comparison;
}

export function buildDraftingDrawingSheetIssueManifest(args: {
  issue: DraftingDrawingSheetIssue;
  model: DraftingModel;
  rootTemplatesById?: ReadonlyMap<string, RootSheetTemplate>;
}): DraftingDrawingSheetIssueManifest {
  return {
    comparison: compareDraftingDrawingSheetIssue(
      args.model,
      args.issue,
      args.rootTemplatesById ?? new Map(),
    ),
    issue: {
      createdAt: args.issue.createdAt,
      id: args.issue.id,
      issueDate: args.issue.issueDate,
      issueNumber: args.issue.issueNumber,
      issuedBy: args.issue.issuedBy,
      notes: args.issue.notes,
      purpose: args.issue.purpose,
      revision: args.issue.revision,
      status: args.issue.status,
      updatedAt: args.issue.updatedAt,
    },
    lockedDrawingSheets: args.issue.lockedDrawingSheets,
    lockedObjects: args.issue.lockedObjects.map((object) => {
      const snapshot = { ...object };
      delete snapshot.renderedState;
      return snapshot;
    }),
    lockedRevisionBlock: args.issue.lockedRevisionBlock,
    lockedTemplateMetadata: args.issue.lockedDrawingSheets.map((sheet) => ({
      sheetId: sheet.id,
      sheetName: sheet.name,
      templateSnapshot: sheet.templateSnapshot ?? null,
    })),
    lockedTitleBlock: args.issue.lockedTitleBlock,
    lockedUnderlays: args.issue.lockedUnderlays,
  };
}

export function serializeDraftingDrawingSheetIssueManifestJson(
  manifest: DraftingDrawingSheetIssueManifest,
) {
  return JSON.stringify(manifest, null, 2);
}

function collectLockedObjects(
  model: DraftingModel,
  sheets: DraftingDrawingSheetDefinition[],
): DraftingDrawingSheetIssueObjectSnapshot[] {
  const byId = new Map<string, DraftingObject>();
  sheets.forEach((sheet) => {
    getDrawingSheetVisibleObjects(model, sheet).forEach((object) => byId.set(object.id, object));
  });

  return Array.from(byId.values()).map((object) => ({
    objectId: object.id,
    objectType: object.type,
    layerId: object.layerId,
    label: getObjectLabel(object),
    geometrySummary: summarizeGeometry(object),
    scheduleKey: getObjectScheduleKey(object),
    provenance: object.provenance ? { ...object.provenance } : undefined,
    renderedState: clonePlain(object),
  }));
}

function collectLockedUnderlays(
  model: DraftingModel,
  sheets: DraftingDrawingSheetDefinition[],
): DraftingDrawingSheetIssueUnderlaySnapshot[] {
  const byId = new Map<string, DraftingUnderlay>();
  sheets.forEach((sheet) => {
    getDrawingSheetVisibleUnderlays(model, sheet).forEach((underlay) =>
      byId.set(underlay.id, underlay),
    );
  });

  return Array.from(byId.values()).map((underlay) => ({
    underlayId: underlay.id,
    fileId: underlay.fileId,
    fileName: underlay.fileName,
    pageNumber: underlay.pageNumber,
    transform: { ...underlay.transform },
    crop: underlay.crop ? { ...underlay.crop } : null,
    calibration: underlay.calibration ? clonePlain(underlay.calibration) : null,
    visible: underlay.visible,
    opacity: underlay.opacity,
    locked: underlay.locked,
  }));
}

function cloneDrawingSheetDefinition(
  sheet: DraftingDrawingSheetDefinition,
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate> = new Map(),
) {
  return {
    ...clonePlain(sheet),
    templateSnapshot: resolveDrawingSheetTemplateSnapshot(sheet, rootTemplatesById),
  };
}

function resolveDrawingSheetTemplateSnapshot(
  sheet: DraftingDrawingSheetDefinition,
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>,
): DraftingDrawingSheetTemplateSnapshot | undefined {
  const rootSheetTemplateId = sheet.rootSheetTemplateId ?? null;
  if (!rootSheetTemplateId) {
    return {
      label: 'Default drafting drawing sheet',
      rootSheetTemplateId: null,
      source: 'default_layout',
      renderDefinition: {
        orientation: sheet.orientation,
        pageSize: sheet.pageSize,
      },
      templateFingerprint: stableSerialize({
        orientation: sheet.orientation,
        pageSize: sheet.pageSize,
      }),
    };
  }

  const rootTemplate = rootTemplatesById.get(rootSheetTemplateId);
  if (!rootTemplate) {
    return {
      label: 'Default drafting drawing sheet',
      rootSheetTemplateId,
      source: 'missing_template_fallback',
      renderDefinition: {
        orientation: sheet.orientation,
        pageSize: sheet.pageSize,
      },
      templateFingerprint: stableSerialize({
        orientation: sheet.orientation,
        pageSize: sheet.pageSize,
        rootSheetTemplateId,
      }),
    };
  }

  const rootSheetTemplateName = formatOperatorFacingSheetLabel(rootTemplate.label);
  const document = coerceRootSheetTemplateDocument(rootTemplate);
  if (!document || !rootTemplate.currentVersion) {
    return {
      label: 'Default drafting drawing sheet',
      rootSheetTemplateId,
      rootSheetTemplateName,
      source: 'incompatible_template_fallback',
      renderDefinition: {
        orientation: sheet.orientation,
        pageSize: sheet.pageSize,
      },
      templateFingerprint: stableSerialize({
        orientation: sheet.orientation,
        pageSize: sheet.pageSize,
        rootSheetTemplateId,
        rootSheetTemplateName,
      }),
    };
  }

  const renderDefinition = adaptGenericTemplateToSharedDefinition(document);
  return {
    label: rootSheetTemplateName,
    rootSheetTemplateId,
    rootSheetTemplateName,
    rootSheetTemplateVersionId: rootTemplate.currentVersion.id,
    source: 'root_template',
    renderDefinition,
    templateFingerprint: stableSerialize(renderDefinition),
  };
}

function compareObjectSnapshots(model: DraftingModel, issue: DraftingDrawingSheetIssue) {
  const lockedById = new Map(issue.lockedObjects.map((object) => [object.objectId, object]));
  const liveObjects = collectLiveObjectsForIssuedSheets(model, issue);
  const liveById = new Map(liveObjects.map((object) => [object.id, object]));
  const added = liveObjects
    .filter((object) => !lockedById.has(object.id) && object.visible !== false)
    .map((object) => formatObjectDriftLabel(object.id, getObjectLabel(object)));
  const removed = issue.lockedObjects
    .filter((object) => !liveById.has(object.objectId))
    .map((object) => formatObjectDriftLabel(object.objectId, object.label));
  const changed = issue.lockedObjects
    .filter((locked) => {
      const live = liveById.get(locked.objectId);
      return live && locked.renderedState && !sameJson(live, locked.renderedState);
    })
    .map((object) => formatObjectDriftLabel(object.objectId, object.label));

  return { added, changed, removed };
}

function compareUnderlaySnapshots(model: DraftingModel, issue: DraftingDrawingSheetIssue) {
  const lockedById = new Map(
    issue.lockedUnderlays.map((underlay) => [underlay.underlayId, underlay]),
  );
  const liveUnderlays = collectLiveUnderlaysForIssuedSheets(model, issue);
  const liveById = new Map(liveUnderlays.map((underlay) => [underlay.id, underlay]));
  const added = liveUnderlays
    .filter((underlay) => underlay.visible && !lockedById.has(underlay.id))
    .map((underlay) => underlay.fileName);
  const removed = issue.lockedUnderlays
    .filter((underlay) => !liveById.has(underlay.underlayId))
    .map((underlay) => underlay.fileName);
  const changed = issue.lockedUnderlays
    .filter((locked) => {
      const live = liveById.get(locked.underlayId);
      return live && !sameJson(toComparableUnderlay(live), locked);
    })
    .map((underlay) => underlay.fileName);

  return { added, changed, removed };
}

function collectLiveObjectsForIssuedSheets(
  model: DraftingModel,
  issue: DraftingDrawingSheetIssue,
): DraftingObject[] {
  const liveSheetsById = new Map(
    getDrawingSheetDefinitions(model).map((sheet) => [sheet.id, sheet]),
  );
  const byId = new Map<string, DraftingObject>();
  issue.lockedDrawingSheets.forEach((lockedSheet) => {
    const liveSheet = liveSheetsById.get(lockedSheet.id) ?? lockedSheet;
    getDrawingSheetVisibleObjects(model, liveSheet).forEach((object) =>
      byId.set(object.id, object),
    );
  });
  return Array.from(byId.values());
}

function collectLiveUnderlaysForIssuedSheets(
  model: DraftingModel,
  issue: DraftingDrawingSheetIssue,
): DraftingUnderlay[] {
  const liveSheetsById = new Map(
    getDrawingSheetDefinitions(model).map((sheet) => [sheet.id, sheet]),
  );
  const byId = new Map<string, DraftingUnderlay>();
  issue.lockedDrawingSheets.forEach((lockedSheet) => {
    const liveSheet = liveSheetsById.get(lockedSheet.id) ?? lockedSheet;
    getDrawingSheetVisibleUnderlays(model, liveSheet).forEach((underlay) =>
      byId.set(underlay.id, underlay),
    );
  });
  return Array.from(byId.values());
}

function toComparableUnderlay(
  underlay: DraftingUnderlay,
): DraftingDrawingSheetIssueUnderlaySnapshot {
  return {
    underlayId: underlay.id,
    fileId: underlay.fileId,
    fileName: underlay.fileName,
    pageNumber: underlay.pageNumber,
    transform: underlay.transform,
    crop: underlay.crop ?? null,
    calibration: underlay.calibration ?? null,
    visible: underlay.visible,
    opacity: underlay.opacity,
    locked: underlay.locked,
  };
}

function toDraftingUnderlay(
  underlay: DraftingDrawingSheetIssueUnderlaySnapshot,
  issue: DraftingDrawingSheetIssue,
): DraftingUnderlay {
  return {
    id: underlay.underlayId,
    name: underlay.fileName,
    fileId: underlay.fileId,
    fileName: underlay.fileName,
    pageNumber: underlay.pageNumber,
    visible: underlay.visible,
    opacity: underlay.opacity,
    locked: underlay.locked,
    transform: { ...underlay.transform },
    crop: underlay.crop ? { ...underlay.crop } : null,
    calibration: underlay.calibration ? clonePlain(underlay.calibration) : null,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

export function buildIssuedDrawingLayers(liveLayers: DraftingLayer[]): DraftingLayer[] {
  return liveLayers.map((layer) => ({ ...layer }));
}

function getObjectLabel(object: DraftingObject): string | undefined {
  if (object.name) {
    return object.name;
  }
  const metadata = object.metadata as Record<string, unknown> | undefined;
  const parameters = 'parameters' in object ? (object.parameters as Record<string, unknown>) : {};
  const candidate =
    metadata?.pileId ??
    metadata?.pointId ??
    metadata?.text ??
    parameters?.anchorId ??
    parameters?.beamId ??
    parameters?.walerId ??
    parameters?.sectionLabel ??
    parameters?.boreholeId ??
    parameters?.serviceId ??
    parameters?.crossingId;
  return typeof candidate === 'string' ? candidate : undefined;
}

function getObjectScheduleKey(object: DraftingObject): string | undefined {
  const label = getObjectLabel(object);
  return label ? `${object.type}:${label}` : `${object.type}:${object.id}`;
}

function summarizeGeometry(object: DraftingObject): string {
  return stableSerialize('geometry' in object ? object.geometry : {});
}

function formatObjectDriftLabel(objectId: string, label: string | undefined) {
  return label ? `${label} (${objectId})` : objectId;
}

function sameJson(left: unknown, right: unknown) {
  return stableSerialize(left) === stableSerialize(right);
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
