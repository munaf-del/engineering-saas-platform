import { randomUUID } from 'crypto';
import {
  DraftingDrawing,
  DraftingDrawingSummary,
  DraftingModel,
  DraftingModelSchema,
  DraftingRevision,
  createEmptyDraftingModel,
} from '@eng/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateDraftingDrawingDto } from './dto/create-drafting-drawing.dto';
import type { UpdateDraftingDrawingDto } from './dto/update-drafting-drawing.dto';

type ProjectAccess = {
  projectId: string;
  organisationId: string;
  userId: string;
  orgRole?: string;
};

type DraftingDrawingRecord = Prisma.DraftingDrawingGetPayload<{
  include: {
    revisions: {
      orderBy: {
        revisionNumber: 'desc';
      };
    };
  };
}>;

@Injectable()
export class DraftingService {
  constructor(private readonly prisma: PrismaService) {}

  async listDrawings(access: ProjectAccess): Promise<DraftingDrawingSummary[]> {
    await this.assertProjectReadAccess(access);

    const drawings = await this.prisma.draftingDrawing.findMany({
      where: { projectId: access.projectId },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
    });

    return drawings.map(serializeDraftingDrawingSummary);
  }

  async createDrawing(
    access: ProjectAccess,
    dto: CreateDraftingDrawingDto,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);

    const drawingId = randomUUID();
    const drawing = await this.prisma.draftingDrawing.create({
      data: {
        id: drawingId,
        projectId: access.projectId,
        title: dto.title.trim(),
        modelVersion: 1,
        modelJson: createEmptyDraftingModel(drawingId) as Prisma.InputJsonValue,
        createdById: access.userId,
        updatedById: access.userId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    return serializeDraftingDrawing(drawing);
  }

  async findDrawing(access: ProjectAccess, drawingId: string): Promise<DraftingDrawing> {
    await this.assertProjectReadAccess(access);

    const drawing = await this.findDrawingRecord(access.projectId, drawingId);
    return serializeDraftingDrawing(drawing);
  }

  async updateDrawing(
    access: ProjectAccess,
    drawingId: string,
    dto: UpdateDraftingDrawingDto,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);
    await this.findDrawingRecord(access.projectId, drawingId);

    const drawing = await this.prisma.draftingDrawing.update({
      where: { id: drawingId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        updatedById: access.userId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    return serializeDraftingDrawing(drawing);
  }

  async saveModel(
    access: ProjectAccess,
    drawingId: string,
    rawModel: Record<string, unknown>,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);
    const existing = await this.findDrawingRecord(access.projectId, drawingId);
    const parsedModel = parseIncomingDraftingModel(rawModel, drawingId);

    const drawing = await this.prisma.draftingDrawing.update({
      where: { id: drawingId },
      data: {
        modelVersion: parsedModel.version,
        modelJson: parsedModel as Prisma.InputJsonValue,
        updatedById: access.userId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (existing.status === 'archived') {
      await this.prisma.draftingDrawing.update({
        where: { id: drawingId },
        data: {
          status: 'draft',
          updatedById: access.userId,
        },
      });

      return this.findDrawing(access, drawingId);
    }

    return serializeDraftingDrawing(drawing);
  }

  private async findDrawingRecord(projectId: string, drawingId: string) {
    const drawing = await this.prisma.draftingDrawing.findFirst({
      where: {
        id: drawingId,
        projectId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (!drawing) {
      throw new NotFoundException('Drafting drawing not found');
    }

    return drawing;
  }

  private async assertProjectReadAccess(access: ProjectAccess) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: access.projectId,
        organisationId: access.organisationId,
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (access.orgRole === 'owner' || access.orgRole === 'admin') {
      return project;
    }

    const membership = project.members.find((member) => member.userId === access.userId);
    if (!membership) {
      throw new ForbiddenException('Not a member of this project');
    }

    return project;
  }

  private async assertProjectWriteAccess(access: ProjectAccess) {
    const project = await this.assertProjectReadAccess(access);

    if (access.orgRole === 'owner' || access.orgRole === 'admin') {
      return project;
    }

    const membership = project.members.find((member) => member.userId === access.userId);
    if (!membership || membership.role === 'viewer') {
      throw new ForbiddenException('Project write access denied');
    }

    return project;
  }
}

function parseIncomingDraftingModel(
  rawModel: Record<string, unknown>,
  drawingId: string,
): DraftingModel {
  const result = DraftingModelSchema.safeParse({
    ...rawModel,
    drawingId,
  });

  if (!result.success) {
    throw new BadRequestException('Drafting model payload is invalid');
  }

  return result.data;
}

function parseStoredDraftingModel(rawModel: Prisma.JsonValue, drawingId: string): DraftingModel {
  const result = DraftingModelSchema.safeParse(rawModel);

  if (!result.success) {
    throw new InternalServerErrorException(
      `Stored drafting model is invalid for drawing ${drawingId}`,
    );
  }

  return result.data;
}

function serializeDraftingDrawing(record: DraftingDrawingRecord): DraftingDrawing {
  return {
    ...serializeDraftingDrawingSummary(record),
    model: parseStoredDraftingModel(record.modelJson, record.id),
    revisions: record.revisions.map(serializeDraftingRevision),
  };
}

function serializeDraftingDrawingSummary(record: DraftingDrawingRecord): DraftingDrawingSummary {
  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title,
    status: record.status,
    currentRevision: record.currentRevision,
    modelVersion: record.modelVersion,
    objectCount: countDraftingObjects(record.modelJson),
    createdById: record.createdById ?? null,
    updatedById: record.updatedById ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializeDraftingRevision(record: DraftingDrawingRecord['revisions'][number]): DraftingRevision {
  return {
    id: record.id,
    drawingId: record.drawingId,
    projectId: record.projectId,
    revisionNumber: record.revisionNumber,
    title: record.title,
    notes: record.notes ?? null,
    modelJsonSnapshot: parseStoredDraftingModel(record.modelJsonSnapshot, record.drawingId),
    createdById: record.createdById ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function countDraftingObjects(rawModel: Prisma.JsonValue) {
  if (!rawModel || typeof rawModel !== 'object' || Array.isArray(rawModel)) {
    return 0;
  }

  const objects = (rawModel as Record<string, unknown>).objects;
  return Array.isArray(objects) ? objects.length : 0;
}
