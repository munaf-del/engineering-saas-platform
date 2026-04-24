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

  const objectBaseSchema = z.object({
    id: z.string(),
    layerId: z.string(),
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
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
    underlays: z.array(z.unknown()),
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
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    projectDraftingTransmittal: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let documentsService: {
    create: jest.Mock;
    findById: jest.Mock;
  };
  let service: DraftingService;

  function buildDrawingRecord(
    overrides: Partial<{ modelJson: Record<string, unknown>; status: string }> = {},
  ) {
    const now = new Date('2026-04-21T00:00:00.000Z');

    return {
      id: drawingId,
      projectId: access.projectId,
      title: 'Drafting QA Drawing',
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
        findMany: jest
          .fn()
          .mockResolvedValue([buildDrawingRecord({ modelJson: issuedSheetModel() })]),
        findFirst: jest.fn().mockResolvedValue(buildDrawingRecord()),
        update: jest.fn().mockImplementation((args) =>
          Promise.resolve(
            buildDrawingRecord({
              status: args.data?.status ?? 'draft',
              modelJson: args.data?.modelJson,
            }),
          ),
        ),
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
