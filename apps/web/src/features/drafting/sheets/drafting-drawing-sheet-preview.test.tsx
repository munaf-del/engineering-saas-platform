import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyDraftingModel,
  type DraftingDrawing,
  type DraftingObject,
  type Project,
} from '@eng/shared';
import {
  DraftingDrawingSheetPage,
  DraftingDrawingSheetPreview,
} from './drafting-drawing-sheet-preview';
import { createDraftingObject } from '../model-utils';
import {
  addDrawingSheetIssue,
  createDraftingDrawingSheetIssueSnapshot,
} from './drafting-drawing-sheet-issue-utils';
import { createDraftingDrawingSheetDefinition } from './drafting-drawing-sheet-utils';

vi.mock('../components/drafting-pdf-underlay', () => ({
  DraftingPdfUnderlay({ underlay }: { underlay: { id: string } }) {
    return <g data-testid="mock-drafting-pdf-underlay" data-underlay-id={underlay.id} />;
  },
}));

describe('drafting drawing sheet preview', () => {
  it('renders drafting geometry on a formal sheet with title and current revision metadata', () => {
    const drawing = createDrawing();
    const sheet = createDraftingDrawingSheetDefinition({
      id: 'drawing-sheet-1',
      name: 'Geometry Sheet',
      sheetNumber: 'S-101',
      title: 'Retention Plan',
      viewport: {
        center: { x: 1000, y: 1000 },
        scale: 0.05,
      },
    });
    drawing.model.titleBlock = {
      approvedBy: 'APP',
      checkedBy: 'CHK',
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Wall General Arrangement',
      drawnBy: 'DRN',
      projectName: 'NORTH SYDNEY',
      status: 'for_review',
    };
    drawing.model.revisionBlock = {
      currentRevision: 'B',
      revisions: [
        {
          approvedBy: 'APR',
          checkedBy: 'CKR',
          date: '2026-04-24',
          description: 'Issued for review',
          drawnBy: 'AVD',
          id: 'revision-b',
          issuedFor: 'Review',
          revision: 'B',
          status: 'for_review',
        },
      ],
    };
    drawing.model.objects.push({
      id: 'pile-1',
      type: 'pile',
      layerId: 'piles',
      geometry: {
        centre: { x: 1000, y: 1000 },
        diameterMm: 600,
      },
      metadata: {
        pileId: 'P1',
      },
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });

    const markup = renderToStaticMarkup(
      <DraftingDrawingSheetPage
        currentRevisionRow={drawing.model.revisionBlock.revisions[0]!}
        drawing={drawing}
        drawingRevision="B"
        drawingTitle="Retention Wall General Arrangement"
        project={project}
        rootTemplate={null}
        sheet={sheet}
      />,
    );

    expect(markup).toContain('data-testid="drafting-drawing-sheet-page"');
    expect(markup).toContain('data-testid="drafting-geometry-viewport"');
    expect(markup).toContain('data-testid="drafting-sheet-viewport-clip"');
    expect(markup).toContain('drafting-sheet-paper-preview');
    expect(markup).toContain('data-testid="drafting-sheet-north-overlay"');
    expect(markup).toContain('clip-path="url(#drafting-sheet-viewport-clip-drawing-sheet-1)"');
    expect(markup).toContain('data-drafting-object="true"');
    expect(markup).toContain('stroke-width="0.35"');
    expect(markup).not.toContain('vector-effect="non-scaling-stroke"');
    expect(markup).toContain('P1');
    expect(markup).toContain('Retention Plan');
    expect(markup).toContain('Retention Wall General Arrangement');
    expect(markup).toContain('S-1001');
    expect(markup).toContain('S-101');
    expect(markup).toContain('for_review');
    expect(markup).toContain('AVD');
    expect(markup).toContain('CKR');
    expect(markup).toContain('APR');
  });

  it('does not disable profile-driven paper line weights inside sheet preview', () => {
    const drawing = createDrawing();
    drawing.model.objects.push({
      id: 'pile-1',
      type: 'pile',
      layerId: 'piles',
      geometry: {
        centre: { x: 1000, y: 1000 },
        diameterMm: 600,
      },
      metadata: {
        pileId: 'P1',
      },
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });

    const markup = renderToStaticMarkup(
      <DraftingDrawingSheetPage
        currentRevisionRow={null}
        drawing={drawing}
        drawingRevision="R0"
        drawingTitle="Drawing"
        project={project}
        rootTemplate={null}
        sheet={createDraftingDrawingSheetDefinition({ id: 'drawing-sheet-1' })}
      />,
    );

    expect(markup).not.toContain('vector-effect:none');
    expect(markup).toContain('stroke-width="0.35"');
  });

  it('uses plotted paper line weights and linework-first pile wall objects', () => {
    const drawing = createDrawing();
    const secantWall = createDraftingObject('secant_pile_wall', { x: 0, y: 0 }, drawing.model);
    const soldierWall = createDraftingObject('soldier_pile_wall', { x: 0, y: 1200 }, drawing.model);
    drawing.model.objects.push(secantWall, soldierWall);

    const markup = renderToStaticMarkup(
      <DraftingDrawingSheetPage
        currentRevisionRow={null}
        drawing={drawing}
        drawingRevision="R0"
        drawingTitle="Drawing"
        project={project}
        rootTemplate={null}
        sheet={createDraftingDrawingSheetDefinition({ id: 'drawing-sheet-1' })}
      />,
    );

    expect(markup).toContain('stroke-width="0.35"');
    expect(markup).toContain('fill="none"');
    expect(markup).not.toContain('#fdba74');
    expect(markup).not.toContain('#dcfce7');
    expect(markup).not.toContain('stroke-width="24"');
  });

  it('hides renderer text labels when object labels are disabled', () => {
    const drawing = createDrawing();
    const sheet = {
      ...createDraftingDrawingSheetDefinition({ id: 'drawing-sheet-1' }),
      includeObjectLabels: false,
    };

    const markup = renderToStaticMarkup(
      <DraftingDrawingSheetPage
        currentRevisionRow={null}
        drawing={drawing}
        drawingRevision="R0"
        drawingTitle="Drawing"
        project={project}
        rootTemplate={null}
        sheet={sheet}
      />,
    );

    expect(markup).toContain('drafting-sheet-hide-labels');
    expect(markup).toContain('.drafting-sheet-hide-labels text{display:none}');
  });

  it('clips optional grid and object labels inside the geometry viewport', () => {
    const drawing = createDrawing();
    const sheet = {
      ...createDraftingDrawingSheetDefinition({ id: 'drawing-sheet-1' }),
      includeGrid: true,
      includeObjectLabels: true,
    };
    drawing.model.objects.push({
      id: 'pile-1',
      type: 'pile',
      layerId: 'piles',
      geometry: {
        centre: { x: 0, y: 0 },
        diameterMm: 600,
      },
      metadata: {
        pileId: 'P1',
      },
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });

    const markup = renderToStaticMarkup(
      <DraftingDrawingSheetPage
        currentRevisionRow={null}
        drawing={drawing}
        drawingRevision="R0"
        drawingTitle="Drawing"
        project={project}
        rootTemplate={null}
        sheet={sheet}
      />,
    );

    const clipIndex = markup.indexOf('data-testid="drafting-sheet-viewport-clip"');
    const gridIndex = markup.indexOf('data-testid="drafting-sheet-grid"');
    const labelIndex = markup.indexOf('P1');

    expect(clipIndex).toBeGreaterThan(-1);
    expect(gridIndex).toBeGreaterThan(clipIndex);
    expect(labelIndex).toBeGreaterThan(clipIndex);
    expect(markup).toContain('drafting-sheet-paper-preview');
  });

  it('uses existing PDF underlay rendering when underlays are included and preserves fallback metadata', () => {
    const drawing = createDrawing();
    const sheet = {
      ...createDraftingDrawingSheetDefinition({ id: 'drawing-sheet-1' }),
      includeUnderlays: true,
    };
    drawing.model.underlays.push({
      id: 'underlay-1',
      name: 'Survey underlay',
      fileId: 'document-1',
      fileName: 'survey.pdf',
      pageNumber: 2,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: { x: 0, y: 0, scale: 1, rotationDeg: 0 },
      crop: null,
      calibration: null,
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });
    drawing.model.objects.push({
      id: 'pile-1',
      type: 'pile',
      layerId: 'piles',
      geometry: {
        centre: { x: 0, y: 0 },
        diameterMm: 600,
      },
      metadata: {
        pileId: 'P1',
      },
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });

    const markup = renderToStaticMarkup(
      <DraftingDrawingSheetPage
        currentRevisionRow={null}
        drawing={drawing}
        drawingRevision="R0"
        drawingTitle="Drawing"
        project={project}
        rootTemplate={null}
        sheet={sheet}
      />,
    );

    expect(markup).toContain('data-testid="mock-drafting-pdf-underlay"');
    expect(markup).toContain('PDF underlay:');
    expect(markup).toContain('survey.pdf');
    expect(markup.indexOf('data-testid="mock-drafting-pdf-underlay"')).toBeLessThan(
      markup.indexOf('data-drafting-object="true"'),
    );
  });

  it('applies sheet layer filters without mutating the editor model', () => {
    const drawing = createDrawing();
    const sheet = {
      ...createDraftingDrawingSheetDefinition({ id: 'drawing-sheet-1' }),
      layerFilter: {
        hiddenLayerIds: ['notes' as const],
      },
    };
    drawing.model.objects.push(
      {
        id: 'pile-1',
        type: 'pile',
        layerId: 'piles',
        geometry: {
          centre: { x: 0, y: 0 },
          diameterMm: 600,
        },
        metadata: {
          pileId: 'P1',
        },
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      },
      {
        id: 'pile-hidden-by-sheet-filter',
        type: 'pile',
        layerId: 'notes',
        geometry: {
          centre: { x: 1000, y: 0 },
          diameterMm: 600,
        },
        metadata: {
          pileId: 'P-NOTES',
        },
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      },
    );

    const markup = renderToStaticMarkup(
      <DraftingDrawingSheetPage
        currentRevisionRow={null}
        drawing={drawing}
        drawingRevision="R0"
        drawingTitle="Drawing"
        project={project}
        rootTemplate={null}
        sheet={sheet}
      />,
    );

    expect(markup).toContain('P1');
    expect(markup).not.toContain('P-NOTES');
    expect(drawing.model.objects).toHaveLength(2);
  });

  it('renders issued previews from locked snapshots instead of the live model', () => {
    const drawing = createDrawing();
    const sheet = createDraftingDrawingSheetDefinition({
      id: 'drawing-sheet-1',
      name: 'Geometry Sheet',
      sheetNumber: 'S-101',
      title: 'Locked Retention Plan',
      viewport: {
        center: { x: 1000, y: 1000 },
        scale: 0.05,
      },
    });
    drawing.model.titleBlock = {
      drawingTitle: 'Locked Drawing Title',
      projectName: 'NORTH SYDNEY',
    };
    drawing.model.revisionBlock = {
      currentRevision: 'A',
      revisions: [
        {
          approvedBy: 'APR',
          checkedBy: 'CHK',
          date: '2026-04-24',
          description: 'Issued',
          drawnBy: 'DRN',
          id: 'revision-a',
          issuedFor: 'Review',
          revision: 'A',
          status: 'issued',
        },
      ],
    };
    drawing.model.drawingSheets = [sheet];
    drawing.model.objects.push({
      id: 'pile-locked',
      type: 'pile',
      layerId: 'piles',
      geometry: {
        centre: { x: 1000, y: 1000 },
        diameterMm: 600,
      },
      metadata: {
        pileId: 'P-LOCKED',
      },
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });
    const issue = createDraftingDrawingSheetIssueSnapshot(drawing.model, {
      id: 'issue-1',
      issueDate: '2026-04-24T00:00:00.000Z',
      issueNumber: 'ISS-001',
      purpose: 'For review',
      revision: 'A',
      sheetIds: ['drawing-sheet-1'],
    });
    drawing.model = addDrawingSheetIssue(drawing.model, issue);
    drawing.model.titleBlock = {
      ...drawing.model.titleBlock,
      drawingTitle: 'Changed Live Drawing Title',
    };
    drawing.model.drawingSheets = [
      {
        ...sheet,
        title: 'Changed Live Sheet',
        viewport: {
          ...sheet.viewport,
          center: { x: 9000, y: 9000 },
        },
      },
    ];
    drawing.model.objects = [
      {
        ...drawing.model.objects[0]!,
        id: 'pile-live',
        metadata: {
          pileId: 'P-LIVE',
        },
      } as DraftingObject,
    ];

    const markup = renderToStaticMarkup(
      <DraftingDrawingSheetPreview
        drawing={drawing}
        onModeChange={() => {}}
        onSelectedSheetIdChange={() => {}}
        previewMode="sheet"
        project={project}
        projectId={project.id}
        rootTemplates={[]}
        selectedIssueId="issue-1"
        selectedSheetId="drawing-sheet-1"
      />,
    );

    expect(markup).toContain('Frozen issued snapshot');
    expect(markup).toContain('Locked Retention Plan');
    expect(markup).toContain('Locked Drawing Title');
    expect(markup).toContain('P-LOCKED');
    expect(markup).not.toContain('Changed Live Sheet');
    expect(markup).not.toContain('Changed Live Drawing Title');
    expect(markup).not.toContain('P-LIVE');
  });
});

const project = {
  id: 'project-1',
  code: 'NSYD',
  name: 'NORTH SYDNEY',
  organisationId: 'org-1',
  status: 'active',
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
} as Project;

function createDrawing(): DraftingDrawing {
  return {
    id: 'drawing-1',
    projectId: 'project-1',
    title: 'Drafting Geometry Sheet QA',
    kind: 'model',
    isProjectModel: true,
    isSketch: false,
    status: 'draft',
    currentRevision: 0,
    modelVersion: 1,
    objectCount: 0,
    createdById: null,
    updatedById: null,
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    model: createEmptyDraftingModel('drawing-1'),
    revisions: [],
  };
}
