import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import {
  DraftingScheduleSheet,
  DraftingScheduleSheetPackPreview,
} from './drafting-schedule-sheet-preview';
import {
  DRAFTING_SCHEDULE_ALL_GROUPS,
  buildDraftingScheduleSheetPack,
  buildDraftingScheduleSheetRenderModel,
} from './drafting-schedule-sheet';
import { createDraftingScheduleSheetDefinition } from './drafting-schedule-sheet-definition-utils';

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

  it('renders one saved schedule sheet definition as a print page', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [createDraftingObject('anchor_tieback', { x: 1000, y: 2000 }, model)];
    const pack = buildDraftingScheduleSheetPack({
      definitions: [
        createDraftingScheduleSheetDefinition({
          id: 'sheet-anchors',
          includedScheduleGroups: ['anchors'],
          name: 'Anchor Sheet',
          title: 'Anchor Sheet',
        }),
      ],
      metadata: metadata(),
      model,
    });
    const markup = renderToStaticMarkup(<DraftingScheduleSheetPackPreview pack={pack} />);

    expect(markup).toContain('data-testid="drafting-schedule-pack-preview"');
    expect(markup).toContain('data-definition-id="sheet-anchors"');
    expect(markup).toContain('data-print-page-size="a3"');
    expect(markup).toContain('Anchor Schedule');
    expect(markup).toContain('Page');
    expect(markup).toContain('1 of 1');
  });

  it('renders all saved definitions as a multi-sheet print pack', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [
      createDraftingObject('pile', { x: 1000, y: 2000 }, model),
      createDraftingObject('borehole', { x: 1600, y: 2600 }, model),
    ];
    const pack = buildDraftingScheduleSheetPack({
      definitions: [
        createDraftingScheduleSheetDefinition({
          id: 'sheet-piles',
          includedScheduleGroups: ['shoring_piles'],
          name: 'Pile Sheet',
        }),
        createDraftingScheduleSheetDefinition({
          id: 'sheet-boreholes',
          includedScheduleGroups: ['boreholes'],
          name: 'Borehole Sheet',
          pageOrder: 2,
        }),
      ],
      metadata: metadata(),
      model,
    });
    const markup = renderToStaticMarkup(<DraftingScheduleSheetPackPreview pack={pack} />);

    expect(markup).toContain('data-definition-id="sheet-piles"');
    expect(markup).toContain('data-definition-id="sheet-boreholes"');
    expect(markup).toContain('Shoring / Pile Schedule');
    expect(markup).toContain('Borehole Schedule');
    expect(markup).toContain('2 of 2');
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
