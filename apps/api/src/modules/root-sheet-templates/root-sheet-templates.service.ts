import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CreateRootSheetTemplateDto,
  ListRootSheetTemplatesDto,
  UpdateRootSheetTemplateDto,
} from './dto/root-sheet-templates.dto';

type RootTemplateAccess = {
  organisationId: string;
  orgRole?: string;
  userId: string;
};

type RootSheetTemplateWithCurrentVersion = Prisma.RootSheetTemplateGetPayload<{
  include: typeof rootSheetTemplateInclude;
}>;

@Injectable()
export class RootSheetTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(access: RootTemplateAccess, query: ListRootSheetTemplatesDto) {
    await this.assertOrganisationAccess(access);

    const templates = await this.prisma.rootSheetTemplate.findMany({
      where: {
        archivedAt: query.includeArchived ? undefined : null,
        OR: [
          {
            organisationId: access.organisationId,
          },
          {
            scopeType: 'global',
          },
        ],
      },
      include: rootSheetTemplateInclude,
      orderBy: [{ archivedAt: 'asc' }, { updatedAt: 'desc' }, { label: 'asc' }],
    });

    return templates.map(serializeRootSheetTemplate);
  }

  async createTemplate(access: RootTemplateAccess, dto: CreateRootSheetTemplateDto) {
    await this.assertOrganisationWriteAccess(access);

    // Root Sheet Templates are durable generic reusable paper/layout records.
    // Modules can recommend or bind them later, but the library identity remains generic here.
    const scope = await this.resolveScope(access, dto.scopeType ?? 'org', dto.scopeId);
    const key = normalizeRootSheetTemplateKey(dto.key ?? dto.label);
    const existing = await this.findTemplateByScopeKey(scope.scopeType, scope.scopeId, key);

    if (existing?.archivedAt) {
      return this.updateTemplate(access, existing.id, {
        ...dto,
        key,
        scopeId: scope.scopeId,
        scopeType: scope.scopeType,
      });
    }

    if (existing) {
      throw new ConflictException(ROOT_SHEET_TEMPLATE_SCOPE_KEY_CONFLICT_MESSAGE);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const template = await tx.rootSheetTemplate.create({
          data: {
            organisationId: access.organisationId,
            scopeType: scope.scopeType,
            scopeId: scope.scopeId,
            key,
            label: dto.label.trim(),
            category: normalizeNullableString(dto.category) ?? 'general',
            createdBy: access.userId,
          },
        });

        const version = await tx.rootSheetTemplateVersion.create({
          data: {
            rootSheetTemplateId: template.id,
            versionLabel: normalizeRootSheetTemplateVersionLabel(dto.versionLabel, 1),
            schemaVersion: dto.schemaVersion ?? 1,
            definitionJson: dto.definitionJson as Prisma.InputJsonValue,
            publishedAt: new Date(),
            createdBy: access.userId,
          },
        });

        const updatedTemplate = await tx.rootSheetTemplate.update({
          where: { id: template.id },
          data: {
            currentVersionId: version.id,
          },
          include: rootSheetTemplateInclude,
        });

        return serializeRootSheetTemplate(updatedTemplate);
      });
    } catch (error) {
      if (isRootSheetTemplateScopeKeyConflictError(error)) {
        throw new ConflictException(ROOT_SHEET_TEMPLATE_SCOPE_KEY_CONFLICT_MESSAGE);
      }

      throw error;
    }
  }

  async updateTemplate(
    access: RootTemplateAccess,
    templateId: string,
    dto: UpdateRootSheetTemplateDto,
  ) {
    await this.assertOrganisationWriteAccess(access);

    const existing = await this.findExistingTemplate(access, templateId);
    const nextScope = await this.resolveScope(
      access,
      dto.scopeType ?? existing.scopeType,
      dto.scopeId ?? existing.scopeId,
    );
    const nextKey = normalizeRootSheetTemplateKey(dto.key ?? existing.key);

    if (
      nextKey !== existing.key ||
      nextScope.scopeType !== existing.scopeType ||
      nextScope.scopeId !== existing.scopeId
    ) {
      await this.assertTemplateKeyAvailable(
        nextScope.scopeType,
        nextScope.scopeId,
        nextKey,
        existing.id,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let currentVersionId = existing.currentVersionId;

      if (dto.definitionJson !== undefined) {
        const nextVersionNumber =
          (await tx.rootSheetTemplateVersion.count({
            where: { rootSheetTemplateId: existing.id },
          })) + 1;
        const version = await tx.rootSheetTemplateVersion.create({
          data: {
            rootSheetTemplateId: existing.id,
            versionLabel: normalizeRootSheetTemplateVersionLabel(
              dto.versionLabel,
              nextVersionNumber,
            ),
            schemaVersion: dto.schemaVersion ?? existing.currentVersion?.schemaVersion ?? 1,
            definitionJson: dto.definitionJson as Prisma.InputJsonValue,
            publishedAt: new Date(),
            createdBy: access.userId,
          },
        });
        currentVersionId = version.id;
      }

      const template = await tx.rootSheetTemplate.update({
        where: { id: existing.id },
        data: {
          category:
            dto.category !== undefined
              ? (normalizeNullableString(dto.category) ?? 'general')
              : undefined,
          currentVersionId,
          key: nextKey,
          label: dto.label?.trim() ?? undefined,
          scopeId: nextScope.scopeId,
          scopeType: nextScope.scopeType,
          archivedAt: dto.definitionJson !== undefined && existing.archivedAt ? null : undefined,
        },
        include: rootSheetTemplateInclude,
      });

      return serializeRootSheetTemplate(template);
    });
  }

  async archiveTemplate(access: RootTemplateAccess, templateId: string) {
    await this.assertOrganisationWriteAccess(access);
    await this.findExistingTemplate(access, templateId);

    const template = await this.prisma.$transaction(async (tx) => {
      const archivedTemplate = await tx.rootSheetTemplate.update({
        where: { id: templateId },
        data: { archivedAt: new Date() },
        include: rootSheetTemplateInclude,
      });

      await tx.projectSpatialSheet.deleteMany({
        where: {
          rootSheetTemplateId: templateId,
        },
      });

      return archivedTemplate;
    });

    return serializeRootSheetTemplate(template);
  }

  private async findExistingTemplate(access: RootTemplateAccess, templateId: string) {
    await this.assertOrganisationAccess(access);

    const template = await this.prisma.rootSheetTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ organisationId: access.organisationId }, { scopeType: 'global' }],
      },
      include: rootSheetTemplateInclude,
    });

    if (!template) {
      throw new NotFoundException('Root Sheet Template not found');
    }

    return template;
  }

  private async assertOrganisationAccess(access: RootTemplateAccess) {
    const membership = await this.prisma.organisationMember.findFirst({
      where: {
        organisationId: access.organisationId,
        userId: access.userId,
      },
      select: { id: true },
    });

    if (!membership && access.orgRole !== 'owner' && access.orgRole !== 'admin') {
      throw new ForbiddenException('Organisation access denied');
    }
  }

  private async assertOrganisationWriteAccess(access: RootTemplateAccess) {
    await this.assertOrganisationAccess(access);

    if (access.orgRole !== 'owner' && access.orgRole !== 'admin' && access.orgRole !== 'engineer') {
      throw new ForbiddenException('Organisation write access denied');
    }
  }

  private async resolveScope(
    access: RootTemplateAccess,
    scopeType: RootSheetTemplateWithCurrentVersion['scopeType'],
    scopeId: string | null | undefined,
  ) {
    if (scopeType === 'org') {
      return {
        scopeId: access.organisationId,
        scopeType,
      } as const;
    }

    if (scopeType === 'global') {
      if (access.orgRole !== 'owner' && access.orgRole !== 'admin') {
        throw new ForbiddenException(
          'Only organisation admins can manage global Root Sheet Templates',
        );
      }

      return {
        scopeId: null,
        scopeType,
      } as const;
    }

    const normalizedScopeId = normalizeNullableString(scopeId);
    if (!normalizedScopeId) {
      throw new BadRequestException('Project-scoped Root Sheet Templates require scopeId');
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: normalizedScopeId,
        organisationId: access.organisationId,
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found for Root Sheet Template scope');
    }

    return {
      scopeId: normalizedScopeId,
      scopeType,
    } as const;
  }

  private async assertTemplateKeyAvailable(
    scopeType: RootSheetTemplateWithCurrentVersion['scopeType'],
    scopeId: string | null,
    key: string,
    ignoreTemplateId?: string,
  ) {
    const existing = await this.findTemplateByScopeKey(scopeType, scopeId, key, ignoreTemplateId);

    if (existing) {
      throw new ConflictException(ROOT_SHEET_TEMPLATE_SCOPE_KEY_CONFLICT_MESSAGE);
    }
  }

  private async findTemplateByScopeKey(
    scopeType: RootSheetTemplateWithCurrentVersion['scopeType'],
    scopeId: string | null,
    key: string,
    ignoreTemplateId?: string,
  ) {
    return this.prisma.rootSheetTemplate.findFirst({
      where: {
        scopeType,
        scopeId,
        key,
        ...(ignoreTemplateId ? { id: { not: ignoreTemplateId } } : {}),
      },
      select: {
        archivedAt: true,
        id: true,
      },
    });
  }
}

const ROOT_SHEET_TEMPLATE_SCOPE_KEY_CONFLICT_MESSAGE =
  'A Root Sheet Template with this key already exists in the selected scope';

const rootSheetTemplateInclude = {
  currentVersion: true,
  versions: {
    orderBy: { createdAt: 'desc' },
    take: 5,
  },
} satisfies Prisma.RootSheetTemplateInclude;

function serializeRootSheetTemplate(template: RootSheetTemplateWithCurrentVersion) {
  return {
    archivedAt: template.archivedAt?.toISOString() ?? null,
    category: template.category ?? null,
    createdAt: template.createdAt.toISOString(),
    createdBy: template.createdBy ?? null,
    currentVersion: template.currentVersion
      ? {
          createdAt: template.currentVersion.createdAt.toISOString(),
          createdBy: template.currentVersion.createdBy ?? null,
          definitionJson: template.currentVersion.definitionJson as Record<string, unknown>,
          id: template.currentVersion.id,
          publishedAt: template.currentVersion.publishedAt?.toISOString() ?? null,
          rootSheetTemplateId: template.currentVersion.rootSheetTemplateId,
          schemaVersion: template.currentVersion.schemaVersion,
          versionLabel: template.currentVersion.versionLabel,
        }
      : null,
    currentVersionId: template.currentVersionId ?? null,
    id: template.id,
    key: template.key,
    label: template.label,
    organisationId: template.organisationId ?? null,
    scopeId: template.scopeId ?? null,
    scopeType: template.scopeType,
    updatedAt: template.updatedAt.toISOString(),
    versions: template.versions.map((version) => ({
      createdAt: version.createdAt.toISOString(),
      createdBy: version.createdBy ?? null,
      id: version.id,
      publishedAt: version.publishedAt?.toISOString() ?? null,
      rootSheetTemplateId: version.rootSheetTemplateId,
      schemaVersion: version.schemaVersion,
      versionLabel: version.versionLabel,
    })),
  };
}

function normalizeNullableString(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function normalizeRootSheetTemplateKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized) {
    throw new BadRequestException('Root Sheet Template key is required');
  }

  return normalized.slice(0, 200);
}

function normalizeRootSheetTemplateVersionLabel(value: string | undefined, versionNumber: number) {
  const normalized = value?.trim();
  return normalized?.length ? normalized : `v${versionNumber}`;
}

function isRootSheetTemplateScopeKeyConflictError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('scope_type') &&
    error.meta.target.includes('scope_id') &&
    error.meta.target.includes('key')
  );
}
