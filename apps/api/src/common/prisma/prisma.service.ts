import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getCurrentTenant } from '../tenant/tenant.context';

type TenantScopedModel =
  | 'Project'
  | 'StandardsProfile'
  | 'AuditLog'
  | 'ImportJob'
  | 'Document'
  | 'AiDocument';

type PrismaExtensionArgs = Record<string, unknown>;

interface AllOperationsParams {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
}

const TENANT_SCOPED_MODELS = new Set<TenantScopedModel>([
  'Project',
  'StandardsProfile',
  'AuditLog',
  'ImportJob',
  'Document',
  'AiDocument',
]);

const READ_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_MANY_ACTIONS = new Set(['updateMany', 'deleteMany']);

function asRecord(value: unknown): PrismaExtensionArgs {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as PrismaExtensionArgs)
    : {};
}

function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      $allOperations({ model, operation, args, query }: AllOperationsParams) {
        const tenant = getCurrentTenant();

        if (!tenant?.organisationId || !model) {
          return query(args);
        }

        if (!TENANT_SCOPED_MODELS.has(model as TenantScopedModel)) {
          return query(args);
        }

        const orgId = tenant.organisationId;
        const argsRecord = asRecord(args);

        if (READ_ACTIONS.has(operation)) {
          args = {
            ...argsRecord,
            where: { ...asRecord(argsRecord.where), organisationId: orgId },
          };
        }

        if (operation === 'create') {
          args = {
            ...argsRecord,
            data: { ...asRecord(argsRecord.data), organisationId: orgId },
          };
        }

        if (WRITE_MANY_ACTIONS.has(operation)) {
          args = {
            ...argsRecord,
            where: { ...asRecord(argsRecord.where), organisationId: orgId },
          };
        }

        return query(args);
      },
    },
  });
}

const ExtendedPrismaClient = class {
  constructor() {
    return createPrismaClient();
  }
} as new () => ReturnType<typeof createPrismaClient>;

@Injectable()
export class PrismaService
  extends ExtendedPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Tenant-scoping query extension registered');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
