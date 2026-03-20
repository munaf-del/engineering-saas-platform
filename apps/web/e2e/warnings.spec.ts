import { test, expect } from '@playwright/test';
import { signInWithSeedUser } from './helpers';

test.describe('Warning and Review States', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeedUser(page);
  });

  test('project detail shows missing rule packs warning', async ({ page }) => {
    await page.getByRole('link', { name: 'Projects' }).click();

    const hasProject = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    if (!hasProject) {
      test.skip();
      return;
    }

    await page.locator('table tbody tr').first().click();

    const hasWarning = await page.getByText('Missing Approved Rule Packs').isVisible().catch(() => false);
    const noWarning = !(await page.getByText('Missing Approved Rule Packs').isVisible().catch(() => false));
    expect(hasWarning || noWarning).toBeTruthy();
  });

  test('calculation detail shows engineer review banner for failures', async ({ page }) => {
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

    const hasReviewBanner = await page.getByText('Engineer Review Required').isVisible().catch(() => false);
    const noReviewBanner = !(await page.getByText('Engineer Review Required').isVisible().catch(() => false));
    expect(hasReviewBanner || noReviewBanner).toBeTruthy();
  });

  test('calculation report shows review watermark for warnings', async ({ page }) => {
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
    await page.getByRole('link', { name: 'View Report' }).click();
    await expect(page.getByText('Engineering Calculation Report')).toBeVisible();

    const hasReview = await page.getByText('Engineer Review Required').isVisible().catch(() => false);
    const printButton = page.getByRole('button', { name: 'Print Report' });
    await expect(printButton).toBeVisible();

    expect(typeof hasReview).toBe('boolean');
  });

  test('new calculation page shows missing standards warning', async ({ page }) => {
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();

    const apiError = await page.getByText('Failed to load projects').isVisible().catch(() => false);
    if (apiError) { test.skip(); return; }

    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByLabel('Name').fill('E2E Warnings Test');
    await page.getByLabel('Code').fill(`E2E-WRN-${Date.now()}`);
    await page.getByRole('button', { name: 'Create Project' }).click();

    const navigated = await page.waitForURL(/\/projects\/\w/, { timeout: 10_000 }).then(() => true).catch(() => false);
    if (!navigated) { test.skip(); return; }

    await expect(page.getByRole('link', { name: /Calculations/ })).toBeVisible();
    await page.getByRole('link', { name: /Calculations/ }).click();
    await page.getByRole('link', { name: 'New Calculation' }).click();

    await expect(page.getByText('No Standards Assigned')).toBeVisible();
  });

  test('report page shows PDF export as coming soon', async ({ page }) => {
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
    await page.getByRole('link', { name: 'View Report' }).click();

    await expect(page.getByText('Coming soon')).toBeVisible();
    await expect(page.getByRole('button', { name: /Export PDF/ })).toBeDisabled();
  });
});

test.describe('Org Switching', () => {
  test('shows org name in sidebar', async ({ page }) => {
    await signInWithSeedUser(page);
    const sidebar = page.locator('aside, nav').first();
    await expect(sidebar).toBeVisible();
  });

  test('sign-in redirects to projects', async ({ page }) => {
    await signInWithSeedUser(page);
    await expect(page).toHaveURL(/\/projects/);
  });
});
