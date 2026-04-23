import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import {
  addScheduleSheetDefinition,
  createDraftingScheduleSheetDefinition,
  deleteScheduleSheetDefinition,
  duplicateScheduleSheetDefinition,
  getOrderedScheduleSheetDefinitions,
  reorderScheduleSheetDefinition,
  setScheduleSheetGroupIncluded,
  updateScheduleSheetDefinition,
} from './drafting-schedule-sheet-definition-utils';

describe('drafting schedule sheet definition utils', () => {
  it('creates a default persisted schedule sheet definition', () => {
    const definition = createDraftingScheduleSheetDefinition({
      id: 'sheet-1',
      name: 'Coordination Schedule',
      pageOrder: 2,
    });

    expect(definition).toMatchObject({
      id: 'sheet-1',
      name: 'Coordination Schedule',
      pageSize: 'a3',
      orientation: 'landscape',
      tableDensity: 'compact',
      pageOrder: 2,
    });
    expect(definition.includedScheduleGroups).toContain('shoring_piles');
    expect(definition.includedScheduleGroups).toContain('annotations_references');
  });

  it('adds, renames, duplicates, deletes, and reorders definitions without touching objects', () => {
    const model = createEmptyDraftingModel('drawing-sheets');
    const first = createDraftingScheduleSheetDefinition({
      id: 'sheet-1',
      name: 'Shoring Schedules',
    });
    const second = createDraftingScheduleSheetDefinition({
      id: 'sheet-2',
      name: 'Services Schedules',
      pageOrder: 2,
    });

    let nextModel = addScheduleSheetDefinition(model, first);
    nextModel = addScheduleSheetDefinition(nextModel, second);
    nextModel = updateScheduleSheetDefinition(nextModel, 'sheet-2', {
      name: 'Services and Conflicts',
      title: 'Services and Conflicts',
    });
    nextModel = duplicateScheduleSheetDefinition(nextModel, 'sheet-2', 'sheet-3');
    nextModel = reorderScheduleSheetDefinition(nextModel, 'sheet-3', 'up');
    nextModel = deleteScheduleSheetDefinition(nextModel, 'sheet-1');

    expect(nextModel.objects).toEqual(model.objects);
    expect(getOrderedScheduleSheetDefinitions(nextModel).map((sheet) => sheet.id)).toEqual([
      'sheet-3',
      'sheet-2',
    ]);
    expect(nextModel.scheduleSheets.map((sheet) => sheet.pageOrder)).toEqual([1, 2]);
    expect(nextModel.scheduleSheets[0]).toMatchObject({
      id: 'sheet-3',
      name: 'Services and Conflicts Copy',
      title: 'Services and Conflicts',
    });
  });

  it('updates included schedule groups in canonical order', () => {
    const model = {
      ...createEmptyDraftingModel('drawing-sheets'),
      scheduleSheets: [
        createDraftingScheduleSheetDefinition({
          id: 'sheet-1',
          includedScheduleGroups: ['anchors'],
        }),
      ],
    };

    let nextModel = setScheduleSheetGroupIncluded(model, 'sheet-1', 'shoring_piles', true);
    nextModel = setScheduleSheetGroupIncluded(nextModel, 'sheet-1', 'anchors', false);

    expect(nextModel.scheduleSheets[0]?.includedScheduleGroups).toEqual(['shoring_piles']);
  });
});
