import type { Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3001/api/v1';

export async function seedTestUser(): Promise<{ email: string; password: string }> {
  const email = `e2e-${Date.now()}@test.eng`;
  const password = 'TestPass123!';
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'E2E Test User' }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to seed user: ${res.status}`);
  }
  return { email, password };
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/projects/, { timeout: 10_000 });
}

export async function signInWithSeedUser(page: Page) {
  const { email, password } = await seedTestUser();
  await signIn(page, email, password);
  return { email, password };
}
