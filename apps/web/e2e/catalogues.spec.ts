import { test, expect } from '@playwright/test';
import { signInWithSeedUser } from './helpers';

test.describe('Catalogues', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeedUser(page);
  });

  test('materials page shows standards badges', async ({ page }) => {
    await page.getByRole('link', { name: 'Materials' }).click();
    await expect(page.getByText('Structural Materials')).toBeVisible();
    await expect(page.getByText('AS 3600')).toBeVisible();
    await expect(page.getByText('AS 4100')).toBeVisible();
  });

  test('steel sections page shows standards badges', async ({ page }) => {
    await page.getByRole('link', { name: 'Steel Sections' }).click();
    await expect(page.getByText('Steel Sections Catalogue')).toBeVisible();
    await expect(page.getByText('AS 4100')).toBeVisible();
  });

  test('rebar page shows standards badges', async ({ page }) => {
    await page.getByRole('link', { name: 'Rebar' }).click();
    await expect(page.getByText('Reinforcement Catalogue')).toBeVisible();
    await expect(page.getByText('AS/NZS 4671')).toBeVisible();
  });

  test('geotech page shows standards badges', async ({ page }) => {
    await page.getByRole('link', { name: 'Geotech' }).click();
    await expect(page.getByText('Geotechnical Materials')).toBeVisible();
    await expect(page.getByText('AS 1726')).toBeVisible();
  });
});
