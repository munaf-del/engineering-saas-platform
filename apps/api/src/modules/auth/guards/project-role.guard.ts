import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PROJECT_ROLES_KEY } from '../decorators/project-roles.decorator';

@Injectable()
export class ProjectRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      PROJECT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { id: string; organisationId?: string; orgRole?: string }
      | undefined;
    const projectId = request.params?.id as string | undefined;

    if (!user?.id || !projectId) {
      throw new ForbiddenException(
        'Authentication and project context required',
      );
    }

    if (user.orgRole === 'owner' || user.orgRole === 'admin') {
      return true;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this project');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient project role');
    }

    return true;
  }
}
