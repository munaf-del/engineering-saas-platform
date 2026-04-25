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
  { key: 'sourceType', label: 'Source Type' },
  { key: 'sourceId', label: 'Source ID' },
  { key: 'serviceOrCrossingId', label: 'Service / Crossing ID' },
  { key: 'serviceType', label: 'Service Type' },
  { key: 'status', label: 'Status' },
  { key: 'authority', label: 'Authority' },
  { key: 'depth', label: 'Depth' },
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
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      serviceOrCrossingId: object.parameters.serviceId || object.id,
      serviceType: formatOptionalText(object.parameters.serviceType),
      status: formatOptionalText(object.parameters.status),
      authority: formatOptionalText(object.parameters.authority),
      depth: formatMetres(object.parameters.depthM),
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
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      serviceOrCrossingId: object.parameters.crossingId || object.id,
      serviceType: formatOptionalText(object.parameters.serviceType),
      status: '',
      authority: '',
      depth: '',
      diameter: '',
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
