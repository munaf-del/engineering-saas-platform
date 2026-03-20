import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows sign-in page for unauthenticated users', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText('EngPlatform')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('sign-in page has correct structure', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByText('Sign in to your engineering workspace')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('type', 'email');
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password');
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill('nonexistent@test.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });
});
