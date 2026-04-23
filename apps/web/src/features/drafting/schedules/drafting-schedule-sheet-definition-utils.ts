import type { DraftingModel, DraftingScheduleSheetDefinition } from '@eng/shared';
import { DRAFTING_SCHEDULE_GROUP_DEFINITIONS } from './drafting-schedule-utils';
import type { DraftingScheduleGroupKey } from './drafting-schedule-types';

export const DEFAULT_DRAFTING_SCHEDULE_SHEET_PAGE_SIZE = 'a3';
export const DEFAULT_DRAFTING_SCHEDULE_SHEET_ORIENTATION = 'landscape';
export const DEFAULT_DRAFTING_SCHEDULE_SHEET_TABLE_DENSITY = 'compact';

export const DEFAULT_DRAFTING_SCHEDULE_SHEET_GROUPS = DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map(
  (group) => group.key,
);

export type CreateDraftingScheduleSheetDefinitionArgs = {
  id: string;
  includedScheduleGroups?: DraftingScheduleGroupKey[];
  name?: string;
  pageOrder?: number;
  title?: string;
};

export function createDraftingScheduleSheetDefinition({
  id,
  includedScheduleGroups = DEFAULT_DRAFTING_SCHEDULE_SHEET_GROUPS,
  name = 'Schedule Sheet',
  pageOrder = 1,
  title = name,
}: CreateDraftingScheduleSheetDefinitionArgs): DraftingScheduleSheetDefinition {
  return {
    id,
    name,
    rootSheetTemplateId: null,
    templateId: null,
    pageSize: DEFAULT_DRAFTING_SCHEDULE_SHEET_PAGE_SIZE,
    orientation: DEFAULT_DRAFTING_SCHEDULE_SHEET_ORIENTATION,
    includedScheduleGroups,
    title,
    tableDensity: DEFAULT_DRAFTING_SCHEDULE_SHEET_TABLE_DENSITY,
    pageOrder,
  };
}

export function getScheduleSheetRootTemplateId(definition: DraftingScheduleSheetDefinition) {
  return definition.rootSheetTemplateId ?? definition.templateId ?? null;
}

export function getOrderedScheduleSheetDefinitions(model: DraftingModel) {
  return [...getScheduleSheets(model)].sort((left, right) => {
    const orderDelta = left.pageOrder - right.pageOrder;
    if (orderDelta !== 0) {
      return orderDelta;
    }

    return left.name.localeCompare(right.name);
  });
}

export function addScheduleSheetDefinition(
  model: DraftingModel,
  definition: DraftingScheduleSheetDefinition,
): DraftingModel {
  return withReorderedScheduleSheets(model, [...getScheduleSheets(model), definition]);
}

export function updateScheduleSheetDefinition(
  model: DraftingModel,
  sheetId: string,
  patch: Partial<DraftingScheduleSheetDefinition>,
): DraftingModel {
  return withReorderedScheduleSheets(
    model,
    getScheduleSheets(model).map((sheet) =>
      sheet.id === sheetId ? { ...sheet, ...patch } : sheet,
    ),
  );
}

export function duplicateScheduleSheetDefinition(
  model: DraftingModel,
  sourceSheetId: string,
  nextId: string,
): DraftingModel {
  const orderedSheets = getOrderedScheduleSheetDefinitions(model);
  const sourceIndex = orderedSheets.findIndex((sheet) => sheet.id === sourceSheetId);
  if (sourceIndex === -1) {
    return model;
  }

  const source = orderedSheets[sourceIndex]!;
  const duplicate: DraftingScheduleSheetDefinition = {
    ...source,
    id: nextId,
    name: `${source.name} Copy`,
    pageOrder: source.pageOrder + 1,
    title: source.title,
  };
  const nextSheets = [
    ...orderedSheets.slice(0, sourceIndex + 1),
    duplicate,
    ...orderedSheets.slice(sourceIndex + 1),
  ];

  return withReorderedScheduleSheets(model, nextSheets);
}

export function deleteScheduleSheetDefinition(
  model: DraftingModel,
  sheetId: string,
): DraftingModel {
  return withReorderedScheduleSheets(
    model,
    getScheduleSheets(model).filter((sheet) => sheet.id !== sheetId),
  );
}

export function reorderScheduleSheetDefinition(
  model: DraftingModel,
  sheetId: string,
  direction: 'down' | 'up',
): DraftingModel {
  const orderedSheets = getOrderedScheduleSheetDefinitions(model);
  const currentIndex = orderedSheets.findIndex((sheet) => sheet.id === sheetId);
  if (currentIndex === -1) {
    return model;
  }

  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= orderedSheets.length) {
    return model;
  }

  const nextSheets = [...orderedSheets];
  const [sheet] = nextSheets.splice(currentIndex, 1);
  nextSheets.splice(nextIndex, 0, sheet!);

  return withReorderedScheduleSheets(model, nextSheets);
}

export function setScheduleSheetGroupIncluded(
  model: DraftingModel,
  sheetId: string,
  groupKey: DraftingScheduleGroupKey,
  included: boolean,
): DraftingModel {
  const sheet = getScheduleSheets(model).find((candidate) => candidate.id === sheetId);
  if (!sheet) {
    return model;
  }

  const currentGroups = new Set(sheet.includedScheduleGroups);
  if (included) {
    currentGroups.add(groupKey);
  } else {
    currentGroups.delete(groupKey);
  }

  const orderedGroups = DEFAULT_DRAFTING_SCHEDULE_SHEET_GROUPS.filter((key) =>
    currentGroups.has(key),
  );

  return updateScheduleSheetDefinition(model, sheetId, {
    includedScheduleGroups: orderedGroups,
  });
}

function withReorderedScheduleSheets(
  model: DraftingModel,
  sheets: DraftingScheduleSheetDefinition[],
): DraftingModel {
  return {
    ...model,
    scheduleSheets: sheets.map((sheet, index) => ({
      ...sheet,
      pageOrder: index + 1,
    })),
  };
}

function getScheduleSheets(model: DraftingModel) {
  return model.scheduleSheets ?? [];
}
