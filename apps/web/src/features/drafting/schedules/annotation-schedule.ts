import type { DraftingModel, DraftingObject } from '@eng/shared';
import {
  calculateDimensionChainSegments,
  calculateDimensionChainTotal,
  formatDimensionDistance,
} from '../semantic-object-utils';
import type { DraftingScheduleColumn, DraftingScheduleRow } from './drafting-schedule-types';
import {
  formatLinkedRefs,
  formatOptionalText,
  formatScheduleNotes,
  getDraftingScheduleObjects,
} from './drafting-schedule-format';

export const ANNOTATION_SCHEDULE_COLUMNS = [
  { key: 'objectType', label: 'Object Type' },
  { key: 'id', label: 'ID' },
  { key: 'label', label: 'Label' },
  { key: 'titleOrText', label: 'Title / Text' },
  { key: 'linkedDrawingOrSheet', label: 'Linked Drawing / Sheet' },
  { key: 'linkedObjectRefs', label: 'Linked Object Refs' },
  { key: 'notes', label: 'Notes' },
] as const satisfies readonly DraftingScheduleColumn[];

export function buildAnnotationScheduleRows(model: DraftingModel): DraftingScheduleRow[] {
  return getDraftingScheduleObjects(model).flatMap((object) => {
    switch (object.type) {
      case 'section_marker':
        return [buildSectionMarkerRow(object)];
      case 'callout':
        return [buildCalloutRow(object)];
      case 'dimension_chain':
        return [buildDimensionChainRow(object)];
      case 'leader_note':
        return [buildLeaderNoteRow(object)];
      case 'monitoring_point':
        return [buildMonitoringPointRow(object)];
      default:
        return [];
    }
  });
}

function buildSectionMarkerRow(
  object: Extract<DraftingObject, { type: 'section_marker' }>,
): DraftingScheduleRow {
  return {
    id: object.parameters.sectionId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'section marker',
      id: object.parameters.sectionId || object.id,
      label: formatOptionalText(object.parameters.sectionLabel),
      titleOrText: formatOptionalText(object.parameters.arrowDirection),
      linkedDrawingOrSheet: formatLinkedRefs([
        object.parameters.sheetReference,
        object.metadata.linkedDrawingId,
      ]),
      linkedObjectRefs: '',
      notes: formatOptionalText(object.metadata.notes),
    },
  };
}

function buildCalloutRow(object: Extract<DraftingObject, { type: 'callout' }>): DraftingScheduleRow {
  return {
    id: object.parameters.calloutId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'callout',
      id: object.parameters.calloutId || object.id,
      label: formatOptionalText(object.parameters.title),
      titleOrText: formatOptionalText(object.parameters.body),
      linkedDrawingOrSheet: '',
      linkedObjectRefs: formatOptionalText(object.metadata.associatedObjectId),
      notes: formatOptionalText(object.metadata.notes),
    },
  };
}

function buildDimensionChainRow(
  object: Extract<DraftingObject, { type: 'dimension_chain' }>,
): DraftingScheduleRow {
  const total = calculateDimensionChainTotal(object.geometry.points);
  const segments = calculateDimensionChainSegments(object.geometry.points)
    .map((segment) => formatDimensionDistance(segment, object.parameters.unit, object.parameters.precision))
    .join(' / ');

  return {
    id: object.parameters.dimensionId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'dimension chain',
      id: object.parameters.dimensionId || object.id,
      label: formatOptionalText(object.name),
      titleOrText:
        formatOptionalText(object.parameters.textOverride) ||
        formatScheduleNotes([
          object.parameters.showTotal
            ? `total ${formatDimensionDistance(
                total,
                object.parameters.unit,
                object.parameters.precision,
              )}`
            : '',
          object.parameters.showSegments ? `segments ${segments}` : '',
        ]),
      linkedDrawingOrSheet: '',
      linkedObjectRefs: formatLinkedRefs(object.metadata.associatedObjectIds ?? []),
      notes: formatOptionalText(object.metadata.notes),
    },
  };
}

function buildLeaderNoteRow(
  object: Extract<DraftingObject, { type: 'leader_note' }>,
): DraftingScheduleRow {
  return {
    id: object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'leader note',
      id: object.id,
      label: formatOptionalText(object.name),
      titleOrText: formatOptionalText(object.metadata.text),
      linkedDrawingOrSheet: '',
      linkedObjectRefs: '',
      notes: '',
    },
  };
}

function buildMonitoringPointRow(
  object: Extract<DraftingObject, { type: 'monitoring_point' }>,
): DraftingScheduleRow {
  return {
    id: object.metadata.pointId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'monitoring point',
      id: object.metadata.pointId || object.id,
      label: formatOptionalText(object.metadata.monitoringType),
      titleOrText: formatScheduleNotes([
        object.metadata.triggerLevel === undefined ? '' : `trigger ${object.metadata.triggerLevel}`,
        object.metadata.actionLevel === undefined ? '' : `action ${object.metadata.actionLevel}`,
        object.metadata.units,
      ]),
      linkedDrawingOrSheet: '',
      linkedObjectRefs: '',
      notes: formatOptionalText(object.metadata.notes),
    },
  };
}
