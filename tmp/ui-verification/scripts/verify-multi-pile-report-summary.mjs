import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/munaf/engineering-saas-platform/apps/web/node_modules/@playwright/test/index.mjs';

const baseUrl = 'http://127.0.0.1:3000';
const apiBase = 'http://127.0.0.1:4000/api/v1';
const email = `ui-report-summary-${crypto.randomUUID()}@test.eng`;
const password = 'TestPass123!';
const slug = `ui-report-summary-${crypto.randomUUID()}`;
const outDir = path.join(
  '/Users/munaf/engineering-saas-platform/tmp/ui-verification',
  `multi-pile-report-summary-${new Date().toISOString().replaceAll(':', '-').replace(/\..+$/, '')}`,
);

fs.mkdirSync(outDir, { recursive: true });

async function parseJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function api(pathname, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${apiBase}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `API ${method} ${pathname} failed: ${response.status} ${await response.text()}`,
    );
  }

  return parseJson(response);
}

function populatedProjectSpecifics() {
  return {
    identity: {
      projectNumber: 'MP-RPT-001',
      projectName: 'Report Summary Verification Populated',
      client: 'Acme Foundations',
      status: 'Issued',
      address: '100 Example Street, Sydney NSW 2000',
      latitude: '-33.8688',
      longitude: '151.2093',
      mapAddress: '',
      notes: 'Verification fixture for the Multi-Pile report-summary print route.',
      archived: false,
      projectLogo: '',
      mapSource: 'address',
    },
    reportMeta: {
      reportTitle: 'Multi-Pile Report Summary Verification',
      reportRevision: 'Rev D',
      issueDate: '2026-04-06',
      preparedBy: 'Codex',
      checkedBy: 'Verifier',
      purpose: 'Verification',
    },
    references: [
      {
        id: 'ref_geo',
        referenceId: 'GEO-01',
        documentType: 'Geotechnical Report',
        title: 'Site Geotechnical Investigation',
        documentNumber: 'GI-2401',
        revision: 'B',
        issueDate: '2026-03-21',
        authorOrganisation: 'Geo Labs',
        notes: 'Primary founding report.',
        includeInReport: true,
        active: true,
        primaryGeotechnical: true,
      },
      {
        id: 'ref_struct',
        referenceId: 'STR-01',
        documentType: 'Structural Drawing',
        title: 'Foundation GA Drawings',
        documentNumber: 'S-100',
        revision: 'C',
        issueDate: '2026-04-02',
        authorOrganisation: 'Acme Structures',
        notes: 'Primary structural reference.',
        includeInReport: true,
        active: true,
        primaryStructuralReference: true,
      },
    ],
    structuralDefaults: {
      concreteClasses: [{ id: 'conc_40' }, { id: 'conc_50' }],
      reinforcementGrades: [{ id: 'reo_d500n' }],
      tendonGrades: [{ id: 'tendon_strand_15_2' }],
      coverDurabilityClasses: [{ id: 'cover_mild_100y' }, { id: 'cover_moderate_50y' }],
    },
    geotechnicalMaterials: {
      activeReferenceId: 'ref_geo',
      templateState: 'manual',
      materials: [
        {
          id: 'geo_sand',
          unitCode: 'SAND',
          displayName: 'Dense Sand',
          sourceReferenceId: 'ref_geo',
          pile_fms_comp_kPa: 180,
          pile_fms_tension_kPa: 95,
          pile_fb_ult_kPa: 2500,
          includeInProject: true,
        },
        {
          id: 'geo_rock',
          unitCode: 'RCK',
          displayName: 'Weathered Rock',
          sourceReferenceId: 'ref_geo',
          pile_fms_comp_kPa: 420,
          pile_fms_tension_kPa: 220,
          pile_fb_ult_kPa: 8000,
          includeInProject: true,
        },
      ],
    },
    geotechnicalBasis: {
      groundwaterDesignNotes: 'Groundwater ignored for this verification fixture.',
      cfaUpliftMode: 'manual-entry',
      cfaUpliftFactor: 0.7,
      defaultSocketAssumptions: 'Manual socket lengths adopted for the verification fixture.',
      foundingNotes: 'Rock socket lengths are authored directly in the pile type GEO settings.',
      commentary: 'Used to verify the compact Multi-Pile report summary route.',
      arrAssessment: {
        irrValues: [1.2, 1.1, 1.4, 1.0, 1.3],
        testType: 'NONE',
        testPilePercentage: 0,
        weightTotal: 5,
        weightedScore: 6,
        arrValue: 1.2,
        arrBand: '1.0 - 1.5',
        phiTf: null,
        testBenefitK: 1,
        phiGbLow: 0.5,
        phiGbHigh: 0.6,
        phiGLow: 0.5,
        phiGHigh: 0.6,
      },
    },
  };
}

function populatedState() {
  return {
    pileTypes: [
      {
        id: 'BP1',
        displayName: 'Main Tower Pile',
        sizePreset: '900',
        useCustom: false,
        customMm: 900,
        Dmm: 900,
        nominalDiameterMm: 900,
        eoop: 0.075,
        eoopM: 0.075,
        active: true,
        order: 0,
      },
      {
        id: 'BP2',
        displayName: 'Edge Pile',
        sizePreset: '600',
        useCustom: false,
        customMm: 600,
        Dmm: 600,
        nominalDiameterMm: 600,
        eoop: 0.075,
        eoopM: 0.075,
        active: true,
        order: 1,
      },
    ],
    joints: [
      {
        id: 'J1',
        displayName: 'Grid A1',
        jointDisplayName: 'Grid A1',
        x: 0,
        y: 0,
        z: 0,
        supportCount: 2,
        noOfSupports: 2,
        pileTypeId: 'BP1',
        active: true,
        order: 0,
      },
      {
        id: 'J2',
        displayName: 'Grid B1',
        jointDisplayName: 'Grid B1',
        x: 7.5,
        y: 0,
        z: 0,
        supportCount: 1,
        noOfSupports: 1,
        pileTypeId: 'BP2',
        active: true,
        order: 1,
      },
    ],
    geoTypeSettings: {
      BP1: {
        typeId: 'BP1',
        linkedDmm: 900,
        foundingMaterialId: 'geo_rock',
        socketOverrideEnabled: true,
        LsManual: 3.6,
        LsAdopted: 3.6,
        LsMode: 'manual',
        qsRock: 3500,
        qbRock: 7000,
        useBase: 'YES',
      },
      BP2: {
        typeId: 'BP2',
        linkedDmm: 600,
        foundingMaterialId: 'geo_sand',
        socketOverrideEnabled: true,
        LsManual: 1.8,
        LsAdopted: 1.8,
        LsMode: 'manual',
        qsRock: 1500,
        qbRock: 0,
        useBase: 'NO',
      },
    },
    jointLoads: [
      { jointId: 'J1', patternId: 'G', p: 4200, vx: 120, vy: 80, mx: 250, my: 180, mz: 0 },
      { jointId: 'J1', patternId: 'Q', p: 600, vx: 30, vy: 20, mx: 45, my: 35, mz: 0 },
      { jointId: 'J2', patternId: 'G', p: 1900, vx: 50, vy: 30, mx: 90, my: 70, mz: 0 },
      { jointId: 'J2', patternId: 'Q', p: 250, vx: 15, vy: 10, mx: 20, my: 16, mz: 0 },
    ],
    uiState: {
      multiPileStructDesigner: {
        typeSettingsByTypeId: {
          BP1: {
            typeId: 'BP1',
            linkedDmm: 900,
            concreteClassId: 'conc_50',
            reinforcementGradeId: 'reo_d500n',
            tendonGradeId: 'tendon_strand_15_2',
            coverDurabilityClassId: 'cover_mild_100y',
            axModel: 'reinforced',
            nBars: 12,
            barDia: 24,
            cover: 75,
            transverseSystem: 'spiral',
            spiralDia: 16,
            spiralPitch: 150,
            useCentralBar: true,
            centralBarCount: 2,
            centralBarDia: 24,
            perimHeadDetail: '90out',
            centralHeadDetail: 'straight',
            perimProjectionAboveHead: 0.55,
            centralProjectionAboveHead: 0.35,
          },
          BP2: {
            typeId: 'BP2',
            linkedDmm: 600,
            concreteClassId: 'conc_40',
            reinforcementGradeId: 'reo_d500n',
            tendonGradeId: '',
            coverDurabilityClassId: 'cover_moderate_50y',
            axModel: 'partial',
            nBars: 8,
            barDia: 20,
            cover: 65,
            transverseSystem: 'ties',
            tieDia: 12,
            tieS: 180,
            useCentralBar: false,
            reoCutDepth: 2.2,
            reoLd: 0.9,
            perimHeadDetail: '90in',
            perimProjectionAboveHead: 0.4,
          },
        },
      },
    },
  };
}

async function createUserAndOrg() {
  const registerResponse = await fetch(`${apiBase}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Report Summary Verification User' }),
  });

  if (!registerResponse.ok && registerResponse.status !== 409) {
    throw new Error(`Register failed: ${registerResponse.status} ${await registerResponse.text()}`);
  }

  let auth = await parseJson(registerResponse);
  let token = auth?.accessToken;

  if (!token) {
    const loginResponse = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
    }

    auth = await parseJson(loginResponse);
    token = auth?.accessToken;
  }

  assert.ok(token, 'Expected auth token');

  await api('/organisations', {
    method: 'POST',
    token,
    body: { name: 'Report Summary Verification Org', slug },
  }).catch(() => null);

  return token;
}

async function createProjectFixture(token, { name, code, description }) {
  const project = await api('/projects', {
    method: 'POST',
    token,
    body: { name, code, description },
  });
  const group = await api(`/projects/${project.id}/pile-groups`, {
    method: 'POST',
    token,
    body: {
      name: `${name} Group`,
      description: `${name} pile group`,
    },
  });
  return { project, group };
}

async function createPopulatedFixture(token) {
  const fixture = await createProjectFixture(token, {
    name: 'Report Summary Populated',
    code: `RPT-POP-${Date.now()}`,
    description: 'Populated report-summary verification fixture',
  });

  await api(`/projects/${fixture.project.id}`, {
    method: 'PATCH',
    token,
    body: {
      metadata: {
        projectSpecifics: populatedProjectSpecifics(),
      },
    },
  });

  const run = await api(
    `/projects/${fixture.project.id}/pile-groups/${fixture.group.id}/multi-pile/envelope-runs`,
    {
      method: 'POST',
      token,
      body: { state: populatedState() },
    },
  );

  const latestRun = await api(
    `/projects/${fixture.project.id}/pile-groups/${fixture.group.id}/multi-pile/envelope-runs/latest`,
    { token },
  );

  assert.ok(latestRun?.envelope?.jointResults?.length, 'Expected populated latest envelope run');

  return {
    ...fixture,
    runStatus: run?.status ?? latestRun?.status ?? 'completed',
  };
}

async function createLeanFixture(token) {
  const fixture = await createProjectFixture(token, {
    name: 'Report Summary Lean',
    code: `RPT-LEAN-${Date.now()}`,
    description: 'Lean report-summary verification fixture',
  });

  const state = await api(
    `/projects/${fixture.project.id}/pile-groups/${fixture.group.id}/multi-pile`,
    { token },
  );

  assert.ok(state, 'Expected lean Multi-Pile state');

  return fixture;
}

async function signIn(page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await Promise.all([
    page.waitForURL(/\/projects/, { timeout: 20000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
}

function buildReportRoutes(projectId, groupId) {
  const reportSummary = `/projects/${projectId}/pile-groups/${groupId}/multi-pile/report-summary/print`;
  return {
    reportSummary,
    reportSummaryJustification: `${reportSummary}?appendix=justification`,
    reportSummaryPricing: `${reportSummary}?appendix=pricing`,
    reportSummaryFull: `${reportSummary}?appendix=full`,
  };
}

function routeRegex(route) {
  return new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

async function waitForReportDocument(page) {
  await page.getByTestId('multi-pile-report-summary-print-document').waitFor({
    timeout: 20000,
  });
}

async function captureCurrentPage(page, fileName) {
  const shot = path.join(outDir, fileName);
  await page.screenshot({ path: shot, fullPage: true });
  return shot;
}

async function captureReportRoute(page, route, fileName) {
  await page.goto(route);
  await waitForReportDocument(page);
  return captureCurrentPage(page, fileName);
}

async function navigateReportMode(page, { buttonName, route, fileName }) {
  await Promise.all([
    page.waitForURL(routeRegex(route), { timeout: 20000 }),
    page.getByRole('link', { name: buttonName, exact: true }).click(),
  ]);
  await waitForReportDocument(page);
  return fileName ? captureCurrentPage(page, fileName) : null;
}

async function captureReportButtonAndPopulatedRoute(page, populatedFixture) {
  const multiPileRoute = `/projects/${populatedFixture.project.id}/pile-groups/${populatedFixture.group.id}/multi-pile`;
  const routes = buildReportRoutes(populatedFixture.project.id, populatedFixture.group.id);

  await page.goto(multiPileRoute);
  await page.getByRole('heading', { level: 1, name: 'Multi-Pile', exact: true }).waitFor({
    timeout: 20000,
  });
  await page.getByTestId('multi-pile-report-summary-button').waitFor({ timeout: 20000 });

  const buttonShot = path.join(outDir, 'multi-pile-page-report-button.png');
  await page.screenshot({ path: buttonShot, fullPage: true });

  await Promise.all([
    page.waitForURL(routeRegex(routes.reportSummary), { timeout: 20000 }),
    page.getByTestId('multi-pile-report-summary-button').click(),
  ]);
  await waitForReportDocument(page);

  const populatedShot = await captureCurrentPage(page, 'report-summary-print-populated.png');
  const justificationShot = await navigateReportMode(page, {
    buttonName: 'Report + Justification Appendix',
    route: routes.reportSummaryJustification,
    fileName: 'report-summary-justification-populated.png',
  });
  const pricingShot = await navigateReportMode(page, {
    buttonName: 'Report + Pricing Appendix',
    route: routes.reportSummaryPricing,
    fileName: 'report-summary-pricing-populated.png',
  });
  const fullShot = await navigateReportMode(page, {
    buttonName: 'Full Report',
    route: routes.reportSummaryFull,
    fileName: 'report-summary-full-populated.png',
  });
  await navigateReportMode(page, {
    buttonName: 'Compact Report',
    route: routes.reportSummary,
  });

  return {
    multiPileRoute,
    reportRoute: routes.reportSummary,
    justificationRoute: routes.reportSummaryJustification,
    pricingRoute: routes.reportSummaryPricing,
    fullRoute: routes.reportSummaryFull,
    buttonShot,
    populatedShot,
    justificationShot,
    pricingShot,
    fullShot,
  };
}

async function captureLeanRoute(page, leanFixture) {
  const routes = buildReportRoutes(leanFixture.project.id, leanFixture.group.id);
  const leanShot = await captureReportRoute(
    page,
    routes.reportSummary,
    'report-summary-print-lean.png',
  );
  const leanJustificationShot = await captureReportRoute(
    page,
    routes.reportSummaryJustification,
    'report-summary-justification-lean.png',
  );

  return {
    reportRoute: routes.reportSummary,
    leanShot,
    leanJustificationRoute: routes.reportSummaryJustification,
    leanJustificationShot,
  };
}

const token = await createUserAndOrg();
const populatedFixture = await createPopulatedFixture(token);
const leanFixture = await createLeanFixture(token);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  baseURL: baseUrl,
  viewport: { width: 1600, height: 2200 },
});
const page = await context.newPage();

await signIn(page);

const populatedArtifacts = await captureReportButtonAndPopulatedRoute(page, populatedFixture);
const leanArtifacts = await captureLeanRoute(page, leanFixture);

await browser.close();

const verification = {
  loginOk: true,
  populated: {
    projectId: populatedFixture.project.id,
    groupId: populatedFixture.group.id,
    runStatus: populatedFixture.runStatus,
    routes: {
      multiPile: populatedArtifacts.multiPileRoute,
      reportSummary: populatedArtifacts.reportRoute,
      reportSummaryJustification: populatedArtifacts.justificationRoute,
      reportSummaryPricing: populatedArtifacts.pricingRoute,
      reportSummaryFull: populatedArtifacts.fullRoute,
    },
    screenshots: {
      multiPileButton: populatedArtifacts.buttonShot,
      reportSummary: populatedArtifacts.populatedShot,
      reportSummaryJustification: populatedArtifacts.justificationShot,
      reportSummaryPricing: populatedArtifacts.pricingShot,
      reportSummaryFull: populatedArtifacts.fullShot,
    },
  },
  lean: {
    projectId: leanFixture.project.id,
    groupId: leanFixture.group.id,
    routes: {
      reportSummary: leanArtifacts.reportRoute,
      reportSummaryJustification: leanArtifacts.leanJustificationRoute,
    },
    screenshots: {
      reportSummary: leanArtifacts.leanShot,
      reportSummaryJustification: leanArtifacts.leanJustificationShot,
    },
  },
};

fs.writeFileSync(path.join(outDir, 'verification.json'), JSON.stringify(verification, null, 2));
console.log(JSON.stringify(verification, null, 2));
