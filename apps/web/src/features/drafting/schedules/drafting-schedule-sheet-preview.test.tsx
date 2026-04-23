import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import { DraftingScheduleSheet } from './drafting-schedule-sheet-preview';
import {
  DRAFTING_SCHEDULE_ALL_GROUPS,
  buildDraftingScheduleSheetRenderModel,
} from './drafting-schedule-sheet';

describe('DraftingScheduleSheet', () => {
  beforeAll(() => {
    vi.stubGlobal('React', React);
  });

  it('renders a selected schedule group on a sheet preview surface', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [createDraftingObject('anchor_tieback', { x: 1000, y: 2000 }, model)];
    const markup = renderToStaticMarkup(
      <DraftingScheduleSheet
        renderModel={buildDraftingScheduleSheetRenderModel({
          groupSelection: 'anchors',
          metadata: metadata(),
          model,
        })}
      />,
    );

    expect(markup).toContain('template-canvas-surface');
    expect(markup).toContain('Anchor Schedule');
    expect(markup).toContain('A1');
    expect(markup).toContain('DRAFTING SCHEDULE SHEET QA SCHEDULES');
  });

  it('renders all schedule groups as multiple sections', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [
      createDraftingObject('pile', { x: 1000, y: 2000 }, model),
      createDraftingObject('borehole', { x: 1600, y: 2600 }, model),
    ];
    const markup = renderToStaticMarkup(
      <DraftingScheduleSheet
        renderModel={buildDraftingScheduleSheetRenderModel({
          groupSelection: DRAFTING_SCHEDULE_ALL_GROUPS,
          metadata: metadata(),
          model,
        })}
      />,
    );

    expect(markup).toContain('Shoring / Pile Schedule');
    expect(markup).toContain('Anchor Schedule');
    expect(markup).toContain('Beam / Waler Schedule');
    expect(markup).toContain('Borehole Schedule');
    expect(markup).toContain('Services / Conflicts Schedule');
    expect(markup).toContain('Annotation / Reference Schedule');
  });

  it('renders the empty schedule placeholder state', () => {
    const markup = renderToStaticMarkup(
      <DraftingScheduleSheet
        renderModel={buildDraftingScheduleSheetRenderModel({
          groupSelection: 'services_conflicts',
          metadata: metadata(),
          model: createEmptyDraftingModel('drawing-empty'),
        })}
      />,
    );

    expect(markup).toContain('No services / conflicts rows');
  });
});

function metadata() {
  return {
    drawingId: 'drawing-preview',
    drawingStatus: 'draft',
    drawingTitle: 'Drafting Schedule Sheet QA',
    generatedAtLabel: 'Updated 23 Apr 2026',
    projectCode: 'NSYD',
    projectName: 'NORTH SYDNEY',
    revision: 'Revision 1',
  };
}
