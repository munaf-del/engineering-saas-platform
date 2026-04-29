import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

const authState = vi.hoisted(() => ({
  hasOrgRole: vi.fn(() => true),
  user: {
    email: 'admin@demo.eng',
    name: 'Demo Admin',
    organisationId: 'org-1',
    orgRole: 'admin',
  },
}));

const navigationState = vi.hoisted(() => ({
  pathname: '/projects',
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    currentOrg: { id: 'org-1', name: 'North Sydney Demo' },
    hasOrgRole: authState.hasOrgRole,
    organisations: [{ id: 'org-1', name: 'North Sydney Demo' }],
    switchOrg: vi.fn(),
    user: authState.user,
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    navigationState.pathname = '/projects';
    authState.hasOrgRole.mockReturnValue(true);
  });

  it('renders the expanded desktop navigation with labels and a collapse control', () => {
    const markup = renderToStaticMarkup(
      <Sidebar collapsed={false} onToggleCollapsed={() => undefined} />,
    );

    expect(markup).toContain('data-testid="app-sidebar"');
    expect(markup).toContain('data-state="expanded"');
    expect(markup).toContain('EngPlatform');
    expect(markup).toContain('Projects');
    expect(markup).toContain('Catalogues');
    expect(markup).toContain('aria-label="Collapse navigation"');
    expect(markup).toContain('href="/settings/ai"');
  });

  it('renders collapsed mode as an accessible icon rail', () => {
    const markup = renderToStaticMarkup(<Sidebar collapsed onToggleCollapsed={() => undefined} />);

    expect(markup).toContain('data-state="collapsed"');
    expect(markup).toContain('w-[4.5rem]');
    expect(markup).toContain('title="Projects"');
    expect(markup).toContain('<span class="sr-only">Projects</span>');
    expect(markup).toContain('title="North Sydney Demo"');
    expect(markup).toContain('aria-label="Expand navigation"');
    expect(markup).toContain('href="/settings/ai"');
  });
});
