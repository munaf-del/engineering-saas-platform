import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organisationId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { organisationId };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          members: {
            include: {
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findById(id: string, organisationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organisationId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        standardsProfile: true,
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async create(
    organisationId: string,
    userId: string,
    dto: CreateProjectDto,
  ) {
    return this.prisma.project.create({
      data: {
        organisationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        standardsProfileId: dto.standardsProfileId,
        members: {
          create: { userId, role: 'lead' },
        },
      },
      include: { members: true },
    });
  }

  async update(id: string, organisationId: string, dto: UpdateProjectDto) {
    await this.assertExists(id, organisationId);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.standardsProfileId !== undefined && {
          standardsProfileId: dto.standardsProfileId,
        }),
      },
    });
  }

  async remove(id: string, organisationId: string) {
    await this.assertExists(id, organisationId);
    return this.prisma.project.delete({ where: { id } });
  }

  async listMembers(projectId: string, organisationId: string) {
    await this.assertExists(projectId, organisationId);

    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async addMember(
    projectId: string,
    organisationId: string,
    dto: AddProjectMemberDto,
  ) {
    await this.assertExists(projectId, organisationId);

    const orgMembership = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: {
          organisationId,
          userId: dto.userId,
        },
      },
    });
    if (!orgMembership) {
      throw new ForbiddenException(
        'User must be a member of the organisation first',
      );
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async removeMember(
    projectId: string,
    organisationId: string,
    userId: string,
  ) {
    await this.assertExists(projectId, organisationId);

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Project membership not found');
    }

    return this.prisma.projectMember.delete({
      where: { id: membership.id },
    });
  }

  private async assertExists(id: string, organisationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organisationId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}
