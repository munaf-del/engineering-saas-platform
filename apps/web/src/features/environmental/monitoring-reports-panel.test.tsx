// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MonitoringReportsPanel } from './monitoring-reports-panel';

const mockPush = vi.fn();
const mockUseEnvironmentalMonitoringReports = vi.fn();
const mockCreateReportMutateAsync = vi.fn();
const mockDeleteReportMutateAsync = vi.fn();
const mockDuplicateReportMutateAsync = vi.fn();

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

vi.mock('@/hooks/use-environmental-monitoring', () => ({
  useEnvironmentalMonitoringReports: (...args: unknown[]) =>
    mockUseEnvironmentalMonitoringReports(...args),
  useCreateEnvironmentalMonitoringReport: () => ({
    mutateAsync: mockCreateReportMutateAsync,
    isPending: false,
  }),
  useDeleteEnvironmentalMonitoringReport: () => ({
    mutateAsync: mockDeleteReportMutateAsync,
    isPending: false,
    variables: undefined,
  }),
  useDuplicateEnvironmentalMonitoringReport: () => ({
    mutateAsync: mockDuplicateReportMutateAsync,
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/loading', () => ({
  PageLoading: () => <div>Loading…</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui/button')>(
    '@/components/ui/button',
  );

  return {
    ...actual,
    Button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
      <button {...props}>{children}</button>
    ),
  };
});

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  CardDescription: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe('MonitoringReportsPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    root = createRoot(container);

    mockUseEnvironmentalMonitoringReports.mockReturnValue({
      data: [
        {
          id: 'report-vibration',
          reportType: 'vibration_monitoring',
          title: 'Vibration Monitoring Report',
          revision: null,
          issueDate: null,
          documentStatus: 'draft',
          _count: {
            annexures: 0,
            locations: 0,
            selectedCriteria: 0,
            noiseResults: 0,
            vibrationResults: 0,
          },
        },
        {
          id: 'report-noise',
          reportType: 'noise_monitoring',
          title: 'Noise Monitoring Report',
          revision: null,
          issueDate: null,
          documentStatus: 'draft',
          _count: {
            annexures: 0,
            locations: 0,
            selectedCriteria: 0,
            noiseResults: 0,
            vibrationResults: 0,
          },
        },
      ],
      isLoading: false,
    });
  });

  it('adds an Omnidots shortcut for vibration monitoring reports', async () => {
    await act(async () => {
      root.render(<MonitoringReportsPanel projectId="project-1" />);
    });

    const importLink = Array.from(container.querySelectorAll('a')).find((candidate) =>
      candidate.textContent?.includes('Import from Omnidots'),
    );

    expect(importLink).toBeTruthy();
    expect(importLink?.getAttribute('href')).toBe(
      '/projects/project-1/environmental/monitoring/report-vibration#omnidots-import-panel',
    );

    const importLinks = Array.from(container.querySelectorAll('a')).filter((candidate) =>
      candidate.textContent?.includes('Import from Omnidots'),
    );
    expect(importLinks).toHaveLength(1);
  });
});
