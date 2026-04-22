import {
  buildOmnidotsImportedVibrationResultDrafts,
  buildOmnidotsLatestDatasetSummary,
} from './environmental-monitoring-omnidots.helpers';

describe('environmental monitoring Omnidots helpers', () => {
  it('builds preview rows with metric maxima and import-job references', () => {
    const summary = buildOmnidotsLatestDatasetSummary({
      datasetId: 'dataset-1',
      datasetHash: 'dataset-hash',
      dateFrom: new Date('2026-04-21T00:00:00.000Z'),
      dateTo: new Date('2026-04-22T00:00:00.000Z'),
      createdAt: new Date('2026-04-22T02:00:00.000Z'),
      updatedAt: new Date('2026-04-22T02:00:00.000Z'),
      importJobsByMetric: new Map([
        [
          'vtop',
          {
            metricKey: 'vtop',
            id: 'job-peak',
            status: 'completed',
            completedAt: '2026-04-22T01:00:00.000Z',
          },
        ],
      ]),
      snapshotJson: {
        connection: {
          id: 'connection-1',
          displayName: 'Omnidots Honeycomb',
        },
        measuringPoint: {
          id: 'point-1',
          externalMeasuringPointId: '544',
          name: 'North facade monitor',
          timezone: 'Australia/Sydney',
        },
        dateRange: {
          dateFrom: '2026-04-21T00:00:00.000Z',
          dateTo: '2026-04-22T00:00:00.000Z',
          timezone: 'Australia/Sydney',
        },
        selectedMetricKeys: ['vtop'],
        metrics: [
          {
            metricKey: 'vtop',
            metricLabel: 'Peak particle velocity (Vtop)',
            unit: 'mm/s',
            sampleCount: 2,
            samples: [
              {
                sampledAt: '2026-04-21T01:00:00.000Z',
                xValue: 1.2,
                yValue: 1.1,
                zValue: 0.9,
                fdomX: 12.2,
                fdomY: 11.2,
                fdomZ: 10.2,
              },
              {
                sampledAt: '2026-04-21T03:00:00.000Z',
                xValue: 1.0,
                yValue: 1.3,
                zValue: 1.4,
                fdomX: 12.5,
                fdomY: 13.2,
                fdomZ: 14.2,
              },
            ],
          },
        ],
      },
    });

    expect(summary).not.toBeNull();
    expect(summary?.previewRows).toEqual([
      expect.objectContaining({
        metricKey: 'vtop',
        measuringPointLabel: 'North facade monitor',
        importJobId: 'job-peak',
        highestVtopX: 1.2,
        highestVtopXAt: '2026-04-21T01:00:00.000Z',
        highestVtopY: 1.3,
        highestVtopYAt: '2026-04-21T03:00:00.000Z',
        highestVtopZ: 1.4,
        highestVtopZAt: '2026-04-21T03:00:00.000Z',
        fdomX: 12.2,
        fdomY: 13.2,
        fdomZ: 14.2,
      }),
    ]);
  });

  it('creates explicit imported drafts as not assessed and skips unsupported or duplicate items', () => {
    const result = buildOmnidotsImportedVibrationResultDrafts({
      datasetId: 'dataset-1',
      existingResultNotes: [
        '[Omnidots dataset dataset-1 | metric vdv | axis x | observed 2026-04-21T04:00:00.000Z]',
      ],
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
          highestVtopY: 1.1,
          highestVtopYAt: '2026-04-21T02:00:00.000Z',
          highestVtopZ: 1.4,
          highestVtopZAt: '2026-04-21T03:00:00.000Z',
          fdomX: 12.2,
          fdomY: 11.2,
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
        {
          metricKey: 'vdv',
          metricLabel: 'Vibration dose value',
          unit: 'm/s^1.75',
          measuringPointId: 'point-1',
          measuringPointLabel: 'North facade monitor',
          sampleCount: 4,
          importDateFrom: '2026-04-21T00:00:00.000Z',
          importDateTo: '2026-04-22T00:00:00.000Z',
          timezone: 'Australia/Sydney',
          datasetId: 'dataset-1',
          importJobId: 'job-vdv',
          importJobStatus: 'completed',
          highestVtopX: null,
          highestVtopXAt: null,
          highestVtopY: null,
          highestVtopYAt: null,
          highestVtopZ: null,
          highestVtopZAt: null,
          fdomX: null,
          fdomY: null,
          fdomZ: null,
          highestVdvX: 0.8,
          highestVdvXAt: '2026-04-21T04:00:00.000Z',
          highestVdvY: 0.7,
          highestVdvYAt: '2026-04-21T05:00:00.000Z',
          highestVdvZ: 0.6,
          highestVdvZAt: '2026-04-21T06:00:00.000Z',
          highestVeffX: null,
          highestVeffXAt: null,
          highestVeffY: null,
          highestVeffYAt: null,
          highestVeffZ: null,
          highestVeffZAt: null,
        },
        {
          metricKey: 'veff_max',
          metricLabel: 'Maximum Veff',
          unit: 'mm/s',
          measuringPointId: 'point-1',
          measuringPointLabel: 'North facade monitor',
          sampleCount: 4,
          importDateFrom: '2026-04-21T00:00:00.000Z',
          importDateTo: '2026-04-22T00:00:00.000Z',
          timezone: 'Australia/Sydney',
          datasetId: 'dataset-1',
          importJobId: 'job-veff',
          importJobStatus: 'completed',
          highestVtopX: null,
          highestVtopXAt: null,
          highestVtopY: null,
          highestVtopYAt: null,
          highestVtopZ: null,
          highestVtopZAt: null,
          fdomX: null,
          fdomY: null,
          fdomZ: null,
          highestVdvX: null,
          highestVdvXAt: null,
          highestVdvY: null,
          highestVdvYAt: null,
          highestVdvZ: null,
          highestVdvZAt: null,
          highestVeffX: 0.4,
          highestVeffXAt: '2026-04-21T07:00:00.000Z',
          highestVeffY: 0.5,
          highestVeffYAt: '2026-04-21T08:00:00.000Z',
          highestVeffZ: 0.6,
          highestVeffZAt: '2026-04-21T09:00:00.000Z',
        },
      ],
    });

    expect(result.drafts).toHaveLength(1);
    const draft = result.drafts[0]!;

    expect(draft).toMatchObject({
      metricKey: 'vtop',
      metricType: 'ppv',
      observedAt: '2026-04-21T03:00:00.000Z',
      ppvValue: '1.4',
      dominantFrequencyHz: '14.2',
      complianceStatus: 'not_assessed',
    });
    expect(draft.resultNote).toContain('dataset-1');
    expect(draft.resultNote).toContain('Not assessed');
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricKey: 'vdv',
          reason: expect.stringContaining('already exists'),
        }),
        expect.objectContaining({
          metricKey: 'veff_max',
          reason: expect.stringContaining('not auto-mapped'),
        }),
      ]),
    );
  });
});
