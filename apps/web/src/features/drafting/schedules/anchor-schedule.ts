import type { DraftingModel, DraftingObject } from '@eng/shared';
import type { DraftingScheduleColumn, DraftingScheduleRow } from './drafting-schedule-types';
import {
  formatDegrees,
  formatKn,
  formatMm,
  formatOptionalText,
  getDraftingScheduleObjects,
} from './drafting-schedule-format';

export const ANCHOR_SCHEDULE_COLUMNS = [
  { key: 'anchorId', label: 'Anchor ID' },
  { key: 'associatedWallId', label: 'Associated Wall ID' },
  { key: 'angle', label: 'Angle' },
  { key: 'planLength', label: 'Plan Length' },
  { key: 'freeLength', label: 'Free Length' },
  { key: 'bondLength', label: 'Bond Length' },
  { key: 'designLoad', label: 'Design Load' },
  { key: 'lockOffLoad', label: 'Lock-off Load' },
  { key: 'stage', label: 'Stage' },
] as const satisfies readonly DraftingScheduleColumn[];

export function buildAnchorScheduleRows(model: DraftingModel): DraftingScheduleRow[] {
  return getDraftingScheduleObjects(model).flatMap((object) =>
    object.type === 'anchor_tieback' ? [buildAnchorRow(object)] : [],
  );
}

function buildAnchorRow(
  object: Extract<DraftingObject, { type: 'anchor_tieback' }>,
): DraftingScheduleRow {
  return {
    id: object.parameters.anchorId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      anchorId: object.parameters.anchorId || object.id,
      associatedWallId: formatOptionalText(object.metadata.associatedWallId),
      angle: formatDegrees(object.parameters.angleDeg),
      planLength: formatMm(object.parameters.planLengthMm),
      freeLength: formatMm(object.parameters.freeLengthMm),
      bondLength: formatMm(object.parameters.bondLengthMm),
      designLoad: formatKn(object.parameters.designLoadKn),
      lockOffLoad: formatKn(object.parameters.lockOffLoadKn),
      stage: formatOptionalText(object.parameters.stage || object.metadata.installationStage),
    },
  };
}
