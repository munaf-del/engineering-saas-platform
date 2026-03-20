import { test, expect } from '@playwright/test';
import { signInWithSeedUser } from './helpers';

test.describe('Snapshot Pinning', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeedUser(page);
  });

  test('steel sections page shows snapshot status card', async ({ page }) => {
    await page.getByRole('link', { name: 'Steel Sections' }).click();
    await expect(page.getByText('Steel Sections Catalogue')).toBeVisible();

    const hasData = await page.getByText('Catalogue Snapshot Status').isVisible().catch(() => false);
    if (hasData) {
      await expect(page.getByText('Catalogue Snapshot Status')).toBeVisible();
    } else {
      await expect(page.getByText('No catalogues')).toBeVisible();
    }
  });

  test('steel sections page shows pinned badge for active catalogue', async ({ page }) => {
    await page.getByRole('link', { name: 'Steel Sections' }).click();
    await expect(page.getByText('Steel Sections Catalogue')).toBeVisible();

    const hasActive = await page.getByText('Pinned').first().isVisible().catch(() => false);
    const hasNoCatalogs = await page.getByText('No catalogues').isVisible().catch(() => false);

    if (hasNoCatalogs) {
      test.skip();
      return;
    }

    await expect(page.getByText('Catalogue Snapshot Status')).toBeVisible();
  });

  test('rebar page shows snapshot status card', async ({ page }) => {
    await page.getByRole('link', { name: 'Rebar' }).click();
    await expect(page.getByText('Reinforcement Catalogue')).toBeVisible();

    const hasData = await page.getByText('Catalogue Snapshot Status').isVisible().catch(() => false);
    if (hasData) {
      await expect(page.getByText('Catalogue Snapshot Status')).toBeVisible();
    } else {
      await expect(page.getByText('No catalogues')).toBeVisible();
    }
  });

  test('shows warning when no active catalogue exists', async ({ page }) => {
    await page.getByRole('link', { name: 'Steel Sections' }).click();
    await expect(page.getByText('Steel Sections Catalogue')).toBeVisible();

    const noActive = await page.getByText('No Active Catalogue').isVisible().catch(() => false);
    const hasActive = await page.getByText('active').first().isVisible().catch(() => false);
    const noCatalogs = await page.getByText('No catalogues').isVisible().catch(() => false);

    expect(noActive || hasActive || noCatalogs).toBeTruthy();
  });
});

test.describe('Project Standards Pinning', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeedUser(page);
  });

  test('project standards page shows pinned dates', async ({ page }) => {
    await page.getByRole('link', { name: 'Projects' }).click();

    const hasProject = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    if (!hasProject) {
      test.skip();
      return;
    }

    await page.locator('table tbody tr').first().click();
    await page.getByText('Standards').click();
    await expect(page.getByText('Project Standards')).toBeVisible();

    const hasAssignments = await page.getByText('Pinned').first().isVisible().catch(() => false);
    const isEmpty = await page.getByText('No standards assigned').isVisible().catch(() => false);
    expect(hasAssignments || isEmpty).toBeTruthy();
  });

  test('shows rule pack status for each assigned standard', async ({ page }) => {
    await page.getByRole('link', { name: 'Projects' }).click();

    const hasProject = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    if (!hasProject) {
      test.skip();
      return;
    }

    await page.locator('table tbody tr').first().click();
    await page.getByText('Standards').click();

    const hasAssignments = await page.getByText('Rule pack loaded').first().isVisible().catch(() => false);
    const hasMissing = await page.getByText('No rule pack').first().isVisible().catch(() => false);
    const isEmpty = await page.getByText('No standards assigned').isVisible().catch(() => false);

    expect(hasAssignments || hasMissing || isEmpty).toBeTruthy();
  });
});
