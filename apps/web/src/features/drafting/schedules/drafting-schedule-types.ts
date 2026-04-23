import type { DraftingModel, DraftingObjectType } from '@eng/shared';

export type DraftingScheduleGroupKey =
  | 'shoring_piles'
  | 'anchors'
  | 'beams_walers'
  | 'boreholes'
  | 'services_conflicts'
  | 'annotations_references';

export type DraftingScheduleColumn = {
  key: string;
  label: string;
};

export type DraftingScheduleCellMap = Record<string, string>;

export type DraftingScheduleRow = {
  id: string;
  sourceObjectId: string;
  objectType: DraftingObjectType;
  cells: DraftingScheduleCellMap;
};

export type DraftingScheduleGroup = {
  key: DraftingScheduleGroupKey;
  title: string;
  description: string;
  columns: readonly DraftingScheduleColumn[];
  rows: DraftingScheduleRow[];
};

export type DraftingScheduleSummary = {
  drawingId: string;
  units: DraftingModel['units'];
  groups: DraftingScheduleGroup[];
  counts: Record<DraftingScheduleGroupKey, number>;
};

export type DraftingScheduleBuilder = (model: DraftingModel) => DraftingScheduleRow[];

export type DraftingScheduleGroupDefinition = Omit<DraftingScheduleGroup, 'rows'> & {
  buildRows: DraftingScheduleBuilder;
};
