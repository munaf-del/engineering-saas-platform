import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

type AuthTransactionClient = Pick<
  PrismaService,
  'user' | 'organisation' | 'organisationMember'
>;

const ORGANISATION_AUTH_SELECT = {
  id: true,
  name: true,
  slug: true,
  abn: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganisationSelect;

const ORGANISATION_MEMBERSHIP_WITH_ORG_SELECT = {
  id: true,
  organisationId: true,
  userId: true,
  role: true,
  createdAt: true,
  organisation: {
    select: ORGANISATION_AUTH_SELECT,
  },
} satisfies Prisma.OrganisationMemberSelect;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { user, org } = await this.prisma.$transaction(async (tx: AuthTransactionClient) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          password: hashedPassword,
        },
      });

      const baseSlug = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slug = `${baseSlug || 'workspace'}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

      const org = await tx.organisation.create({
        data: {
          name: `${dto.name}'s Workspace`,
          slug,
          members: { create: { userId: user.id, role: 'owner' } },
        },
      });

      return { user, org };
    });

    const orgRole = 'owner';
    const accessToken = this.signAccessToken(user.id, user.email, org.id, orgRole);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organisationId: org.id,
        orgRole,
      },
      organisations: [
        { id: org.id, name: org.name, slug: org.slug, role: orgRole },
      ],
    };
  }

  async login(dto: LoginDto, requestId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        orgMemberships: { select: ORGANISATION_MEMBERSHIP_WITH_ORG_SELECT },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Bootstrap a personal workspace for users with no organisation
    if (user.orgMemberships.length === 0) {
      const membership = await this.bootstrapPersonalOrg(user.id, user.name);
      user.orgMemberships.push(membership);
      this.logger.log(`Bootstrapped personal org for user ${user.id}`);
    }

    let orgId: string | undefined;
    let orgRole: string | undefined;

    if (dto.organisationId) {
      const membership = user.orgMemberships.find(
        (m: (typeof user.orgMemberships)[number]) => m.organisationId === dto.organisationId,
      );
      if (!membership) {
        throw new UnauthorizedException('Not a member of this organisation');
      }
      orgId = membership.organisationId;
      orgRole = membership.role;
    } else if (user.orgMemberships.length === 1) {
      orgId = user.orgMemberships[0]!.organisationId;
      orgRole = user.orgMemberships[0]!.role;
    }

    const accessToken = this.signAccessToken(
      user.id,
      user.email,
      orgId,
      orgRole,
    );
    const refreshToken = await this.createRefreshToken(user.id);

    this.writeAuthAudit(user.id, orgId, 'login', requestId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        ...(orgId && { organisationId: orgId }),
        ...(orgRole && { orgRole }),
      },
      organisations: user.orgMemberships.map((m: (typeof user.orgMemberships)[number]) => ({
        id: m.organisationId,
        name: m.organisation.name,
        slug: m.organisation.slug,
        role: m.role,
      })),
    };
  }

  async refresh(refreshTokenValue: string) {
    const tokenHash = this.hashToken(refreshTokenValue);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const user = storedToken.user;

    let membership = await this.prisma.organisationMember.findFirst({
      where: { userId: user.id },
    });

    if (!membership) {
      membership = await this.bootstrapPersonalOrg(user.id, user.name);
      this.logger.log(`Bootstrapped personal org for user ${user.id} during token refresh`);
    }

    const accessToken = this.signAccessToken(
      user.id,
      user.email,
      membership.organisationId,
      membership.role,
    );
    const newRefreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshTokenValue: string) {
    const tokenHash = this.hashToken(refreshTokenValue);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (storedToken && !storedToken.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  async switchOrg(userId: string, organisationId: string, requestId?: string) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
    });

    if (!membership) {
      throw new UnauthorizedException('Not a member of this organisation');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const accessToken = this.signAccessToken(
      user.id,
      user.email,
      membership.organisationId,
      membership.role,
    );
    const refreshToken = await this.createRefreshToken(user.id);

    this.writeAuthAudit(userId, organisationId, 'switch_org', requestId);

    return {
      accessToken,
      refreshToken,
      organisation: {
        id: membership.organisationId,
        role: membership.role,
      },
    };
  }

  async profile(userId: string, organisationId?: string, orgRole?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMemberships: { select: ORGANISATION_MEMBERSHIP_WITH_ORG_SELECT },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.orgMemberships.length === 0) {
      const membership = await this.bootstrapPersonalOrg(user.id, user.name);
      user.orgMemberships.push(membership);
      this.logger.log(`Bootstrapped personal org for user ${user.id} during profile fetch`);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        ...(organisationId && { organisationId }),
        ...(orgRole && { orgRole }),
      },
      organisations: user.orgMemberships.map((m: (typeof user.orgMemberships)[number]) => ({
        id: m.organisationId,
        name: m.organisation.name,
        slug: m.organisation.slug,
        role: m.role,
      })),
    };
  }

  private signAccessToken(
    userId: string,
    email: string,
    orgId?: string,
    orgRole?: string,
  ): string {
    const payload: Record<string, unknown> = { sub: userId, email };
    if (orgId) payload['orgId'] = orgId;
    if (orgRole) payload['orgRole'] = orgRole;
    return this.jwtService.sign(payload);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return token;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async bootstrapPersonalOrg(userId: string, userName: string) {
    return this.prisma.$transaction(async (tx: AuthTransactionClient) => {
      const existing = await tx.organisationMember.findFirst({
        where: { userId },
        select: ORGANISATION_MEMBERSHIP_WITH_ORG_SELECT,
      });
      if (existing) return existing;

      const baseSlug = userName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slug = `${baseSlug || 'workspace'}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

      const org = await tx.organisation.create({
        data: {
          name: `${userName}'s Workspace`,
          slug,
          members: { create: { userId, role: 'owner' } },
        },
      });

      return tx.organisationMember.findUniqueOrThrow({
        where: { organisationId_userId: { organisationId: org.id, userId } },
        select: ORGANISATION_MEMBERSHIP_WITH_ORG_SELECT,
      });
    });
  }

  private writeAuthAudit(
    userId: string,
    organisationId: string | undefined,
    action: string,
    requestId?: string,
  ) {
    this.prisma.auditLog
      .create({
        data: {
          userId,
          organisationId: organisationId ?? null,
          action,
          entityType: 'auth',
          metadata: requestId ? { requestId } : undefined,
        },
      })
      .catch((err: unknown) => this.logger.error('Failed to write auth audit log', err));
  }
}
