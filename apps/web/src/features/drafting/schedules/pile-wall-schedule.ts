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
  { key: 'sourceLabel', label: 'Source Label / Code' },
  { key: 'sourceStatus', label: 'Source Status' },
  { key: 'sourceCompleteness', label: 'Source Completeness' },
  { key: 'manualSketch', label: 'Manual / Sketch' },
  { key: 'idOrWallId', label: 'ID / Wall ID' },
  { key: 'pileMark', label: 'Pile Mark' },
  { key: 'pileTypeCode', label: 'Pile Type / Code' },
  { key: 'pileSystem', label: 'Pile System / Type' },
  { key: 'pileCount', label: 'Pile Count' },
  { key: 'diameterOrSection', label: 'Diameter / Section' },
  { key: 'diameterMm', label: 'Diameter (mm)' },
  { key: 'concreteGrade', label: 'Concrete Grade' },
  { key: 'socketLength', label: 'Socket Length' },
  { key: 'foundingStratum', label: 'Founding Stratum' },
  { key: 'foundingNote', label: 'Founding Note' },
  { key: 'founding', label: 'Socket / Founding' },
  { key: 'designCompressionKn', label: 'Design Compression (kN)' },
  { key: 'designTensionKn', label: 'Design Tension (kN)' },
  { key: 'designLateralKn', label: 'Design Lateral (kN)' },
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
      sourceLabel: object.sourceRef?.sourceLabel ?? '',
      sourceStatus:
        object.sourceRef?.status ?? (object.sourceRef?.sourceType ? 'snapshot' : 'manual'),
      sourceCompleteness: object.metadata.sourceCompleteness?.replaceAll('_', ' ') ?? '',
      manualSketch: isManualSketch(object) ? 'yes' : 'no',
      idOrWallId: object.metadata.pileId || object.id,
      pileMark: object.metadata.pileId || object.id,
      pileTypeCode: formatOptionalText(object.metadata.pileTypeCode ?? object.metadata.pileType),
      pileSystem: formatOptionalText(object.metadata.pileSystem ?? object.metadata.pileType),
      pileCount: '1',
      diameterOrSection: formatMm(object.geometry.diameterMm),
      diameterMm: String(object.geometry.diameterMm),
      concreteGrade: formatOptionalText(object.metadata.concreteGrade),
      socketLength:
        object.metadata.socketLengthM !== undefined ? `${object.metadata.socketLengthM} m` : '',
      foundingStratum: formatOptionalText(object.metadata.foundingStratum),
      foundingNote: formatOptionalText(object.metadata.foundingNote),
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
      designCompressionKn:
        object.metadata.designCompressionKn !== undefined
          ? String(object.metadata.designCompressionKn)
          : '',
      designTensionKn:
        object.metadata.designTensionKn !== undefined
          ? String(object.metadata.designTensionKn)
          : '',
      designLateralKn:
        object.metadata.designLateralKn !== undefined
          ? String(object.metadata.designLateralKn)
          : '',
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
      sourceLabel: object.sourceRef?.sourceLabel ?? '',
      sourceStatus: object.sourceRef?.status ?? '',
      sourceCompleteness: '',
      manualSketch: isManualSketch(object) ? 'yes' : 'no',
      idOrWallId: object.metadata.wallId || object.id,
      pileMark: '',
      pileTypeCode: '',
      pileSystem: '',
      pileCount: String(object.metadata.pileCount),
      diameterOrSection: formatMm(object.parameters.pileDiameterMm),
      diameterMm: String(object.parameters.pileDiameterMm),
      concreteGrade: '',
      socketLength: '',
      foundingStratum: '',
      foundingNote: '',
      founding: '',
      designCompressionKn: '',
      designTensionKn: '',
      designLateralKn: '',
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
      sourceLabel: object.sourceRef?.sourceLabel ?? '',
      sourceStatus: object.sourceRef?.status ?? '',
      sourceCompleteness: '',
      manualSketch: isManualSketch(object) ? 'yes' : 'no',
      idOrWallId: object.metadata.wallId || object.id,
      pileMark: '',
      pileTypeCode: '',
      pileSystem: '',
      pileCount: String(object.metadata.pileCount),
      diameterOrSection: formatScheduleNotes([
        formatMm(object.parameters.pileDiameterMm),
        object.parameters.sectionLabel,
      ]),
      diameterMm: String(object.parameters.pileDiameterMm),
      concreteGrade: '',
      socketLength: '',
      foundingStratum: '',
      foundingNote: '',
      founding: '',
      designCompressionKn: '',
      designTensionKn: '',
      designLateralKn: '',
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
      sourceLabel: object.sourceRef?.sourceLabel ?? '',
      sourceStatus: object.sourceRef?.status ?? '',
      sourceCompleteness: '',
      manualSketch: isManualSketch(object) ? 'yes' : 'no',
      idOrWallId: object.metadata.excavationId || object.id,
      pileMark: '',
      pileTypeCode: '',
      pileSystem: '',
      pileCount: '',
      diameterOrSection: '',
      diameterMm: '',
      concreteGrade: '',
      socketLength: '',
      foundingStratum: '',
      foundingNote: '',
      founding: '',
      designCompressionKn: '',
      designTensionKn: '',
      designLateralKn: '',
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
    return 'pile type library';
  }
  if (object.sourceRef?.sourceType === 'foundation_pile') {
    return 'existing placed pile';
  }
  return 'manual sketch';
}

function isManualSketch(object: DraftingObject) {
  return !object.sourceRef || object.sourceRef.sourceType === 'manual';
}

function formatPileCoordinates(object: Extract<DraftingObject, { type: 'pile' }>) {
  const centre = object.geometry.centre as typeof object.geometry.centre & { z?: number };
  return `X ${centre.x}, Y ${centre.y}${centre.z !== undefined ? `, Z ${centre.z}` : ''}`;
}
