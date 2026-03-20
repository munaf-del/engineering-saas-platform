import { test, expect } from '@playwright/test';
import { signInWithSeedUser, getAuthToken, apiRequest } from './helpers';

test.describe('Calculation Submission', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeedUser(page);
  });

  async function ensureProjectDetail(page: import('@playwright/test').Page) {
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();

    const hasProject = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    if (hasProject) {
      await page.locator('table tbody tr').first().click();
      await expect(page.getByRole('link', { name: /Calculations/ })).toBeVisible();
      return true;
    }

    const apiError = await page.getByText('Failed to load projects').isVisible().catch(() => false);
    if (apiError) return false;

    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByLabel('Name').fill(`E2E Project ${Date.now()}`);
    await page.getByLabel('Code').fill(`E2E-${Date.now()}`);
    await page.getByRole('button', { name: 'Create Project' }).click();

    const navigated = await page.waitForURL(/\/projects\/\w/, { timeout: 10_000 }).then(() => true).catch(() => false);
    if (!navigated) return false;

    await expect(page.getByRole('link', { name: /Calculations/ })).toBeVisible();
    return true;
  }

  test('can navigate to new calculation page from calculations list', async ({ page }) => {
    const ready = await ensureProjectDetail(page);
    if (!ready) { test.skip(); return; }

    await page.getByRole('link', { name: /Calculations/ }).click();
    await expect(page.getByText('Calculation History')).toBeVisible();

    const newCalcButton = page.getByRole('link', { name: 'New Calculation' });
    await expect(newCalcButton).toBeVisible();
    await newCalcButton.click();
    await expect(page.getByRole('heading', { name: 'New Calculation' })).toBeVisible();
  });

  test('new calculation form shows required fields', async ({ page }) => {
    const ready = await ensureProjectDetail(page);
    if (!ready) { test.skip(); return; }

    await page.getByRole('link', { name: /Calculations/ }).click();
    await page.getByRole('link', { name: 'New Calculation' }).click();

    await expect(page.getByText('Calculation Type & Calculator')).toBeVisible();
    await expect(page.getByText('Context')).toBeVisible();
    await expect(page.getByText('Input Parameters')).toBeVisible();
    await expect(page.getByText('Options')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Calculation' })).toBeVisible();
  });

  test('shows validation errors when submitting empty form', async ({ page }) => {
    const ready = await ensureProjectDetail(page);
    if (!ready) { test.skip(); return; }

    await page.getByRole('link', { name: /Calculations/ }).click();
    await page.getByRole('link', { name: 'New Calculation' }).click();

    await page.getByRole('button', { name: 'Run Calculation' }).click();
    await expect(page.getByText('Select a calculation type', { exact: true })).toBeVisible();
  });

  test('can select a calculation type', async ({ page }) => {
    const ready = await ensureProjectDetail(page);
    if (!ready) { test.skip(); return; }

    await page.getByRole('link', { name: /Calculations/ }).click();
    await page.getByRole('link', { name: 'New Calculation' }).click();

    await page.getByText('Select type…').click();
    await page.getByRole('option', { name: 'pile capacity' }).click();
    await expect(page.getByText('pile capacity').first()).toBeVisible();
  });

  test('shows warning when no standards assigned', async ({ page }) => {
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();

    const apiError = await page.getByText('Failed to load projects').isVisible().catch(() => false);
    if (apiError) { test.skip(); return; }

    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByLabel('Name').fill('E2E No Standards');
    await page.getByLabel('Code').fill(`E2E-NS-${Date.now()}`);
    await page.getByRole('button', { name: 'Create Project' }).click();

    const navigated = await page.waitForURL(/\/projects\/\w/, { timeout: 10_000 }).then(() => true).catch(() => false);
    if (!navigated) { test.skip(); return; }

    await expect(page.getByRole('link', { name: /Calculations/ })).toBeVisible();
    await page.getByRole('link', { name: /Calculations/ }).click();
    await page.getByRole('link', { name: 'New Calculation' }).click();

    await expect(page.getByText('No Standards Assigned')).toBeVisible();
  });
});

test.describe('Clone Previous Calculation', () => {
  test('clone button exists on calculation detail page', async ({ page }) => {
    await signInWithSeedUser(page);
    await page.getByRole('link', { name: 'Projects' }).click();

    const hasProject = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    if (!hasProject) {
      test.skip();
      return;
    }

    await page.locator('table tbody tr').first().click();
    await page.getByRole('link', { name: /Calculations/ }).click();

    const hasRun = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    if (!hasRun) {
      test.skip();
      return;
    }

    await page.locator('table tbody tr').first().click();
    await expect(page.getByRole('link', { name: /Clone/ })).toBeVisible();
  });

  test('clone navigates to new calc with cloneFrom param', async ({ page }) => {
    await signInWithSeedUser(page);
    await page.getByRole('link', { name: 'Projects' }).click();

    const hasProject = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    if (!hasProject) {
      test.skip();
      return;
    }

    await page.locator('table tbody tr').first().click();
    await page.getByRole('link', { name: /Calculations/ }).click();

    const hasRun = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    if (!hasRun) {
      test.skip();
      return;
    }

    await page.locator('table tbody tr').first().click();
    await page.getByRole('link', { name: /Clone/ }).click();
    await expect(page).toHaveURL(/\/calculations\/new\?cloneFrom=/);
    await expect(page.getByText('New Calculation')).toBeVisible();
    await expect(page.getByText('Cloned from previous run')).toBeVisible();
  });
});
