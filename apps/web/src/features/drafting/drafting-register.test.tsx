// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { DraftingDrawingSummary, Project } from '@eng/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftingRegister } from './drafting-register';

const mockUseDraftingDrawings = vi.fn();
const mockCreateDrawingMutateAsync = vi.fn();
const mockUpdateDrawingMutateAsync = vi.fn();
const mockPush = vi.fn();

vi.mock('next/link', () => ({
  default: ({
    children,
    className,
    href,
  }: {
    children: React.ReactNode;
    className?: string;
    href: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/hooks/use-drafting', () => ({
  useDraftingDrawings: (...args: unknown[]) => mockUseDraftingDrawings(...args),
  useCreateDraftingDrawing: () => ({
    mutateAsync: mockCreateDrawingMutateAsync,
    isPending: false,
  }),
  useUpdateDraftingDrawing: () => ({
    mutateAsync: mockUpdateDrawingMutateAsync,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/loading', () => ({
  PageLoading: () => <div>Loading...</div>,
}));

vi.mock('@/components/page-header', () => ({
  PageHeader: ({
    actions,
    badges,
    description,
    title,
  }: {
    actions?: React.ReactNode;
    badges?: React.ReactNode;
    description?: string;
    title: string;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      <div>{badges}</div>
      <div>{actions}</div>
    </header>
  ),
}));

describe('DraftingRegister archived drawing visibility', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseDraftingDrawings.mockReturnValue({
      data: createDrawings(),
      isLoading: false,
    });
    mockCreateDrawingMutateAsync.mockReset();
    mockUpdateDrawingMutateAsync.mockReset();
    mockPush.mockReset();
  });

  it('hides archived drawings by default and counts only active drawings', async () => {
    await renderRegister();

    expect(container.textContent).toContain('2 active drawing(s)');
    expect(container.textContent).toContain('Show archived (2)');
    expect(container.textContent).toContain('Active newer');
    expect(container.textContent).toContain('Active older');
    expect(container.textContent).not.toContain('Archived newest');
    expect(container.textContent).not.toContain('Archived older');
    expect(container.textContent).not.toContain('72 drawing(s)');
    expect(container.textContent).not.toContain('PDF underlays next');
  });

  it('reveals archived drawings in a separate section below active drawings', async () => {
    await renderRegister();

    await clickButton('Show archived (2)');

    const text = container.textContent ?? '';
    expect(text).toContain('Archived drawings');
    expect(text).toContain('Archived newest');
    expect(text).toContain('Archived older');
    expect(text.indexOf('Active newer')).toBeLessThan(text.indexOf('Archived drawings'));
    expect(text.indexOf('Active older')).toBeLessThan(text.indexOf('Archived drawings'));
  });

  it('keeps active archive actions separate from archived restore actions', async () => {
    await renderRegister();

    expect(cardButtonLabels('Active newer')).toContain('Archive');
    expect(cardButtonLabels('Active newer')).not.toContain('Restore');
    expect(container.textContent).not.toContain('Restore');

    await clickButton('Show archived (2)');

    expect(cardButtonLabels('Archived newest')).toContain('Restore');
    expect(cardButtonLabels('Archived newest')).not.toContain('Archive');
    expect(cardButtonLabels('Active newer')).toContain('Archive');
  });

  it('sorts active and archived drawings within their own sections', async () => {
    await renderRegister();
    await clickButton('Show archived (2)');

    const text = container.textContent ?? '';
    expect(text.indexOf('Active newer')).toBeLessThan(text.indexOf('Active older'));
    expect(text.indexOf('Archived newest')).toBeLessThan(text.indexOf('Archived older'));
    expect(text.indexOf('Active older')).toBeLessThan(text.indexOf('Archived newest'));
  });

  async function renderRegister() {
    await act(async () => {
      root.render(<DraftingRegister project={project} projectId="project-1" />);
    });
  }

  async function clickButton(label: string) {
    const button = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    expect(button).toBeTruthy();
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  function findCard(title: string) {
    const heading = Array.from(container.querySelectorAll('h3')).find(
      (candidate) => candidate.textContent === title,
    );
    return heading?.closest('.rounded-lg');
  }

  function cardButtonLabels(title: string) {
    return Array.from(findCard(title)?.querySelectorAll('button') ?? []).map((button) =>
      button.textContent?.trim(),
    );
  }
});

const project: Project = {
  id: 'project-1',
  organisationId: 'org-1',
  name: 'NORTH SYDNEY',
  code: 'NSW-001',
  description: undefined,
  status: 'active',
  standardsProfileId: undefined,
  metadata: {},
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
};

function createDrawings(): DraftingDrawingSummary[] {
  return [
    createDrawing({
      id: 'archived-newest',
      title: 'Archived newest',
      status: 'archived',
      updatedAt: '2026-04-25T02:42:00.000Z',
    }),
    createDrawing({
      id: 'active-newer',
      title: 'Active newer',
      status: 'draft',
      updatedAt: '2026-04-24T02:42:00.000Z',
    }),
    createDrawing({
      id: 'archived-older',
      title: 'Archived older',
      status: 'archived',
      updatedAt: '2026-04-23T02:42:00.000Z',
    }),
    createDrawing({
      id: 'active-older',
      title: 'Active older',
      status: 'draft',
      updatedAt: '2026-04-22T02:42:00.000Z',
    }),
  ];
}

function createDrawing(
  overrides: Partial<DraftingDrawingSummary> & { id: string; title: string },
): DraftingDrawingSummary {
  return {
    projectId: 'project-1',
    status: 'draft',
    currentRevision: 0,
    modelVersion: 1,
    objectCount: 0,
    createdById: null,
    updatedById: null,
    createdAt: '2026-04-21T00:00:00.000Z',
    updatedAt: '2026-04-21T00:00:00.000Z',
    ...overrides,
  };
}
