// @vitest-environment jsdom

import React, { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MonitoringOmnidotsImportPanel } from './monitoring-omnidots-import-panel';

const mockUseEnvironmentalMonitoringOmnidotsConnections = vi.fn();
const mockUseEnvironmentalMonitoringOmnidotsMeasuringPoints = vi.fn();
const mockCreateConnectionMutateAsync = vi.fn();
const mockUpdateConnectionMutateAsync = vi.fn();
const mockValidateConnectionMutateAsync = vi.fn();
const mockSyncMeasuringPointsMutateAsync = vi.fn();
const mockImportMutateAsync = vi.fn();
const mockBuildDatasetMutateAsync = vi.fn();
const mockCreateRowsMutateAsync = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

const defaultConnectionsData = [
  {
    id: 'connection-1',
    organisationId: 'org-1',
    providerKey: 'omnidots',
    displayName: 'Omnidots Honeycomb',
    status: 'active',
    authType: 'api_token',
    lastValidatedAt: '2026-04-22T00:00:00.000Z',
    lastSyncAt: '2026-04-22T01:00:00.000Z',
    lastError: null,
    createdBy: 'user-1',
    createdAt: '2026-04-21T00:00:00.000Z',
    updatedAt: '2026-04-22T01:00:00.000Z',
    hasStoredToken: true,
  },
];

const defaultMeasuringPointsData = {
  measuringPoints: [
    buildMeasuringPoint({
      id: 'point-1',
      externalMeasuringPointId: '544',
      name: 'North facade monitor',
      sensorName: 'BANANA',
    }),
  ],
  latestImportJob: {
    id: 'job-1',
    jobType: 'import_peak_records',
    status: 'completed',
    errorMessage: null,
    createdAt: '2026-04-22T02:00:00.000Z',
    completedAt: '2026-04-22T02:01:00.000Z',
  },
  latestDataset: {
    id: 'dataset-1',
    connectionId: 'connection-1',
    measuringPointId: 'point-1',
    measuringPointLabel: 'North facade monitor',
    dateFrom: '2026-04-21T00:00:00.000Z',
    dateTo: '2026-04-22T00:00:00.000Z',
    timezone: 'Australia/Sydney',
    datasetHash: 'dataset-hash',
    createdAt: '2026-04-22T02:05:00.000Z',
    updatedAt: '2026-04-22T02:05:00.000Z',
    selectedMetricKeys: ['vtop', 'vdv', 'veff_max'],
    sampleCount: 12,
    previewRows: [
      {
        metricKey: 'vtop',
        metricLabel: 'Peak particle velocity (Vtop)',
        unit: 'mm/s',
        measuringPointId: 'point-1',
        measuringPointLabel: 'North facade monitor',
        sampleCount: 4,
        importDateFrom: '2026-04-21T00:00:00.000Z',
        importDateTo: '2026-04-22T00:00:00.000Z',
        timezone: 'Australia/Sydney',
        datasetId: 'dataset-1',
        importJobId: 'job-peak',
        importJobStatus: 'completed',
        highestVtopX: 1.2,
        highestVtopXAt: '2026-04-21T01:00:00.000Z',
        highestVtopY: 1.3,
        highestVtopYAt: '2026-04-21T02:00:00.000Z',
        highestVtopZ: 1.4,
        highestVtopZAt: '2026-04-21T03:00:00.000Z',
        fdomX: 12.2,
        fdomY: 13.2,
        fdomZ: 14.2,
        highestVdvX: null,
        highestVdvXAt: null,
        highestVdvY: null,
        highestVdvYAt: null,
        highestVdvZ: null,
        highestVdvZAt: null,
        highestVeffX: null,
        highestVeffXAt: null,
        highestVeffY: null,
        highestVeffYAt: null,
        highestVeffZ: null,
        highestVeffZAt: null,
      },
    ],
  },
};

vi.mock('@/hooks/use-environmental-monitoring', () => ({
  useEnvironmentalMonitoringOmnidotsConnections: (...args: unknown[]) =>
    mockUseEnvironmentalMonitoringOmnidotsConnections(...args),
  useEnvironmentalMonitoringOmnidotsMeasuringPoints: (...args: unknown[]) =>
    mockUseEnvironmentalMonitoringOmnidotsMeasuringPoints(...args),
  useCreateEnvironmentalMonitoringOmnidotsConnection: () => ({
    mutateAsync: mockCreateConnectionMutateAsync,
    isPending: false,
  }),
  useUpdateEnvironmentalMonitoringOmnidotsConnection: () => ({
    mutateAsync: mockUpdateConnectionMutateAsync,
    isPending: false,
  }),
  useValidateEnvironmentalMonitoringOmnidotsConnection: () => ({
    mutateAsync: mockValidateConnectionMutateAsync,
    isPending: false,
  }),
  useSyncEnvironmentalMonitoringOmnidotsMeasuringPoints: () => ({
    mutateAsync: mockSyncMeasuringPointsMutateAsync,
    isPending: false,
  }),
  useImportEnvironmentalMonitoringOmnidots: () => ({
    mutateAsync: mockImportMutateAsync,
    isPending: false,
    data: null,
  }),
  useBuildEnvironmentalMonitoringOmnidotsDataset: () => ({
    mutateAsync: mockBuildDatasetMutateAsync,
    isPending: false,
    data: null,
  }),
  useCreateVibrationResultsFromEnvironmentalMonitoringOmnidotsDataset: () => ({
    mutateAsync: mockCreateRowsMutateAsync,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('MonitoringOmnidotsImportPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    root = createRoot(container);

    mockUseEnvironmentalMonitoringOmnidotsConnections.mockReturnValue({
      data: defaultConnectionsData,
    });

    mockUseEnvironmentalMonitoringOmnidotsMeasuringPoints.mockReturnValue({
      data: defaultMeasuringPointsData,
    });

    mockCreateConnectionMutateAsync.mockReset();
    mockUpdateConnectionMutateAsync.mockReset();
    mockValidateConnectionMutateAsync.mockReset();
    mockSyncMeasuringPointsMutateAsync.mockReset();
    mockImportMutateAsync.mockReset();
    mockBuildDatasetMutateAsync.mockReset();
    mockCreateRowsMutateAsync.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();

    mockUpdateConnectionMutateAsync.mockResolvedValue({});
    mockValidateConnectionMutateAsync.mockResolvedValue({
      validation: { valid: true, accountName: 'Demo account' },
    });
    mockSyncMeasuringPointsMutateAsync.mockResolvedValue({
      sync: { status: 'completed', totalCount: 1, createdCount: 1, updatedCount: 0 },
    });
    mockImportMutateAsync.mockResolvedValue({ importSummary: { selectedMetricKeys: [] } });
    mockBuildDatasetMutateAsync.mockResolvedValue({ created: true });
    mockCreateRowsMutateAsync.mockResolvedValue({ createdCount: 1 });
  });

  it('renders a password-style token field and only creates rows after the explicit button click', async () => {
    await renderPanel(root);

    const tokenInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    expect(tokenInput).toBeTruthy();
    expect(tokenInput.value).toBe('');
    expect(tokenInput.placeholder).toContain('hidden');
    expect(container.textContent).toContain(
      'Use an Omnidots Honeycomb API token. Log in to Omnidots separately, create a permanent API token, then paste it here. The saved token is encrypted and never displayed.',
    );
    expect(container.textContent).toContain('Do not enter your Omnidots password here.');
    expect(container.textContent).toContain(
      'Tip: names like NorthSydney_VM01 make report-scoped filtering easier.',
    );

    const helpLink = Array.from(container.querySelectorAll('a')).find((candidate) =>
      candidate.textContent?.includes('Where to create an Omnidots API token'),
    );
    expect(helpLink).toBeTruthy();
    expect(helpLink?.getAttribute('href')).toBe(
      'https://support.omnidots.com/where-can-i-find-omnidots-api-documentation-and-api-tokens',
    );
    expect(helpLink?.getAttribute('target')).toBe('_blank');

    expect(mockCreateRowsMutateAsync).not.toHaveBeenCalled();

    await clickButton('Validate');
    expect(mockValidateConnectionMutateAsync).toHaveBeenCalledWith('connection-1');

    await clickButton('Sync Measuring Points');
    expect(mockSyncMeasuringPointsMutateAsync).toHaveBeenCalledWith('connection-1');
    expect(container.textContent).toContain('1 synced measuring point available.');

    await clickButton('Import Data');
    expect(mockImportMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1',
        measuringPointId: 'point-1',
        selectedMetricKeys: ['vtop', 'vdv', 'veff_max'],
      }),
    );

    await clickButton('Build / Refresh Dataset Snapshot');
    expect(mockBuildDatasetMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1',
        measuringPointId: 'point-1',
        selectedMetricKeys: ['vtop', 'vdv', 'veff_max'],
      }),
    );

    expect(mockCreateRowsMutateAsync).not.toHaveBeenCalled();
    await clickButton('Create vibration result rows from imported summary');
    expect(mockCreateRowsMutateAsync).toHaveBeenCalledWith('dataset-1');
  });

  it('auto-selects the first saved connection after async connection data arrives', async () => {
    mockUseEnvironmentalMonitoringOmnidotsConnections.mockReturnValueOnce({ data: [] });
    mockUseEnvironmentalMonitoringOmnidotsMeasuringPoints.mockReturnValueOnce({ data: null });

    await renderPanel(root);

    await act(async () => {
      root.render(
        <MonitoringOmnidotsImportPanel
          projectId="project-1"
          reportId="report-1"
          report={buildReportFixture()}
        />,
      );
    });

    const tokenInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    expect(tokenInput).toBeTruthy();
    expect(tokenInput.value).toBe('');
    expect(tokenInput.placeholder).toContain('Stored token is hidden');
  });

  it('shows a safe empty state when no measuring points have been synced yet', async () => {
    mockUseEnvironmentalMonitoringOmnidotsMeasuringPoints.mockReturnValue({
      data: {
        ...defaultMeasuringPointsData,
        measuringPoints: [],
      },
    });

    await renderPanel(root);

    expect(container.textContent).toContain('0 synced measuring points available.');
    expect(container.textContent).not.toContain('invalid payload');
  });

  it('renders the latest redacted sync error without exposing a token', async () => {
    mockUseEnvironmentalMonitoringOmnidotsConnections.mockReturnValue({
      data: [
        {
          ...defaultConnectionsData[0],
          lastError: 'Omnidots API error: Token [REDACTED] is invalid',
        },
      ],
    });

    await renderPanel(root);

    expect(container.textContent).toContain('Latest connection error');
    expect(container.textContent).toContain('Token [REDACTED] is invalid');
    expect(container.textContent).not.toContain('super-secret-token');
  });

  it('filters synced measuring points by measuring point name and sensor name', async () => {
    mockUseEnvironmentalMonitoringOmnidotsMeasuringPoints.mockReturnValue({
      data: {
        ...defaultMeasuringPointsData,
        measuringPoints: [
          buildMeasuringPoint({
            id: 'point-1',
            externalMeasuringPointId: '544',
            name: 'NorthSydney_VM01',
            sensorName: 'Sensor-A',
          }),
          buildMeasuringPoint({
            id: 'point-2',
            externalMeasuringPointId: '545',
            name: 'Merrylands_VM01',
            sensorName: 'Sensor-B',
          }),
          buildMeasuringPoint({
            id: 'point-3',
            externalMeasuringPointId: '546',
            name: 'Boundary South',
            sensorName: 'NorthSydney_SWARM',
          }),
        ],
      },
    });

    await renderPanel(root);

    const filterInput = Array.from(container.querySelectorAll('input')).find(
      (candidate) =>
        candidate.getAttribute('placeholder') === 'Filter by measuring point or sensor name',
    ) as HTMLInputElement | undefined;
    expect(filterInput).toBeTruthy();

    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    expect(valueSetter).toBeTruthy();

    await act(async () => {
      valueSetter?.call(filterInput, 'NorthSydney');
      filterInput!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.textContent).toContain('Showing 2 of 3 synced measuring points.');
    expect(container.textContent).toContain('NorthSydney_VM01');
    expect(container.textContent).toContain('Boundary South');
    expect(container.textContent).not.toContain('Merrylands_VM01');
  });

  async function clickButton(label: string) {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label),
    );
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }
});

async function renderPanel(root: Root) {
  await act(async () => {
    root.render(
      <MonitoringOmnidotsImportPanel
        projectId="project-1"
        reportId="report-1"
        report={buildReportFixture()}
      />,
    );
  });
}

function buildReportFixture() {
  return {
    id: 'report-1',
    projectId: 'project-1',
    reportType: 'vibration_monitoring' as const,
    title: 'Vibration Monitoring Report',
    revision: 'A',
    issueDate: '2026-04-22',
    documentStatus: 'draft' as const,
    preparedBy: 'Engineer',
    checkedBy: 'Reviewer',
    purpose: null,
    monitoringDate: '2026-04-21',
    monitoringWindowStart: '2026-04-21T00:00:00.000Z',
    monitoringWindowEnd: '2026-04-22T00:00:00.000Z',
    weatherConditions: null,
    siteActivitySummary: null,
    executiveSummary: null,
    generalObservations: null,
    conclusion: null,
    recommendationsSummary: null,
    assumptionsLimitations: null,
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-22T00:00:00.000Z',
    annexures: [],
    references: [],
    locations: [],
    selectedCriteria: [],
    noiseResults: [],
    vibrationResults: [],
    observations: [],
    recommendations: [],
    packageIssues: [],
  };
}

function buildMeasuringPoint(args: {
  id: string;
  externalMeasuringPointId: string;
  name: string;
  sensorName: string | null;
}) {
  return {
    id: args.id,
    connectionId: 'connection-1',
    externalMeasuringPointId: args.externalMeasuringPointId,
    name: args.name,
    active: true,
    timezone: 'Australia/Sydney',
    guideLine: null,
    category: 'vibration',
    measuringType: 'peak',
    vibrationType: 'structural',
    userLatitude: null,
    userLongitude: null,
    sensorName: args.sensorName,
    sensorOnline: true,
    sensorLastseenAt: '2026-04-22T01:00:00.000Z',
    sensorConnectedUsing: 'GSM',
    sensorBatteryCharge: 95,
    sensorLatitude: null,
    sensorLongitude: null,
    deepLinkUrl: null,
    createdAt: '2026-04-22T01:00:00.000Z',
    updatedAt: '2026-04-22T01:00:00.000Z',
  };
}
