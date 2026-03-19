import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Standards & Profiles E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;
  let projectId: string;

  const uniqueSuffix = `std-${Date.now()}`;
  const testUser = {
    email: `e2e-${uniqueSuffix}@test.com`,
    name: 'Standards Test User',
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

    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);
    accessToken = regRes.body.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organisations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Std Org ${uniqueSuffix}`, slug: `e2e-std-${uniqueSuffix}` });
    orgId = orgRes.body.id;

    const switchRes = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-org')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ organisationId: orgId });
    accessToken = switchRes.body.accessToken;

    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Std Project ${uniqueSuffix}`, code: `STD-${uniqueSuffix}` });
    projectId = projRes.body.id;
  });

  afterAll(async () => {
    await prisma.projectStandardAssignment.deleteMany({
      where: { projectId },
    });
    await prisma.pinnedStandard.deleteMany({
      where: { standardsProfile: { organisationId: orgId } },
    });
    await prisma.standardsProfile.deleteMany({ where: { organisationId: orgId } });
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

  // ── Standards Registry ────────────────────────────────────────

  describe('Standards Registry', () => {
    let standardId: string;
    let editionId: string;

    it('POST /standards - should create a standard', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/standards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          code: `TEST-${uniqueSuffix}`,
          title: 'Test Standard',
          category: 'general',
        })
        .expect(201);

      expect(res.body.code).toBe(`TEST-${uniqueSuffix}`);
      standardId = res.body.id;
    });

    it('GET /standards - should list standards', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/standards')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('POST /standards/editions - should create an edition', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/standards/editions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          standardId,
          edition: '2025',
          sourceEdition: '2025',
          effectiveDate: '2025-01-01',
        })
        .expect(201);

      expect(res.body.edition).toBe('2025');
      editionId = res.body.id;
    });

    it('GET /standards/editions/current - should list current editions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/standards/editions/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    // ── Standards Profiles ──────────────────────────────────────

    let profileId: string;

    it('POST /standards/profiles - should create a profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/standards/profiles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test Profile ${uniqueSuffix}`,
          description: 'E2E test profile',
        })
        .expect(201);

      expect(res.body.name).toBe(`Test Profile ${uniqueSuffix}`);
      profileId = res.body.id;
    });

    it('POST /standards/profiles/:id/pin - should pin an edition', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/standards/profiles/${profileId}/pin`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ standardEditionId: editionId })
        .expect(201);

      expect(res.body.standardEditionId).toBe(editionId);
    });

    it('GET /standards/profiles/:id - should show pinned standards', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/standards/profiles/${profileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.pinnedStandards.length).toBe(1);
    });

    it('DELETE /standards/profiles/:profileId/pin/:editionId - should unpin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/standards/profiles/${profileId}/pin/${editionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/standards/profiles/${profileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.pinnedStandards.length).toBe(0);
    });

    // ── Project Standard Assignments ────────────────────────────

    it('POST /standards/projects/:projectId/assignments - should assign', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/standards/projects/${projectId}/assignments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          standardEditionId: editionId,
          notes: 'Required for design',
        })
        .expect(201);

      expect(res.body.projectId).toBe(projectId);
    });

    it('GET /standards/projects/:projectId/assignments - should list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/standards/projects/${projectId}/assignments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.length).toBe(1);
    });

    it('DELETE /standards/projects/:projectId/assignments/:editionId - should remove', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/standards/projects/${projectId}/assignments/${editionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/standards/projects/${projectId}/assignments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.length).toBe(0);
    });
  });

  // ── Tenant Isolation for Profiles ─────────────────────────────

  describe('Tenant Isolation for Profiles', () => {
    let otherToken: string;

    beforeAll(async () => {
      const otherUser = {
        email: `e2e-stdother-${uniqueSuffix}@test.com`,
        name: 'Other Std User',
        password: 'TestPassword1!',
      };

      const regRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(otherUser);
      otherToken = regRes.body.accessToken;

      const otherOrg = await request(app.getHttpServer())
        .post('/api/v1/organisations')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          name: `Other Std Org ${uniqueSuffix}`,
          slug: `e2e-stdother-${uniqueSuffix}`,
        });

      const switchRes = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ organisationId: otherOrg.body.id });
      otherToken = switchRes.body.accessToken;
    });

    it('should not show first org profiles to other org user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/standards/profiles')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const found = res.body.data.filter(
        (p: { organisationId: string }) => p.organisationId === orgId,
      );
      expect(found.length).toBe(0);
    });
  });
});
