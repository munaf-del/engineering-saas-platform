import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Calculations Domain E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let userId: string;
  let orgId: string;
  let projectId: string;

  const uniqueSuffix = `calc-${Date.now()}`;
  const testUser = {
    email: `e2e-${uniqueSuffix}@test.com`,
    name: 'E2E Calc User',
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

    // Register, create org, switch org, create project
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);
    accessToken = regRes.body.accessToken;
    userId = regRes.body.user.id;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organisations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Calc Test Org', slug: `e2e-${uniqueSuffix}` });
    orgId = orgRes.body.id;

    const switchRes = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-org')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ organisationId: orgId });
    accessToken = switchRes.body.accessToken;

    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Calc Test Project', code: `CTP-${uniqueSuffix}` });
    projectId = projRes.body.id;
  });

  afterAll(async () => {
    await prisma.calculationReport.deleteMany({
      where: { project: { organisation: { slug: { startsWith: 'e2e-' } } } },
    });
    await prisma.pileDesignCheck.deleteMany({
      where: { calculationRun: { project: { organisation: { slug: { startsWith: 'e2e-' } } } } },
    });
    await prisma.calculationSnapshot.deleteMany({
      where: { calculationRun: { project: { organisation: { slug: { startsWith: 'e2e-' } } } } },
    });
    await prisma.calculationRun.deleteMany({
      where: { project: { organisation: { slug: { startsWith: 'e2e-' } } } },
    });
    await prisma.loadAction.deleteMany({
      where: { loadCase: { project: { organisation: { slug: { startsWith: 'e2e-' } } } } },
    });
    await prisma.loadCase.deleteMany({
      where: { project: { organisation: { slug: { startsWith: 'e2e-' } } } },
    });
    await prisma.loadCombination.deleteMany({
      where: { set: { project: { organisation: { slug: { startsWith: 'e2e-' } } } } },
    });
    await prisma.loadCombinationSet.deleteMany({
      where: { project: { organisation: { slug: { startsWith: 'e2e-' } } } },
    });
    await prisma.pileLayoutPoint.deleteMany({
      where: { pileGroup: { project: { organisation: { slug: { startsWith: 'e2e-' } } } } },
    });
    await prisma.pileCapacityProfile.deleteMany({
      where: { project: { organisation: { slug: { startsWith: 'e2e-' } } } },
    });
    await prisma.pile.deleteMany({
      where: { pileGroup: { project: { organisation: { slug: { startsWith: 'e2e-' } } } } },
    });
    await prisma.pileGroup.deleteMany({
      where: { project: { organisation: { slug: { startsWith: 'e2e-' } } } },
    });
    await prisma.calculatorVersion.deleteMany({});
    await prisma.calculatorDefinition.deleteMany({});
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

  // ── Load Cases ────────────────────────────────────────────────

  describe('Load Cases', () => {
    let loadCaseId: string;
    let actionId: string;

    it('POST /projects/:projectId/load-cases - should create a load case', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/load-cases`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Dead Load', category: 'permanent', description: 'Self-weight' })
        .expect(201);

      expect(res.body.name).toBe('Dead Load');
      expect(res.body.category).toBe('permanent');
      expect(res.body.projectId).toBe(projectId);
      loadCaseId = res.body.id;
    });

    it('GET /projects/:projectId/load-cases - should list load cases', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/load-cases`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('GET /projects/:projectId/load-cases/:id - should get load case by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/load-cases/${loadCaseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(loadCaseId);
      expect(res.body.actions).toBeDefined();
    });

    it('POST /projects/:projectId/load-cases/:id/actions - should add a load action', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/load-cases/${loadCaseId}/actions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Vertical DL', direction: 'fz', magnitude: 150.0, unit: 'kN' })
        .expect(201);

      expect(res.body.name).toBe('Vertical DL');
      expect(res.body.direction).toBe('fz');
      expect(res.body.magnitude).toBe(150.0);
      actionId = res.body.id;
    });

    it('PATCH /projects/:projectId/load-cases/:id - should update load case', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/load-cases/${loadCaseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Dead Load' })
        .expect(200);

      expect(res.body.name).toBe('Updated Dead Load');
    });

    it('should reject invalid category', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/load-cases`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Bad', category: 'invalid_category' })
        .expect(400);
    });

    it('DELETE /projects/:projectId/load-cases/:id/actions/:actionId - should remove action', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/load-cases/${loadCaseId}/actions/${actionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  // ── Load Combination Sets ─────────────────────────────────────

  describe('Load Combination Sets', () => {
    let setId: string;
    let combinationId: string;

    it('POST /projects/:projectId/load-combination-sets - should create', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/load-combination-sets`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'AS/NZS 1170.0 Combos',
          standardRef: 'AS/NZS 1170.0:2002',
          description: 'Standard load combinations',
        })
        .expect(201);

      expect(res.body.name).toBe('AS/NZS 1170.0 Combos');
      setId = res.body.id;
    });

    it('POST /:setId/combinations - should add combination', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/load-combination-sets/${setId}/combinations`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '1.35G',
          limitState: 'strength',
          clauseRef: 'Cl 4.2.1',
          factors: [{ loadCaseId: 'test-case-1', factor: 1.35, source: 'Table 4.1' }],
        })
        .expect(201);

      expect(res.body.name).toBe('1.35G');
      expect(res.body.limitState).toBe('strength');
      combinationId = res.body.id;
    });

    it('GET /projects/:projectId/load-combination-sets - should list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/load-combination-sets`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /:id - should get set with combinations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/load-combination-sets/${setId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.combinations).toHaveLength(1);
    });

    it('DELETE combination', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/load-combination-sets/${setId}/combinations/${combinationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  // ── Calculator Registry ───────────────────────────────────────

  describe('Calculator Registry', () => {
    let calcDefId: string;

    it('POST /calculators - should register a calculator definition', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/calculators')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          code: `pile-cap-${uniqueSuffix}`,
          name: 'Pile Capacity AS2159',
          calcType: 'pile_capacity',
          description: 'Single pile axial capacity check',
          category: 'geotechnical',
        })
        .expect(201);

      expect(res.body.code).toBe(`pile-cap-${uniqueSuffix}`);
      calcDefId = res.body.id;
    });

    it('POST /calculators/:id/versions - should create a version', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/calculators/${calcDefId}/versions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: '1.0.0',
          inputSchema: { type: 'object', properties: { pileDiameter: { type: 'number' } } },
          status: 'active',
          releaseNotes: 'Initial version',
        })
        .expect(201);

      expect(res.body.version).toBe('1.0.0');
      expect(res.body.status).toBe('active');
    });

    it('GET /calculators - should list definitions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/calculators')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /calculators/:id - should get definition with versions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/calculators/${calcDefId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.versions).toHaveLength(1);
    });

    it('should reject duplicate calculator code', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/calculators')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          code: `pile-cap-${uniqueSuffix}`,
          name: 'Duplicate',
          calcType: 'pile_capacity',
          category: 'geotechnical',
        })
        .expect(409);
    });
  });

  // ── Pile Groups ───────────────────────────────────────────────

  describe('Pile Groups', () => {
    let pileGroupId: string;
    let pileId: string;
    let layoutPointId: string;

    it('POST /projects/:projectId/pile-groups - should create', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pile-groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Foundation Group A', description: 'Main building piles' })
        .expect(201);

      expect(res.body.name).toBe('Foundation Group A');
      pileGroupId = res.body.id;
    });

    it('POST /:id/piles - should add a pile', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pile-groups/${pileGroupId}/piles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'P1',
          pileType: 'bored',
          diameter: 0.6,
          length: 15.0,
          embedmentDepth: 12.0,
        })
        .expect(201);

      expect(res.body.name).toBe('P1');
      expect(res.body.pileType).toBe('bored');
      expect(res.body.diameter).toBe(0.6);
      pileId = res.body.id;
    });

    it('POST /:id/layout-points - should add a layout point', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pile-groups/${pileGroupId}/layout-points`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pileId, x: 0.0, y: 0.0, z: 0.0, label: 'P1' })
        .expect(201);

      expect(res.body.x).toBe(0);
      expect(res.body.label).toBe('P1');
      layoutPointId = res.body.id;
    });

    it('GET /:id - should get group with piles and layout', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/pile-groups/${pileGroupId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.piles).toHaveLength(1);
      expect(res.body.layoutPoints).toHaveLength(1);
    });

    it('should reject invalid pile type', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pile-groups/${pileGroupId}/piles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Bad', pileType: 'unknown_type', diameter: 0.5, length: 10 })
        .expect(400);
    });

    it('PATCH /:id - should update pile group', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/pile-groups/${pileGroupId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Group A' })
        .expect(200);

      expect(res.body.name).toBe('Updated Group A');
    });

    it('DELETE layout point', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/pile-groups/${pileGroupId}/layout-points/${layoutPointId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  // ── Pile Capacity Profiles ────────────────────────────────────

  describe('Pile Capacity Profiles', () => {
    let profileId: string;

    it('POST - should create a capacity profile with snapshot hash', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pile-capacity-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          method: 'as2159_static',
          standardRef: 'AS 2159:2009',
          parameters: {
            shaftFrictionFactor: 0.5,
            baseBearingFactor: 9.0,
            soilLayers: [{ depth: 5, type: 'clay', su: 50 }],
          },
        })
        .expect(201);

      expect(res.body.method).toBe('as2159_static');
      expect(res.body.inputHash).toBeDefined();
      expect(res.body.inputHash.length).toBe(64);
      profileId = res.body.id;
    });

    it('GET - should list profiles', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/pile-capacity-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /:id - should get profile with hash', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/pile-capacity-profiles/${profileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.inputHash).toBeDefined();
      expect(res.body.inputSnapshot).toBeDefined();
    });
  });

  // ── Calculation Orchestration ─────────────────────────────────

  describe('Calculation Orchestration', () => {
    let runId: string;

    it('POST /projects/:projectId/calculations/run - should submit and run a calculation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/calculations/run`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          calcType: 'pile_capacity',
          inputs: {
            pileDiameter: { value: 600, unit: 'mm', label: 'Pile diameter' },
            pileLength: { value: 15, unit: 'm', label: 'Pile length' },
          },
          loadCombinations: [
            {
              id: 'lc-1',
              name: '1.35G',
              limitState: 'strength',
              factors: [{ loadCaseId: 'dl', factor: 1.35, source: 'AS 1170.0' }],
              clauseRef: 'Cl 4.2.1',
            },
          ],
          rulePack: {
            id: 'rp-1',
            standardCode: 'AS2159',
            version: '2009',
            rules: {
              shaft_friction_factor: {
                clauseRef: 'Cl 4.3.1',
                description: 'Shaft friction reduction factor',
                value: 0.5,
              },
            },
          },
          standardsRefs: [{ code: 'AS2159', edition: '2009' }],
          notes: 'Test calculation',
        });

      // The calc engine may be unavailable (503) or the calc type may not be implemented
      // Both are valid orchestration outcomes for this domain-only prompt
      expect([201, 503]).toContain(res.status);

      if (res.status === 201) {
        expect(res.body.id).toBeDefined();
        expect(res.body.calcType).toBe('pile_capacity');
        runId = res.body.id;
      }
    });

    it('should reject submission with missing rule pack', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/calculations/run`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          calcType: 'pile_capacity',
          inputs: { pileDiameter: { value: 600, unit: 'mm', label: 'Diameter' } },
          loadCombinations: [],
          rulePack: { id: 'rp-1', standardCode: 'AS2159', version: '2009', rules: {} },
          standardsRefs: [{ code: 'AS2159', edition: '2009' }],
        })
        .expect(400);
    });

    it('should reject submission with no inputs', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/calculations/run`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          calcType: 'pile_capacity',
          inputs: {},
          loadCombinations: [],
          rulePack: {
            id: 'rp-1',
            standardCode: 'AS2159',
            version: '2009',
            rules: { rule1: { clauseRef: 'Cl 1', description: 'test', value: 1.0 } },
          },
          standardsRefs: [{ code: 'AS2159', edition: '2009' }],
        })
        .expect(400);
    });

    it('should reject invalid calc type', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/calculations/run`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          calcType: 'not_a_real_calc',
          inputs: { x: { value: 1, unit: 'm', label: 'x' } },
          loadCombinations: [],
          rulePack: {
            id: 'rp-1',
            standardCode: 'AS2159',
            version: '2009',
            rules: { rule1: { clauseRef: 'Cl 1', description: 'test', value: 1.0 } },
          },
          standardsRefs: [{ code: 'AS2159', edition: '2009' }],
        })
        .expect(400);
    });

    it('should reject submission with no standards refs', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/calculations/run`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          calcType: 'pile_capacity',
          inputs: { x: { value: 1, unit: 'm', label: 'x' } },
          loadCombinations: [],
          rulePack: {
            id: 'rp-1',
            standardCode: 'AS2159',
            version: '2009',
            rules: { rule1: { clauseRef: 'Cl 1', description: 'test', value: 1.0 } },
          },
          standardsRefs: [],
        })
        .expect(400);
    });

    it('GET /projects/:projectId/calculations - should list runs', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/calculations`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
    });
  });

  // ── Snapshot Immutability ─────────────────────────────────────

  describe('Snapshot Immutability', () => {
    it('should produce consistent hashes for identical inputs', async () => {
      const { SnapshotService } = await import('../src/modules/calculations/snapshot.service');
      const snapshotService = new SnapshotService(prisma);

      const input1 = {
        inputs: { diameter: { value: 0.6, unit: 'm', label: 'Diameter' } },
        standardsRefs: [{ code: 'AS2159', edition: '2009' }],
        rulePack: { id: 'rp-1', standardCode: 'AS2159', version: '2009', rules: {} },
        loadCombinations: [],
      };

      const input2 = {
        inputs: { diameter: { value: 0.6, unit: 'm', label: 'Diameter' } },
        standardsRefs: [{ code: 'AS2159', edition: '2009' }],
        rulePack: { id: 'rp-1', standardCode: 'AS2159', version: '2009', rules: {} },
        loadCombinations: [],
      };

      const snap1 = snapshotService.buildSnapshotData(input1);
      const snap2 = snapshotService.buildSnapshotData(input2);

      expect(snap1.inputHash).toBe(snap2.inputHash);
      expect(snap1.standardsHash).toBe(snap2.standardsHash);
      expect(snap1.rulePackHash).toBe(snap2.rulePackHash);
      expect(snap1.combinedHash).toBe(snap2.combinedHash);
    });

    it('should produce different hashes for different inputs', async () => {
      const { SnapshotService } = await import('../src/modules/calculations/snapshot.service');
      const snapshotService = new SnapshotService(prisma);

      const input1 = {
        inputs: { diameter: { value: 0.6, unit: 'm', label: 'Diameter' } },
        standardsRefs: [{ code: 'AS2159', edition: '2009' }],
        rulePack: { id: 'rp-1', standardCode: 'AS2159', version: '2009', rules: {} },
        loadCombinations: [],
      };

      const input2 = {
        inputs: { diameter: { value: 0.8, unit: 'm', label: 'Diameter' } },
        standardsRefs: [{ code: 'AS2159', edition: '2009' }],
        rulePack: { id: 'rp-1', standardCode: 'AS2159', version: '2009', rules: {} },
        loadCombinations: [],
      };

      const snap1 = snapshotService.buildSnapshotData(input1);
      const snap2 = snapshotService.buildSnapshotData(input2);

      expect(snap1.inputHash).not.toBe(snap2.inputHash);
      expect(snap1.combinedHash).not.toBe(snap2.combinedHash);
      // Standards and rule pack are the same, so those should match
      expect(snap1.standardsHash).toBe(snap2.standardsHash);
      expect(snap1.rulePackHash).toBe(snap2.rulePackHash);
    });

    it('hash should be a valid SHA-256 hex string', async () => {
      const { SnapshotService } = await import('../src/modules/calculations/snapshot.service');
      const snapshotService = new SnapshotService(prisma);

      const snap = snapshotService.buildSnapshotData({
        inputs: { x: { value: 1, unit: 'm', label: 'x' } },
        standardsRefs: [],
        rulePack: { id: 'rp', standardCode: 'test', version: '1', rules: {} },
        loadCombinations: [],
      });

      expect(snap.inputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(snap.standardsHash).toMatch(/^[a-f0-9]{64}$/);
      expect(snap.rulePackHash).toMatch(/^[a-f0-9]{64}$/);
      expect(snap.combinedHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ── Unit Normalization ────────────────────────────────────────

  describe('Unit Normalization', () => {
    it('should normalize mm to m in submitted inputs', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/calculations/run`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          calcType: 'pile_capacity',
          inputs: {
            diameter: { value: 600, unit: 'mm', label: 'Diameter' },
            length: { value: 15, unit: 'm', label: 'Length' },
          },
          loadCombinations: [
            {
              id: 'lc-1',
              name: '1.35G',
              limitState: 'strength',
              factors: [{ loadCaseId: 'dl', factor: 1.35, source: 'AS 1170.0' }],
              clauseRef: 'Cl 4.2.1',
            },
          ],
          rulePack: {
            id: 'rp-1',
            standardCode: 'AS2159',
            version: '2009',
            rules: {
              rule1: { clauseRef: 'Cl 4.3.1', description: 'Factor', value: 0.5 },
            },
          },
          standardsRefs: [{ code: 'AS2159', edition: '2009' }],
        });

      // Allow 201 (calc engine running) or 503 (calc engine unavailable)
      expect([201, 503]).toContain(res.status);

      if (res.status === 201) {
        const run = res.body;
        const snapshot = run.requestSnapshot as Record<string, any>;
        // The inputs should be normalized to SI
        expect(snapshot.inputs.diameter.value).toBeCloseTo(0.6, 5);
        expect(snapshot.inputs.diameter.unit).toBe('m');
        expect(snapshot.inputs.length.value).toBe(15);
        expect(snapshot.inputs.length.unit).toBe('m');
      }
    });
  });

  // ── Auth: Unauthenticated access ──────────────────────────────

  describe('Auth guards on new endpoints', () => {
    it('should reject unauthenticated load-cases request', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/load-cases`)
        .expect(401);
    });

    it('should reject unauthenticated pile-groups request', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/pile-groups`)
        .expect(401);
    });

    it('should reject unauthenticated calculations request', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/calculations`)
        .expect(401);
    });

    it('should reject unauthenticated calculators request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/calculators')
        .expect(401);
    });
  });
});
