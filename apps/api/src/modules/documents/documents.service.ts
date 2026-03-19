import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organisationId: string,
    pagination: PaginationDto,
    projectId?: string,
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organisationId };
    if (projectId) where.projectId = projectId;

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

  async findById(id: string, organisationId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, organisationId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(
    organisationId: string,
    userId: string,
    dto: CreateDocumentDto,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    const storagePath = `uploads/${organisationId}/${Date.now()}-${file.originalname}`;

    return this.prisma.document.create({
      data: {
        organisationId,
        projectId: dto.projectId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        name: dto.name,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
        uploadedBy: userId,
      },
    });
  }

  async delete(id: string, organisationId: string) {
    const doc = await this.findById(id, organisationId);
    return this.prisma.document.delete({ where: { id: doc.id } });
  }
}
