import type { Page } from '@playwright/test';

const API_BASE =
  process.env.E2E_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

export async function seedTestUser(): Promise<{ email: string; password: string }> {
  const email = `e2e-${crypto.randomUUID()}@test.eng`;
  const password = 'TestPass123!';
  const slug = `e2e-${crypto.randomUUID()}`;

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'E2E Test User' }),
  });
  if (!regRes.ok && regRes.status !== 409) {
    throw new Error(`Failed to seed user: ${regRes.status}`);
  }

  const regData = await regRes.json().catch(() => null);
  const token = regData?.accessToken;

  if (token) {
    await fetch(`${API_BASE}/organisations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'E2E Org', slug }),
    }).catch(() => {});
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

export async function getAuthToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

export async function apiRequest(
  token: string,
  path: string,
  opts: { method?: string; body?: unknown } = {},
) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} on ${path}: ${text}`);
  }
  if (res.status === 204) return undefined;
  return res.json();
}
