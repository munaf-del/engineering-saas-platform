import assert from 'node:assert/strict';

const { chromium } = await import(
  new URL('../../../apps/web/node_modules/@playwright/test/index.mjs', import.meta.url).href
);

const webBase = process.env.E2E_WEB_URL || 'http://localhost:3000';
const apiBase = process.env.E2E_API_URL || 'http://localhost:4000/api/v1';
const projectId = '0f133e44-78a5-4d5d-bb83-391e08be2fc2';

const summary = {
  placeholderLabelsBefore: [],
  placeholderLabelsAfterApply: [],
  rowCounts: {
    before: 0,
    afterApply: 0,
    afterAdd: 0,
    afterRemove: 0,
  },
  manualEditValue: null,
  unsavedVisible: false,
  requestCounts: {
    projectPatch: 0,
    projectMutations: 0,
    calculationRuns: 0,
  },
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

  await page.goto(`${webBase}/projects/${projectId}`);
  await page.locator('#project-geotechnical-materials').waitFor({ timeout: 20_000 });

  summary.rowCounts.before = await countMaterialRows(page);
  summary.placeholderLabelsBefore = (await getMaterialLabels(page)).filter((label) =>
    /^Material row/i.test(label),
  );
  assert.ok(summary.rowCounts.before > 0, 'Expected existing project material rows');

  await page.getByTestId('load-project-ai-suggestions').click();
  await page.getByTestId('project-ai-suggestions-answer').waitFor({ timeout: 20_000 });
  await page
    .getByTestId('project-ai-suggestion-reportmeta-preparedby')
    .getByRole('button', { name: 'Apply', exact: true })
    .click();

  await page.waitForTimeout(300);
  summary.rowCounts.afterApply = await countMaterialRows(page);
  summary.placeholderLabelsAfterApply = (await getMaterialLabels(page)).filter((label) =>
    /^Material row/i.test(label),
  );
  assert.equal(
    summary.rowCounts.afterApply,
    summary.rowCounts.before,
    'Applying a draft suggestion should not break existing material rows',
  );
  assert.ok(
    summary.placeholderLabelsAfterApply.every((label) => /^Material row \d+$/.test(label)),
    `Expected numbered placeholder labels after apply, got: ${summary.placeholderLabelsAfterApply.join(', ')}`,
  );

  await page.getByRole('button', { name: 'Add Material', exact: true }).click();
  await page.waitForTimeout(300);
  summary.rowCounts.afterAdd = await countMaterialRows(page);
  assert.equal(
    summary.rowCounts.afterAdd,
    summary.rowCounts.afterApply + 1,
    'Expected Add Material to append one draft row after AI apply',
  );

  await fillLastMaterialUnitName(page, 'Manual edit check');
  summary.manualEditValue = await getLastMaterialUnitName(page);
  assert.equal(
    summary.manualEditValue,
    'Manual edit check',
    'Expected manual editing of the newly added row to still work after AI apply',
  );

  const removeButtons = page.locator('#project-geotechnical-materials button[aria-label^="Remove "]');
  const removeCount = await removeButtons.count();
  assert.ok(removeCount > 0, 'Expected at least one remove button');
  await removeButtons.last().click();
  await page.waitForTimeout(300);
  summary.rowCounts.afterRemove = await countMaterialRows(page);
  assert.equal(
    summary.rowCounts.afterRemove,
    summary.rowCounts.afterApply,
    'Expected Remove Material to delete one draft row after AI apply',
  );

  summary.unsavedVisible = await page.getByText('Unsaved changes', { exact: true }).isVisible();
  assert.equal(summary.unsavedVisible, true, 'Expected unsaved draft state to remain visible');

  assert.equal(summary.requestCounts.projectPatch, 0, 'Expected no project auto-save');
  assert.equal(summary.requestCounts.projectMutations, 0, 'Expected no project mutation request');
  assert.equal(summary.requestCounts.calculationRuns, 0, 'Expected no calculation run');

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close().catch(() => {});
}

async function countMaterialRows(page) {
  return page
    .locator('#project-geotechnical-materials')
    .locator('button[aria-label^="Remove "]')
    .count();
}

async function getMaterialLabels(page) {
  return page
    .locator('#project-geotechnical-materials .text-sm.font-semibold')
    .allTextContents();
}

async function fillLastMaterialUnitName(page, value) {
  const count = await page.evaluate(() => {
    const labels = Array.from(
      document.querySelectorAll('#project-geotechnical-materials label'),
    ).filter((label) => label.textContent?.trim() === 'Material / Unit Name');
    return labels.length;
  });
  assert.ok(count > 0, 'Expected at least one material name field');
  await page.evaluate(
    ({ targetIndex, nextValue }) => {
      const labels = Array.from(
        document.querySelectorAll('#project-geotechnical-materials label'),
      ).filter((label) => label.textContent?.trim() === 'Material / Unit Name');
      const label = labels[targetIndex];
      const input = label?.parentElement?.querySelector('input');
      if (!(input instanceof HTMLInputElement)) {
        throw new Error('Target material name input was not found');
      }
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = nextValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    { targetIndex: count - 1, nextValue: value },
  );
}

async function getLastMaterialUnitName(page) {
  return page.evaluate(() => {
    const labels = Array.from(
      document.querySelectorAll('#project-geotechnical-materials label'),
    ).filter((label) => label.textContent?.trim() === 'Material / Unit Name');
    const label = labels.at(-1);
    const input = label?.parentElement?.querySelector('input');
    return input instanceof HTMLInputElement ? input.value : null;
  });
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
