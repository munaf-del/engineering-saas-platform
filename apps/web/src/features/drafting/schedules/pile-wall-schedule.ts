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
  { key: 'sourceKind', label: 'Source Kind' },
  { key: 'sourceType', label: 'Source Type' },
  { key: 'sourceId', label: 'Source ID' },
  { key: 'sourceStatus', label: 'Source Status' },
  { key: 'idOrWallId', label: 'ID / Wall ID' },
  { key: 'pileTypeCode', label: 'Pile Type / Code' },
  { key: 'pileCount', label: 'Pile Count' },
  { key: 'diameterOrSection', label: 'Diameter / Section' },
  { key: 'concreteGrade', label: 'Concrete Grade' },
  { key: 'founding', label: 'Socket / Founding' },
  { key: 'designLoads', label: 'Design Loads' },
  { key: 'coordinates', label: 'Coordinates' },
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
      sourceKind: formatPileSourceKind(object),
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      sourceStatus:
        object.sourceRef?.status ?? (object.sourceRef?.sourceType ? 'snapshot' : 'manual'),
      idOrWallId: object.metadata.pileId || object.id,
      pileTypeCode: formatOptionalText(object.metadata.pileTypeCode ?? object.metadata.pileType),
      pileCount: '1',
      diameterOrSection: formatMm(object.geometry.diameterMm),
      concreteGrade: formatOptionalText(object.metadata.concreteGrade),
      founding: formatScheduleNotes([
        object.metadata.socketLengthM !== undefined
          ? `socket ${object.metadata.socketLengthM} m`
          : undefined,
        object.metadata.foundingStratum,
        object.metadata.foundingNote,
      ]),
      designLoads: formatScheduleNotes([
        object.metadata.designCompressionKn !== undefined
          ? `C ${object.metadata.designCompressionKn} kN`
          : undefined,
        object.metadata.designTensionKn !== undefined
          ? `T ${object.metadata.designTensionKn} kN`
          : undefined,
        object.metadata.designLateralKn !== undefined
          ? `L ${object.metadata.designLateralKn} kN`
          : undefined,
      ]),
      coordinates: formatPileCoordinates(object),
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
      sourceKind: object.sourceRef?.sourceType === 'manual' ? 'manual' : 'linked',
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      sourceStatus: object.sourceRef?.status ?? '',
      idOrWallId: object.metadata.wallId || object.id,
      pileTypeCode: '',
      pileCount: String(object.metadata.pileCount),
      diameterOrSection: formatMm(object.parameters.pileDiameterMm),
      concreteGrade: '',
      founding: '',
      designLoads: '',
      coordinates: '',
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
      sourceKind: object.sourceRef?.sourceType === 'manual' ? 'manual' : 'linked',
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      sourceStatus: object.sourceRef?.status ?? '',
      idOrWallId: object.metadata.wallId || object.id,
      pileTypeCode: '',
      pileCount: String(object.metadata.pileCount),
      diameterOrSection: formatScheduleNotes([
        formatMm(object.parameters.pileDiameterMm),
        object.parameters.sectionLabel,
      ]),
      concreteGrade: '',
      founding: '',
      designLoads: '',
      coordinates: '',
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
      sourceKind: object.sourceRef?.sourceType === 'manual' ? 'manual' : 'linked',
      sourceType: object.sourceRef?.sourceType ?? 'manual',
      sourceId: object.sourceRef?.sourceId ?? '',
      sourceStatus: object.sourceRef?.status ?? '',
      idOrWallId: object.metadata.excavationId || object.id,
      pileTypeCode: '',
      pileCount: '',
      diameterOrSection: '',
      concreteGrade: '',
      founding: '',
      designLoads: '',
      coordinates: '',
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

function formatPileSourceKind(object: Extract<DraftingObject, { type: 'pile' }>) {
  if (object.sourceRef?.sourceType === 'foundation_pile_type') {
    return 'pile type';
  }
  if (object.sourceRef?.sourceType === 'foundation_pile') {
    return 'pile instance';
  }
  return 'manual sketch';
}

function formatPileCoordinates(object: Extract<DraftingObject, { type: 'pile' }>) {
  const centre = object.geometry.centre as typeof object.geometry.centre & { z?: number };
  return `X ${centre.x}, Y ${centre.y}${centre.z !== undefined ? `, Z ${centre.z}` : ''}`;
}
