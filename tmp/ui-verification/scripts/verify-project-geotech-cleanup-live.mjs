import assert from 'node:assert/strict';

const { chromium } = await import(
  new URL('../../../apps/web/node_modules/@playwright/test/index.mjs', import.meta.url).href
);

const webBase = process.env.E2E_WEB_URL || 'http://localhost:3000';
const apiBase = process.env.E2E_API_URL || 'http://localhost:4000/api/v1';
const projectId = '0f133e44-78a5-4d5d-bb83-391e08be2fc2';

const summary = {
  noVisibleGeoId: false,
  metadataSuggestions: {},
  groundwaterSuggestionClean: false,
  foundingSuggestionClean: false,
  unsupportedSuggestionFieldsPresent: [],
  selectedMaterialGroup: null,
  requestCounts: { projectPatch: 0, projectMutations: 0, calculationRuns: 0 },
  applied: {
    preparedBy: null,
    checkedBy: null,
    groundwaterDesignNotes: null,
    projectCfaTensionRatio: null,
    defaultSocketDesignAssumptions: null,
    foundingNotes: null,
    materialUnitName: null,
    sourceDocument: null,
    sourceSite: null,
    sourceSection: null,
    sourceTable: null,
    fmsComp: null,
    fbUlt: null,
    fmsAllow: null,
    fbAllow: null,
    cfaUpliftTensionFactor: null,
  },
  unsavedVisible: false,
};

let browser;

try {
  const { authToken, refreshToken } = await loginWithOptionalSwitchOrg({
    email: 'admin@demo.eng',
    password: 'DemoPassword1!',
  });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: webBase });
  await context.addInitScript(
    ({ seededAccessToken, seededRefreshToken }) => {
      window.localStorage.setItem('eng_access_token', seededAccessToken);
      window.localStorage.setItem('eng_refresh_token', seededRefreshToken);
    },
    {
      seededAccessToken: authToken,
      seededRefreshToken: refreshToken,
    },
  );

  const page = await context.newPage();
  page.on('request', (request) => {
    const url = request.url();
    const method = request.method();
    const projectBase = `${apiBase}/projects/${projectId}`;

    if (method === 'PATCH' && url === projectBase) {
      summary.requestCounts.projectPatch += 1;
    }
    if (method !== 'GET' && url.startsWith(projectBase)) {
      summary.requestCounts.projectMutations += 1;
    }
    if (method === 'POST' && url === `${projectBase}/calculations/run`) {
      summary.requestCounts.calculationRuns += 1;
    }
  });

  let assistantPayload = null;
  page.on('response', async (response) => {
    if (!response.url().includes('/ai/assistant/respond')) {
      return;
    }
    if (response.request().method() !== 'POST') {
      return;
    }

    const body = response.request().postDataJSON?.();
    if (body?.quickAction !== 'suggest_fields') {
      return;
    }

    try {
      assistantPayload = await response.json();
    } catch {
      // Ignore parse errors from unrelated responses.
    }
  });

  await page.goto(`${webBase}/projects/${projectId}`);
  await page.getByRole('heading', { name: 'Project Details' }).waitFor({ timeout: 20_000 });

  summary.noVisibleGeoId =
    (await page.locator('main').locator('text=/geo_[a-z0-9]+/i').count()) === 0;
  assert.equal(summary.noVisibleGeoId, true, 'Expected no visible geo_* row identity');

  await openAssistant(page);
  await page.getByRole('button', { name: 'Suggest values for this page', exact: true }).click();
  await page.getByText('Suggestion Review List', { exact: true }).waitFor({ timeout: 20_000 });
  await pollUntil(() => assert.ok(assistantPayload?.suggestedFields?.length));

  const suggestions = assistantPayload.suggestedFields;
  const suggestionByFieldPath = new Map(suggestions.map((suggestion) => [suggestion.fieldPath, suggestion]));

  const unsupportedFieldPaths = suggestions
    .map((suggestion) => suggestion.fieldPath)
    .filter((fieldPath) =>
      /(\.gamma_b|\.phi_prime|\.c_prime|\.cu|\.E_MPa|\.nu|\.Ka|\.Ko|\.Kp)$/.test(fieldPath),
    );
  summary.unsupportedSuggestionFieldsPresent = unsupportedFieldPaths;
  assert.equal(
    unsupportedFieldPaths.length,
    0,
    `Expected no unsupported soil-parameter suggestions, got: ${unsupportedFieldPaths.join(', ')}`,
  );

  const expectedMetadata = {
    'reportMeta.reportRevision': '0',
    'reportMeta.issueDate': '7 November 2025',
    'reportMeta.preparedBy': 'Osama Naushad',
    'reportMeta.checkedBy': 'Chris Crowe',
  };
  const titleSuggestion = suggestionByFieldPath.get('reportMeta.reportTitle');
  assert.ok(titleSuggestion, 'Expected suggestion for reportMeta.reportTitle');
  assert.match(
    titleSuggestion.suggestedValue,
    /Report on Geotechnical Investigation(?:\s*[:,-]\s*|,\s*)Clinical Services Building, Albury Hospital/i,
    'Unexpected value for reportMeta.reportTitle',
  );
  summary.metadataSuggestions['reportMeta.reportTitle'] = titleSuggestion.suggestedValue;
  for (const [fieldPath, expectedValue] of Object.entries(expectedMetadata)) {
    const suggestion = suggestionByFieldPath.get(fieldPath);
    assert.ok(suggestion, `Expected suggestion for ${fieldPath}`);
    assert.equal(suggestion.suggestedValue, expectedValue, `Unexpected value for ${fieldPath}`);
    summary.metadataSuggestions[fieldPath] = suggestion.suggestedValue;
  }

  const purposeSuggestion = suggestionByFieldPath.get('reportMeta.purpose');
  assert.ok(purposeSuggestion, 'Expected report purpose suggestion');
  assert.match(
    purposeSuggestion.suggestedValue,
    /assess the subsurface (conditions|profile)/i,
    'Expected purpose suggestion to be field-appropriate',
  );
  summary.metadataSuggestions['reportMeta.purpose'] = purposeSuggestion.suggestedValue;

  const groundwaterSuggestion = suggestionByFieldPath.get('geotechnicalBasis.groundwaterDesignNotes');
  assert.ok(groundwaterSuggestion, 'Expected groundwater design notes suggestion');
  assert.match(groundwaterSuggestion.suggestedValue, /Observed groundwater:/);
  assert.match(groundwaterSuggestion.suggestedValue, /Groundwater uncertainty \/ monitoring:/);
  assert.match(groundwaterSuggestion.suggestedValue, /Groundwater construction implications:/);
  assert.match(groundwaterSuggestion.suggestedValue, /Pile excavations may encounter groundwater\./);
  summary.groundwaterSuggestionClean = true;

  const foundingSuggestion = suggestionByFieldPath.get('geotechnicalBasis.foundingNotes');
  assert.ok(foundingSuggestion, 'Expected founding notes suggestion');
  assert.match(
    foundingSuggestion.suggestedValue,
    /maximum allowable bearing pressures presented in Table 8/i,
  );
  assert.doesNotMatch(
    foundingSuggestion.suggestedValue,
    /Groundwater is not expected to be encountered/i,
    'Founding notes should not be filled with groundwater commentary',
  );
  summary.foundingSuggestionClean = true;

  const cfaUpliftModeSuggestion = suggestionByFieldPath.get('geotechnicalBasis.cfaUpliftMode');
  const cfaUpliftFactorSuggestion = suggestionByFieldPath.get('geotechnicalBasis.cfaUpliftFactor');
  assert.ok(cfaUpliftModeSuggestion, 'Expected project CFA uplift logic suggestion');
  assert.equal(cfaUpliftModeSuggestion.suggestedValue, 'ratio-to-compression');
  assert.ok(cfaUpliftFactorSuggestion, 'Expected project CFA tension ratio suggestion');
  assert.equal(cfaUpliftFactorSuggestion.suggestedValue, '0.8');

  const materialGroups = groupMaterialSuggestions(suggestions);
  const selectedMaterialEntry =
    materialGroups.find(([, entries]) =>
      entries.some((entry) => entry.fieldPath.endsWith('.displayName')) &&
      entries.some(
        (entry) =>
          entry.fieldPath.endsWith('.pile_fms_comp_kPa') ||
          entry.fieldPath.endsWith('.pile_fb_ult_kPa'),
      ),
    ) ?? null;

  assert.ok(selectedMaterialEntry, 'Expected at least one material suggestion group to apply');
  const [materialIndex, materialSuggestions] = selectedMaterialEntry;
  summary.selectedMaterialGroup = materialIndex + 1;

  const selectedSuggestionFieldPaths = [
    'reportMeta.preparedBy',
    'reportMeta.checkedBy',
    'geotechnicalBasis.groundwaterDesignNotes',
    'geotechnicalBasis.cfaUpliftMode',
    'geotechnicalBasis.cfaUpliftFactor',
    'geotechnicalBasis.defaultSocketAssumptions',
    'geotechnicalBasis.foundingNotes',
    `geotechnicalMaterials.materials[${materialIndex}].displayName`,
    `geotechnicalMaterials.materials[${materialIndex}].sourceDocument`,
    `geotechnicalMaterials.materials[${materialIndex}].sourceSite`,
    `geotechnicalMaterials.materials[${materialIndex}].sourceSection`,
    `geotechnicalMaterials.materials[${materialIndex}].sourceTable`,
    `geotechnicalMaterials.materials[${materialIndex}].pile_fms_comp_kPa`,
    `geotechnicalMaterials.materials[${materialIndex}].pile_fb_ult_kPa`,
    `geotechnicalMaterials.materials[${materialIndex}].cfaUpliftTensionFactor`,
  ].filter((fieldPath) => suggestionByFieldPath.has(fieldPath));

  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  for (const fieldPath of selectedSuggestionFieldPaths) {
    const suggestion = suggestionByFieldPath.get(fieldPath);
    assert.ok(suggestion, `Expected suggestion for ${fieldPath}`);
    await checkSuggestion(page, suggestion.label);
  }

  const beforeApply = { ...summary.requestCounts };
  await page.getByRole('button', { name: 'Apply selected', exact: true }).click();

  await expectStableNetworkCount(
    () => summary.requestCounts.projectPatch,
    beforeApply.projectPatch,
    'Expected no PATCH /projects request during apply',
  );
  await expectStableNetworkCount(
    () => summary.requestCounts.projectMutations,
    beforeApply.projectMutations,
    'Expected no project mutation during apply',
  );
  await expectStableNetworkCount(
    () => summary.requestCounts.calculationRuns,
    beforeApply.calculationRuns,
    'Expected no calculation run during apply',
  );

  await assertFieldValueByLabel(page, 'Prepared By', 'Osama Naushad');
  await assertFieldValueByLabel(page, 'Checked By', 'Chris Crowe');
  summary.applied.preparedBy = await getFieldValueByLabel(page, 'Prepared By');
  summary.applied.checkedBy = await getFieldValueByLabel(page, 'Checked By');

  summary.applied.groundwaterDesignNotes = await getFieldValueByLabel(
    page,
    'Groundwater Design Notes',
  );
  assert.match(summary.applied.groundwaterDesignNotes, /Observed groundwater:/);
  assert.match(summary.applied.groundwaterDesignNotes, /Pile excavations may encounter groundwater\./);
  summary.applied.projectCfaTensionRatio = await getFieldValueByLabel(page, 'CFA Tension Ratio');
  assert.equal(summary.applied.projectCfaTensionRatio, '0.8');

  summary.applied.defaultSocketDesignAssumptions = await getFieldValueByLabel(
    page,
    'Default Socket Design Assumptions',
  );
  assert.match(summary.applied.defaultSocketDesignAssumptions, /minimum socket length/i);
  assert.match(summary.applied.defaultSocketDesignAssumptions, /4 pile diameters/i);

  summary.applied.foundingNotes = await getFieldValueByLabel(page, 'Project-Level Founding Notes');
  assert.match(summary.applied.foundingNotes, /maximum allowable bearing pressures presented in Table 8/i);
  assert.doesNotMatch(
    summary.applied.foundingNotes,
    /Groundwater is not expected to be encountered/i,
  );

  summary.applied.materialUnitName = await getNthFieldValueByLabel(
    page,
    'Material / Unit Name',
    materialIndex,
  );
  summary.applied.sourceDocument = await getNthFieldValueByLabel(
    page,
    'Source Document',
    materialIndex,
  );
  summary.applied.sourceSite = await getNthFieldValueByLabel(page, 'Source Site', materialIndex);
  summary.applied.sourceSection = await getNthFieldValueByLabel(
    page,
    'Source Section',
    materialIndex,
  );
  summary.applied.sourceTable = await getNthFieldValueByLabel(page, 'Source Table', materialIndex);
  summary.applied.fmsComp = await getNthFieldValueByLabel(
    page,
    'f_m,s comp. (kPa)',
    materialIndex,
  );
  summary.applied.fbUlt = await getNthFieldValueByLabel(page, 'f_b ult. (kPa)', materialIndex);
  summary.applied.fmsAllow = await getNthFieldValueByLabel(
    page,
    'f_m,s allow (kPa)',
    materialIndex,
  );
  summary.applied.fbAllow = await getNthFieldValueByLabel(
    page,
    'f_b allow (kPa)',
    materialIndex,
  );
  summary.applied.cfaUpliftTensionFactor = await getNthFieldValueByLabel(
    page,
    'CFA uplift tension factor',
    materialIndex,
  );

  assert.ok(summary.applied.materialUnitName);
  assert.doesNotMatch(summary.applied.materialUnitName, /^geo_/i);
  assert.equal(summary.applied.sourceDocument, '206725.02.R.001.Rev0');
  assert.match(summary.applied.sourceSite, /Albury Hospital, 201 Borella Rd, Albury NSW/);
  assert.match(summary.applied.sourceTable, /Table 9/i);
  assert.equal(summary.applied.fmsAllow, '', 'Expected unsupported f_m,s allow to remain blank');
  assert.equal(summary.applied.fbAllow, '', 'Expected unsupported f_b allow to remain blank');
  if (
    suggestionByFieldPath.has(
      `geotechnicalMaterials.materials[${materialIndex}].cfaUpliftTensionFactor`,
    )
  ) {
    assert.equal(summary.applied.cfaUpliftTensionFactor, '0.8');
  }

  summary.unsavedVisible = await page.getByText('Unsaved changes', { exact: true }).isVisible();
  assert.equal(summary.unsavedVisible, true, 'Expected unsaved badge to remain visible');

  summary.noVisibleGeoId =
    summary.noVisibleGeoId &&
    (await page.locator('main').locator('text=/geo_[a-z0-9]+/i').count()) === 0;
  assert.equal(summary.noVisibleGeoId, true, 'Expected no visible geo_* row identity after apply');

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close().catch(() => {});
}

function groupMaterialSuggestions(suggestions) {
  const groups = new Map();

  for (const suggestion of suggestions) {
    const match = suggestion.fieldPath.match(/^geotechnicalMaterials\.materials\[(\d+)\]\./);
    if (!match) {
      continue;
    }
    const index = Number(match[1]);
    const entries = groups.get(index) ?? [];
    entries.push(suggestion);
    groups.set(index, entries);
  }

  return [...groups.entries()];
}

async function loginWithOptionalSwitchOrg({ email, password }) {
  const loginResponse = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginResponse.ok) {
    throw new Error(
      `Login failed for ${email}: ${loginResponse.status} ${await loginResponse.text()}`,
    );
  }
  const loginJson = await loginResponse.json();

  if (loginJson.user?.organisationId && loginJson.accessToken && loginJson.refreshToken) {
    return {
      authToken: loginJson.accessToken,
      refreshToken: loginJson.refreshToken,
    };
  }

  const firstOrg = loginJson.organisations?.[0];
  assert.ok(firstOrg?.id, `Expected at least one organisation for ${email}`);

  const switchOrgResponse = await fetch(`${apiBase}/auth/switch-org`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginJson.accessToken}`,
    },
    body: JSON.stringify({ organisationId: firstOrg.id }),
  });
  if (!switchOrgResponse.ok) {
    throw new Error(
      `Switch org failed for ${email}: ${switchOrgResponse.status} ${await switchOrgResponse.text()}`,
    );
  }
  const switchOrgJson = await switchOrgResponse.json();

  return {
    authToken: switchOrgJson.accessToken,
    refreshToken: switchOrgJson.refreshToken,
  };
}

async function openAssistant(page) {
  const panelCloseButton = page.getByRole('button', { name: 'Close assistant', exact: true });
  if (await panelCloseButton.isVisible().catch(() => false)) {
    return;
  }
  await page.getByRole('button', { name: 'AI Assistant', exact: true }).click();
  await panelCloseButton.waitFor({ timeout: 10_000 });
}

async function checkSuggestion(page, label) {
  const row = page.locator('label').filter({ has: page.getByText(label, { exact: true }) }).first();
  await row.waitFor({ timeout: 10_000 });
  await row.locator('input[type="checkbox"]').check();
}

async function assertFieldValueByLabel(page, label, expectedValue) {
  await pollUntil(async () => {
    const value = await getFieldValueByLabel(page, label);
    assert.equal(value, expectedValue, `Expected ${label} to equal ${expectedValue}`);
  });
}

async function getFieldValueByLabel(page, label) {
  return page.evaluate((targetLabel) => {
    const main = document.querySelector('main');
    const labels = Array.from((main ?? document).querySelectorAll('label'));
    const matchingLabel = labels.find((candidate) => candidate.textContent?.trim() === targetLabel);
    if (!matchingLabel) {
      return null;
    }
    const fieldContainer = matchingLabel.parentElement;
    const control = fieldContainer?.querySelector('input, textarea');
    if (!(control instanceof HTMLInputElement) && !(control instanceof HTMLTextAreaElement)) {
      return null;
    }
    return control.value;
  }, label);
}

async function getNthFieldValueByLabel(page, label, occurrenceIndex) {
  return page.evaluate(
    ({ targetLabel, targetIndex }) => {
      const main = document.querySelector('main');
      const labels = Array.from((main ?? document).querySelectorAll('label')).filter(
        (candidate) => candidate.textContent?.trim() === targetLabel,
      );
      const matchingLabel = labels[targetIndex] ?? null;
      if (!matchingLabel) {
        return null;
      }
      const fieldContainer = matchingLabel.parentElement;
      const control = fieldContainer?.querySelector('input, textarea');
      if (!(control instanceof HTMLInputElement) && !(control instanceof HTMLTextAreaElement)) {
        return null;
      }
      return control.value;
    },
    { targetLabel: label, targetIndex: occurrenceIndex },
  );
}

async function expectStableNetworkCount(readCount, expectedCount, message) {
  await pollUntil(async () => {
    assert.equal(readCount(), expectedCount, message);
  }, 4_000);
}

async function pollUntil(assertion, timeoutMs = 10_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw lastError ?? new Error('Timed out while waiting for verification condition');
}
