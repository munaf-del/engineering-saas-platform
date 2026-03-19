import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

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

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
      },
    });

    const accessToken = this.signAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        orgMemberships: { include: { organisation: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let orgId: string | undefined;
    let orgRole: string | undefined;

    if (dto.organisationId) {
      const membership = user.orgMemberships.find(
        (m) => m.organisationId === dto.organisationId,
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

    this.writeAuthAudit(user.id, orgId, 'login');

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      organisations: user.orgMemberships.map((m) => ({
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
    const accessToken = this.signAccessToken(user.id, user.email);
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

  async switchOrg(userId: string, organisationId: string) {
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

    this.writeAuthAudit(userId, organisationId, 'switch_org');

    return {
      accessToken,
      refreshToken,
      organisation: {
        id: membership.organisationId,
        role: membership.role,
      },
    };
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMemberships: { include: { organisation: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organisations: user.orgMemberships.map((m) => ({
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

  private writeAuthAudit(
    userId: string,
    organisationId: string | undefined,
    action: string,
  ) {
    this.prisma.auditLog
      .create({
        data: {
          userId,
          organisationId: organisationId ?? null,
          action,
          entityType: 'auth',
        },
      })
      .catch((err) => this.logger.error('Failed to write auth audit log', err));
  }
}
