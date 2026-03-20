import { test, expect } from '@playwright/test';
import { signInWithSeedUser } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeedUser(page);
  });

  test('sidebar shows main navigation sections', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calculators' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Materials' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Geotech' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Steel Sections' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Rebar' })).toBeVisible();
  });

  test('navigates to catalogues pages', async ({ page }) => {
    await page.getByRole('link', { name: 'Materials' }).click();
    await expect(page.getByText('Structural Materials')).toBeVisible();

    await page.getByRole('link', { name: 'Steel Sections' }).click();
    await expect(page.getByText('Steel Sections Catalogue')).toBeVisible();

    await page.getByRole('link', { name: 'Rebar' }).click();
    await expect(page.getByText('Reinforcement Catalogue')).toBeVisible();
  });

  test('navigates to calculators page', async ({ page }) => {
    await page.getByRole('link', { name: 'Calculators' }).click();
    await expect(page.getByText('Calculators')).toBeVisible();
  });
});
