import type { DraftingModel, DraftingObject } from '@eng/shared';
import type { DraftingScheduleColumn, DraftingScheduleRow } from './drafting-schedule-types';
import {
  formatLinkedRefs,
  formatMetres,
  formatMm,
  formatOptionalText,
  getDraftingScheduleObjects,
} from './drafting-schedule-format';

export const SERVICE_SCHEDULE_COLUMNS = [
  { key: 'objectType', label: 'Object Type' },
  { key: 'sourceKind', label: 'Source Kind' },
  { key: 'sourceType', label: 'Source Type' },
  { key: 'sourceId', label: 'Source ID' },
  { key: 'sourceLabel', label: 'Source Label' },
  { key: 'originModule', label: 'Origin Module' },
  { key: 'sourceStatus', label: 'Source Status' },
  { key: 'sourceCompleteness', label: 'Source Completeness' },
  { key: 'serviceOrCrossingId', label: 'Service / Crossing ID' },
  { key: 'serviceType', label: 'Service Type' },
  { key: 'status', label: 'Status' },
  { key: 'authority', label: 'Authority' },
  { key: 'material', label: 'Material' },
  { key: 'depth', label: 'Depth' },
  { key: 'level', label: 'Level RL' },
  { key: 'diameter', label: 'Diameter' },
  { key: 'conflictType', label: 'Conflict Type' },
  { key: 'clearance', label: 'Clearance' },
  { key: 'riskStatus', label: 'Risk Status' },
  { key: 'linkedObjectRefs', label: 'Linked Object Refs' },
  { key: 'notes', label: 'Notes' },
] as const satisfies readonly DraftingScheduleColumn[];

export function buildServiceScheduleRows(model: DraftingModel): DraftingScheduleRow[] {
  return getDraftingScheduleObjects(model).flatMap((object) => {
    switch (object.type) {
      case 'service_run':
        return [buildServiceRunRow(object)];
      case 'service_crossing':
        return [buildServiceCrossingRow(object)];
      default:
        return [];
    }
  });
}

function buildServiceRunRow(
  object: Extract<DraftingObject, { type: 'service_run' }>,
): DraftingScheduleRow {
  return {
    id: object.parameters.serviceId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'service run',
      ...buildServiceSourceCells(object),
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      sourceLabel: object.sourceRef?.sourceLabel ?? '',
      serviceOrCrossingId: object.parameters.serviceId || object.id,
      serviceType: formatOptionalText(object.parameters.serviceType),
      status: formatOptionalText(object.parameters.status),
      authority: formatOptionalText(
        object.parameters.authority ?? serviceSnapshotText(object, 'authority'),
      ),
      material: formatOptionalText(serviceSnapshotText(object, 'material')),
      depth: formatMetres(object.parameters.depthM),
      level: formatMetres(object.parameters.levelRl),
      diameter: formatMm(object.parameters.diameterMm),
      conflictType: '',
      clearance: '',
      riskStatus: '',
      linkedObjectRefs: formatOptionalText(object.metadata.sourceReference),
      notes: formatOptionalText(object.metadata.notes),
    },
  };
}

function buildServiceCrossingRow(
  object: Extract<DraftingObject, { type: 'service_crossing' }>,
): DraftingScheduleRow {
  return {
    id: object.parameters.crossingId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'service crossing',
      ...buildServiceSourceCells(object),
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      sourceLabel: object.sourceRef?.sourceLabel ?? '',
      serviceOrCrossingId: object.parameters.crossingId || object.id,
      serviceType: formatOptionalText(object.parameters.serviceType),
      status: formatOptionalText(serviceSnapshotText(object, 'status')),
      authority: formatOptionalText(serviceSnapshotText(object, 'authority')),
      material: formatOptionalText(serviceSnapshotText(object, 'material')),
      depth: formatMetres(serviceSnapshotNumber(object, 'depthM')),
      level: formatMetres(serviceSnapshotNumber(object, 'levelRL')),
      diameter: formatMm(serviceSnapshotNumber(object, 'diameterMm')),
      conflictType: formatOptionalText(object.parameters.conflictType),
      clearance: formatMm(object.parameters.clearanceMm),
      riskStatus: formatOptionalText(object.parameters.riskStatus),
      linkedObjectRefs: formatLinkedRefs([
        object.metadata.linkedServiceRunId,
        object.metadata.linkedObjectId,
      ]),
      notes: formatOptionalText(object.metadata.notes),
    },
  };
}

function buildServiceSourceCells(
  object: Extract<DraftingObject, { type: 'service_run' | 'service_crossing' }>,
) {
  const sourceType = object.sourceRef?.sourceType ?? 'manual';
  const sourceStatus = object.sourceRef?.status ?? (sourceType === 'manual' ? 'manual' : '');
  return {
    sourceKind: sourceType === 'manual' ? 'sketch / unlinked' : 'project service source',
    originModule: sourceSnapshotText(object, 'originModule'),
    sourceStatus,
    sourceCompleteness: sourceSnapshotText(object, 'completeness'),
  };
}

function sourceSnapshotText(object: DraftingObject, key: string) {
  const value = object.sourceRef?.snapshot?.[key];
  return typeof value === 'string' ? value : '';
}

function serviceSnapshotRecord(object: DraftingObject) {
  const service = object.sourceRef?.snapshot?.service;
  return service && typeof service === 'object' && !Array.isArray(service)
    ? (service as Record<string, unknown>)
    : {};
}

function serviceSnapshotText(object: DraftingObject, key: string) {
  const value = serviceSnapshotRecord(object)[key];
  return typeof value === 'string' ? value : '';
}

function serviceSnapshotNumber(object: DraftingObject, key: string) {
  const value = serviceSnapshotRecord(object)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
