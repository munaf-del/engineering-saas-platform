import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Catalogue & Snapshot E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;

  const uniqueSuffix = `cat-${Date.now()}`;
  const testUser = {
    email: `e2e-${uniqueSuffix}@test.com`,
    name: 'Catalogue Test User',
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
      .send({ name: `Cat Org ${uniqueSuffix}`, slug: `e2e-cat-${uniqueSuffix}` });
    orgId = orgRes.body.id;

    const switchRes = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-org')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ organisationId: orgId });
    accessToken = switchRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.steelSection.deleteMany({
      where: { catalog: { organisationId: orgId } },
    });
    await prisma.steelSectionCatalog.deleteMany({ where: { organisationId: orgId } });
    await prisma.rebarSize.deleteMany({
      where: { catalog: { organisationId: orgId } },
    });
    await prisma.rebarCatalog.deleteMany({ where: { organisationId: orgId } });
    await prisma.importItemError.deleteMany({
      where: { importJob: { organisationId: orgId } },
    });
    await prisma.importJob.deleteMany({ where: { organisationId: orgId } });
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

  // ── Steel Section Catalog Lifecycle ───────────────────────────

  describe('Steel Section Catalog Lifecycle', () => {
    let catalogId: string;

    it('POST /steel-sections/catalogs - should create a draft catalog', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/steel-sections/catalogs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test Catalog ${uniqueSuffix}`,
          version: '1.0',
          sourceStandard: 'AS/NZS 3679.1',
          sourceEdition: '2016',
        })
        .expect(201);

      expect(res.body.status).toBe('draft');
      expect(res.body.sourceStandard).toBe('AS/NZS 3679.1');
      catalogId = res.body.id;
    });

    it('POST /steel-sections/sections - should add section to draft catalog', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/steel-sections/sections')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          catalogId,
          designation: '200UB25.4',
          sectionType: 'UB',
          properties: { massPerMetre: 25.4, depth: 203 },
        })
        .expect(201);

      expect(res.body.designation).toBe('200UB25.4');
    });

    it('POST /steel-sections/catalogs/:id/activate - should activate and compute hash', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/steel-sections/catalogs/${catalogId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('active');
      expect(res.body.snapshotHash).toBeDefined();
      expect(res.body.snapshotHash.length).toBeGreaterThan(10);
    });

    it('GET /steel-sections/catalogs - should list catalogs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/steel-sections/catalogs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /steel-sections/catalogs/:catalogId/sections - should list sections', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/steel-sections/catalogs/${catalogId}/sections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].designation).toBe('200UB25.4');
    });

    it('should not allow adding sections to an active catalog', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/steel-sections/sections')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          catalogId,
          designation: '310UB40.4',
          sectionType: 'UB',
          properties: { massPerMetre: 40.4 },
        })
        .expect(400);
    });
  });

  // ── Snapshot Pinning (new version doesn't change old) ─────────

  describe('Snapshot Pinning', () => {
    let v1CatalogId: string;
    let v2CatalogId: string;

    it('should create v1 catalog, activate, then create v2 without changing v1', async () => {
      const v1 = await request(app.getHttpServer())
        .post('/api/v1/steel-sections/catalogs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Pin Test ${uniqueSuffix}`,
          version: 'v1',
          sourceStandard: 'AS/NZS 3679.1',
          sourceEdition: '2016',
        });
      v1CatalogId = v1.body.id;

      await request(app.getHttpServer())
        .post('/api/v1/steel-sections/sections')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          catalogId: v1CatalogId,
          designation: 'PIN-100',
          sectionType: 'UB',
          properties: { massPerMetre: 10 },
        });

      await request(app.getHttpServer())
        .post(`/api/v1/steel-sections/catalogs/${v1CatalogId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`);

      const v2 = await request(app.getHttpServer())
        .post('/api/v1/steel-sections/catalogs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Pin Test ${uniqueSuffix}`,
          version: 'v2',
          sourceStandard: 'AS/NZS 3679.1',
          sourceEdition: '2016',
        });
      v2CatalogId = v2.body.id;

      await request(app.getHttpServer())
        .post('/api/v1/steel-sections/sections')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          catalogId: v2CatalogId,
          designation: 'PIN-200',
          sectionType: 'UC',
          properties: { massPerMetre: 20 },
        });

      await request(app.getHttpServer())
        .post(`/api/v1/steel-sections/catalogs/${v2CatalogId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`);

      const v1Detail = await request(app.getHttpServer())
        .get(`/api/v1/steel-sections/catalogs/${v1CatalogId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(v1Detail.body.status).toBe('superseded');

      const v1Sections = await request(app.getHttpServer())
        .get(`/api/v1/steel-sections/catalogs/${v1CatalogId}/sections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(v1Sections.body.data.length).toBe(1);
      expect(v1Sections.body.data[0].designation).toBe('PIN-100');

      const v2Sections = await request(app.getHttpServer())
        .get(`/api/v1/steel-sections/catalogs/${v2CatalogId}/sections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(v2Sections.body.data.length).toBe(1);
      expect(v2Sections.body.data[0].designation).toBe('PIN-200');
    });
  });

  // ── Tenant Isolation for Catalogs ─────────────────────────────

  describe('Tenant Isolation for Catalogs', () => {
    let otherToken: string;

    beforeAll(async () => {
      const otherUser = {
        email: `e2e-catother-${uniqueSuffix}@test.com`,
        name: 'Other Cat User',
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
          name: `Other Cat Org ${uniqueSuffix}`,
          slug: `e2e-catother-${uniqueSuffix}`,
        });

      const switchRes = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ organisationId: otherOrg.body.id });
      otherToken = switchRes.body.accessToken;
    });

    it('should not show first org catalogs to other org user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/steel-sections/catalogs')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const orgCatalogs = res.body.data.filter(
        (c: { organisationId: string }) => c.organisationId === orgId,
      );
      expect(orgCatalogs.length).toBe(0);
    });
  });
});
