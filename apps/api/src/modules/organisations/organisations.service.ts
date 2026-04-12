import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { normalizeAiModelSelection, type AiModelId } from '@eng/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { UpdateOrganisationAiSettingsDto } from './dto/update-organisation-ai-settings.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import {
  buildOrganisationAiSettingsPayload,
  getOrganisationAiSettingsFromMetadata,
  isMissingOrganisationMetadataColumnError,
  mergeOrganisationMetadataWithAiSettings,
} from './organisation-ai-settings';

const ORGANISATION_BASE_SELECT = {
  id: true,
  name: true,
  slug: true,
  abn: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganisationSelect;

const ORGANISATION_MEMBER_SELECT = {
  id: true,
  organisationId: true,
  userId: true,
  role: true,
  createdAt: true,
} satisfies Prisma.OrganisationMemberSelect;

const ORGANISATION_WITH_MEMBERS_SELECT = {
  ...ORGANISATION_BASE_SELECT,
  members: {
    select: ORGANISATION_MEMBER_SELECT,
  },
} satisfies Prisma.OrganisationSelect;

const ORGANISATION_DETAIL_SELECT = {
  ...ORGANISATION_BASE_SELECT,
  members: {
    select: {
      ...ORGANISATION_MEMBER_SELECT,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.OrganisationSelect;

@Injectable()
export class OrganisationsService {
  private readonly logger = new Logger(OrganisationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findByUser(userId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { userId };

    const [memberships, total] = await Promise.all([
      this.prisma.organisationMember.findMany({
        where,
        include: { organisation: { select: ORGANISATION_BASE_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.organisationMember.count({ where }),
    ]);

    const data = memberships.map((m: (typeof memberships)[number]) => ({
      ...m.organisation,
      role: m.role,
    }));

    return paginate(data, total, page, limit);
  }

  async findById(id: string, userId: string) {
    const membership = await this.prisma.organisationMember.findFirst({
      where: { organisationId: id, userId },
      include: {
        organisation: { select: ORGANISATION_DETAIL_SELECT },
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
      select: ORGANISATION_WITH_MEMBERS_SELECT,
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
      select: ORGANISATION_BASE_SELECT,
    });
  }

  async getAiSettings(id: string, userId: string) {
    await this.assertMembership(id, userId);

    const fallback = this.resolveAiSettingsFallbacks();
    const metadataState = await this.readOrganisationMetadata(id);

    if (!metadataState.exists) {
      throw new NotFoundException('Organisation not found');
    }

    return buildOrganisationAiSettingsPayload(metadataState.metadata, fallback);
  }

  async updateAiSettings(
    id: string,
    userId: string,
    dto: UpdateOrganisationAiSettingsDto,
  ) {
    await this.assertRole(id, userId, ['owner', 'admin']);

    const fallback = this.resolveAiSettingsFallbacks();
    const metadataState = await this.readOrganisationMetadata(id);

    if (!metadataState.exists) {
      throw new NotFoundException('Organisation not found');
    }

    if (!metadataState.persistenceAvailable) {
      throw new ServiceUnavailableException(
        'Organisation AI settings persistence is unavailable until the database schema is updated',
      );
    }

    const currentSettings = getOrganisationAiSettingsFromMetadata(
      metadataState.metadata,
      fallback,
    );
    const nextSettings = {
      assistantModel: dto.assistantModel ?? currentSettings.assistantModel,
      agentModel: dto.agentModel ?? currentSettings.agentModel,
    };

    const updated = await this.prisma.organisation.update({
      where: { id },
      data: {
        metadata: mergeOrganisationMetadataWithAiSettings(
          metadataState.metadata,
          nextSettings,
        ),
      },
      select: { metadata: true },
    });

    return buildOrganisationAiSettingsPayload(updated.metadata, fallback);
  }

  async remove(id: string, userId: string) {
    await this.assertRole(id, userId, ['owner']);
    return this.prisma.organisation.delete({ where: { id } });
  }

  async listMembers(organisationId: string, actorUserId: string) {
    await this.assertMembership(organisationId, actorUserId);

    return this.prisma.organisationMember.findMany({
      where: { organisationId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(
    organisationId: string,
    actorUserId: string,
    targetUserId: string,
    role: string,
  ) {
    await this.assertRole(organisationId, actorUserId, ['owner', 'admin']);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const existing = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: { organisationId, userId: targetUserId },
      },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this organisation');
    }

    return this.prisma.organisationMember.create({
      data: {
        organisationId,
        userId: targetUserId,
        role: role as 'owner' | 'admin' | 'engineer' | 'viewer',
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async updateMemberRole(
    organisationId: string,
    actorUserId: string,
    targetUserId: string,
    role: string,
  ) {
    await this.assertRole(organisationId, actorUserId, ['owner', 'admin']);

    const membership = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: { organisationId, userId: targetUserId },
      },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.role === 'owner' && actorUserId !== targetUserId) {
      throw new ForbiddenException('Cannot change the role of an owner');
    }

    return this.prisma.organisationMember.update({
      where: { id: membership.id },
      data: { role: role as 'owner' | 'admin' | 'engineer' | 'viewer' },
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

    if (membership.role === 'owner') {
      throw new ForbiddenException('Cannot remove an owner');
    }

    return this.prisma.organisationMember.delete({
      where: { id: membership.id },
    });
  }

  private async assertMembership(organisationId: string, userId: string) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Organisation not found');
    }
    return membership;
  }

  private async readOrganisationMetadata(organisationId: string): Promise<{
    exists: boolean;
    metadata: unknown;
    persistenceAvailable: boolean;
  }> {
    try {
      const organisation = await this.prisma.organisation.findUnique({
        where: { id: organisationId },
        select: { id: true, metadata: true },
      });

      if (!organisation) {
        return {
          exists: false,
          metadata: null,
          persistenceAvailable: true,
        };
      }

      return {
        exists: true,
        metadata: organisation.metadata,
        persistenceAvailable: true,
      };
    } catch (error) {
      if (!isMissingOrganisationMetadataColumnError(error)) {
        throw error;
      }

      this.logger.warn(
        `Organisation metadata column is unavailable; falling back to default AI settings for organisation ${organisationId}`,
      );

      const organisation = await this.prisma.organisation.findUnique({
        where: { id: organisationId },
        select: { id: true },
      });

      return {
        exists: Boolean(organisation),
        metadata: null,
        persistenceAvailable: false,
      };
    }
  }

  private resolveAiSettingsFallbacks(): {
    assistantModel: AiModelId;
    agentModel: AiModelId;
  } {
    const assistantModel = normalizeAiModelSelection(
      this.configService.get<string>('AI_OPENAI_MODEL'),
      'gpt-4.1',
    );
    const agentModel = normalizeAiModelSelection(
      this.configService.get<string>('AI_OPENAI_AGENT_MODEL') ??
        this.configService.get<string>('AI_OPENAI_MODEL'),
      'gpt-4.1-mini',
    );

    return {
      assistantModel,
      agentModel,
    };
  }

  private async assertRole(
    organisationId: string,
    userId: string,
    allowedRoles: string[],
  ) {
    const membership = await this.assertMembership(organisationId, userId);
    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return membership;
  }
}
