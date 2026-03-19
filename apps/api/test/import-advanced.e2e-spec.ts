import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Advanced import subsystem E2E tests covering:
 * - Material import apply & rollback
 * - Geotech import apply & rollback
 * - Diff preview for updates (steel, rebar, material, geotech)
 * - Snapshot pinning
 * - XLSX import
 * - Tenant isolation for import/catalogue routes
 */
describe('Import Advanced E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;

  const uniqueSuffix = `impv2-${Date.now()}`;
  const testUser = {
    email: `e2e-${uniqueSuffix}@test.com`,
    name: 'Import V2 Test User',
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
      .send({
        name: `Import V2 Org ${uniqueSuffix}`,
        slug: `e2e-impv2-${uniqueSuffix}`,
      });
    orgId = orgRes.body.id;

    const switchRes = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-org')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ organisationId: orgId });
    accessToken = switchRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.materialPropertySet.deleteMany({
      where: { material: { organisationId: orgId } },
    });
    await prisma.material.deleteMany({ where: { organisationId: orgId } });
    await prisma.geotechParameterSet.deleteMany({ where: { organisationId: orgId } });
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
    await prisma.document.deleteMany({ where: { organisationId: orgId } });
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

  // ── Material Import Apply & Rollback ───────────────────────────

  describe('Material Import Apply & Rollback', () => {
    let materialJobId: string;

    it('should validate a material CSV import', async () => {
      const csvContent = [
        'name,category,grade,sourceStandard,sourceEdition',
        `Demo Concrete ${uniqueSuffix},concrete,N40,AS 3600,2018`,
        `Demo Steel ${uniqueSuffix},structural_steel,300PLUS,AS/NZS 3679.1,2016`,
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'material')
        .field('format', 'csv')
        .field('catalogName', `Material Import ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS 3600')
        .field('sourceEdition', '2018')
        .attach('file', Buffer.from(csvContent), 'materials.csv')
        .expect(201);

      expect(res.body.status).toBe('validated');
      expect(res.body.totalRows).toBe(2);
      expect(res.body.validRows).toBe(2);
      materialJobId = res.body.id;
    });

    it('should apply the material import creating Material records', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${materialJobId}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('applied');
      expect(res.body.snapshotId).toBeDefined();
      expect(res.body.completedAt).toBeDefined();
    });

    it('should find the imported materials via materials API', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/materials/grades')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const imported = res.body.data.filter(
        (m: { name: string }) =>
          m.name.includes(uniqueSuffix),
      );
      expect(imported.length).toBe(2);
    });

    it('should rollback the material import removing the records', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${materialJobId}/rollback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('rolled_back');
      expect(res.body.rolledBackAt).toBeDefined();
    });

    it('should no longer find the rolled-back materials', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/materials/grades')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const imported = res.body.data.filter(
        (m: { name: string }) =>
          m.name.includes(uniqueSuffix),
      );
      expect(imported.length).toBe(0);
    });
  });

  // ── Geotech Import Apply & Rollback ────────────────────────────

  describe('Geotech Import Apply & Rollback', () => {
    let geotechJobId: string;

    it('should validate a geotech CSV import', async () => {
      const csvContent = [
        'name,classCode,sourceStandard,sourceEdition,unitWeight,cohesion,frictionAngle',
        `Demo Clay ${uniqueSuffix},CL-${uniqueSuffix},AS 2159,2009,18,25,22`,
        `Demo Sand ${uniqueSuffix},SP-${uniqueSuffix},AS 2159,2009,20,0,35`,
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'geotech_parameter')
        .field('format', 'csv')
        .field('catalogName', `Geotech Import ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS 2159')
        .field('sourceEdition', '2009')
        .attach('file', Buffer.from(csvContent), 'geotech.csv')
        .expect(201);

      expect(res.body.status).toBe('validated');
      expect(res.body.totalRows).toBe(2);
      expect(res.body.validRows).toBe(2);
      geotechJobId = res.body.id;
    });

    it('should apply the geotech import creating parameter sets', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${geotechJobId}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('applied');
      expect(res.body.snapshotId).toBeDefined();
    });

    it('should find the imported geotech data via API', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/geotech/parameters')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const imported = res.body.data.filter(
        (p: { name: string }) => p.name.includes(uniqueSuffix),
      );
      expect(imported.length).toBe(2);
    });

    it('should rollback the geotech import', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${geotechJobId}/rollback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('rolled_back');
    });

    it('should no longer find the rolled-back geotech data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/geotech/parameters')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const imported = res.body.data.filter(
        (p: { name: string }) => p.name.includes(uniqueSuffix),
      );
      expect(imported.length).toBe(0);
    });
  });

  // ── Diff Preview for Upgrades ──────────────────────────────────

  describe('Diff Preview for Upgrades', () => {
    it('should show add diff for new steel section data', async () => {
      const csvContent = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        'DIFF-100,UB,10,100,50,5,3',
        'DIFF-200,UC,20,200,100,10,6',
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `Diff Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(csvContent), 'diff-test.csv')
        .expect(201);

      expect(res.body.status).toBe('validated');
      expect(res.body.diff).toBeDefined();
      expect(res.body.diff.added).toBe(2);
      expect(res.body.diff.modified).toBe(0);
      expect(res.body.diff.unchanged).toBe(0);
      expect(res.body.diff.removed).toBe(0);
      expect(res.body.diff.rows).toBeDefined();
      expect(res.body.diff.rows.length).toBe(2);
      expect(res.body.diff.rows[0].action).toBe('add');
      expect(res.body.diff.rows[0].data).toBeDefined();
    });

    it('should detect modify and unchanged after applying v1 then previewing v2', async () => {
      const v1Csv = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        'DIFFV-100,UB,10,100,50,5,3',
        'DIFFV-200,UC,20,200,100,10,6',
      ].join('\n');

      const v1Upload = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('catalogName', `DiffV Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(v1Csv), 'v1.csv')
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/imports/${v1Upload.body.id}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const catalogId = (
        await request(app.getHttpServer())
          .get(`/api/v1/imports/${v1Upload.body.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body.snapshotId;

      await request(app.getHttpServer())
        .post(`/api/v1/steel-sections/catalogs/${catalogId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const v2Csv = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        'DIFFV-100,UB,12,110,55,6,4',
        'DIFFV-300,UB,30,300,150,15,9',
      ].join('\n');

      const v2Upload = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `DiffV Test ${uniqueSuffix}`)
        .field('catalogVersion', '2.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(v2Csv), 'v2.csv')
        .expect(201);

      expect(v2Upload.body.diff.added).toBe(1);
      expect(v2Upload.body.diff.modified).toBe(1);
      expect(v2Upload.body.diff.removed).toBe(1);
      expect(v2Upload.body.diff.unchanged).toBe(0);

      const rows = v2Upload.body.diff.rows;
      const modifiedRow = rows.find(
        (r: { action: string }) => r.action === 'modify',
      );
      expect(modifiedRow).toBeDefined();
      expect(modifiedRow.key).toBe('DIFFV-100');
      expect(modifiedRow.changes).toBeDefined();
      expect(modifiedRow.changes.massPerMetre).toBeDefined();

      const addedRow = rows.find(
        (r: { action: string }) => r.action === 'add',
      );
      expect(addedRow).toBeDefined();
      expect(addedRow.key).toBe('DIFFV-300');

      const removedRow = rows.find(
        (r: { action: string }) => r.action === 'remove',
      );
      expect(removedRow).toBeDefined();
      expect(removedRow.key).toBe('DIFFV-200');
    });

    it('should compute diff for rebar import', async () => {
      const csvContent = [
        'designation,barDiameter,nominalArea,massPerMetre,grade,ductilityClass',
        'N12,12,113.1,0.888,D500N,N',
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'rebar_size')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `Rebar Diff ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 4671')
        .field('sourceEdition', '2019')
        .attach('file', Buffer.from(csvContent), 'rebar-diff.csv')
        .expect(201);

      expect(res.body.diff).toBeDefined();
      expect(res.body.diff.added).toBe(1);
      expect(res.body.diff.rows[0].action).toBe('add');
    });

    it('should compute diff for material import', async () => {
      const csvContent = [
        'name,category,grade,sourceStandard,sourceEdition',
        `DiffMat ${uniqueSuffix},concrete,N50,AS 3600,2018`,
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'material')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `Material Diff ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS 3600')
        .field('sourceEdition', '2018')
        .attach('file', Buffer.from(csvContent), 'mat-diff.csv')
        .expect(201);

      expect(res.body.diff).toBeDefined();
      expect(res.body.diff.added).toBe(1);
    });

    it('should compute diff for geotech import', async () => {
      const csvContent = [
        'name,classCode,sourceStandard,sourceEdition,unitWeight',
        `DiffGeo ${uniqueSuffix},GM-${uniqueSuffix},AS 2159,2009,19`,
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'geotech_parameter')
        .field('format', 'csv')
        .field('dryRun', 'true')
        .field('catalogName', `Geotech Diff ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS 2159')
        .field('sourceEdition', '2009')
        .attach('file', Buffer.from(csvContent), 'geo-diff.csv')
        .expect(201);

      expect(res.body.diff).toBeDefined();
      expect(res.body.diff.added).toBe(1);
    });
  });

  // ── Snapshot Pinning ───────────────────────────────────────────

  describe('Snapshot Pinning via Import', () => {
    it('should create versioned catalog via import that can be activated', async () => {
      const csvContent = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        'PIN-IMP-100,UB,10,100,50,5,3',
      ].join('\n');

      const uploadRes = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('catalogName', `Pin Import ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(csvContent), 'pin-import.csv')
        .expect(201);

      const applyRes = await request(app.getHttpServer())
        .post(`/api/v1/imports/${uploadRes.body.id}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const catalogId = applyRes.body.snapshotId;

      const catalog = await request(app.getHttpServer())
        .get(`/api/v1/steel-sections/catalogs/${catalogId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(catalog.body.status).toBe('draft');
      expect(catalog.body.name).toBe(`Pin Import ${uniqueSuffix}`);
      expect(catalog.body.version).toBe('1.0');
      expect(catalog.body.snapshotHash).toBeDefined();

      const sections = await request(app.getHttpServer())
        .get(`/api/v1/steel-sections/catalogs/${catalogId}/sections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(sections.body.data.length).toBe(1);
      expect(sections.body.data[0].designation).toBe('PIN-IMP-100');

      const activateRes = await request(app.getHttpServer())
        .post(`/api/v1/steel-sections/catalogs/${catalogId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(activateRes.body.status).toBe('active');
    });

    it('should create v2 import without overwriting v1', async () => {
      const v2Csv = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        'PIN-IMP-200,UC,20,200,100,10,6',
      ].join('\n');

      const v2Upload = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('catalogName', `Pin Import ${uniqueSuffix}`)
        .field('catalogVersion', '2.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(v2Csv), 'pin-import-v2.csv')
        .expect(201);

      const v2Apply = await request(app.getHttpServer())
        .post(`/api/v1/imports/${v2Upload.body.id}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const v2CatalogId = v2Apply.body.snapshotId;

      const v2Sections = await request(app.getHttpServer())
        .get(`/api/v1/steel-sections/catalogs/${v2CatalogId}/sections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(v2Sections.body.data.length).toBe(1);
      expect(v2Sections.body.data[0].designation).toBe('PIN-IMP-200');

      const catalogs = await request(app.getHttpServer())
        .get('/api/v1/steel-sections/catalogs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const pinCatalogs = catalogs.body.data.filter(
        (c: { name: string }) => c.name === `Pin Import ${uniqueSuffix}`,
      );
      expect(pinCatalogs.length).toBe(2);
    });
  });

  // ── Rebar Import Apply ─────────────────────────────────────────

  describe('Rebar Import Apply', () => {
    let rebarJobId: string;

    it('should apply a rebar JSON import with row data', async () => {
      const jsonContent = JSON.stringify([
        {
          designation: `RB12-${uniqueSuffix}`,
          barDiameter: 12,
          nominalArea: 113.1,
          massPerMetre: 0.888,
          grade: 'D500N',
          ductilityClass: 'N',
        },
        {
          designation: `RB16-${uniqueSuffix}`,
          barDiameter: 16,
          nominalArea: 201.1,
          massPerMetre: 1.579,
          grade: 'D500N',
          ductilityClass: 'N',
        },
      ]);

      const uploadRes = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'rebar_size')
        .field('format', 'json')
        .field('catalogName', `Rebar Apply ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 4671')
        .field('sourceEdition', '2019')
        .attach('file', Buffer.from(jsonContent), 'rebar-apply.json')
        .expect(201);

      expect(uploadRes.body.status).toBe('validated');
      rebarJobId = uploadRes.body.id;

      const applyRes = await request(app.getHttpServer())
        .post(`/api/v1/imports/${rebarJobId}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(applyRes.body.status).toBe('applied');
      const catalogId = applyRes.body.snapshotId;

      const sizes = await request(app.getHttpServer())
        .get(`/api/v1/rebar/catalogs/${catalogId}/sizes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(sizes.body.data.length).toBe(2);
      const designations = sizes.body.data.map(
        (s: { designation: string }) => s.designation,
      );
      expect(designations).toContain(`RB12-${uniqueSuffix}`);
      expect(designations).toContain(`RB16-${uniqueSuffix}`);
    });

    it('should rollback the rebar import', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/imports/${rebarJobId}/rollback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.status).toBe('rolled_back');
    });
  });

  // ── Steel Section Import with Row Data ─────────────────────────

  describe('Steel Section Import with Row Insertion', () => {
    it('should import steel sections and verify row data is persisted', async () => {
      const csvContent = [
        'designation,sectionType,massPerMetre,depth,flangeWidth,flangeThickness,webThickness',
        `SS-A-${uniqueSuffix},UB,25.4,203,133,7.8,5.8`,
        `SS-B-${uniqueSuffix},UC,40.4,304,165,10.2,6.1`,
      ].join('\n');

      const uploadRes = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'csv')
        .field('catalogName', `SS Row Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from(csvContent), 'ss-row-test.csv')
        .expect(201);

      const applyRes = await request(app.getHttpServer())
        .post(`/api/v1/imports/${uploadRes.body.id}/apply`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const catalogId = applyRes.body.snapshotId;

      const sections = await request(app.getHttpServer())
        .get(`/api/v1/steel-sections/catalogs/${catalogId}/sections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(sections.body.data.length).toBe(2);
      const designations = sections.body.data.map(
        (s: { designation: string }) => s.designation,
      );
      expect(designations).toContain(`SS-A-${uniqueSuffix}`);
      expect(designations).toContain(`SS-B-${uniqueSuffix}`);
    });
  });

  // ── XLSX Import ────────────────────────────────────────────────

  describe('XLSX Import', () => {
    it('should validate an XLSX steel section import', async () => {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Data');

      sheet.addRow([
        'designation', 'sectionType', 'massPerMetre', 'depth',
        'flangeWidth', 'flangeThickness', 'webThickness',
      ]);
      sheet.addRow([`XLSX-100-${uniqueSuffix}`, 'UB', 15, 150, 75, 6, 4]);

      const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());

      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'xlsx')
        .field('dryRun', 'true')
        .field('catalogName', `XLSX Test ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', xlsxBuffer, 'test-sections.xlsx')
        .expect(201);

      expect(res.body.status).toBe('validated');
      expect(res.body.totalRows).toBe(1);
      expect(res.body.validRows).toBe(1);
    });

    it('should reject a malformed XLSX (non-XLSX buffer)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/imports/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('entityType', 'steel_section')
        .field('format', 'xlsx')
        .field('dryRun', 'true')
        .field('catalogName', `Bad XLSX ${uniqueSuffix}`)
        .field('catalogVersion', '1.0')
        .field('sourceStandard', 'AS/NZS 3679.1')
        .field('sourceEdition', '2016')
        .attach('file', Buffer.from('not valid xlsx data'), 'bad.xlsx');

      expect([400, 201]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.status).toBe('failed');
      }
    });
  });

  // ── Tenant Isolation for Admin/Catalogue Routes ────────────────

  describe('Tenant Isolation for Import & Catalogue Routes', () => {
    let otherToken: string;
    let otherOrgId: string;

    beforeAll(async () => {
      const otherUser = {
        email: `e2e-impother-${uniqueSuffix}@test.com`,
        name: 'Other Import User',
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
          name: `Other Import Org ${uniqueSuffix}`,
          slug: `e2e-impother-${uniqueSuffix}`,
        });
      otherOrgId = otherOrg.body.id;

      const switchRes = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-org')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ organisationId: otherOrgId });
      otherToken = switchRes.body.accessToken;
    });

    it('should not show first org import jobs to other org', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/imports')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const leaked = res.body.data.filter(
        (j: { organisationId: string }) => j.organisationId === orgId,
      );
      expect(leaked.length).toBe(0);
    });

    it('should not show first org steel catalogs to other org', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/steel-sections/catalogs')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const leaked = res.body.data.filter(
        (c: { organisationId: string }) => c.organisationId === orgId,
      );
      expect(leaked.length).toBe(0);
    });

    it('should not show first org materials to other org', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/materials/grades')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const leaked = res.body.data.filter(
        (m: { organisationId: string }) => m.organisationId === orgId,
      );
      expect(leaked.length).toBe(0);
    });

    it('should not show first org geotech data to other org', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/geotech/parameters')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const leaked = res.body.data.filter(
        (p: { organisationId: string }) => p.organisationId === orgId,
      );
      expect(leaked.length).toBe(0);
    });
  });

  // ── Document File Persistence Not-Implemented ──────────────────

  describe('Document File Persistence', () => {
    it('GET /documents/:id/download should return 501 not implemented', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'Test Document')
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .expect(201);

      const docId = uploadRes.body.id;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(501);

      expect(res.body.message).toContain('not yet implemented');
    });
  });
});
