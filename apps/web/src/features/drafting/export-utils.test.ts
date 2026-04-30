import { describe, expect, it } from 'vitest';
import {
  DraftingModelSchema,
  createEmptyDraftingModel,
  type DraftingObject,
  type DraftingUnderlay,
} from '@eng/shared';
import { serializeDraftingModelJson } from './export-utils';
import { createDraftingObject } from './model-utils';

describe('drafting export utils', () => {
  it('serializes underlay metadata without embedding binary content', () => {
    const model = createEmptyDraftingModel('drawing-1');
    model.objects.push({
      id: 'secant-wall-1',
      type: 'secant_pile_wall',
      layerId: 'shoring',
      name: 'Secant Wall 1',
      visible: true,
      locked: false,
      style: {
        stroke: '#9a3412',
        fill: '#fdba74',
        lineWeight: 2,
      },
      geometry: {
        baselinePoints: [
          { x: 0, y: 0 },
          { x: 6000, y: 0 },
        ],
        pileCentres: [
          { x: 0, y: 0 },
          { x: 1500, y: 0 },
          { x: 3000, y: 0 },
          { x: 4500, y: 0 },
          { x: 6000, y: 0 },
        ],
      },
      parameters: {
        pileDiameterMm: 900,
        spacingMm: 1500,
        overlapMm: 100,
        secantType: 'overlapping',
        primarySecondaryPattern: 'hard_soft',
      },
      metadata: {
        wallId: 'SEC1',
        constructionMethod: 'secant bored piles',
        pileCount: 5,
        designNotes: 'Draft export coverage',
      },
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });
    model.objects.push({
      id: 'dimension-1',
      type: 'dimension_chain',
      layerId: 'dimensions',
      name: 'Boundary Setback',
      visible: true,
      locked: false,
      style: {
        stroke: '#334155',
        lineWeight: 1,
      },
      geometry: {
        points: [
          { x: 0, y: 0 },
          { x: 3000, y: 0 },
        ],
        offsetDistanceMm: 1200,
      },
      parameters: {
        dimensionId: 'DIM1',
        unit: 'mm',
        precision: 0,
        showSegments: true,
        showTotal: true,
      },
      metadata: {
        notes: 'Dimension export coverage',
      },
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });
    model.objects.push({
      id: 'service-crossing-1',
      type: 'service_crossing',
      layerId: 'services_conflicts',
      name: 'Crossing 1',
      visible: true,
      locked: false,
      style: {
        stroke: '#b91c1c',
        fill: '#fee2e2',
        lineWeight: 2,
      },
      geometry: {
        crossingPoint: { x: 3200, y: 800 },
      },
      parameters: {
        crossingId: 'SC1',
        serviceType: 'water',
        conflictType: 'crosses_anchor',
        clearanceMm: 350,
        riskStatus: 'open',
      },
      metadata: {
        linkedServiceRunId: 'service-run-1',
        linkedObjectId: 'anchor-1',
        notes: 'Crossing export coverage',
      },
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });
    model.underlays.push({
      id: 'underlay-1',
      name: 'Calibrated PDF',
      fileId: 'document-1',
      fileName: 'calibrated.pdf',
      pageNumber: 2,
      visible: true,
      opacity: 0.7,
      locked: false,
      transform: {
        x: 100,
        y: 200,
        scale: 0.3527777778,
        rotationDeg: 15,
      },
      crop: {
        x: 10,
        y: 20,
        width: 300,
        height: 400,
      },
      calibration: {
        method: 'two_point_uniform_scale',
        pdfPointA: { x: 0, y: 0 },
        pdfPointB: { x: 100, y: 0 },
        modelPointA: { x: 100, y: 200 },
        modelPointB: { x: 1100, y: 200 },
        modelDistanceMm: 1000,
        calculatedScale: 10,
        calibratedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        warningAcknowledged: true,
      },
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });
    const exported = serializeDraftingModelJson(model);
    const parsed = JSON.parse(exported);

    expect(parsed.model).toEqual(model);
    expect(parsed.profileAudit).toMatchObject({
      activeProfileId: 'as1100-general',
      provenance: {
        source: 'fallback_resolved',
        status: 'fallback_resolved',
      },
      schemaVersion: 'drafting.profile-audit.v1',
      warning: 'AS1100-informed profile; not a certification or full compliance claim.',
    });
    expect(exported).toContain('"type": "secant_pile_wall"');
    expect(exported).toContain('"wallId": "SEC1"');
    expect(exported).toContain('"type": "dimension_chain"');
    expect(exported).toContain('"dimensionId": "DIM1"');
    expect(exported).toContain('"type": "service_crossing"');
    expect(exported).toContain('"crossingId": "SC1"');
    expect(exported).toContain('"fileId": "document-1"');
    expect(exported).not.toContain('data:application/pdf');
    expect(exported).not.toContain('"buffer"');
  });

  it('exports PDF underlays as stable round-trippable metadata only', () => {
    const model = createEmptyDraftingModel('drawing-underlay-export-guard');
    const calibratedUnderlay = createUnderlay({
      id: 'underlay-calibrated',
      calibration: {
        method: 'two_point_uniform_scale',
        pdfPointA: { x: 0, y: 0 },
        pdfPointB: { x: 100, y: 0 },
        modelPointA: { x: 200, y: 300 },
        modelPointB: { x: 1200, y: 300 },
        modelDistanceMm: 1000,
        calculatedScale: 10,
        calibratedAt: '2026-04-22T00:00:00.000Z',
        warningAcknowledged: true,
      },
      crop: {
        x: 8,
        y: 12,
        width: 240,
        height: 320,
      },
      locked: false,
      name: 'Calibrated underlay',
      opacity: 0.72,
      pageNumber: 3,
      transform: {
        x: 120,
        y: 240,
        scale: 0.45,
        rotationDeg: 12,
      },
      visible: true,
    });
    const hiddenLockedUnderlay = createUnderlay({
      id: 'underlay-hidden-locked',
      calibration: null,
      crop: null,
      fileId: 'document-hidden',
      fileName: 'hidden.pdf',
      locked: true,
      name: 'Hidden locked underlay',
      opacity: 0.3,
      pageNumber: 1,
      visible: false,
    });
    const runtimeUnderlay = {
      ...createUnderlay({
        id: 'underlay-runtime-noise',
        fileId: 'document-runtime',
        fileName: 'runtime.pdf',
        name: 'Runtime underlay',
      }),
      base64: 'JVBERi0xLjQK',
      buffer: { data: [37, 80, 68, 70] },
      imageUrl: 'blob:rendered-page',
      pdfBytes: 'data:application/pdf;base64,JVBERi0xLjQK',
      renderedImageData: 'data:image/png;base64,iVBORw0KGgo=',
    } satisfies DraftingUnderlay & Record<string, unknown>;
    model.underlays.push(calibratedUnderlay, hiddenLockedUnderlay, runtimeUnderlay);
    const sourceSnapshot = JSON.stringify(model);

    const exported = serializeDraftingModelJson(model);
    const parsed = JSON.parse(exported);
    const parsedModel = DraftingModelSchema.parse(parsed.model);

    expect(parsed.binaryPolicy).toContain('Metadata only');
    expect(parsedModel.underlays).toEqual([
      calibratedUnderlay,
      hiddenLockedUnderlay,
      createUnderlay({
        id: 'underlay-runtime-noise',
        fileId: 'document-runtime',
        fileName: 'runtime.pdf',
        name: 'Runtime underlay',
      }),
    ]);
    expect(parsedModel.underlays[0]).toMatchObject({
      id: 'underlay-calibrated',
      fileId: 'document-1',
      pageNumber: 3,
      name: 'Calibrated underlay',
      opacity: 0.72,
      visible: true,
      locked: false,
      transform: {
        x: 120,
        y: 240,
        scale: 0.45,
        rotationDeg: 12,
      },
      calibration: {
        calculatedScale: 10,
        warningAcknowledged: true,
      },
      crop: {
        height: 320,
        width: 240,
      },
    });
    expect(parsedModel.underlays[1]).toMatchObject({
      id: 'underlay-hidden-locked',
      fileId: 'document-hidden',
      locked: true,
      visible: false,
    });
    expect(exported).not.toContain('data:application/pdf');
    expect(exported).not.toContain('data:image/png');
    expect(exported).not.toContain('blob:rendered-page');
    expect(exported).not.toContain('"base64"');
    expect(exported).not.toContain('"buffer"');
    expect(exported).not.toContain('"imageUrl"');
    expect(exported).not.toContain('"pdfBytes"');
    expect(exported).not.toContain('"renderedImageData"');
    expect(JSON.stringify(model)).toBe(sourceSnapshot);
    expect((model.underlays[2] as DraftingUnderlay & { imageUrl?: string }).imageUrl).toBe(
      'blob:rendered-page',
    );
  });

  it('serializes title block and revision block metadata through the DraftingModel export', () => {
    const model = createEmptyDraftingModel('drawing-title-revision-export');
    model.titleBlock = {
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Wall General Arrangement',
      status: 'for_review',
    };
    model.revisionBlock = {
      currentRevision: 'B',
      revisions: [
        {
          approvedBy: 'Approver',
          checkedBy: 'Checker',
          date: '2026-04-24',
          description: 'Issued for review',
          drawnBy: 'Drafter',
          id: 'revision-b',
          issuedFor: 'Review',
          revision: 'B',
          status: 'for_review',
        },
      ],
    };
    const parsed = JSON.parse(serializeDraftingModelJson(model));

    expect(parsed.model.titleBlock).toMatchObject({
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Wall General Arrangement',
      status: 'for_review',
    });
    expect(parsed.model.revisionBlock).toMatchObject({
      currentRevision: 'B',
      revisions: [expect.objectContaining({ revision: 'B' })],
    });
  });

  it('adds report-friendly drawing metadata without changing the exported model payload', () => {
    const model = createEmptyDraftingModel('drawing-export-metadata');
    model.revisionBlock = {
      currentRevision: 'C',
      revisions: [],
    };
    model.drawingSheets.push({
      id: 'sheet-1',
      name: 'Geometry Sheet',
      title: 'Retention Plan',
      sheetNumber: 'S-101',
      rootSheetTemplateId: null,
      pageSize: 'a3',
      orientation: 'landscape',
      scaleLabel: 'Fit',
      viewport: {
        center: { x: 0, y: 0 },
        fitMode: 'model_extents',
        heightMm: 220,
        rotationDeg: 0,
        scale: 0.02,
        widthMm: 360,
      },
      includeUnderlays: true,
      includeGrid: true,
      includeObjectLabels: true,
      createdAt: '2026-04-30T00:00:00.000Z',
      updatedAt: '2026-04-30T00:00:00.000Z',
    });
    model.drawingSheetIssues.push({
      id: 'issue-1',
      issueDate: '2026-04-30T00:00:00.000Z',
      issueNumber: 'ISS-001',
      lockedDrawingSheets: [],
      lockedObjects: [],
      lockedRevisionBlock: { currentRevision: 'C', revisions: [] },
      lockedTitleBlock: {},
      lockedUnderlays: [],
      purpose: 'For review',
      revision: 'C',
      sheetIds: [],
      status: 'issued',
      createdAt: '2026-04-30T00:00:00.000Z',
      updatedAt: '2026-04-30T00:00:00.000Z',
    });
    const sourceSnapshot = JSON.stringify(model);

    const parsed = JSON.parse(
      serializeDraftingModelJson(model, {
        currentIssue: model.drawingSheetIssues[0]!,
        currentRevision: 'C',
        drawingId: 'drawing-export-metadata',
        drawingStatus: 'draft',
        drawingTitle: 'Retention Plan Export',
        exportedAt: '2026-04-30T01:00:00.000Z',
        projectId: 'project-1',
      }),
    );

    expect(parsed.exportedAt).toBe('2026-04-30T01:00:00.000Z');
    expect(parsed.metadata).toMatchObject({
      modelVersion: 1,
      units: 'mm',
      drawingId: 'drawing-export-metadata',
      projectId: 'project-1',
      drawingTitle: 'Retention Plan Export',
      drawingStatus: 'draft',
      currentRevision: 'C',
      currentIssue: {
        id: 'issue-1',
        issueNumber: 'ISS-001',
        purpose: 'For review',
        revision: 'C',
        status: 'issued',
      },
      counts: {
        drawingSheetIssues: 1,
        drawingSheets: 1,
        objects: 0,
        underlays: 0,
      },
    });
    expect(parsed.model).toEqual(model);
    expect(JSON.stringify(model)).toBe(sourceSnapshot);
  });

  it('serializes drawing sheet definitions through the DraftingModel export', () => {
    const model = createEmptyDraftingModel('drawing-sheet-export');
    model.drawingSheets.push({
      id: 'drawing-sheet-1',
      name: 'Geometry Sheet',
      title: 'Retention Plan',
      sheetNumber: 'S-101',
      rootSheetTemplateId: 'root-template-1',
      pageSize: 'a3',
      orientation: 'landscape',
      scaleLabel: 'Fit',
      viewport: {
        center: { x: 5000, y: 3000 },
        fitMode: 'model_extents',
        heightMm: 220,
        rotationDeg: 0,
        scale: 0.02,
        widthMm: 360,
      },
      includeUnderlays: true,
      includeGrid: true,
      includeObjectLabels: false,
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });

    const parsed = JSON.parse(serializeDraftingModelJson(model));

    expect(parsed.model.drawingSheets).toHaveLength(1);
    expect(parsed.model.drawingSheets[0]).toMatchObject({
      id: 'drawing-sheet-1',
      includeUnderlays: true,
      rootSheetTemplateId: 'root-template-1',
      sheetNumber: 'S-101',
      viewport: {
        center: { x: 5000, y: 3000 },
        fitMode: 'model_extents',
      },
    });
  });

  it('exports project grid references as metadata-only model objects', () => {
    const model = createEmptyDraftingModel('drawing-project-grid-export');
    const projectGrid = {
      ...createDraftingObject('project_grid', { x: 1000, y: 2000 }, model),
      renderedImageData: 'data:image/png;base64,iVBORw0KGgo=',
      renderCacheKey: 'project-grid-render-cache',
      objectUrl: 'blob:project-grid-preview',
    } satisfies DraftingObject & Record<string, unknown>;
    const projectGridLine = {
      ...createDraftingObject('project_grid_line', { x: 0, y: 0 }, model, [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
      ]),
      renderedImageData: 'data:image/png;base64,grid-line',
      objectUrl: 'blob:grid-line-preview',
    } satisfies DraftingObject & Record<string, unknown>;
    const shaft = {
      ...createDraftingObject('shaft', { x: 0, y: 0 }, model, [
        { x: 0, y: 0 },
        { x: 1500, y: 0 },
      ]),
      renderCacheKey: 'shaft-render-cache',
    } satisfies DraftingObject & Record<string, unknown>;
    model.objects.push(projectGrid, projectGridLine, shaft);
    const sourceSnapshot = JSON.stringify(model);

    const exported = serializeDraftingModelJson(model);
    const parsed = JSON.parse(exported);
    const parsedModel = DraftingModelSchema.parse(parsed.model);

    expect(parsedModel.objects).toHaveLength(3);
    expect(parsedModel.objects[0]).toMatchObject({
      type: 'project_grid',
      layerId: 'grid',
      metadata: {
        gridId: 'GRID1',
        moduleSizeMm: 100,
        bubblePlacement: 'both',
        as1100Profile: 'modular_grid_informed',
      },
    });
    expect(parsedModel.objects[1]).toMatchObject({
      type: 'project_grid_line',
      layerId: 'grid',
      metadata: {
        gridLineId: 'GL1',
        bubblePlacement: 'both',
        as1100Profile: 'modular_grid_informed',
      },
    });
    expect(parsedModel.objects[2]).toMatchObject({
      type: 'shaft',
      layerId: 'shoring',
      parameters: {
        constructionType: 'secant_piles',
        sourceMode: 'manual_sketch',
      },
    });
    expect(exported).toContain('"type": "project_grid"');
    expect(exported).toContain('"type": "project_grid_line"');
    expect(exported).toContain('"type": "shaft"');
    expect(exported).not.toContain('data:image/png');
    expect(exported).not.toContain('blob:project-grid-preview');
    expect(exported).not.toContain('blob:grid-line-preview');
    expect(exported).not.toContain('"renderCacheKey"');
    expect(exported).not.toContain('"renderedImageData"');
    expect(exported).not.toContain('"objectUrl"');
    expect(JSON.stringify(model)).toBe(sourceSnapshot);
  });

  it('preserves text style and workspace metadata without exporting runtime fields', () => {
    const model = createEmptyDraftingModel('drawing-text-workspace-export');
    const note = {
      ...createDraftingObject('leader_note', { x: 1000, y: 2000 }, model),
      workspaceId: 'workspace-shoring',
      style: {
        fontFamily: 'ISOCP',
        textHeightMm: 3.5,
        fontWeight: 'bold' as const,
        fontStyle: 'italic' as const,
        textAlign: 'center' as const,
        textCase: 'uppercase' as const,
      },
      renderedTextCache: 'runtime-cache',
      objectUrl: 'blob:text-preview',
    } satisfies DraftingObject & Record<string, unknown>;
    model.objects.push(note);
    const sourceSnapshot = JSON.stringify(model);

    const exported = serializeDraftingModelJson(model, {
      exportedAt: '2026-05-01T00:00:00.000Z',
    });
    const parsed = JSON.parse(exported);
    const parsedModel = DraftingModelSchema.parse(parsed.model);

    expect(parsed.metadata.counts.workspaces).toBe(8);
    expect(parsedModel.workspaces?.map((workspace) => workspace.id)).toEqual(
      expect.arrayContaining(['workspace-all', 'workspace-shoring', 'workspace-services']),
    );
    expect(parsedModel.objects[0]).toMatchObject({
      type: 'leader_note',
      workspaceId: 'workspace-shoring',
      style: {
        fontFamily: 'ISOCP',
        textHeightMm: 3.5,
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
        textCase: 'uppercase',
      },
    });
    expect(exported).not.toContain('runtime-cache');
    expect(exported).not.toContain('blob:text-preview');
    expect(JSON.stringify(model)).toBe(sourceSnapshot);
  });
});

function createUnderlay(overrides: Partial<DraftingUnderlay> = {}): DraftingUnderlay {
  return {
    id: 'underlay-1',
    name: 'Survey underlay',
    fileId: 'document-1',
    fileName: 'survey.pdf',
    pageNumber: 1,
    visible: true,
    opacity: 0.6,
    locked: false,
    transform: {
      x: 100,
      y: 200,
      scale: 1,
      rotationDeg: 0,
    },
    crop: null,
    calibration: null,
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-22T00:00:00.000Z',
    ...overrides,
  };
}
