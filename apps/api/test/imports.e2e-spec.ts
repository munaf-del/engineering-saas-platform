import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Import Subsystem E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;

  const uniqueSuffix = `imp-${Date.now()}`;
  const testUser = {
    email: `e2e-${uniqueSuffix}@test.com`,
    name: 'Import Test User',
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
      .send({ name: `Import Org ${uniqueSuffix}`, slug: `e2e-imp-${uniqueSuffix}` });
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

  // ── Templates ─────────────────────────────────────────────────

  describe('Import Templates', () => {
    it('GET /imports/templates - should list available templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/imports/templates')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
    });

    it('GET /imports/templates/steel_section - should download template', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/imports/templates/steel_section')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('designation');
    });
  });

  // ── Import Validation ─────────────────────────────────────────

  describe('Import Validation', () => {
    it('should validate a valid CSV and return validated status', async () => {
      const csvContent = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        '200UB25.4,UB,25.4,203,133,7.8,5.8',
        '310UB40.4,UB,40.4,304,165,10.2,6.1',
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `Import Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(csvContent), 'test-sections.csv')
        .expect(201);

      expect(res.body.status).toBe('validated');
      expect(res.body.totalRows).toBe(2);
      expect(res.body.validRows).toBe(2);
      expect(res.body.errorRows).toBe(0);
    });

    it('should fail validation for CSV with missing required fields', async () => {
      const csvContent = [
        'designation,sectionType,massPerMetre',
        '200UB25.4,UB,25.4',
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `Fail Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(csvContent), 'bad-sections.csv')
        .expect(201);

      expect(res.body.status).toBe('failed');
      expect(res.body.errorRows).toBeGreaterThan(0);
      expect(res.body.errors.length).toBeGreaterThan(0);
      expect(res.body.errors[0].message).toContain('Missing required field');
    });

    it('should validate JSON import format', async () => {
      const jsonContent = JSON.stringify([
        {
          designation: 'N12',
          barDiameter: 12,
          nominalArea: 113.1,
          massPerMetre: 0.888,
          grade: 'D500N',
          ductilityClass: 'N',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'rebar_size')
        .field('format', 'json')
        .field('dryRun', 'true')
        .field('catalogName', `JSON Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 4671')
        .field('sourceEdition', '2019')
        .attach('file', Buffer.from(jsonContent), 'test-rebar.json')
        .expect(201);

      expect(res.body.status).toBe('validated');
      expect(res.body.totalRows).toBe(1);
    });
  });

  // ── Import Apply & Rollback ───────────────────────────────────

  describe('Import Apply & Rollback', () => {
    let appliedJobId: string;

    it('should upload, validate, and apply a steel section import', async () => {
      const csvContent = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        'TEST-100,UB,10,100,50,5,3',
      ].join('\n');

      const uploadRes = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('catalogName', `Apply Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(csvContent), 'apply-test.csv')
        .expect(201);

      expect(uploadRes.body.status).toBe('validated');
      const jobId = uploadRes.body.id;

      const applyRes = await request(app.getHttpServer())
        .post(`/api/v1/imports/${jobId}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(applyRes.body.status).toBe('applied');
      expect(applyRes.body.snapshotId).toBeDefined();
      appliedJobId = jobId;
    });

    it('should not allow applying a dry-run import', async () => {
      const csvContent = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        'DRY-100,UB,10,100,50,5,3',
      ].join('\n');

      const uploadRes = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `DryRun Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(csvContent), 'dry-run-test.csv');

      await request(app.getHttpServer())
        .post(`/api/v1/imports/${uploadRes.body.id}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should rollback an applied import', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${appliedJobId}/rollback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('rolled_back');
      expect(res.body.rolledBackAt).toBeDefined();
    });

    it('should not rollback an already rolled-back import', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/imports/${appliedJobId}/rollback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  // ── Import Audit Trail ────────────────────────────────────────

  describe('Import Audit Trail', () => {
    it('GET /imports - should list import jobs for the org', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/imports')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      for (const job of res.body.data) {
        expect(job.organisationId).toBe(orgId);
      }
    });
  });
});
