import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
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

    const accessToken = this.signToken(user.id, user.email);

    return {
      accessToken,
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

    const accessToken = this.signToken(user.id, user.email, orgId, orgRole);

    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
      organisations: user.orgMemberships.map((m) => ({
        id: m.organisationId,
        name: m.organisation.name,
        slug: m.organisation.slug,
        role: m.role,
      })),
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

  private signToken(
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
}
