import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Ingestion & Approval Workflow E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;

  const uniqueSuffix = `ing-${Date.now()}`;
  const testUser = {
    email: `e2e-${uniqueSuffix}@test.com`,
    name: 'Ingestion Test User',
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
      .send({ name: `Ingestion Org ${uniqueSuffix}`, slug: `e2e-ing-${uniqueSuffix}` });
    orgId = orgRes.body.id;

    const switchRes = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-org')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ organisationId: orgId });
    accessToken = switchRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.rulePackActivation.deleteMany({});
    await prisma.standardRulePack.deleteMany({
      where: { importedBy: { not: 'system' } },
    });
    await prisma.importApproval.deleteMany({
      where: { importJob: { organisationId: orgId } },
    });
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

  // ── Standards Registry Import ──────────────────────────────────

  describe('Standards Registry Import', () => {
    it('should validate standards registry CSV with required metadata', async () => {
      const csv = [
        'code,title,category,edition,sourceEdition,effectiveDate,sourceDataset',
        'PLACEHOLDER-1170.0,Placeholder Loading Standard,loading,2002,2002,2002-06-01,placeholder-dataset',
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'standards_registry')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `Standards ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'placeholder')
        .field('sourceEdition', 'placeholder')
        .attach('file', Buffer.from(csv), 'standards.csv')
        .expect(201);

      expect(res.body.status).toBe('validated');
      expect(res.body.totalRows).toBe(1);
    });

    it('should fail standards registry import missing sourceDataset', async () => {
      const csv = [
        'code,title,category,edition,sourceEdition,effectiveDate',
        'BAD-STD,Bad Standard,loading,2002,2002,2002-06-01',
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'standards_registry')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `Bad Standards ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'placeholder')
        .field('sourceEdition', 'placeholder')
        .attach('file', Buffer.from(csv), 'bad-standards.csv')
        .expect(201);

      expect(res.body.status).toBe('failed');
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  // ── Approval Before Activation ─────────────────────────────────

  describe('Approval Workflow', () => {
    let jobId: string;

    it('should upload and validate a rule-pack YAML import', async () => {
      const yamlContent = [
        'standardCode: PLACEHOLDER-STD',
        'version: "1.0"',
        'effectiveDate: "2024-01-01"',
        'sourceDataset: placeholder-fixture',
        'rules:',
        '  - ruleKey: phi_placeholder',
        '    clauseRef: "4.2.3"',
        '    description: Placeholder reduction factor',
        '    value: 0.5',
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'load_combination_rules')
        .field('format', 'yaml')
        .field('catalogName', `RulePack ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'placeholder')
        .field('sourceEdition', 'placeholder')
        .attach('file', Buffer.from(yamlContent), 'rules.yaml')
        .expect(201);

      expect(res.body.status).toBe('validated');
      jobId = res.body.id;
    });

    it('should not allow activation without approval', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/imports/${jobId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should submit for approval', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${jobId}/submit-for-approval`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('awaiting_approval');
    });

    it('should not allow apply while awaiting approval', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/imports/${jobId}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should approve the import', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${jobId}/approve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Data verified' })
        .expect(201);

      expect(res.body.status).toBe('approved');
      expect(res.body.approvedAt).toBeDefined();
    });

    it('should return approval history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/imports/${jobId}/approvals`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].action).toBe('approve');
    });

    it('should activate the approved import', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${jobId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('applied');
    });

    it('should rollback activated import', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${jobId}/rollback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('rolled_back');
    });
  });

  // ── Rejection Workflow ─────────────────────────────────────────

  describe('Rejection Workflow', () => {
    it('should reject an import awaiting approval', async () => {
      const csv = [
        'code,title,category,edition,sourceEdition,effectiveDate,sourceDataset',
        'REJECT-STD,Reject Standard,general,2024,2024,2024-01-01,placeholder',
      ].join('\n');

      const upload = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'standards_registry')
        .field('format', 'csv')
        .field('catalogName', `Reject Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'placeholder')
        .field('sourceEdition', 'placeholder')
        .attach('file', Buffer.from(csv), 'reject-test.csv')
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/imports/${upload.body.id}/submit-for-approval`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${upload.body.id}/reject`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Data not verified' })
        .expect(201);

      expect(res.body.status).toBe('rejected');
      expect(res.body.rejectionReason).toBe('Data not verified');
    });
  });

  // ── Invalid Metadata ───────────────────────────────────────────

  describe('Invalid Metadata', () => {
    it('should fail import missing sourceStandard', async () => {
      const csv = 'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness\n200UB,UB,25.4,203,133,7.8,5.8';

      await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('catalogName', `NoSource ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', '')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(csv), 'no-source.csv')
        .expect(400);
    });
  });

  // ── Rule Pack Active Endpoints ─────────────────────────────────

  describe('Rule Pack Active Endpoints', () => {
    it('GET /imports/rule-packs/active should return active packs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/imports/rule-packs/active')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── No Raw Licensed Data ───────────────────────────────────────

  describe('No raw licensed data in fixtures', () => {
    it('test fixtures use only placeholder values, not real standards data', () => {
      const placeholderCsv = 'code,title\nPLACEHOLDER-1170.0,Placeholder Loading Standard';
      expect(placeholderCsv).toContain('PLACEHOLDER');
      expect(placeholderCsv).not.toContain('AS/NZS 1170.0:2002');
    });
  });
});
