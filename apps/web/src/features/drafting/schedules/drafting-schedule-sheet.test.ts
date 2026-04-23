import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingModel } from '@eng/shared';
import { createGenericTemplateDocument } from '@/features/templates/core/generic-template-document';
import type { SharedSheetBlockContent } from '@/features/templates/core/shared-sheet-schema';
import { createDraftingObject } from '../model-utils';
import {
  DRAFTING_SCHEDULE_ALL_GROUPS,
  buildDraftingScheduleSheetRenderModel,
} from './drafting-schedule-sheet';

describe('drafting schedule sheet render model', () => {
  it('renders the selected schedule group as a plotted table block', () => {
    const model = modelWith(['pile', 'anchor_tieback']);
    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: 'anchors',
      metadata: metadata(),
      model,
    });
    const anchorTable = renderModel.contentByBlockId['drafting-schedule-table-anchors'];

    expect(renderModel.definition.objects.some((object) => object.type === 'titleBlock')).toBe(
      true,
    );
    const anchorTableContent = expectTableContent(anchorTable);

    expect(anchorTableContent.title).toBe('Anchor Schedule');
    expect(anchorTableContent.rows).toHaveLength(1);
    expect(anchorTableContent.rows?.[0]).toMatchObject({
      anchorId: 'A1',
      stage: 'Stage 1',
    });
    expect(renderModel.contentByBlockId['drafting-schedule-table-shoring_piles']).toBeUndefined();
  });

  it('renders all schedule groups as multiple table sections', () => {
    const model = modelWith([
      'pile',
      'anchor_tieback',
      'waler',
      'borehole',
      'service_run',
      'callout',
    ]);
    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: DRAFTING_SCHEDULE_ALL_GROUPS,
      metadata: metadata(),
      model,
    });
    const tableBlocks = renderModel.definition.objects.filter(
      (object) => object.type === 'tableBlock',
    );

    expect(tableBlocks.map((block) => block.id)).toEqual([
      'drafting-schedule-table-shoring_piles',
      'drafting-schedule-table-anchors',
      'drafting-schedule-table-beams_walers',
      'drafting-schedule-table-boreholes',
      'drafting-schedule-table-services_conflicts',
      'drafting-schedule-table-annotations_references',
    ]);
    expect(renderModel.contentByBlockId['drafting-schedule-table-shoring_piles']).toMatchObject({
      title: 'Shoring / Pile Schedule',
      type: 'tableBlock',
    });
    expect(
      renderModel.contentByBlockId['drafting-schedule-table-annotations_references'],
    ).toMatchObject({
      title: 'Annotation / Reference Schedule',
      type: 'tableBlock',
    });
  });

  it('keeps empty schedules on the sheet with a useful placeholder', () => {
    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: 'boreholes',
      metadata: metadata(),
      model: createEmptyDraftingModel('drawing-empty'),
    });
    const boreholeTable = renderModel.contentByBlockId['drafting-schedule-table-boreholes'];

    const boreholeTableContent = expectTableContent(boreholeTable);

    expect(boreholeTableContent.rows).toEqual([]);
    expect(boreholeTableContent.placeholder).toContain('No borehole rows');
  });

  it('passes only DraftingModel-derived schedule rows into preview content', () => {
    const model = modelWith(['service_crossing']);
    model.underlays.push({
      id: 'underlay-1',
      name: 'Source underlay',
      fileId: 'pdf-file-1',
      fileName: 'source.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: { x: 0, y: 0, scale: 1, rotationDeg: 0 },
      crop: null,
      calibration: null,
      createdAt: '2026-04-22T00:00:00.000Z',
      updatedAt: '2026-04-22T00:00:00.000Z',
    });

    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: 'services_conflicts',
      metadata: metadata(),
      model,
    });
    const exportedPreviewContent = JSON.stringify(renderModel.contentByBlockId);

    expect(exportedPreviewContent).toContain('SC1');
    expect(exportedPreviewContent).not.toContain('pdf-file-1');
    expect(exportedPreviewContent).not.toContain('data:application/pdf');
    expect(exportedPreviewContent).not.toContain('"buffer"');
  });

  it('can reuse a root sheet template surface for schedule placement', () => {
    const template = createGenericTemplateDocument({
      name: 'A4 Schedule Template',
      orientation: 'landscape',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: 'shoring_piles',
      metadata: metadata(),
      model: modelWith(['pile']),
      templateSource: {
        label: 'A4 Schedule Template',
        template,
      },
    });

    expect(renderModel.definition.paperSize).toBe('a4');
    expect(renderModel.definition.orientation).toBe('landscape');
    expect(renderModel.definition.objects.some((object) => object.type === 'titleBlock')).toBe(
      true,
    );
    expect(
      renderModel.definition.objects.some(
        (object) => object.id === 'drafting-schedule-table-shoring_piles',
      ),
    ).toBe(true);
  });
});

function modelWith(types: Parameters<typeof createDraftingObject>[0][]): DraftingModel {
  const model = createEmptyDraftingModel('drawing-schedules');
  model.objects = types.map((type, index) =>
    createDraftingObject(type, { x: 1000 + index * 500, y: 2000 + index * 500 }, model),
  );
  return model;
}

function metadata() {
  return {
    drawingId: 'drawing-schedules',
    drawingStatus: 'draft',
    drawingTitle: 'Drafting Schedule Sheet QA',
    generatedAtLabel: 'Updated 23 Apr 2026',
    projectCode: 'NSYD',
    projectName: 'NORTH SYDNEY',
    revision: 'Revision 1',
  };
}

function expectTableContent(content: SharedSheetBlockContent | undefined) {
  expect(content?.type).toBe('tableBlock');
  if (!content || content.type !== 'tableBlock') {
    throw new Error('Expected table block content');
  }

  return content;
}
