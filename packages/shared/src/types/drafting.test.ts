import { describe, expect, it } from 'vitest';
import {
  createEmptyDraftingModel,
  createDefaultDraftingLayers,
  defaultLayerIdForDraftingObjectType,
  ensureDraftingModelLayers,
} from './drafting.js';
import { DraftingModelSchema, DraftingUnderlaySchema } from '../schemas/drafting.js';

describe('drafting defaults', () => {
  it('creates a valid empty drafting model', () => {
    const model = createEmptyDraftingModel('drawing-123');
    const parsed = DraftingModelSchema.parse(model);

    expect(parsed.drawingId).toBe('drawing-123');
    expect(parsed.units).toBe('mm');
    expect(parsed.layers).toHaveLength(13);
    expect(parsed.objects).toHaveLength(0);
    expect(parsed.titleBlock).toEqual({});
    expect(parsed.revisionBlock).toEqual({ revisions: [] });
    expect(parsed.scheduleSheets).toEqual([]);
    expect(parsed.schedulePackIssues).toEqual([]);
    expect(parsed.drawingSheets).toEqual([]);
    expect(parsed.drawingSheetIssues).toEqual([]);
  });

  it('hydrates older drafting models without title, revision, schedule, or drawing sheet issue metadata', () => {
    const model = createEmptyDraftingModel('drawing-legacy');
    const legacyModel = JSON.parse(JSON.stringify(model));
    delete legacyModel.titleBlock;
    delete legacyModel.revisionBlock;
    delete legacyModel.scheduleSheets;
    delete legacyModel.schedulePackIssues;
    delete legacyModel.drawingSheets;
    delete legacyModel.drawingSheetIssues;
    const parsed = DraftingModelSchema.parse(legacyModel);

    expect(parsed.titleBlock).toEqual({});
    expect(parsed.revisionBlock).toEqual({ revisions: [] });
    expect(parsed.scheduleSheets).toEqual([]);
    expect(parsed.schedulePackIssues).toEqual([]);
    expect(parsed.drawingSheets).toEqual([]);
    expect(parsed.drawingSheetIssues).toEqual([]);
    expect(parsed.objectChangeEvents).toEqual([]);
    expect(parsed.underlays).toEqual([]);
    expect(parsed.objects).toEqual([]);
  });

  it('accepts and preserves title block metadata', () => {
    const model = createEmptyDraftingModel('drawing-title-block');
    model.titleBlock = {
      approvedBy: 'Principal',
      checkedBy: 'Checker',
      clientName: 'Harbour Client',
      discipline: 'Structural',
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Plan',
      drawnBy: 'Drafter',
      organisationName: 'EngPlatform Demo',
      projectName: 'NORTH SYDNEY',
      projectNumber: 'NS-001',
      scale: '1:100',
      sheetNumber: '1',
      sheetTotal: '3',
      status: 'for_review',
    };

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.titleBlock).toMatchObject({
      clientName: 'Harbour Client',
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Plan',
      status: 'for_review',
    });
  });

  it('accepts and preserves revision block metadata with the current revision selection', () => {
    const model = createEmptyDraftingModel('drawing-revision-block');
    model.revisionBlock = {
      currentRevision: 'B',
      revisions: [
        {
          approvedBy: 'Approver',
          checkedBy: 'Checker',
          date: '2026-04-24',
          description: 'Issued for review',
          drawnBy: 'Drafter',
          id: 'revision-a',
          issuedFor: 'Review',
          revision: 'A',
          status: 'for_review',
        },
        {
          approvedBy: 'Approver',
          checkedBy: 'Checker',
          date: '2026-04-25',
          description: 'Client markups incorporated',
          drawnBy: 'Drafter',
          id: 'revision-b',
          issuedFor: 'Information',
          revision: 'B',
          status: 'for_information',
        },
      ],
    };

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.revisionBlock.currentRevision).toBe('B');
    expect(parsed.revisionBlock.revisions).toHaveLength(2);
    expect(parsed.revisionBlock.revisions[1]).toMatchObject({
      description: 'Client markups incorporated',
      revision: 'B',
    });
  });

  it('accepts optional object provenance and model change events', () => {
    const model = createEmptyDraftingModel('drawing-provenance');
    const now = new Date('2026-04-24T00:00:00.000Z').toISOString();

    model.objects.push({
      id: 'pile-1',
      type: 'pile',
      layerId: 'piles',
      geometry: {
        centre: { x: 1000, y: 2000 },
        diameterMm: 600,
      },
      metadata: {
        pileId: 'P1',
      },
      provenance: {
        createdAt: now,
        createdBy: 'Avery Drafter',
        updatedAt: now,
        updatedBy: 'Avery Drafter',
        lastAction: 'created',
      },
      createdAt: now,
      updatedAt: now,
    });
    model.objectChangeEvents = [
      {
        id: 'event-1',
        objectId: 'pile-1',
        objectType: 'pile',
        action: 'deleted',
        at: now,
        by: 'Avery Drafter',
        summary: 'Deleted pile P1',
        source: 'drafting-editor',
      },
    ];

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.objects[0]).toMatchObject({
      provenance: {
        createdBy: 'Avery Drafter',
        lastAction: 'created',
      },
    });
    expect(parsed.objectChangeEvents).toHaveLength(1);
  });

  it('clones the default layers instead of reusing references', () => {
    const left = createDefaultDraftingLayers();
    const right = createDefaultDraftingLayers();

    left[0]!.visible = false;

    expect(right[0]!.visible).toBe(true);
  });

  it('maps authored object types to the expected default layer', () => {
    expect(defaultLayerIdForDraftingObjectType('pile')).toBe('piles');
    expect(defaultLayerIdForDraftingObjectType('secant_pile_wall')).toBe('shoring');
    expect(defaultLayerIdForDraftingObjectType('soldier_pile_wall')).toBe('shoring');
    expect(defaultLayerIdForDraftingObjectType('anchor_tieback')).toBe('anchors');
    expect(defaultLayerIdForDraftingObjectType('capping_beam')).toBe('beams_walers');
    expect(defaultLayerIdForDraftingObjectType('waler')).toBe('beams_walers');
    expect(defaultLayerIdForDraftingObjectType('excavation_line')).toBe('excavation');
    expect(defaultLayerIdForDraftingObjectType('monitoring_point')).toBe('monitoring');
    expect(defaultLayerIdForDraftingObjectType('leader_note')).toBe('notes');
    expect(defaultLayerIdForDraftingObjectType('dimension_chain')).toBe('dimensions');
    expect(defaultLayerIdForDraftingObjectType('callout')).toBe('notes');
    expect(defaultLayerIdForDraftingObjectType('section_marker')).toBe('sections');
    expect(defaultLayerIdForDraftingObjectType('borehole')).toBe('boreholes');
    expect(defaultLayerIdForDraftingObjectType('service_run')).toBe('services');
    expect(defaultLayerIdForDraftingObjectType('service_crossing')).toBe('services_conflicts');
  });

  it('hydrates missing default layers without disturbing existing layer settings', () => {
    const model = createEmptyDraftingModel('drawing-789');
    const withoutBeamLayer = {
      ...model,
      layers: model.layers
        .filter((layer) => layer.id !== 'beams_walers')
        .map((layer) => (layer.id === 'anchors' ? { ...layer, visible: false } : layer)),
    };

    const hydrated = ensureDraftingModelLayers(withoutBeamLayer);

    expect(hydrated.layers.find((layer) => layer.id === 'anchors')?.visible).toBe(false);
    expect(hydrated.layers.find((layer) => layer.id === 'beams_walers')).toMatchObject({
      name: 'Beams / Walers',
      visible: true,
    });
    expect(hydrated.layers.find((layer) => layer.id === 'sections')).toMatchObject({
      name: 'Sections',
      visible: true,
    });
    expect(hydrated.layers.find((layer) => layer.id === 'services_conflicts')).toMatchObject({
      name: 'Services / Conflicts',
      visible: true,
    });
  });

  it('validates PDF underlay configuration with uniform calibration metadata', () => {
    const parsed = DraftingUnderlaySchema.parse({
      id: 'underlay-1',
      name: 'Existing survey sheet',
      fileId: 'document-1',
      fileName: 'survey.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: {
        x: 1200,
        y: 2400,
        scale: 1.25,
        rotationDeg: 12,
      },
      crop: {
        x: 10,
        y: 20,
        width: 300,
        height: 450,
      },
      calibration: {
        method: 'two_point_uniform_scale',
        pdfPointA: { x: 10, y: 20 },
        pdfPointB: { x: 210, y: 20 },
        modelPointA: { x: 1200, y: 2400 },
        modelPointB: { x: 3700, y: 2400 },
        modelDistanceMm: 2500,
        calculatedScale: 12.5,
        calibratedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        warningAcknowledged: true,
      },
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });

    expect(parsed.calibration?.warningAcknowledged).toBe(true);
    expect(parsed.transform.scale).toBe(1.25);
  });

  it('preserves saved underlay configuration when a drafting model is parsed and reloaded', () => {
    const model = createEmptyDraftingModel('drawing-456');
    model.underlays.push({
      id: 'underlay-3',
      name: 'Reloaded PDF',
      fileId: 'document-3',
      fileName: 'reloaded.pdf',
      pageNumber: 2,
      visible: true,
      opacity: 0.5,
      locked: true,
      transform: {
        x: 500,
        y: 750,
        scale: 0.3527777778,
        rotationDeg: 8,
      },
      crop: {
        x: 12,
        y: 18,
        width: 280,
        height: 360,
      },
      calibration: null,
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.underlays).toHaveLength(1);
    expect(parsed.underlays[0]).toEqual(model.underlays[0]);
  });

  it('accepts and preserves saved schedule sheet definitions', () => {
    const model = createEmptyDraftingModel('drawing-schedule-pack');
    model.scheduleSheets.push({
      id: 'schedule-sheet-1',
      name: 'Anchor schedule pack',
      rootSheetTemplateId: 'root-template-1',
      templateId: null,
      pageSize: 'a3',
      orientation: 'landscape',
      includedScheduleGroups: ['anchors', 'shoring_piles'],
      title: 'Anchor Installation Schedule',
      subtitle: 'North wall hold points',
      revisionLabel: 'Rev B',
      issuePurpose: 'For coordination',
      projectMetadata: {
        checkedBy: 'MMA',
        preparedBy: 'JDS',
        projectCode: 'NSYD',
        projectName: 'NORTH SYDNEY',
      },
      tableDensity: 'compact',
      pageOrder: 1,
    });

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.scheduleSheets).toHaveLength(1);
    expect(parsed.scheduleSheets[0]).toMatchObject({
      id: 'schedule-sheet-1',
      includedScheduleGroups: ['anchors', 'shoring_piles'],
      pageSize: 'a3',
      rootSheetTemplateId: 'root-template-1',
      tableDensity: 'compact',
      title: 'Anchor Installation Schedule',
    });
  });

  it('accepts and preserves drawing sheet definitions', () => {
    const model = createEmptyDraftingModel('drawing-geometry-sheets');
    model.drawingSheets.push({
      id: 'drawing-sheet-1',
      name: 'Geometry Sheet 1',
      title: 'Retention Plan',
      sheetNumber: 'S-101',
      rootSheetTemplateId: 'root-template-1',
      pageSize: 'a3',
      orientation: 'landscape',
      scaleLabel: '1:100',
      viewport: {
        center: { x: 12500, y: 4500 },
        scale: 0.12,
        rotationDeg: 0,
        widthMm: 36000,
        heightMm: 22000,
        fitMode: 'model_extents',
      },
      layerFilter: {
        visibleLayerIds: ['piles', 'shoring'],
        hiddenLayerIds: ['notes'],
      },
      includeUnderlays: true,
      includeGrid: false,
      includeObjectLabels: true,
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.drawingSheets).toHaveLength(1);
    expect(parsed.drawingSheets[0]).toMatchObject({
      id: 'drawing-sheet-1',
      includeUnderlays: true,
      pageSize: 'a3',
      rootSheetTemplateId: 'root-template-1',
      scaleLabel: '1:100',
      sheetNumber: 'S-101',
      viewport: {
        center: { x: 12500, y: 4500 },
        fitMode: 'model_extents',
      },
    });
  });

  it('accepts and preserves drawing sheet issue snapshots', () => {
    const model = createEmptyDraftingModel('drawing-sheet-issue');
    const now = '2026-04-24T00:00:00.000Z';
    model.titleBlock = {
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Plan',
      projectName: 'NORTH SYDNEY',
    };
    model.revisionBlock = {
      currentRevision: 'A',
      revisions: [
        {
          approvedBy: 'APR',
          checkedBy: 'CHK',
          date: '2026-04-24',
          description: 'Issued for review',
          drawnBy: 'DRN',
          id: 'revision-a',
          issuedFor: 'Review',
          revision: 'A',
          status: 'for_review',
        },
      ],
    };
    model.drawingSheets.push({
      id: 'drawing-sheet-1',
      name: 'Geometry Sheet 1',
      title: 'Retention Plan',
      sheetNumber: 'S-101',
      rootSheetTemplateId: 'root-template-1',
      pageSize: 'a3',
      orientation: 'landscape',
      scaleLabel: '1:100',
      viewport: {
        center: { x: 12500, y: 4500 },
        scale: 0.12,
        rotationDeg: 0,
        widthMm: 360,
        heightMm: 220,
        fitMode: 'manual',
      },
      layerFilter: {
        hiddenLayerIds: ['notes'],
      },
      includeUnderlays: true,
      includeGrid: false,
      includeObjectLabels: true,
      createdAt: now,
      updatedAt: now,
    });
    model.objects.push({
      id: 'pile-1',
      type: 'pile',
      layerId: 'piles',
      geometry: {
        centre: { x: 1000, y: 2000 },
        diameterMm: 600,
      },
      metadata: {
        pileId: 'P1',
      },
      createdAt: now,
      updatedAt: now,
    });
    model.underlays.push({
      id: 'underlay-1',
      name: 'Survey',
      fileId: 'document-1',
      fileName: 'survey.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.65,
      locked: true,
      transform: { x: 10, y: 20, scale: 1, rotationDeg: 0 },
      crop: null,
      calibration: null,
      createdAt: now,
      updatedAt: now,
    });
    model.drawingSheetIssues.push({
      id: 'drawing-sheet-issue-1',
      issueNumber: 'ISS-001',
      revision: 'A',
      issueDate: now,
      issuedBy: 'Avery Drafter',
      purpose: 'For review',
      status: 'issued',
      notes: 'Frozen geometry sheet issue.',
      sheetIds: ['drawing-sheet-1'],
      lockedTitleBlock: model.titleBlock,
      lockedRevisionBlock: model.revisionBlock,
      lockedDrawingSheets: [
        {
          ...model.drawingSheets[0]!,
          templateSnapshot: {
            label: 'Geometry title sheet',
            rootSheetTemplateId: 'root-template-1',
            rootSheetTemplateName: 'Geometry title sheet',
            rootSheetTemplateVersionId: 'root-template-version-1',
            source: 'root_template',
            templateFingerprint: 'template-fingerprint-1',
            renderDefinition: {
              id: 'root-template-1',
              kind: 'shared_sheet',
              name: 'Geometry title sheet',
              objects: [],
              orientation: 'landscape',
              paperSize: 'a3',
            },
          },
        },
      ],
      lockedObjects: [
        {
          objectId: 'pile-1',
          objectType: 'pile',
          layerId: 'piles',
          label: 'P1',
          geometrySummary: 'pile at 1000,2000',
          scheduleKey: 'pile:P1',
          renderedState: model.objects[0],
        },
      ],
      lockedUnderlays: [
        {
          underlayId: 'underlay-1',
          fileId: 'document-1',
          fileName: 'survey.pdf',
          pageNumber: 1,
          visible: true,
          opacity: 0.65,
          locked: true,
          transform: { x: 10, y: 20, scale: 1, rotationDeg: 0 },
          crop: null,
          calibration: null,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.drawingSheetIssues).toHaveLength(1);
    expect(parsed.drawingSheetIssues[0]).toMatchObject({
      id: 'drawing-sheet-issue-1',
      issueNumber: 'ISS-001',
      lockedDrawingSheets: [
        {
          id: 'drawing-sheet-1',
          layerFilter: {
            hiddenLayerIds: ['notes'],
          },
          templateSnapshot: {
            rootSheetTemplateVersionId: 'root-template-version-1',
            source: 'root_template',
          },
          viewport: {
            center: { x: 12500, y: 4500 },
            fitMode: 'manual',
          },
        },
      ],
      lockedObjects: [
        {
          objectId: 'pile-1',
          objectType: 'pile',
          label: 'P1',
        },
      ],
      lockedUnderlays: [
        {
          underlayId: 'underlay-1',
          fileName: 'survey.pdf',
        },
      ],
      status: 'issued',
    });
  });

  it('accepts and preserves schedule pack issue snapshots', () => {
    const model = createEmptyDraftingModel('drawing-schedule-issue');
    model.scheduleSheets.push({
      id: 'schedule-sheet-1',
      name: 'Anchor schedule pack',
      rootSheetTemplateId: 'root-template-1',
      templateId: 'root-template-1',
      pageSize: 'a3',
      orientation: 'landscape',
      includedScheduleGroups: ['anchors'],
      title: 'Anchor Installation Schedule',
      revisionLabel: 'A',
      issuePurpose: 'For review',
      tableDensity: 'compact',
      pageOrder: 1,
    });
    model.schedulePackIssues.push({
      id: 'issue-1',
      name: 'Anchor schedule issue',
      revisionLabel: 'A',
      issuePurpose: 'For review',
      issueStatus: 'issued',
      issuedAt: '2026-04-23T00:00:00.000Z',
      includedScheduleSheetIds: ['schedule-sheet-1'],
      lockedSheetDefinitions: [
        {
          ...model.scheduleSheets[0]!,
          templateSnapshot: {
            source: 'root_template',
            label: 'Anchor sheet template',
            rootSheetTemplateId: 'root-template-1',
            rootSheetTemplateName: 'Anchor sheet template',
            rootSheetTemplateVersionId: 'root-template-version-1',
            templateFingerprint: 'fingerprint-1',
            safeArea: {
              x: 10,
              y: 10,
              width: 400,
              height: 277,
            },
            scheduleRegion: {
              x: 10,
              y: 42,
              width: 400,
              height: 200,
              sourceBlockId: 'details-block-1',
            },
            renderDefinition: {
              id: 'root-template-1',
              kind: 'shared_sheet',
              paperSize: 'a3',
            },
          },
        },
      ],
      lockedScheduleSummary: {
        counts: {
          anchors: 1,
        },
        drawingId: model.drawingId,
        groups: [
          {
            key: 'anchors',
            title: 'Anchor Schedule',
            description: 'Anchor tieback setout and load rows.',
            columns: [{ key: 'anchorId', label: 'Anchor ID' }],
            rows: [
              {
                id: 'anchor-row-1',
                sourceObjectId: 'anchor-1',
                objectType: 'anchor_tieback',
                cells: {
                  anchorId: 'A1',
                },
              },
            ],
          },
        ],
        units: 'mm',
      },
      pageCount: 1,
    });

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.schedulePackIssues).toHaveLength(1);
    expect(parsed.schedulePackIssues[0]).toMatchObject({
      id: 'issue-1',
      issueStatus: 'issued',
      lockedSheetDefinitions: [
        {
          id: 'schedule-sheet-1',
          templateSnapshot: {
            rootSheetTemplateVersionId: 'root-template-version-1',
            source: 'root_template',
            templateFingerprint: 'fingerprint-1',
          },
        },
      ],
      lockedScheduleSummary: {
        drawingId: 'drawing-schedule-issue',
      },
      pageCount: 1,
      revisionLabel: 'A',
    });
  });

  it('hydrates legacy issue snapshots that predate locked template snapshots', () => {
    const model = createEmptyDraftingModel('drawing-legacy-issue');
    model.schedulePackIssues.push({
      id: 'issue-legacy',
      name: 'Legacy Issue',
      revisionLabel: 'A',
      issuePurpose: 'For review',
      issueStatus: 'issued',
      includedScheduleSheetIds: ['schedule-sheet-1'],
      lockedSheetDefinitions: [
        {
          id: 'schedule-sheet-1',
          name: 'Legacy sheet',
          rootSheetTemplateId: 'root-template-1',
          templateId: 'root-template-1',
          pageSize: 'a3',
          orientation: 'landscape',
          includedScheduleGroups: ['anchors'],
          title: 'Legacy sheet',
          tableDensity: 'compact',
          pageOrder: 1,
        },
      ],
      lockedScheduleSummary: {
        counts: {},
        drawingId: model.drawingId,
        groups: [],
        units: 'mm',
      },
      pageCount: 0,
    });

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.schedulePackIssues[0]?.lockedSheetDefinitions[0]?.id).toBe('schedule-sheet-1');
    expect(parsed.schedulePackIssues[0]?.lockedSheetDefinitions[0]).not.toHaveProperty(
      'templateSnapshot',
    );
  });

  it('accepts and preserves semantic shoring drafting objects', () => {
    const model = createEmptyDraftingModel('drawing-semantic');
    const now = new Date('2026-04-22T00:00:00.000Z').toISOString();

    model.objects.push(
      {
        id: 'secant-wall-1',
        type: 'secant_pile_wall',
        layerId: 'shoring',
        name: 'Secant Wall 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#9a3412',
          fill: '#fed7aa',
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
          primarySecondaryPattern: 'hard_firm',
        },
        metadata: {
          wallId: 'SEC1',
          constructionMethod: 'secant bored piles',
          pileCount: 5,
          designNotes: 'Primary and secondary piles alternate.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'soldier-wall-1',
        type: 'soldier_pile_wall',
        layerId: 'shoring',
        name: 'Soldier Wall 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#92400e',
          lineWeight: 2,
        },
        geometry: {
          baselinePoints: [
            { x: 0, y: 2000 },
            { x: 6000, y: 2000 },
          ],
          pilePositions: [
            { x: 0, y: 2000 },
            { x: 2000, y: 2000 },
            { x: 4000, y: 2000 },
            { x: 6000, y: 2000 },
          ],
        },
        parameters: {
          sectionLabel: 'UC310',
          spacingMm: 2000,
          laggingType: 'timber lagging',
        },
        metadata: {
          wallId: 'SOL1',
          constructionMethod: 'soldier piles with lagging',
          pileCount: 4,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'anchor-1',
        type: 'anchor_tieback',
        layerId: 'anchors',
        name: 'Anchor 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#0f766e',
          lineWeight: 2,
        },
        geometry: {
          headPoint: { x: 0, y: 4000 },
          tailPoint: { x: 3500, y: 3000 },
        },
        parameters: {
          anchorId: 'A1',
          angleDeg: -15,
          planLengthMm: 3640,
          freeLengthMm: 2500,
          bondLengthMm: 1140,
          designLoadKn: 400,
          lockOffLoadKn: 320,
          stage: 'Stage 1',
        },
        metadata: {
          associatedWallId: 'SEC1',
          installationStage: 'Excavate to RL 9.5',
          notes: 'Stress anchor after capping beam cure.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'beam-1',
        type: 'capping_beam',
        layerId: 'beams_walers',
        name: 'Capping Beam 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#78350f',
          lineWeight: 3,
        },
        geometry: {
          points: [
            { x: 0, y: 5000 },
            { x: 5000, y: 5000 },
          ],
        },
        parameters: {
          beamId: 'CB1',
          widthMm: 900,
          depthMm: 1200,
          levelRl: 12.45,
          concreteGrade: '40 MPa',
        },
        metadata: {
          associatedWallId: 'SEC1',
          notes: 'Top of wall beam.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'waler-1',
        type: 'waler',
        layerId: 'beams_walers',
        name: 'Waler 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#7c2d12',
          lineWeight: 2,
        },
        geometry: {
          points: [
            { x: 0, y: 6500 },
            { x: 4500, y: 6500 },
          ],
        },
        parameters: {
          walerId: 'W1',
          sectionLabel: '2UC360',
          levelRl: 10.8,
          connectionNotes: 'Bolted to soldier pile flange.',
        },
        metadata: {
          associatedWallId: 'SOL1',
          notes: 'Temporary walers only.',
        },
        createdAt: now,
        updatedAt: now,
      },
    );

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.objects).toHaveLength(5);
    expect(parsed.objects.map((object) => object.type)).toEqual([
      'secant_pile_wall',
      'soldier_pile_wall',
      'anchor_tieback',
      'capping_beam',
      'waler',
    ]);
  });

  it('accepts and preserves semantic annotation and coordination drafting objects', () => {
    const model = createEmptyDraftingModel('drawing-annotations');
    const now = new Date('2026-04-22T00:00:00.000Z').toISOString();

    model.objects.push(
      {
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
            { x: 6000, y: 500 },
          ],
          offsetDistanceMm: 1200,
        },
        parameters: {
          dimensionId: 'DIM1',
          unit: 'mm',
          precision: 0,
          showSegments: true,
          showTotal: true,
          textOverride: 'Overall 6.0m',
        },
        metadata: {
          associatedObjectIds: ['wall-1', 'anchor-1'],
          notes: 'Verify against survey before issue.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'callout-1',
        type: 'callout',
        layerId: 'notes',
        name: 'Callout 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#111827',
          fill: '#ffffff',
          lineWeight: 1,
        },
        geometry: {
          anchorPoint: { x: 2000, y: 1500 },
          labelPoint: { x: 3200, y: 600 },
        },
        parameters: {
          calloutId: 'CO1',
          title: 'Coordination note',
          body: 'Confirm service pothole before tieback drilling.',
          leaderStyle: 'dogleg',
          arrowStyle: 'filled',
        },
        metadata: {
          associatedObjectId: 'service-run-1',
          notes: 'Issued for coordination only.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'section-1',
        type: 'section_marker',
        layerId: 'sections',
        name: 'Section 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#1e293b',
          lineWeight: 2,
        },
        geometry: {
          startPoint: { x: 0, y: 2500 },
          endPoint: { x: 5000, y: 2500 },
        },
        parameters: {
          sectionId: 'S1',
          sectionLabel: 'A-A',
          sheetReference: 'SK-201',
          arrowDirection: 'both',
        },
        metadata: {
          linkedDrawingId: 'drawing-section-a',
          notes: 'Use excavation long-section sheet.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'borehole-1',
        type: 'borehole',
        layerId: 'boreholes',
        name: 'Borehole 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#0f766e',
          fill: '#dcfce7',
          lineWeight: 2,
        },
        geometry: {
          point: { x: 1800, y: 4200 },
        },
        parameters: {
          boreholeId: 'BH1',
          label: 'BH-01',
          groundLevelRl: 12.45,
          terminationDepthM: 18.2,
          terminationLevelRl: -5.75,
          boreholeType: 'rotary wash bore',
        },
        metadata: {
          linkedGeotechEntityId: 'geotech-bh-1',
          sourceReference: 'GI-2026-04',
          notes: 'Derived from geotech factual report.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'service-run-1',
        type: 'service_run',
        layerId: 'services',
        name: 'Service Run 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#475569',
          lineWeight: 2,
          lineStyle: 'dashed',
        },
        geometry: {
          path: [
            { x: 500, y: 5200 },
            { x: 2800, y: 5200 },
            { x: 4200, y: 5800 },
          ],
        },
        parameters: {
          serviceId: 'SR1',
          serviceType: 'water',
          status: 'existing',
          diameterMm: 150,
          depthM: 1.6,
          levelRl: 10.8,
          authority: 'Sydney Water',
        },
        metadata: {
          sourceReference: 'DBYD 240423',
          surveyConfidence: 'approximate',
          notes: 'Pothole required near wall return.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'service-crossing-1',
        type: 'service_crossing',
        layerId: 'services_conflicts',
        name: 'Service Crossing 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#b91c1c',
          fill: '#fee2e2',
          lineWeight: 2,
        },
        geometry: {
          crossingPoint: { x: 3200, y: 5400 },
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
          notes: 'Review clearance with temporary works designer.',
        },
        createdAt: now,
        updatedAt: now,
      },
    );

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.objects).toHaveLength(6);
    expect(parsed.objects.map((object) => object.type)).toEqual([
      'dimension_chain',
      'callout',
      'section_marker',
      'borehole',
      'service_run',
      'service_crossing',
    ]);
  });

  it('rejects invalid semantic shoring object parameters', () => {
    const now = new Date('2026-04-22T00:00:00.000Z').toISOString();

    expect(() =>
      DraftingModelSchema.parse({
        ...createEmptyDraftingModel('drawing-invalid'),
        objects: [
          {
            id: 'secant-invalid',
            type: 'secant_pile_wall',
            layerId: 'shoring',
            geometry: {
              baselinePoints: [
                { x: 0, y: 0 },
                { x: 6000, y: 0 },
              ],
              pileCentres: [
                { x: 0, y: 0 },
                { x: 1500, y: 0 },
              ],
            },
            parameters: {
              pileDiameterMm: 900,
              spacingMm: 1500,
              primarySecondaryPattern: 'hard_soft',
            },
            metadata: {
              wallId: 'SEC1',
              constructionMethod: 'secant bored piles',
              pileCount: 3,
            },
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects invalid semantic annotation object parameters', () => {
    const now = new Date('2026-04-22T00:00:00.000Z').toISOString();

    expect(() =>
      DraftingModelSchema.parse({
        ...createEmptyDraftingModel('drawing-invalid-annotations'),
        objects: [
          {
            id: 'dimension-invalid',
            type: 'dimension_chain',
            layerId: 'dimensions',
            geometry: {
              points: [
                { x: 0, y: 0 },
                { x: 1000, y: 0 },
              ],
            },
            parameters: {
              dimensionId: 'DIMX',
              unit: 'mm',
              precision: 0,
              showSegments: true,
              showTotal: true,
            },
            metadata: {},
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects saved calibration metadata when the warning has not been acknowledged', () => {
    expect(() =>
      DraftingUnderlaySchema.parse({
        id: 'underlay-2',
        name: 'Unacknowledged calibration',
        fileId: 'document-2',
        fileName: 'calibration.pdf',
        pageNumber: 1,
        visible: true,
        opacity: 1,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          scale: 1,
          rotationDeg: 0,
        },
        calibration: {
          method: 'two_point_uniform_scale',
          pdfPointA: { x: 0, y: 0 },
          pdfPointB: { x: 100, y: 0 },
          modelPointA: { x: 0, y: 0 },
          modelPointB: { x: 1000, y: 0 },
          modelDistanceMm: 1000,
          calculatedScale: 10,
          calibratedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
          warningAcknowledged: false,
        },
        createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      }),
    ).toThrow();
  });
});
