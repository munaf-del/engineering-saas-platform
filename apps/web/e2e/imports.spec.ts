import { test, expect } from '@playwright/test';
import { signInWithSeedUser } from './helpers';

test.describe('Imports', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeedUser(page);
  });

  test('shows import history page', async ({ page }) => {
    await page.getByRole('link', { name: 'Imports' }).click();
    await expect(page.getByText('Import History')).toBeVisible();
  });

  test('can open upload dialog', async ({ page }) => {
    await page.getByRole('link', { name: 'Imports' }).click();
    await page.getByRole('button', { name: 'Upload Import' }).click();
    await expect(page.getByRole('heading', { name: 'Upload Import' })).toBeVisible();
    await expect(page.getByText('Entity Type')).toBeVisible();
    await expect(page.getByText('Format')).toBeVisible();
  });
});
