import type { DraftingModel, DraftingObject } from '@eng/shared';
import type { DraftingScheduleColumn, DraftingScheduleRow } from './drafting-schedule-types';
import {
  formatMm,
  formatOptionalText,
  formatRl,
  formatScheduleNotes,
  getDraftingScheduleObjects,
} from './drafting-schedule-format';

export const BEAM_WALER_SCHEDULE_COLUMNS = [
  { key: 'objectType', label: 'Object Type' },
  { key: 'beamOrWalerId', label: 'Beam / Waler ID' },
  { key: 'associatedWallId', label: 'Associated Wall ID' },
  { key: 'width', label: 'Width' },
  { key: 'depth', label: 'Depth' },
  { key: 'sectionLabel', label: 'Section Label' },
  { key: 'levelRl', label: 'Level RL' },
  { key: 'concreteGrade', label: 'Concrete Grade' },
  { key: 'connectionNotes', label: 'Connection Notes' },
] as const satisfies readonly DraftingScheduleColumn[];

export function buildBeamWalerScheduleRows(model: DraftingModel): DraftingScheduleRow[] {
  return getDraftingScheduleObjects(model).flatMap((object) => {
    switch (object.type) {
      case 'capping_beam':
        return [buildCappingBeamRow(object)];
      case 'waler':
        return [buildWalerRow(object)];
      default:
        return [];
    }
  });
}

function buildCappingBeamRow(
  object: Extract<DraftingObject, { type: 'capping_beam' }>,
): DraftingScheduleRow {
  return {
    id: object.parameters.beamId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'capping beam',
      beamOrWalerId: object.parameters.beamId || object.id,
      associatedWallId: formatOptionalText(object.metadata.associatedWallId),
      width: formatMm(object.parameters.widthMm),
      depth: formatMm(object.parameters.depthMm),
      sectionLabel: '',
      levelRl: formatRl(object.parameters.levelRl),
      concreteGrade: formatOptionalText(object.parameters.concreteGrade),
      connectionNotes: formatOptionalText(object.metadata.notes),
    },
  };
}

function buildWalerRow(object: Extract<DraftingObject, { type: 'waler' }>): DraftingScheduleRow {
  return {
    id: object.parameters.walerId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'waler',
      beamOrWalerId: object.parameters.walerId || object.id,
      associatedWallId: formatOptionalText(object.metadata.associatedWallId),
      width: '',
      depth: '',
      sectionLabel: formatOptionalText(object.parameters.sectionLabel),
      levelRl: formatRl(object.parameters.levelRl),
      concreteGrade: '',
      connectionNotes: formatScheduleNotes([
        object.parameters.connectionNotes,
        object.metadata.notes,
      ]),
    },
  };
}
