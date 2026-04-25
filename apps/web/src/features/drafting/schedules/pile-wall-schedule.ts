import type { DraftingModel, DraftingObject } from '@eng/shared';
import type { DraftingScheduleColumn, DraftingScheduleRow } from './drafting-schedule-types';
import {
  formatMm,
  formatOptionalText,
  formatRl,
  formatScheduleNotes,
  getDraftingScheduleObjects,
} from './drafting-schedule-format';

export const SHORING_PILE_SCHEDULE_COLUMNS = [
  { key: 'objectType', label: 'Object Type' },
  { key: 'sourceType', label: 'Source Type' },
  { key: 'sourceId', label: 'Source ID' },
  { key: 'idOrWallId', label: 'ID / Wall ID' },
  { key: 'pileCount', label: 'Pile Count' },
  { key: 'diameterOrSection', label: 'Diameter / Section' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'overlapOrPattern', label: 'Overlap / Pattern' },
  { key: 'constructionMethod', label: 'Construction Method' },
  { key: 'notes', label: 'Notes' },
] as const satisfies readonly DraftingScheduleColumn[];

export function buildShoringPileScheduleRows(model: DraftingModel): DraftingScheduleRow[] {
  return getDraftingScheduleObjects(model).flatMap((object) => {
    switch (object.type) {
      case 'pile':
        return [buildPileRow(object)];
      case 'secant_pile_wall':
        return [buildSecantPileWallRow(object)];
      case 'soldier_pile_wall':
        return [buildSoldierPileWallRow(object)];
      case 'excavation_line':
        return [buildExcavationLineRow(object)];
      default:
        return [];
    }
  });
}

function buildPileRow(object: Extract<DraftingObject, { type: 'pile' }>): DraftingScheduleRow {
  return {
    id: object.metadata.pileId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'pile',
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      idOrWallId: object.metadata.pileId || object.id,
      pileCount: '1',
      diameterOrSection: formatMm(object.geometry.diameterMm),
      spacing: '',
      overlapOrPattern: '',
      constructionMethod: formatOptionalText(object.metadata.pileType),
      notes: formatScheduleNotes([
        object.metadata.material,
        formatRl(object.metadata.cutOffLevel, 'cut-off'),
        formatRl(object.metadata.toeLevel, 'toe'),
        object.metadata.notes,
      ]),
    },
  };
}

function buildSecantPileWallRow(
  object: Extract<DraftingObject, { type: 'secant_pile_wall' }>,
): DraftingScheduleRow {
  return {
    id: object.metadata.wallId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'secant pile wall',
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      idOrWallId: object.metadata.wallId || object.id,
      pileCount: String(object.metadata.pileCount),
      diameterOrSection: formatMm(object.parameters.pileDiameterMm),
      spacing: formatMm(object.parameters.spacingMm),
      overlapOrPattern: formatScheduleNotes([
        formatMm(object.parameters.overlapMm),
        object.parameters.secantType,
        object.parameters.primarySecondaryPattern,
      ]),
      constructionMethod: formatOptionalText(object.metadata.constructionMethod),
      notes: formatOptionalText(object.metadata.designNotes),
    },
  };
}

function buildSoldierPileWallRow(
  object: Extract<DraftingObject, { type: 'soldier_pile_wall' }>,
): DraftingScheduleRow {
  return {
    id: object.metadata.wallId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'soldier pile wall',
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      idOrWallId: object.metadata.wallId || object.id,
      pileCount: String(object.metadata.pileCount),
      diameterOrSection: formatScheduleNotes([
        formatMm(object.parameters.pileDiameterMm),
        object.parameters.sectionLabel,
      ]),
      spacing: formatMm(object.parameters.spacingMm),
      overlapOrPattern: '',
      constructionMethod: formatOptionalText(object.metadata.constructionMethod),
      notes: formatScheduleNotes([object.parameters.laggingType, object.parameters.embedmentNote]),
    },
  };
}

function buildExcavationLineRow(
  object: Extract<DraftingObject, { type: 'excavation_line' }>,
): DraftingScheduleRow {
  return {
    id: object.metadata.excavationId || object.id,
    sourceObjectId: object.id,
    objectType: object.type,
    cells: {
      objectType: 'excavation line',
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      idOrWallId: object.metadata.excavationId || object.id,
      pileCount: '',
      diameterOrSection: '',
      spacing: '',
      overlapOrPattern: '',
      constructionMethod: 'excavation line',
      notes: formatScheduleNotes([
        object.metadata.stage,
        formatRl(object.metadata.designLevel, 'design level'),
        object.metadata.notes,
      ]),
    },
  };
}
