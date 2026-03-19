import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
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

  // ── Organisation Member Management ────────────────────────────

  describe('Organisation Member Management', () => {
    let viewerToken: string;
    let viewerUserId: string;
    let engineerToken: string;
    let engineerUserId: string;

    const viewerUser = {
      email: `e2e-viewer-${uniqueSuffix}@test.com`,
      name: 'E2E Viewer User',
      password: 'TestPassword1!',
    };

    const engineerUser = {
      email: `e2e-engineer-${uniqueSuffix}@test.com`,
      name: 'E2E Engineer User',
      password: 'TestPassword1!',
    };

    beforeAll(async () => {
      // Register viewer user
      const viewerReg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(viewerUser);
      viewerToken = viewerReg.body.accessToken;
      viewerUserId = viewerReg.body.user.id;

      // Register engineer user
      const engReg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(engineerUser);
      engineerToken = engReg.body.accessToken;
      engineerUserId = engReg.body.user.id;
    });

    it('GET /organisations/:id/members - should list members', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organisations/${orgId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /organisations/:id/members - owner should add a viewer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organisations/${orgId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: viewerUserId, role: 'viewer' })
        .expect(201);

      expect(res.body.role).toBe('viewer');
      expect(res.body.user.id).toBe(viewerUserId);

      // Switch viewer into the org
      const switchRes = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ organisationId: orgId });
      viewerToken = switchRes.body.accessToken;
    });

    it('POST /organisations/:id/members - owner should add an engineer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organisations/${orgId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: engineerUserId, role: 'engineer' })
        .expect(201);

      expect(res.body.role).toBe('engineer');

      const switchRes = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${engineerToken}`)
        .send({ organisationId: orgId });
      engineerToken = switchRes.body.accessToken;
    });

    it('POST /organisations/:id/members - viewer should be forbidden from adding members', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organisations/${orgId}/members`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ userId: '00000000-0000-4000-8000-000000000001', role: 'viewer' })
        .expect(403);
    });

    it('POST /organisations/:id/members - engineer should be forbidden from adding members', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organisations/${orgId}/members`)
        .set('Authorization', `Bearer ${engineerToken}`)
        .send({ userId: '00000000-0000-4000-8000-000000000001', role: 'viewer' })
        .expect(403);
    });

    it('PATCH /organisations/:id/members/:userId - owner should update member role', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organisations/${orgId}/members/${viewerUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'engineer' })
        .expect(200);

      expect(res.body.role).toBe('engineer');
    });

    it('PATCH /organisations/:id/members/:userId - viewer/engineer should be forbidden from updating roles', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/organisations/${orgId}/members/${viewerUserId}`)
        .set('Authorization', `Bearer ${engineerToken}`)
        .send({ role: 'viewer' })
        .expect(403);
    });

    it('DELETE /organisations/:id/members/:userId - viewer/engineer should be forbidden from removing members', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/organisations/${orgId}/members/${viewerUserId}`)
        .set('Authorization', `Bearer ${engineerToken}`)
        .expect(403);
    });

    it('POST /organisations/:id/members - should reject duplicate membership', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organisations/${orgId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: viewerUserId, role: 'viewer' })
        .expect(409);
    });

    // Reset viewer role back for subsequent tests
    afterAll(async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/organisations/${orgId}/members/${viewerUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'viewer' });

      const switchRes = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ organisationId: orgId });
      viewerToken = switchRes.body.accessToken;
    });
  });

  // ── Project Access Control ───────────────────────────────────

  describe('Project Access Control', () => {
    let viewerToken: string;
    let viewerUserId: string;
    let nonMemberOrgToken: string;

    beforeAll(async () => {
      // Get a viewer user who is in the org but NOT in the project
      const viewerUser = {
        email: `e2e-proj-viewer-${uniqueSuffix}@test.com`,
        name: 'E2E Project Viewer',
        password: 'TestPassword1!',
      };

      const regRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(viewerUser);
      viewerUserId = regRes.body.user.id;
      viewerToken = regRes.body.accessToken;

      // Add as org viewer
      await request(app.getHttpServer())
        .post(`/api/v1/organisations/${orgId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: viewerUserId, role: 'viewer' });

      // Switch viewer into the org
      const switchRes = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ organisationId: orgId });
      viewerToken = switchRes.body.accessToken;

      // Create a second org with a different user for cross-org tests
      const crossOrgUser = {
        email: `e2e-cross-${uniqueSuffix}@test.com`,
        name: 'Cross Org User',
        password: 'TestPassword1!',
      };
      const crossReg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(crossOrgUser);
      nonMemberOrgToken = crossReg.body.accessToken;

      const crossOrg = await request(app.getHttpServer())
        .post('/api/v1/organisations')
        .set('Authorization', `Bearer ${nonMemberOrgToken}`)
        .send({ name: 'Cross Org', slug: `e2e-cross-${uniqueSuffix}` });

      const crossSwitch = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${nonMemberOrgToken}`)
        .send({ organisationId: crossOrg.body.id });
      nonMemberOrgToken = crossSwitch.body.accessToken;
    });

    it('GET /projects/:id - org viewer (non-project-member) should be forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('GET /projects/:id/members - org viewer (non-project-member) should be forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('PATCH /projects/:id - org viewer (non-project-member) should be forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Hijack' })
        .expect(403);
    });

    it('DELETE /projects/:id - org viewer (non-project-member) should be forbidden', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('GET /projects/:id - cross-org user should get 404 (tenant-scoped)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${nonMemberOrgToken}`)
        .expect(404);
    });

    it('PATCH /projects/:id - cross-org user should get 404', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${nonMemberOrgToken}`)
        .send({ name: 'Hijack' })
        .expect(404);
    });

    it('GET /projects/:id - org owner (non-project-member) should succeed via admin bypass', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(projectId);
    });
  });

  // ── Standards Auth Guard ─────────────────────────────────────

  describe('Standards Auth Guard', () => {
    it('GET /standards - should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/standards')
        .expect(401);
    });

    it('GET /standards/current - should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/standards/current')
        .expect(401);
    });

    it('GET /standards/:code - should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/standards/AS3600')
        .expect(401);
    });

    it('GET /standards - should allow authenticated request', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/standards')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
    });
  });

  // ── Request ID Tracing ──────────────────────────────────────

  describe('Request ID Tracing', () => {
    it('should return x-request-id header on response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should preserve provided x-request-id', async () => {
      const customId = 'test-request-id-12345';
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('x-request-id', customId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  // ── Audit Logging ────────────────────────────────────────────

  describe('Audit Logging', () => {
    it('should have recorded audit logs for the test user', async () => {
      await new Promise((r) => setTimeout(r, 500));

      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      expect(logs.length).toBeGreaterThan(0);

      const actions = logs.map((l: { action: string }) => l.action);
      expect(actions).toContain('login');
    });

    it('should have audit logs for org and project creation', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { userId, action: 'create' },
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);

      const entityTypes = logs.map((l: { entityType: string }) => l.entityType);
      expect(entityTypes).toContain('organisations');
      expect(entityTypes).toContain('projects');
    });

    it('should include requestId in auth audit metadata', async () => {
      const loginLogs = await prisma.auditLog.findMany({
        where: { userId, action: 'login' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(loginLogs.length).toBe(1);
      expect(loginLogs[0]).toBeDefined();
      const meta = loginLogs[0]!.metadata as Record<string, unknown> | null;
      if (meta) {
        expect(meta.requestId).toBeDefined();
      }
    });

    it('should include requestId in CRUD audit metadata', async () => {
      const createLogs = await prisma.auditLog.findMany({
        where: { userId, action: 'create', entityType: 'organisations' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(createLogs.length).toBe(1);
      expect(createLogs[0]).toBeDefined();
      const meta = createLogs[0]!.metadata as Record<string, unknown> | null;
      if (meta) {
        expect(meta.requestId).toBeDefined();
      }
    });
  });

  // ── Auth: Logout ─────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should revoke refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
