// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { DraftingDrawingSummary, Project } from '@eng/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPORARY_DRAFTING_QA_SANDBOX_TITLE_PREFIX } from './qa/drafting-connected-edit-sandbox';
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

describe('DraftingRegister project model architecture', () => {
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

  it('shows one project model card and hides sketches by default', async () => {
    await renderRegister();

    expect(container.textContent).toContain('1 project model canvas');
    expect(container.textContent).toContain('Project Model');
    expect(container.textContent).toContain('Open Project Model');
    expect(container.textContent).toContain('Show sketches (3)');
    expect(container.textContent).not.toContain('QA sketch newer');
    expect(container.textContent).not.toContain('Archived newest');
    expect(container.textContent).not.toContain('Archived older');
    expect(container.textContent).not.toContain('72 drawing(s)');
    expect(container.textContent).not.toContain('PDF underlays next');
  });

  it('reveals sketches and archived sketches in a non-production section', async () => {
    await renderRegister();

    await clickButton('Show sketches (3)');

    const text = container.textContent ?? '';
    expect(text).toContain('Sketches');
    expect(text).toContain('sketch / QA');
    expect(text).toContain('QA sketch newer');
    expect(text).toContain('Archived newest');
    expect(text).toContain('Archived older');
    expect(text.indexOf('Project Model')).toBeLessThan(text.indexOf('QA sketch newer'));
  });

  it('keeps sketch archive actions separate from archived restore actions', async () => {
    await renderRegister();

    expect(container.textContent).not.toContain('QA sketch newer');
    expect(container.textContent).not.toContain('Restore');

    await clickButton('Show sketches (3)');

    expect(cardButtonLabels('QA sketch newer')).toContain('Archive');
    expect(cardButtonLabels('Archived newest')).toContain('Restore');
    expect(cardButtonLabels('Archived newest')).not.toContain('Archive');
  });

  it('keeps project transmittal routing visible at project level', async () => {
    await renderRegister();

    const transmittalLinks = Array.from(container.querySelectorAll('a')).filter((link) =>
      link.getAttribute('href')?.endsWith('/drafting/transmittals'),
    );
    expect(transmittalLinks.length).toBeGreaterThan(0);
  });

  it('keeps temporary QA sandboxes out of the default customer register view', async () => {
    const sandboxTitle = `${TEMPORARY_DRAFTING_QA_SANDBOX_TITLE_PREFIX} 2026-04-27T10:00:00.000Z`;
    mockUseDraftingDrawings.mockReturnValue({
      data: [
        ...createDrawings(),
        createDrawing({
          id: 'temporary-sandbox',
          title: sandboxTitle,
          status: 'draft',
          updatedAt: '2026-04-25T04:42:00.000Z',
        }),
      ],
      isLoading: false,
    });

    await renderRegister();

    expect(container.textContent).toContain('Show sketches (4)');
    expect(container.textContent).not.toContain(sandboxTitle);

    await clickButton('Show sketches (4)');

    expect(container.textContent).toContain(sandboxTitle);
    expect(cardButtonLabels(sandboxTitle)).toContain('Archive');
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
      id: 'model-active',
      title: 'Project Model',
      kind: 'model',
      isProjectModel: true,
      isSketch: false,
      status: 'draft',
      updatedAt: '2026-04-25T03:42:00.000Z',
    }),
    createDrawing({
      id: 'archived-newest',
      title: 'Archived newest',
      status: 'archived',
      updatedAt: '2026-04-25T02:42:00.000Z',
    }),
    createDrawing({
      id: 'sketch-newer',
      title: 'QA sketch newer',
      status: 'draft',
      updatedAt: '2026-04-24T02:42:00.000Z',
    }),
    createDrawing({
      id: 'archived-older',
      title: 'Archived older',
      status: 'archived',
      updatedAt: '2026-04-23T02:42:00.000Z',
    }),
  ];
}

function createDrawing(
  overrides: Partial<DraftingDrawingSummary> & { id: string; title: string },
): DraftingDrawingSummary {
  return {
    projectId: 'project-1',
    kind: 'sketch',
    isProjectModel: false,
    isSketch: true,
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
