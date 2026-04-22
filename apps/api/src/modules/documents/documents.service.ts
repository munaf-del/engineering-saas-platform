import { randomUUID } from 'crypto';
import { access as fsAccess } from 'node:fs/promises';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateDocumentDto } from './dto/document.dto';
import { DocumentStorageService } from './document-storage.service';

type DocumentAccess = {
  organisationId: string;
  userId: string;
  orgRole?: string;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: DocumentStorageService,
  ) {}

  accessFor(user: RequestUser): DocumentAccess {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required');
    }

    return {
      organisationId: user.organisationId,
      userId: user.id,
      orgRole: user.orgRole,
    };
  }

  async findAll(
    access: DocumentAccess,
    pagination: PaginationDto,
    projectId?: string,
    mimeType?: string,
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    if (projectId) {
      await this.assertProjectReadAccess(access, projectId);
    }

    const where: Record<string, unknown> = { organisationId: access.organisationId };
    if (projectId) {
      where.projectId = projectId;
    }
    if (mimeType) {
      where.mimeType = mimeType;
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findById(id: string, access: DocumentAccess) {
    const doc = await this.prisma.document.findFirst({
      where: { id, organisationId: access.organisationId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    if (doc.projectId) {
      await this.assertProjectReadAccess(access, doc.projectId);
    }

    return doc;
  }

  async create(
    access: DocumentAccess,
    dto: CreateDocumentDto,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    if (dto.projectId) {
      await this.assertProjectWriteAccess(access, dto.projectId);
    }

    const documentId = randomUUID();
    const persisted = await this.storageService.persistUploadedFile({
      organisationId: access.organisationId,
      projectId: dto.projectId,
      documentId,
      originalName: file.originalname,
      buffer: file.buffer,
    });

    try {
      return await this.prisma.document.create({
        data: {
          id: documentId,
          organisationId: access.organisationId,
          projectId: dto.projectId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          name: dto.name,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath: persisted.storagePath,
          uploadedBy: access.userId,
        },
      });
    } catch (error) {
      await this.storageService.deleteStoredFile(persisted.storagePath);
      throw error;
    }
  }

  async prepareDownload(id: string, documentAccess: DocumentAccess) {
    const doc = await this.findById(id, documentAccess);
    const absolutePath = this.storageService.resolveAbsolutePath(doc.storagePath);

    try {
      await fsAccess(absolutePath);
    } catch {
      throw new NotFoundException('Document file not found');
    }

    return {
      document: doc,
      absolutePath,
    };
  }

  async delete(id: string, access: DocumentAccess) {
    const doc = await this.findById(id, access);
    const deleted = await this.prisma.document.delete({ where: { id: doc.id } });
    await this.storageService.deleteStoredFile(doc.storagePath);
    return deleted;
  }

  private async assertProjectReadAccess(access: DocumentAccess, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
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

  private async assertProjectWriteAccess(access: DocumentAccess, projectId: string) {
    const project = await this.assertProjectReadAccess(access, projectId);

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
