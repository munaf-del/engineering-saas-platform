import type { DraftingModel, DraftingObject } from '@eng/shared';
import type { DraftingScheduleColumn, DraftingScheduleRow } from './drafting-schedule-types';
import {
  formatMetres,
  formatOptionalText,
  formatRl,
  getDraftingScheduleObjects,
} from './drafting-schedule-format';

export const BOREHOLE_SCHEDULE_COLUMNS = [
  { key: 'boreholeId', label: 'Borehole ID' },
  { key: 'label', label: 'Label' },
  { key: 'groundRl', label: 'Ground RL' },
  { key: 'terminationDepth', label: 'Termination Depth' },
  { key: 'terminationRl', label: 'Termination RL' },
  { key: 'boreholeType', label: 'Borehole Type' },
  { key: 'linkedGeotechRef', label: 'Linked Geotech Ref' },
] as const satisfies readonly DraftingScheduleColumn[];

export function buildBoreholeScheduleRows(model: DraftingModel): DraftingScheduleRow[] {
  return getDraftingScheduleObjects(model).flatMap((object) =>
    object.type === 'borehole' ? [buildBoreholeRow(object)] : [],
  );
}

function buildBoreholeRow(
  object: Extract<DraftingObject, { type: 'borehole' }>,
): DraftingScheduleRow {
  return {
    id: object.parameters.boreholeId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      boreholeId: object.parameters.boreholeId || object.id,
      label: formatOptionalText(object.parameters.label),
      groundRl: formatRl(object.parameters.groundLevelRl),
      terminationDepth: formatMetres(object.parameters.terminationDepthM),
      terminationRl: formatRl(object.parameters.terminationLevelRl),
      boreholeType: formatOptionalText(object.parameters.boreholeType),
      linkedGeotechRef: formatOptionalText(
        object.metadata.linkedGeotechEntityId || object.metadata.sourceReference,
      ),
    },
  };
}
