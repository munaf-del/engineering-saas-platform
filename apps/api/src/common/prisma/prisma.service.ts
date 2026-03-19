import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentTenant } from '../tenant/tenant.context';

const TENANT_SCOPED_MODELS = new Set<Prisma.ModelName>([
  'Project',
  'StandardsProfile',
  'AuditLog',
  'OrganisationMember',
]);

const READ_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_MANY_ACTIONS = new Set(['updateMany', 'deleteMany']);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.setupTenantMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private setupTenantMiddleware() {
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      const tenant = getCurrentTenant();

      if (!tenant?.organisationId || !params.model) {
        return next(params);
      }

      if (!TENANT_SCOPED_MODELS.has(params.model as Prisma.ModelName)) {
        return next(params);
      }

      const orgId = tenant.organisationId;

      if (READ_ACTIONS.has(params.action)) {
        params.args = params.args ?? {};
        params.args.where = { ...params.args.where, organisationId: orgId };
      }

      if (params.action === 'create') {
        params.args = params.args ?? {};
        params.args.data = { ...params.args.data, organisationId: orgId };
      }

      if (WRITE_MANY_ACTIONS.has(params.action)) {
        params.args = params.args ?? {};
        params.args.where = { ...params.args.where, organisationId: orgId };
      }

      return next(params);
    });

    this.logger.log('Tenant-scoping middleware registered');
  }
}
