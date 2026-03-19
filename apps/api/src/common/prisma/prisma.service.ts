import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentTenant } from '../tenant/tenant.context';

const TENANT_SCOPED_MODELS = new Set<Prisma.ModelName>([
  'Project',
  'StandardsProfile',
  'AuditLog',
  'ImportJob',
  'Document',
]);

const READ_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_MANY_ACTIONS = new Set(['updateMany', 'deleteMany']);

function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      $allOperations({ model, operation, args, query }) {
        const tenant = getCurrentTenant();

        if (!tenant?.organisationId || !model) {
          return query(args);
        }

        if (!TENANT_SCOPED_MODELS.has(model as Prisma.ModelName)) {
          return query(args);
        }

        const orgId = tenant.organisationId;

        if (READ_ACTIONS.has(operation)) {
          args = { ...args, where: { ...(args as any).where, organisationId: orgId } };
        }

        if (operation === 'create') {
          args = { ...args, data: { ...(args as any).data, organisationId: orgId } };
        }

        if (WRITE_MANY_ACTIONS.has(operation)) {
          args = { ...args, where: { ...(args as any).where, organisationId: orgId } };
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
