import type { DraftingModel, DraftingObject, DraftingObjectProvenance } from '@eng/shared';
import { buildAnchorScheduleRows, ANCHOR_SCHEDULE_COLUMNS } from './anchor-schedule';
import { buildAnnotationScheduleRows, ANNOTATION_SCHEDULE_COLUMNS } from './annotation-schedule';
import { buildBeamWalerScheduleRows, BEAM_WALER_SCHEDULE_COLUMNS } from './beam-waler-schedule';
import { buildBoreholeScheduleRows, BOREHOLE_SCHEDULE_COLUMNS } from './borehole-schedule';
import { buildServiceScheduleRows, SERVICE_SCHEDULE_COLUMNS } from './service-schedule';
import { buildShoringPileScheduleRows, SHORING_PILE_SCHEDULE_COLUMNS } from './pile-wall-schedule';
import type {
  DraftingScheduleGroup,
  DraftingScheduleGroupDefinition,
  DraftingScheduleGroupKey,
  DraftingScheduleSummary,
} from './drafting-schedule-types';

export const DRAFTING_SCHEDULE_GROUP_DEFINITIONS = [
  {
    key: 'shoring_piles',
    title: 'Shoring / Pile Schedule',
    description: 'Pile, wall, and excavation semantic rows.',
    columns: SHORING_PILE_SCHEDULE_COLUMNS,
    buildRows: buildShoringPileScheduleRows,
  },
  {
    key: 'anchors',
    title: 'Anchor Schedule',
    description: 'Anchor tieback setout and load rows.',
    columns: ANCHOR_SCHEDULE_COLUMNS,
    buildRows: buildAnchorScheduleRows,
  },
  {
    key: 'beams_walers',
    title: 'Beam / Waler Schedule',
    description: 'Capping beam and waler coordination rows.',
    columns: BEAM_WALER_SCHEDULE_COLUMNS,
    buildRows: buildBeamWalerScheduleRows,
  },
  {
    key: 'boreholes',
    title: 'Borehole Schedule',
    description: 'Borehole references and geotechnical links.',
    columns: BOREHOLE_SCHEDULE_COLUMNS,
    buildRows: buildBoreholeScheduleRows,
  },
  {
    key: 'services_conflicts',
    title: 'Services / Conflicts Schedule',
    description: 'Service runs and service crossing conflicts.',
    columns: SERVICE_SCHEDULE_COLUMNS,
    buildRows: buildServiceScheduleRows,
  },
  {
    key: 'annotations_references',
    title: 'Annotation / Reference Schedule',
    description: 'Section, callout, dimension, note, and monitoring references.',
    columns: ANNOTATION_SCHEDULE_COLUMNS,
    buildRows: buildAnnotationScheduleRows,
  },
] as const satisfies readonly DraftingScheduleGroupDefinition[];

export function buildDraftingScheduleSummary(model: DraftingModel): DraftingScheduleSummary {
  const objectsById = new Map(model.objects.map((object) => [object.id, object] as const));
  const groups = DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map<DraftingScheduleGroup>((definition) => ({
    key: definition.key,
    title: definition.title,
    description: definition.description,
    columns: definition.columns,
    rows: definition
      .buildRows(model)
      .map((row) => withDraftingScheduleRowProvenance(row, objectsById.get(row.sourceObjectId))),
  }));

  return {
    drawingId: model.drawingId,
    units: model.units,
    groups,
    counts: groups.reduce(
      (counts, group) => ({
        ...counts,
        [group.key]: group.rows.length,
      }),
      {} as Record<DraftingScheduleGroupKey, number>,
    ),
  };
}

function withDraftingScheduleRowProvenance(
  row: DraftingScheduleGroup['rows'][number],
  object: DraftingObject | undefined,
) {
  const provenance = object ? hydrateDraftingObjectProvenance(object) : null;

  return provenance
    ? {
        ...row,
        provenance,
      }
    : row;
}

function hydrateDraftingObjectProvenance(object: DraftingObject): DraftingObjectProvenance {
  return {
    createdAt: object.provenance?.createdAt ?? object.createdAt,
    ...(object.provenance?.createdBy ? { createdBy: object.provenance.createdBy } : {}),
    updatedAt: object.provenance?.updatedAt ?? object.updatedAt,
    ...(object.provenance?.updatedBy ? { updatedBy: object.provenance.updatedBy } : {}),
    lastAction: object.provenance?.lastAction ?? 'unknown',
  };
}

export function getDraftingScheduleGroup(
  summary: DraftingScheduleSummary,
  groupKey: DraftingScheduleGroupKey,
): DraftingScheduleGroup {
  return summary.groups.find((group) => group.key === groupKey) ?? summary.groups[0]!;
}

export function serializeDraftingScheduleGroupCsv(group: DraftingScheduleGroup): string {
  const header = group.columns.map((column) => escapeCsvValue(column.label));
  const rows = group.rows.map((row) =>
    group.columns.map((column) => escapeCsvValue(row.cells[column.key] ?? '')).join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

export function serializeDraftingSchedulesJson(summary: DraftingScheduleSummary): string {
  return JSON.stringify(
    {
      drawingId: summary.drawingId,
      units: summary.units,
      groups: summary.groups.map((group) => ({
        key: group.key,
        title: group.title,
        rowCount: group.rows.length,
        columns: group.columns,
        rows: group.rows.map((row) => ({
          id: row.id,
          sourceObjectId: row.sourceObjectId,
          objectType: row.objectType,
          values: row.cells,
        })),
      })),
    },
    null,
    2,
  );
}

function escapeCsvValue(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}
