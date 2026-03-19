import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    const memberships = await this.prisma.organisationMember.findMany({
      where: { userId },
      include: { organisation: true },
      orderBy: { createdAt: 'desc' },
    });
    return memberships.map((m) => ({
      ...m.organisation,
      role: m.role,
    }));
  }

  async findById(id: string, userId: string) {
    const membership = await this.prisma.organisationMember.findFirst({
      where: { organisationId: id, userId },
      include: {
        organisation: {
          include: {
            members: {
              include: {
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!membership) {
      throw new NotFoundException('Organisation not found');
    }
    return membership.organisation;
  }

  async create(userId: string, dto: CreateOrganisationDto) {
    const existing = await this.prisma.organisation.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Organisation slug already taken');
    }

    return this.prisma.organisation.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        abn: dto.abn,
        members: {
          create: { userId, role: 'owner' },
        },
      },
      include: { members: true },
    });
  }

  async update(id: string, userId: string, dto: UpdateOrganisationDto) {
    await this.assertRole(id, userId, ['owner', 'admin']);

    return this.prisma.organisation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.abn !== undefined && { abn: dto.abn }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.assertRole(id, userId, ['owner']);
    return this.prisma.organisation.delete({ where: { id } });
  }

  // ── Membership helpers ──────────────────────────────────────────

  async addMember(
    organisationId: string,
    actorUserId: string,
    targetUserId: string,
    role: string,
  ) {
    await this.assertRole(organisationId, actorUserId, ['owner', 'admin']);

    return this.prisma.organisationMember.create({
      data: {
        organisationId,
        userId: targetUserId,
        role: role as 'owner' | 'admin' | 'engineer' | 'viewer',
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async removeMember(
    organisationId: string,
    actorUserId: string,
    targetUserId: string,
  ) {
    await this.assertRole(organisationId, actorUserId, ['owner', 'admin']);

    if (actorUserId === targetUserId) {
      throw new ForbiddenException('Cannot remove yourself');
    }

    const membership = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: { organisationId, userId: targetUserId },
      },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return this.prisma.organisationMember.delete({
      where: { id: membership.id },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private async assertRole(
    organisationId: string,
    userId: string,
    allowedRoles: string[],
  ) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Organisation not found');
    }
    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return membership;
  }
}
