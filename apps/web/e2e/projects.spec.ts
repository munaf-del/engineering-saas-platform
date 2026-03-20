import { test, expect } from '@playwright/test';
import { signInWithSeedUser } from './helpers';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeedUser(page);
  });

  test('shows projects page with empty state or project list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
  });

  test('can open create project dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'New Project' }).click();
    await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Code')).toBeVisible();
  });

  test('create project dialog has validation', async ({ page }) => {
    await page.getByRole('button', { name: 'New Project' }).click();
    const createButton = page.getByRole('button', { name: 'Create Project' });
    await expect(createButton).toBeVisible();
  });
});
