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
  });

  return {
    DraftingModelSchema: draftingModelSchema,
    createEmptyDraftingModel(drawingId: string) {
      return createEmptyModel(drawingId);
    },
  };
});

import { DraftingService } from './drafting.service';

describe('DraftingService', () => {
  const access = {
    projectId: '11111111-1111-1111-1111-111111111111',
    organisationId: '22222222-2222-2222-2222-222222222222',
    userId: '33333333-3333-3333-3333-333333333333',
    orgRole: 'engineer',
  } as const;
  const drawingId = '44444444-4444-4444-4444-444444444444';

  let prisma: {
    project: { findFirst: jest.Mock };
    draftingDrawing: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: DraftingService;

  function buildDrawingRecord(overrides: Partial<{ status: 'draft' | 'archived' }> = {}) {
    const now = new Date('2026-04-21T00:00:00.000Z');

    return {
      id: drawingId,
      projectId: access.projectId,
      title: 'Drafting QA Drawing',
      status: overrides.status ?? 'draft',
      currentRevision: 0,
      modelVersion: 1,
      modelJson: createEmptyModel(drawingId),
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
        findFirst: jest.fn().mockResolvedValue(buildDrawingRecord()),
        update: jest.fn().mockResolvedValue(buildDrawingRecord()),
      },
    };

    service = new DraftingService(prisma as never);
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
  };
}
