import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

const AUDITED_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method?.toUpperCase() ?? '';

    if (!AUDITED_METHODS.has(method)) {
      return next.handle();
    }

    const user = request.user as
      | { id: string; organisationId?: string }
      | undefined;

    if (!user?.id) {
      return next.handle();
    }

    const action = this.methodToAction(method);
    const { entityType, entityId } = this.extractEntityInfo(request);
    const requestId = request.headers['x-request-id'] as string | undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          this.writeAuditLog(
            user.id,
            user.organisationId,
            action,
            entityType,
            entityId,
            requestId,
          ).catch((err) =>
            this.logger.error('Failed to write audit log', err),
          );
        },
      }),
    );
  }

  private async writeAuditLog(
    userId: string,
    organisationId: string | undefined,
    action: string,
    entityType: string,
    entityId: string | undefined,
    requestId?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        organisationId: organisationId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        metadata: requestId ? { requestId } : undefined,
      },
    });
  }

  private methodToAction(method: string): string {
    switch (method) {
      case 'POST':
        return 'create';
      case 'PATCH':
      case 'PUT':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return method.toLowerCase();
    }
  }

  private extractEntityInfo(request: {
    route?: { path?: string };
    url?: string;
    params?: Record<string, string>;
  }): {
    entityType: string;
    entityId?: string;
  } {
    const path: string = request.route?.path || request.url || '';
    const cleanPath = path.replace(/^\/api\/v1\//, '').replace(/^\//, '');
    const segments = cleanPath.split('/').filter(Boolean);
    const entityType = segments[0] || 'unknown';
    const entityId = request.params?.['id'];
    return { entityType, entityId };
  }
}
