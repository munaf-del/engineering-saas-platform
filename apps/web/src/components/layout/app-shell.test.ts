/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects',
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    currentOrg: { id: 'org-1', name: 'North Sydney Demo' },
    hasOrgRole: () => true,
    loading: false,
    organisations: [{ id: 'org-1', name: 'North Sydney Demo' }],
    signOut: vi.fn(),
    switchOrg: vi.fn(),
    user: {
      email: 'admin@demo.eng',
      name: 'Demo Admin',
      organisationId: 'org-1',
      orgRole: 'admin',
    },
  }),
}));

import {
  readStoredSidebarCollapsed,
  SIDEBAR_STORAGE_KEY,
  writeStoredSidebarCollapsed,
} from './app-shell';

describe('AppShell sidebar persistence', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
  });

  it('persists collapsed sidebar state in localStorage', () => {
    expect(readStoredSidebarCollapsed()).toBe(false);

    writeStoredSidebarCollapsed(true);
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('true');
    expect(readStoredSidebarCollapsed()).toBe(true);

    writeStoredSidebarCollapsed(false);
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('false');
    expect(readStoredSidebarCollapsed()).toBe(false);
  });
});
