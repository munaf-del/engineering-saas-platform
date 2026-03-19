import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('API E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let orgId: string;
  let projectId: string;

  const uniqueSuffix = Date.now();
  const testUser = {
    email: `e2e-${uniqueSuffix}@test.com`,
    name: 'E2E Test User',
    password: 'TestPassword1!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data in correct order to respect FK constraints
    await prisma.auditLog.deleteMany({
      where: { user: { email: { startsWith: 'e2e-' } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { startsWith: 'e2e-' } } },
    });
    await prisma.projectMember.deleteMany({
      where: { user: { email: { startsWith: 'e2e-' } } },
    });
    await prisma.project.deleteMany({
      where: { organisation: { slug: { startsWith: 'e2e-' } } },
    });
    await prisma.standardsProfile.deleteMany({
      where: { organisation: { slug: { startsWith: 'e2e-' } } },
    });
    await prisma.organisationMember.deleteMany({
      where: { user: { email: { startsWith: 'e2e-' } } },
    });
    await prisma.organisation.deleteMany({
      where: { slug: { startsWith: 'e2e-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-' } },
    });
    await app.close();
  });

  // ── Auth: Register ───────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
      userId = res.body.user.id;
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });
  });

  // ── Auth: Login ──────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrong-password' })
        .expect(401);
    });
  });

  // ── Auth: Refresh ────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should refresh tokens and rotate the refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);

      const oldRefreshToken = refreshToken;
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;

      // Old refresh token should be revoked
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'totally-invalid-token' })
        .expect(401);
    });
  });

  // ── Auth: Profile ────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(testUser.email);
      expect(res.body.name).toBe(testUser.name);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });

  // ── Organisations CRUD ───────────────────────────────────────

  describe('Organisations', () => {
    it('POST /organisations - should create an org (caller becomes owner)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/organisations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E Test Org',
          slug: `e2e-org-${uniqueSuffix}`,
        })
        .expect(201);

      expect(res.body.name).toBe('E2E Test Org');
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].role).toBe('owner');
      orgId = res.body.id;
    });

    it('GET /organisations - should list user orgs (paginated)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/organisations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((o: { id: string }) => o.id === orgId)).toBe(
        true,
      );
    });

    it('GET /organisations/:id - should get org detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organisations/${orgId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(orgId);
    });

    it('PATCH /organisations/:id - should update org', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organisations/${orgId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Updated Org' })
        .expect(200);

      expect(res.body.name).toBe('E2E Updated Org');
    });
  });

  // ── Auth: Switch Org ─────────────────────────────────────────

  describe('POST /auth/switch-org', () => {
    it('should switch to the created org and return org-scoped tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ organisationId: orgId })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.organisation.id).toBe(orgId);
      expect(res.body.organisation.role).toBe('owner');

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should reject switch to non-member org', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ organisationId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });
  });

  // ── Projects CRUD ────────────────────────────────────────────

  describe('Projects', () => {
    it('POST /projects - should create a project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E Test Project',
          code: `E2E-${uniqueSuffix}`,
        })
        .expect(201);

      expect(res.body.name).toBe('E2E Test Project');
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].role).toBe('lead');
      projectId = res.body.id;
    });

    it('GET /projects - should list projects (paginated)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(
        res.body.data.some((p: { id: string }) => p.id === projectId),
      ).toBe(true);
    });

    it('GET /projects/:id - should get project detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(projectId);
    });

    it('PATCH /projects/:id - should update project', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Updated Project' })
        .expect(200);

      expect(res.body.name).toBe('E2E Updated Project');
    });

    it('GET /projects/:id/members - should list project members', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].userId).toBe(userId);
    });
  });

  // ── Tenant Isolation ─────────────────────────────────────────

  describe('Tenant Isolation', () => {
    let otherToken: string;

    const otherUser = {
      email: `e2e-other-${uniqueSuffix}@test.com`,
      name: 'Other E2E User',
      password: 'TestPassword1!',
    };

    beforeAll(async () => {
      const regRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(otherUser);
      otherToken = regRes.body.accessToken;

      const orgRes = await request(app.getHttpServer())
        .post('/api/v1/organisations')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          name: 'Other E2E Org',
          slug: `e2e-other-${uniqueSuffix}`,
        });

      const switchRes = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ organisationId: orgRes.body.id });
      otherToken = switchRes.body.accessToken;
    });

    it('should not allow other user to view first user org', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/organisations/${orgId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not show projects from another org', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const ids = res.body.data.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(projectId);
    });
  });

  // ── Audit Logging ────────────────────────────────────────────

  describe('Audit Logging', () => {
    it('should have recorded audit logs for the test user', async () => {
      // Give async audit writes a moment to complete
      await new Promise((r) => setTimeout(r, 500));

      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      expect(logs.length).toBeGreaterThan(0);

      const actions = logs.map((l) => l.action);
      expect(actions).toContain('login');
    });

    it('should have audit logs for org and project creation', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { userId, action: 'create' },
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);

      const entityTypes = logs.map((l) => l.entityType);
      expect(entityTypes).toContain('organisations');
      expect(entityTypes).toContain('projects');
    });
  });

  // ── Auth: Logout ─────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should revoke refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      // Revoked token should no longer work
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
