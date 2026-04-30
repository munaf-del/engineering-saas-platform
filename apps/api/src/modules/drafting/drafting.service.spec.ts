import { BadRequestException } from '@nestjs/common';

jest.mock('@eng/shared', () => {
  const { z } = require('zod');

  const pointSchema = z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  });

  const layerSchema = z.object({
    id: z.string(),
    name: z.string(),
    visible: z.boolean(),
    locked: z.boolean(),
    color: z.string(),
    lineWeight: z.number().finite(),
  });

  const underlayTransformSchema = z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    scale: z.number().positive(),
    rotationDeg: z.number().finite(),
  });

  const underlayCropSchema = z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive(),
    height: z.number().positive(),
  });

  const underlayCalibrationSchema = z.object({
    method: z.literal('two_point_uniform_scale'),
    pdfPointA: pointSchema,
    pdfPointB: pointSchema,
    modelPointA: pointSchema,
    modelPointB: pointSchema,
    modelDistanceMm: z.number().positive(),
    calculatedScale: z.number().positive(),
    calibratedAt: z.string().datetime(),
    warningAcknowledged: z.literal(true),
  });

  const underlaySchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    fileId: z.string().min(1),
    fileName: z.string().min(1),
    pageNumber: z.number().int().positive(),
    visible: z.boolean(),
    opacity: z.number().min(0).max(1),
    locked: z.boolean(),
    transform: underlayTransformSchema,
    crop: underlayCropSchema.nullable().optional(),
    calibration: underlayCalibrationSchema.nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const objectBaseSchema = z.object({
    id: z.string(),
    layerId: z.string(),
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
    sourceRef: z.record(z.unknown()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

  const draftingModelSchema = z.object({
    version: z.literal(1),
    units: z.literal('mm'),
    drawingId: z.string(),
    view: z.object({
      scale: z.number().positive(),
      offsetX: z.number().finite(),
      offsetY: z.number().finite(),
    }),
    layers: z.array(layerSchema),
    underlays: z.array(underlaySchema),
    objects: z.array(
      z.discriminatedUnion('type', [
        objectBaseSchema.extend({
          type: z.literal('pile'),
          geometry: z.object({
            centre: pointSchema,
            diameterMm: z.number().positive(),
          }),
          metadata: z.object({
            pileId: z.string().min(1),
          }),
        }),
        objectBaseSchema.extend({
          type: z.literal('excavation_line'),
          geometry: z.object({
            points: z.array(pointSchema).min(2),
            closed: z.boolean().optional(),
          }),
          metadata: z.record(z.unknown()).optional(),
        }),
        objectBaseSchema.extend({
          type: z.literal('monitoring_point'),
          geometry: z.object({
            point: pointSchema,
          }),
          metadata: z.object({
            pointId: z.string().min(1),
            monitoringType: z.string().min(1),
          }),
        }),
        objectBaseSchema.extend({
          type: z.literal('leader_note'),
          geometry: z.object({
            anchor: pointSchema,
            textPoint: pointSchema,
          }),
          metadata: z.object({
            text: z.string().min(1),
          }),
        }),
      ]),
    ),
    titleBlock: z
      .object({
        drawingTitle: z.string().optional(),
        drawingNumber: z.string().optional(),
        status: z.string().optional(),
      })
      .default({}),
    revisionBlock: z
      .object({
        currentRevision: z.string().optional(),
        revisions: z.array(z.record(z.unknown())).default([]),
      })
      .default({ revisions: [] }),
    scheduleSheets: z.array(z.unknown()).default([]),
    schedulePackIssues: z.array(z.unknown()).default([]),
    drawingSheets: z.array(z.unknown()).default([]),
    drawingSheetIssues: z.array(z.unknown()).default([]),
    drawingTransmittals: z.array(z.unknown()).default([]),
  });

  return {
    DraftingModelSchema: draftingModelSchema,
    DraftingProjectTransmittalPayloadSchema: z.object({
      cc: z.array(z.string()),
      includedItems: z.array(z.record(z.unknown())).min(1),
      issuedAt: z.string().optional(),
      issuedBy: z.string().optional(),
      issuedTo: z.array(z.string()),
      manifestSignature: z.string().optional(),
      notes: z.string().optional(),
      provenanceSummary: z.record(z.unknown()),
      purpose: z.string(),
      status: z.string(),
      title: z.string(),
      warningSummary: z.array(z.string()),
    }),
    createEmptyDraftingModel(drawingId: string) {
      return createEmptyModel(drawingId);
    },
  };
});

import { DraftingService } from './drafting.service';

const testProjectId = '11111111-1111-1111-1111-111111111111';
const testOrganisationId = '22222222-2222-2222-2222-222222222222';
const testUserId = '33333333-3333-3333-3333-333333333333';
const testDrawingId = '44444444-4444-4444-4444-444444444444';

describe('DraftingService', () => {
  const access = {
    projectId: testProjectId,
    organisationId: testOrganisationId,
    userId: testUserId,
    orgRole: 'engineer',
  } as const;
  const drawingId = testDrawingId;

  let prisma: {
    project: { findFirst: jest.Mock };
    draftingDrawing: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    projectDraftingTransmittal: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    pileGroup: { findMany: jest.Mock };
    pileCapacityProfile: { findMany: jest.Mock };
    pileDesignCheck: { findMany: jest.Mock };
    projectSpatialFeature: { findMany: jest.Mock };
    projectEnvironmentalMonitoringLocation: { findMany: jest.Mock };
    projectEnvironmentalMonitoringDataset: { findMany: jest.Mock };
  };
  let documentsService: {
    create: jest.Mock;
    findById: jest.Mock;
  };
  let service: DraftingService;

  function buildDrawingRecord(
    overrides: Partial<{ kind: string; modelJson: Record<string, unknown>; status: string }> = {},
  ) {
    const now = new Date('2026-04-21T00:00:00.000Z');

    return {
      id: drawingId,
      projectId: access.projectId,
      title: 'Drafting QA Drawing',
      kind: overrides.kind ?? 'sketch',
      status: overrides.status ?? 'draft',
      currentRevision: 0,
      modelVersion: 1,
      modelJson: overrides.modelJson ?? createEmptyModel(drawingId),
      createdById: access.userId,
      updatedById: access.userId,
      createdAt: now,
      updatedAt: now,
      revisions: [],
    };
  }

  beforeEach(() => {
    prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: access.projectId,
          organisationId: access.organisationId,
          members: [{ userId: access.userId, role: 'lead' }],
        }),
      },
      draftingDrawing: {
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve(
            buildDrawingRecord({
              kind: args.data?.kind ?? 'sketch',
              modelJson: args.data?.modelJson,
            }),
          ),
        ),
        findMany: jest
          .fn()
          .mockResolvedValue([
            buildDrawingRecord({ kind: 'model', modelJson: issuedSheetModel() }),
          ]),
        findFirst: jest.fn().mockResolvedValue(buildDrawingRecord()),
        update: jest.fn().mockImplementation((args) =>
          Promise.resolve(
            buildDrawingRecord({
              kind: args.data?.kind ?? 'sketch',
              status: args.data?.status ?? 'draft',
              modelJson: args.data?.modelJson,
            }),
          ),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      projectDraftingTransmittal: {
        create: jest
          .fn()
          .mockImplementation((args) => Promise.resolve(buildProjectTransmittalRecord(args.data))),
        findFirst: jest.fn().mockResolvedValue(buildProjectTransmittalRecord()),
        findMany: jest.fn().mockResolvedValue([buildProjectTransmittalRecord()]),
        update: jest
          .fn()
          .mockImplementation((args) => Promise.resolve(buildProjectTransmittalRecord(args.data))),
      },
      pileGroup: { findMany: jest.fn().mockResolvedValue([buildPileGroupRecord()]) },
      pileCapacityProfile: { findMany: jest.fn().mockResolvedValue([]) },
      pileDesignCheck: { findMany: jest.fn().mockResolvedValue([]) },
      projectSpatialFeature: {
        findMany: jest.fn().mockResolvedValue([
          buildSpatialFeatureRecord({
            featureType: 'borehole',
            label: 'nh',
            propertiesJson: { boreholeId: 'nh', depthM: 12, rlM: 3 },
          }),
          buildSpatialFeatureRecord({
            id: 'spatial-vm-1',
            featureType: 'vibration_monitor',
            label: 'VM1',
            propertiesJson: { monitorId: 'VM1' },
          }),
          buildSpatialFeatureRecord({
            id: 'spatial-service-run-1',
            featureType: 'service_run',
            geometryType: 'line_string',
            label: 'W-EX-01',
            propertiesJson: {
              serviceType: 'water',
              status: 'existing',
              authority: 'Sydney Water',
              diameterMm: '150',
              sourceReference: 'DBYD 240423',
            },
          }),
          buildSpatialFeatureRecord({
            id: 'spatial-service-crossing-1',
            featureType: 'service_crossing',
            label: 'SC-01',
            propertiesJson: {
              serviceType: 'water',
              conflictType: 'crosses_anchor',
              linkedServiceSourceId: 'spatial-service-run-1',
              clearanceMm: '450',
            },
          }),
        ]),
      },
      projectEnvironmentalMonitoringLocation: { findMany: jest.fn().mockResolvedValue([]) },
      projectEnvironmentalMonitoringDataset: { findMany: jest.fn().mockResolvedValue([]) },
    };

    documentsService = {
      create: jest.fn().mockImplementation((_access, _dto, file) =>
        Promise.resolve(
          buildDocument({
            fileName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          }),
        ),
      ),
      findById: jest.fn().mockResolvedValue(buildDocument()),
    };

    service = new DraftingService(prisma as never, documentsService as never);
  });

  it('creates one project model canvas by demoting other active model records', async () => {
    await service.createDrawing(access, { title: 'Ignored title', kind: 'model' });

    expect(prisma.draftingDrawing.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: access.projectId,
        kind: 'model',
        status: { not: 'archived' },
      },
      data: {
        kind: 'sketch',
        updatedById: access.userId,
      },
    });
    expect(prisma.draftingDrawing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: 'model',
          title: 'Project Model',
        }),
      }),
    );
  });

  it('does not allow archiving the active project model canvas', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValueOnce(buildDrawingRecord({ kind: 'model' }));

    await expect(service.updateDrawing(access, drawingId, { status: 'archived' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid drafting model payloads before persisting', async () => {
    const invalidModel = {
      ...createEmptyModel(drawingId),
      objects: [
        {
          id: 'pile-1',
          type: 'pile',
          layerId: 'piles',
          visible: true,
          locked: false,
          geometry: {
            centre: { x: 0, y: 0 },
            diameterMm: -100,
          },
          metadata: {
            pileId: 'P-INVALID',
          },
          createdAt: new Date('2026-04-21T00:00:00.000Z').toISOString(),
          updatedAt: new Date('2026-04-21T00:00:00.000Z').toISOString(),
        },
      ],
    };

    await expect(service.saveModel(access, drawingId, invalidModel)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.draftingDrawing.update).not.toHaveBeenCalled();
  });

  it('restores archived drawings when a valid model is saved', async () => {
    prisma.draftingDrawing.findFirst
      .mockResolvedValueOnce(buildDrawingRecord({ status: 'archived' }))
      .mockResolvedValueOnce(buildDrawingRecord({ status: 'draft' }));
    prisma.draftingDrawing.update
      .mockResolvedValueOnce(buildDrawingRecord({ status: 'archived' }))
      .mockResolvedValueOnce(buildDrawingRecord({ status: 'draft' }));

    const result = await service.saveModel(access, drawingId, createEmptyModel(drawingId));

    expect(prisma.draftingDrawing.update).toHaveBeenCalledTimes(2);
    expect(prisma.draftingDrawing.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: drawingId },
        data: expect.objectContaining({
          status: 'draft',
          updatedById: access.userId,
        }),
      }),
    );
    expect(result.status).toBe('draft');
  });

  it('persists title block and revision block metadata through the model save path', async () => {
    const model = {
      ...createEmptyModel(drawingId),
      revisionBlock: {
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
      },
      titleBlock: {
        drawingNumber: 'S-1001',
        drawingTitle: 'Retention Wall General Arrangement',
        status: 'for_review',
      },
    };

    await service.saveModel(access, drawingId, model);

    expect(prisma.draftingDrawing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          modelJson: expect.objectContaining({
            revisionBlock: model.revisionBlock,
            titleBlock: model.titleBlock,
          }),
        }),
      }),
    );
  });

  it('persists drawing sheet definitions through the model save path', async () => {
    const model = {
      ...createEmptyModel(drawingId),
      drawingSheets: [
        {
          id: 'drawing-sheet-1',
          name: 'Geometry Sheet',
          title: 'Retention Wall Plan',
          sheetNumber: 'S-101',
          rootSheetTemplateId: null,
          pageSize: 'a3',
          orientation: 'landscape',
          scaleLabel: 'Fit',
          viewport: {
            center: { x: 1000, y: 2000 },
            fitMode: 'model_extents',
            heightMm: 220,
            rotationDeg: 0,
            scale: 0.01,
            widthMm: 360,
          },
          includeUnderlays: true,
          includeGrid: true,
          includeObjectLabels: true,
          createdAt: '2026-04-24T00:00:00.000Z',
          updatedAt: '2026-04-24T00:00:00.000Z',
        },
      ],
    };

    await service.saveModel(access, drawingId, model);

    expect(prisma.draftingDrawing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          modelJson: expect.objectContaining({
            drawingSheets: model.drawingSheets,
          }),
        }),
      }),
    );
  });

  it('persists drawing transmittals through the model save path', async () => {
    const model = {
      ...createEmptyModel(drawingId),
      drawingTransmittals: [
        {
          id: 'transmittal-1',
          transmittalNumber: 'TRN-001',
          title: 'Drawing issue package',
          purpose: 'For information',
          status: 'issued',
          issueDate: '2026-04-24T00:00:00.000Z',
          issuedBy: 'Avery Drafter',
          issuedTo: ['client@example.com'],
          cc: [],
          includedDrawingSheetIssueIds: ['issue-1'],
          includedSheets: [
            {
              drawingSheetIssueId: 'issue-1',
              sheetId: 'sheet-1',
              sheetNumber: 'S-101',
              sheetName: 'Geometry Sheet',
              revision: 'B',
              status: 'issued',
              issueNumber: 'ISS-001',
              snapshotLabel: 'ISS-001 Rev B - S-101 Geometry Sheet',
            },
          ],
          createdAt: '2026-04-24T00:00:00.000Z',
          updatedAt: '2026-04-24T00:00:00.000Z',
        },
      ],
    };

    await service.saveModel(access, drawingId, model);

    expect(prisma.draftingDrawing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          modelJson: expect.objectContaining({
            drawingTransmittals: model.drawingTransmittals,
          }),
        }),
      }),
    );
  });

  it('persists PDF underlay metadata through the model save path without runtime payloads', async () => {
    const expectedUnderlay = createPdfUnderlay({
      visible: false,
      locked: true,
    });
    const rawUnderlay = createPdfUnderlay({
      visible: false,
      locked: true,
      pdfBytes: 'data:application/pdf;base64,JVBERi0xLjQ=',
      renderedImageData: 'data:image/png;base64,iVBORw0KGgo=',
      imageUrl: 'blob:rendered-underlay-page',
      objectUrl: 'blob:pdf-object-url',
      renderCache: {
        viewport: { width: 800, height: 600 },
      },
    });
    const model = {
      ...createEmptyModel(drawingId),
      underlays: [rawUnderlay],
    };
    const inputSnapshot = JSON.stringify(model);

    const result = await service.saveModel(access, drawingId, model);
    const savedModelJson = prisma.draftingDrawing.update.mock.calls[0]?.[0].data.modelJson;
    const serializedSavedModel = JSON.stringify(savedModelJson);

    expect(savedModelJson).toEqual(
      expect.objectContaining({
        underlays: [expectedUnderlay],
      }),
    );
    expect(result.model.underlays).toEqual([expectedUnderlay]);
    expect(serializedSavedModel).not.toContain('pdfBytes');
    expect(serializedSavedModel).not.toContain('renderedImageData');
    expect(serializedSavedModel).not.toContain('imageUrl');
    expect(serializedSavedModel).not.toContain('objectUrl');
    expect(serializedSavedModel).not.toContain('renderCache');
    expect(serializedSavedModel).not.toContain('data:application/pdf');
    expect(serializedSavedModel).not.toContain('data:image/png');
    expect(serializedSavedModel).not.toContain('blob:');
    expect(JSON.stringify(model)).toBe(inputSnapshot);
  });

  it('loads stored PDF underlay metadata without returning runtime payloads', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValueOnce(
      buildDrawingRecord({
        modelJson: {
          ...createEmptyModel(drawingId),
          underlays: [
            createPdfUnderlay({
              pdfBytes: 'data:application/pdf;base64,JVBERi0xLjQ=',
              renderedImageData: 'data:image/png;base64,iVBORw0KGgo=',
              imageUrl: 'blob:rendered-underlay-page',
              objectUrl: 'blob:pdf-object-url',
              renderCache: {
                viewport: { width: 800, height: 600 },
              },
            }),
          ],
        },
      }),
    );

    const result = await service.findDrawing(access, drawingId);
    const serializedModel = JSON.stringify(result.model);

    expect(result.model.underlays).toEqual([createPdfUnderlay()]);
    expect(serializedModel).not.toContain('pdfBytes');
    expect(serializedModel).not.toContain('renderedImageData');
    expect(serializedModel).not.toContain('imageUrl');
    expect(serializedModel).not.toContain('objectUrl');
    expect(serializedModel).not.toContain('renderCache');
    expect(serializedModel).not.toContain('data:application/pdf');
    expect(serializedModel).not.toContain('data:image/png');
    expect(serializedModel).not.toContain('blob:');
  });

  it('rejects malformed PDF underlay metadata before persisting', async () => {
    const malformedCases = [
      {
        label: 'invalid page number',
        underlay: createPdfUnderlay({ pageNumber: 0 }),
      },
      {
        label: 'invalid transform scale',
        underlay: createPdfUnderlay({ transform: { ...createPdfUnderlay().transform, scale: 0 } }),
      },
      {
        label: 'invalid crop size',
        underlay: createPdfUnderlay({ crop: { ...createPdfUnderlay().crop, width: 0 } }),
      },
      {
        label: 'unacknowledged calibration warning',
        underlay: createPdfUnderlay({
          calibration: { ...createPdfUnderlay().calibration, warningAcknowledged: false },
        }),
      },
    ];

    for (const malformedCase of malformedCases) {
      const model = {
        ...createEmptyModel(drawingId),
        underlays: [malformedCase.underlay],
      };
      const inputSnapshot = JSON.stringify(model);

      await expect(service.saveModel(access, drawingId, model)).rejects.toThrow(
        BadRequestException,
      );
      expect(JSON.stringify(model)).toBe(inputSnapshot);
    }

    expect(prisma.draftingDrawing.update).not.toHaveBeenCalled();
  });

  it('builds a project engineering source registry for Drafting', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValue(
      buildDrawingRecord({
        kind: 'model',
        modelJson: {
          ...createEmptyModel(drawingId),
          objects: [
            {
              id: 'drafting-j1',
              type: 'pile',
              layerId: 'piles',
              visible: true,
              locked: false,
              geometry: { centre: { x: 0, y: 0 }, diameterMm: 600 },
              metadata: { pileId: 'J1' },
              sourceRef: {
                sourceType: 'foundation_pile',
                sourceId: 'pile-group-1:joint:J1',
                sourceLabel: 'J1',
              },
              createdAt: '2026-04-21T00:00:00.000Z',
              updatedAt: '2026-04-21T00:00:00.000Z',
            },
          ],
        },
      }),
    );

    const registry = await service.buildSourceRegistry(access, drawingId);

    expect(registry.projectId).toBe(access.projectId);
    expect(registry.sources.foundation.pileTypes.map((source) => source.sourceCode)).toEqual([
      'BP1',
      'BP2',
      'BP3',
      'BP4',
    ]);
    expect(registry.sources.foundation.placedPiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceCode: 'J1',
          alreadyRepresentedInDrafting: true,
          existingDraftingObjectId: 'drafting-j1',
          sourcePath: 'pile_groups.metadata.multiPile.joints[0]',
        }),
      ]),
    );
    expect(registry.sources.geotech.boreholes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceLabel: 'nh',
          originModule: 'spatial',
          engineering: expect.objectContaining({ boreholeId: 'nh' }),
        }),
      ]),
    );
    expect(registry.sources.monitoring.monitoringPoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceLabel: 'VM1',
          originModule: 'spatial',
        }),
      ]),
    );
    expect(registry.sources.spatial.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceLabel: 'W-EX-01',
          category: 'service_run',
          completeness: 'partial',
          engineering: expect.objectContaining({
            serviceType: 'water',
            serviceStatus: 'existing',
            authority: 'Sydney Water',
            diameterMm: 150,
          }),
          snapshot: expect.objectContaining({
            objectType: 'service_run',
            sourcePath: 'project_spatial_features',
            originModule: 'spatial',
          }),
        }),
        expect.objectContaining({
          sourceLabel: 'SC-01',
          category: 'service_crossing',
          engineering: expect.objectContaining({
            conflictType: 'crosses_anchor',
            linkedServiceSourceId: 'spatial-service-run-1',
            clearanceMm: 450,
          }),
          snapshot: expect.objectContaining({ objectType: 'service_crossing' }),
        }),
      ]),
    );
    expect(registry.sources.services).toEqual(
      expect.objectContaining({
        serviceRuns: [
          expect.objectContaining({
            sourceLabel: 'W-EX-01',
            category: 'service_run',
            originModule: 'spatial',
            sourcePath: 'project_spatial_features',
          }),
        ],
        serviceCrossings: [
          expect.objectContaining({
            sourceLabel: 'SC-01',
            category: 'service_crossing',
            originModule: 'spatial',
            sourcePath: 'project_spatial_features',
          }),
        ],
        warnings: [],
      }),
    );
    expect(registry.warnings).not.toContain(
      'No explicit project service/utility sources found. Sketch services remain unlinked until project service sources are added.',
    );
  });

  it('creates a project transmittal with issued sheet snapshots from multiple drawings', async () => {
    const secondDrawingId = '55555555-5555-5555-5555-555555555555';
    prisma.draftingDrawing.findMany.mockResolvedValue([
      buildDrawingRecord({ modelJson: issuedSheetModel({ drawingId }) }),
      {
        ...buildDrawingRecord({
          modelJson: issuedSheetModel({
            drawingId: secondDrawingId,
            issueId: 'issue-2',
            sheetId: 'sheet-2',
            sheetNumber: 'S-201',
          }),
        }),
        id: secondDrawingId,
        title: 'Drafting QA Drawing 2',
      },
    ]);

    const result = await service.createProjectTransmittal(access, {
      includedItems: [
        { drawingId, drawingSheetIssueId: 'issue-1', sheetId: 'sheet-1' },
        { drawingId: secondDrawingId, drawingSheetIssueId: 'issue-2', sheetId: 'sheet-2' },
      ],
      issuedBy: 'Avery Drafter',
      issuedTo: ['client@example.com'],
      purpose: 'For information',
      status: 'issued',
      title: 'Multi drawing package',
      transmittalNumber: 'TRN-001',
    });

    expect(prisma.projectDraftingTransmittal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organisationId: access.organisationId,
          projectId: access.projectId,
          status: 'issued',
          transmittalNumber: 'TRN-001',
        }),
      }),
    );
    expect(result.payload.includedItems).toHaveLength(2);
    expect(result.payload.includedItems[0]?.profileAudit).toMatchObject({
      activeProfileId: 'as1100-structural',
      provenance: {
        source: 'frozen',
        status: 'frozen',
      },
      schemaVersion: 'drafting.profile-audit.v1',
    });
    expect(result.payload.includedItems[1]?.profileAuditProvenance).toMatchObject({
      source: 'frozen',
      status: 'frozen',
    });
    expect(result.payload.provenanceSummary.drawingCount).toBe(2);
    expect(result.payload.manifestSignature).toMatch(/^sig-[0-9a-f]{8}$/);
  });

  it('rejects project transmittal items that reference draft sheet issues', async () => {
    prisma.draftingDrawing.findMany.mockResolvedValue([
      buildDrawingRecord({ modelJson: issuedSheetModel({ issueStatus: 'draft' }) }),
    ]);

    await expect(
      service.createProjectTransmittal(access, {
        includedItems: [{ drawingId, drawingSheetIssueId: 'issue-1', sheetId: 'sheet-1' }],
        purpose: 'For information',
        title: 'Draft-only package',
        transmittalNumber: 'TRN-001',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('locks issued project transmittals against later edits', async () => {
    prisma.projectDraftingTransmittal.findFirst.mockResolvedValue(
      buildProjectTransmittalRecord({ status: 'issued' }),
    );

    await expect(
      service.updateProjectTransmittal(access, '66666666-6666-6666-6666-666666666666', {
        includedItems: [{ drawingId, drawingSheetIssueId: 'issue-1', sheetId: 'sheet-1' }],
        purpose: 'For information',
        title: 'Edited package',
        transmittalNumber: 'TRN-001',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.projectDraftingTransmittal.update).not.toHaveBeenCalled();
  });

  it('uploads PDF evidence for an issued transmittal', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValue(
      buildDrawingRecord({ modelJson: issuedModel() }),
    );

    const result = await service.uploadTransmittalEvidence(
      access,
      drawingId,
      'transmittal-1',
      { notes: 'Signed PDF evidence' },
      pdfFile(),
    );

    expect(documentsService.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        entityType: 'drafting_transmittal_pdf_evidence',
        projectId: access.projectId,
      }),
      expect.objectContaining({ mimetype: 'application/pdf' }),
    );
    expect(result.model.drawingTransmittals[0]).toMatchObject({
      artifactDocumentId: 'document-1',
      artifactFileName: 'evidence.pdf',
      artifactMimeType: 'application/pdf',
      artifactStatus: 'attached',
    });
  });

  it('rejects non-PDF evidence uploads', async () => {
    await expect(
      service.uploadTransmittalEvidence(
        access,
        drawingId,
        'transmittal-1',
        {},
        pdfFile({
          mimetype: 'text/plain',
          originalname: 'evidence.txt',
          buffer: Buffer.from('no'),
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(documentsService.create).not.toHaveBeenCalled();
  });

  it('attaches an existing PDF project document to an issued transmittal', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValue(
      buildDrawingRecord({ modelJson: issuedModel() }),
    );

    const result = await service.attachTransmittalEvidence(access, drawingId, 'transmittal-1', {
      documentId: 'document-1',
      notes: 'Saved from browser print',
    });

    expect(documentsService.findById).toHaveBeenCalledWith(
      'document-1',
      expect.objectContaining({ organisationId: access.organisationId }),
    );
    expect(result.model.drawingTransmittals[0]).toMatchObject({
      artifactDocumentId: 'document-1',
      artifactMimeType: 'application/pdf',
      artifactNotes: 'Saved from browser print',
    });
  });

  it('rejects attaching an existing non-PDF project document', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValue(
      buildDrawingRecord({ modelJson: issuedModel() }),
    );
    documentsService.findById.mockResolvedValue(buildDocument({ mimeType: 'image/png' }));

    await expect(
      service.attachTransmittalEvidence(access, drawingId, 'transmittal-1', {
        documentId: 'document-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.draftingDrawing.update).not.toHaveBeenCalled();
  });

  it('rejects attaching a PDF from another project', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValue(
      buildDrawingRecord({ modelJson: issuedModel() }),
    );
    documentsService.findById.mockResolvedValue(
      buildDocument({ projectId: '99999999-9999-9999-9999-999999999999' }),
    );

    await expect(
      service.attachTransmittalEvidence(access, drawingId, 'transmittal-1', {
        documentId: 'document-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects attaching a global non-project PDF document', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValue(
      buildDrawingRecord({ modelJson: issuedModel() }),
    );
    documentsService.findById.mockResolvedValue(buildDocument({ projectId: null }));

    await expect(
      service.attachTransmittalEvidence(access, drawingId, 'transmittal-1', {
        documentId: 'document-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects attaching evidence to a draft transmittal', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValue(
      buildDrawingRecord({ modelJson: issuedModel({ status: 'draft' }) }),
    );

    await expect(
      service.attachTransmittalEvidence(access, drawingId, 'transmittal-1', {
        documentId: 'document-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.draftingDrawing.update).not.toHaveBeenCalled();
  });

  it('removes evidence metadata without deleting the project document', async () => {
    prisma.draftingDrawing.findFirst.mockResolvedValue(
      buildDrawingRecord({
        modelJson: issuedModel({
          artifactDocumentId: 'document-1',
          artifactFileName: 'evidence.pdf',
          artifactMimeType: 'application/pdf',
          artifactStatus: 'attached',
        }),
      }),
    );

    const result = await service.removeTransmittalEvidence(
      access,
      drawingId,
      'transmittal-1',
      'Replaced elsewhere',
    );

    expect(result.model.drawingTransmittals[0]).toMatchObject({
      artifactDocumentId: undefined,
      artifactFileName: undefined,
      artifactMimeType: undefined,
      artifactStatus: 'removed',
    });
    expect((documentsService as { delete?: jest.Mock }).delete).toBeUndefined();
  });

  it('rejects manually crafted model saves with non-PDF transmittal evidence', async () => {
    await expect(
      service.saveModel(
        access,
        drawingId,
        issuedModel({
          artifactDocumentId: 'document-1',
          artifactFileName: 'evidence.txt',
          artifactMimeType: 'text/plain',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.draftingDrawing.update).not.toHaveBeenCalled();
  });

  it('rejects manually crafted model saves with cross-project or global evidence documents', async () => {
    documentsService.findById.mockResolvedValueOnce(
      buildDocument({ projectId: '99999999-9999-9999-9999-999999999999' }),
    );

    await expect(
      service.saveModel(
        access,
        drawingId,
        issuedModel({
          artifactDocumentId: 'document-1',
          artifactFileName: 'evidence.pdf',
          artifactMimeType: 'application/pdf',
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    documentsService.findById.mockResolvedValueOnce(buildDocument({ projectId: null }));
    await expect(
      service.saveModel(
        access,
        drawingId,
        issuedModel({
          artifactDocumentId: 'document-1',
          artifactFileName: 'evidence.pdf',
          artifactMimeType: 'application/pdf',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

function createEmptyModel(drawingId: string) {
  return {
    version: 1 as const,
    units: 'mm' as const,
    drawingId,
    view: {
      scale: 0.05,
      offsetX: 160,
      offsetY: 160,
    },
    layers: [
      {
        id: 'piles',
        name: 'Piles',
        visible: true,
        locked: false,
        color: '#1d4ed8',
        lineWeight: 2,
      },
      {
        id: 'anchors',
        name: 'Anchors',
        visible: true,
        locked: false,
        color: '#b45309',
        lineWeight: 2,
      },
    ],
    underlays: [],
    objects: [],
    titleBlock: {},
    revisionBlock: {
      revisions: [],
    },
    scheduleSheets: [],
    schedulePackIssues: [],
    drawingSheets: [],
    drawingSheetIssues: [],
    drawingTransmittals: [],
  };
}

function createPdfUnderlay(overrides: Record<string, unknown> = {}) {
  return {
    id: 'underlay-api-1',
    name: 'API persisted PDF',
    fileId: 'document-api-1',
    fileName: 'api-underlay.pdf',
    pageNumber: 2,
    visible: true,
    opacity: 0.55,
    locked: false,
    transform: {
      x: 120,
      y: 240,
      scale: 0.75,
      rotationDeg: 6,
    },
    crop: {
      x: 12,
      y: 18,
      width: 280,
      height: 360,
    },
    calibration: {
      method: 'two_point_uniform_scale',
      pdfPointA: { x: 10, y: 20 },
      pdfPointB: { x: 210, y: 20 },
      modelPointA: { x: 1200, y: 2400 },
      modelPointB: { x: 3700, y: 2400 },
      modelDistanceMm: 2500,
      calculatedScale: 12.5,
      calibratedAt: '2026-04-22T00:00:00.000Z',
      warningAcknowledged: true,
    },
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-22T00:00:00.000Z',
    ...overrides,
  };
}

function issuedModel(overrides: Record<string, unknown> = {}) {
  return {
    ...createEmptyModel('44444444-4444-4444-4444-444444444444'),
    drawingTransmittals: [
      {
        id: 'transmittal-1',
        transmittalNumber: 'TRN-001',
        title: 'Drawing issue package',
        purpose: 'For information',
        status: 'issued',
        issueDate: '2026-04-24T00:00:00.000Z',
        issuedBy: 'Avery Drafter',
        issuedTo: ['client@example.com'],
        cc: [],
        includedDrawingSheetIssueIds: ['issue-1'],
        includedSheets: [
          {
            drawingSheetIssueId: 'issue-1',
            sheetId: 'sheet-1',
            sheetNumber: 'S-101',
            sheetName: 'Geometry Sheet',
            revision: 'B',
            status: 'issued',
            issueNumber: 'ISS-001',
            snapshotLabel: 'ISS-001 Rev B - S-101 Geometry Sheet',
          },
        ],
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
        ...overrides,
      },
    ],
  };
}

function issuedSheetModel(
  overrides: Partial<{
    drawingId: string;
    issueId: string;
    issueStatus: string;
    sheetId: string;
    sheetNumber: string;
  }> = {},
) {
  const model = createEmptyModel(overrides.drawingId ?? testDrawingId);
  return {
    ...model,
    titleBlock: {
      drawingNumber: overrides.sheetNumber === 'S-201' ? 'DR-201' : 'DR-101',
      drawingTitle: 'Retention Wall General Arrangement',
    },
    drawingSheetIssues: [
      {
        id: overrides.issueId ?? 'issue-1',
        issueNumber: overrides.issueId === 'issue-2' ? 'ISS-002' : 'ISS-001',
        revision: 'B',
        issueDate: '2026-04-24T00:00:00.000Z',
        issuedBy: 'Avery Drafter',
        purpose: 'For information',
        status: overrides.issueStatus ?? 'issued',
        sheetIds: [overrides.sheetId ?? 'sheet-1'],
        lockedTitleBlock: {
          drawingNumber: overrides.sheetNumber === 'S-201' ? 'DR-201' : 'DR-101',
          drawingTitle: 'Retention Wall General Arrangement',
        },
        lockedRevisionBlock: {
          currentRevision: 'B',
          revisions: [],
        },
        lockedDrawingSheets: [
          {
            id: overrides.sheetId ?? 'sheet-1',
            name: 'Geometry Sheet',
            title: 'Retention Wall Plan',
            sheetNumber: overrides.sheetNumber ?? 'S-101',
            rootSheetTemplateId: null,
            pageSize: 'a3',
            orientation: 'landscape',
            scaleLabel: 'Fit',
            viewport: {
              center: { x: 0, y: 0 },
              fitMode: 'model_extents',
              scale: 0.01,
            },
            includeUnderlays: true,
            includeGrid: true,
            includeObjectLabels: true,
            profileAudit: profileAuditFixture(),
            createdAt: '2026-04-24T00:00:00.000Z',
            updatedAt: '2026-04-24T00:00:00.000Z',
          },
        ],
        lockedObjects: [],
        lockedUnderlays: [],
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      },
    ],
  };
}

function profileAuditFixture() {
  return {
    schemaVersion: 'drafting.profile-audit.v1' as const,
    provenance: {
      source: 'frozen' as const,
      status: 'frozen' as const,
      drawingId: 'drawing-1',
      sheetId: 'sheet-1',
      sourceIssueId: 'issue-1',
      frozenAt: '2026-04-24T00:00:00.000Z',
    },
    warning: 'AS1100-informed profile; not a certification or full compliance claim.',
    activeProfileId: 'as1100-structural' as const,
    profileName: 'AS/NZS 1100 Structural',
    profileVersion: '2026-04-as1100-style-v1',
    disciplineProfileId: 'structural' as const,
    lineWeightTableId: 'as1100-style-lineweights-v1',
    lineStyleTableId: 'as1100-style-lines-v1',
    sheetSize: 'A3',
    plottedScale: '1:100',
    lineWeightScale: 1,
    textScaleMode: 'model' as const,
    lineRoles: [
      {
        role: 'OBJECT_OUTLINE',
        resolvedRole: 'objectVisible',
        lineType: 'solid',
        editorStrokeWidthPx: 1.4,
        sheetLineWeightMm: 0.35,
      },
    ],
    textPresets: [
      {
        preset: 'DIMENSION',
        textRole: 'dimension',
        paperHeightMm: 2.5,
        editorFontSizeModelUnits: 175,
        sheetFontSizeMm: 2.5,
      },
    ],
    dimensionStyle: {
      extensionRole: 'dimension',
      labelGapModelUnits: 340,
      lineRole: 'dimensionLine',
      sheetLineWeightMm: 0.18,
      textHeightMm: 2.5,
      textPreset: 'DIMENSION',
      tickLengthModelUnits: 210,
    },
    leaderStyle: {
      colorRole: 'leaderLine',
      lineRole: 'leaderLine',
      maxLeaderOpacity: 0.68,
      sheetLineWeightMm: 0.18,
      textHeightMm: 2.5,
      textPreset: 'ANNOTATION',
    },
  };
}

function buildProjectTransmittalRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-04-24T01:00:00.000Z');
  const payloadJson = overrides.payloadJson ?? {
    cc: [],
    includedItems: [
      {
        drawingId: testDrawingId,
        drawingName: 'Drafting QA Drawing',
        drawingNumber: 'DR-101',
        drawingSheetIssueId: 'issue-1',
        issueDate: '2026-04-24T00:00:00.000Z',
        issueNumber: 'ISS-001',
        revision: 'B',
        sheetId: 'sheet-1',
        sheetNumber: 'S-101',
        sheetTitle: 'Retention Wall Plan',
        snapshotLabel: 'ISS-001 Rev B - S-101 Retention Wall Plan',
        status: 'issued',
      },
    ],
    issuedTo: ['client@example.com'],
    provenanceSummary: {
      drawingCount: 1,
      frozenIssueCount: 1,
      sheetCount: 1,
      source: 'drafting_drawing_sheet_issue_snapshots',
    },
    purpose: 'For information',
    status: overrides.status ?? 'draft',
    title: 'Project package',
    warningSummary: [],
  };

  return {
    id: '66666666-6666-6666-6666-666666666666',
    projectId: testProjectId,
    organisationId: testOrganisationId,
    transmittalNumber: 'TRN-001',
    status: overrides.status ?? 'draft',
    payloadJson,
    createdById: testUserId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: 'document-1',
    organisationId: '22222222-2222-2222-2222-222222222222',
    projectId: '11111111-1111-1111-1111-111111111111',
    entityType: 'drafting_transmittal_pdf_evidence',
    entityId: 'transmittal-1',
    name: 'Evidence',
    fileName: 'evidence.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storagePath: 'project/document-1/evidence.pdf',
    uploadedBy: '33333333-3333-3333-3333-333333333333',
    createdAt: new Date('2026-04-24T01:00:00.000Z'),
    ...overrides,
  };
}

function buildPileGroupRecord() {
  const now = new Date('2026-04-24T00:00:00.000Z');
  return {
    id: 'pile-group-1',
    projectId: testProjectId,
    name: 'foundation piles',
    description: null,
    metadata: {
      multiPile: {
        pileTypes: [
          pileType('BP1', 600, { concreteGrade: 'C40', socketLengthM: 3 }),
          pileType('BP2', 750),
          pileType('BP3', 750),
          pileType('BP4', 900),
        ],
        joints: [
          {
            id: 'J1',
            x: 0,
            y: 0,
            z: 0,
            pileTypeId: 'BP1',
            supportCount: 1,
            noOfSupports: 1,
            assignmentMode: 'manual',
            active: true,
            order: 0,
          },
        ],
      },
    },
    piles: [],
    layoutPoints: [],
    designChecks: [],
    createdAt: now,
    updatedAt: now,
  };
}

function pileType(id: string, diameterMm: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    displayName: id,
    sizePreset: String(diameterMm),
    useCustom: false,
    customMm: diameterMm,
    Dmm: diameterMm,
    nominalDiameterMm: diameterMm,
    eoop: 0.075,
    eoopM: 0.075,
    compressionUltimateMin: null,
    compressionUltimateMax: null,
    tensionUltimateMin: null,
    tensionUltimateMax: null,
    active: true,
    order: 0,
    ...overrides,
  };
}

function buildSpatialFeatureRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-04-24T00:00:00.000Z');
  const geometryType = (overrides.geometryType as string | undefined) ?? 'point';
  return {
    id: overrides.id ?? 'spatial-bh-1',
    projectId: testProjectId,
    featureType: overrides.featureType ?? 'borehole',
    geometryType,
    label: overrides.label ?? 'nh',
    description: null,
    geometryJson:
      geometryType === 'line_string'
        ? {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [10, 0],
            ],
          }
        : { type: 'Point', coordinates: [0, 0] },
    status: 'current',
    sourceType: 'manual',
    sourceReference: null,
    linkedProjectReferenceId: null,
    linkedAiDocumentId: null,
    linkedDeliverableType: null,
    linkedDeliverableId: null,
    propertiesJson: overrides.propertiesJson ?? null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function pdfFile(overrides: Partial<Express.Multer.File> = {}) {
  const buffer = overrides.buffer ?? Buffer.from('%PDF-1.7\n%test');
  return {
    originalname: 'evidence.pdf',
    mimetype: 'application/pdf',
    size: buffer.length,
    buffer,
    ...overrides,
  } as Express.Multer.File;
}
