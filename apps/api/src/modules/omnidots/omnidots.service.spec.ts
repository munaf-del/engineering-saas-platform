import { ServiceUnavailableException } from '@nestjs/common';
import { MonitoringProviderConnectionStatus, Prisma } from '@prisma/client';
import {
  OMNIDOTS_MEASURING_POINT_FIXTURE,
  OMNIDOTS_PEAK_RECORD_FIXTURE,
} from './omnidots.fixtures';
import { OmnidotsClient } from './omnidots.client';
import { OmnidotsCredentialsService } from './omnidots.credentials';
import { OmnidotsService } from './omnidots.service';
import { SnapshotService } from '../calculations/snapshot.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

describe('OmnidotsService', () => {
  let service: OmnidotsService;
  let prisma: {
    organisationMember: { findUnique: jest.Mock };
    omnidotsProviderConnection: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    omnidotsMeasuringPoint: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    monitoringImportJob: {
      create: jest.Mock;
      update: jest.Mock;
    };
    monitoringSeries: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    monitoringSample: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    projectEnvironmentalMonitoringReport: {
      findFirst: jest.Mock;
    };
    projectEnvironmentalMonitoringDataset: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let omnidotsClient: {
    validateToken: jest.Mock;
    listMeasuringPoints: jest.Mock;
    getPeakRecords: jest.Mock;
    getVdvRecords: jest.Mock;
    getVeffRecords: jest.Mock;
  };
  let omnidotsCredentialsService: {
    encryptToken: jest.Mock;
    decryptToken: jest.Mock;
  };
  let snapshotService: {
    computeHash: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      organisationMember: {
        findUnique: jest.fn(),
      },
      omnidotsProviderConnection: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      omnidotsMeasuringPoint: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      monitoringImportJob: {
        create: jest.fn(),
        update: jest.fn(),
      },
      monitoringSeries: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      monitoringSample: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      projectEnvironmentalMonitoringReport: {
        findFirst: jest.fn(),
      },
      projectEnvironmentalMonitoringDataset: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    omnidotsClient = {
      validateToken: jest.fn(),
      listMeasuringPoints: jest.fn(),
      getPeakRecords: jest.fn(),
      getVdvRecords: jest.fn(),
      getVeffRecords: jest.fn(),
    };

    omnidotsCredentialsService = {
      encryptToken: jest.fn(),
      decryptToken: jest.fn(),
    };

    snapshotService = {
      computeHash: jest.fn(),
    };

    service = new OmnidotsService(
      prisma as unknown as PrismaService,
      omnidotsClient as unknown as OmnidotsClient,
      omnidotsCredentialsService as unknown as OmnidotsCredentialsService,
      snapshotService as unknown as SnapshotService,
    );
  });

  it('upserts synced measuring points and records a completed import job', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ role: 'admin' });
    prisma.omnidotsProviderConnection.findFirst.mockResolvedValue(buildStoredConnection());
    prisma.monitoringImportJob.create.mockResolvedValue({ id: 'job-1' });
    omnidotsCredentialsService.decryptToken.mockReturnValue('secret-token');
    omnidotsClient.listMeasuringPoints.mockResolvedValue([OMNIDOTS_MEASURING_POINT_FIXTURE]);
    prisma.omnidotsMeasuringPoint.findMany.mockResolvedValue([]);
    prisma.omnidotsMeasuringPoint.upsert.mockResolvedValue({ id: 'point-1' });
    prisma.omnidotsProviderConnection.update.mockResolvedValue(buildConnectionSummary());

    const result = await service.syncMeasuringPoints('org-1', 'connection-1', 'user-1');

    expect(prisma.omnidotsMeasuringPoint.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          connectionId: 'connection-1',
          externalMeasuringPointId: '544',
          sensorName: 'BANANA',
          sensorConnectedUsing: 'GSM',
        }),
        update: expect.objectContaining({
          active: true,
        }),
      }),
    );
    expect(prisma.monitoringImportJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: 'completed',
          resultSummaryJson: expect.objectContaining({
            totalCount: 1,
            createdCount: 1,
            updatedCount: 0,
          }),
        }),
      }),
    );
    expect(result.sync).toEqual({
      status: 'completed',
      totalCount: 1,
      createdCount: 1,
      updatedCount: 0,
    });
  });

  it('imports peak records idempotently for the same timestamp', async () => {
    prisma.omnidotsProviderConnection.findUnique.mockResolvedValue(buildStoredConnection());
    prisma.omnidotsMeasuringPoint.findFirst.mockResolvedValue(buildStoredMeasuringPoint());
    prisma.monitoringSeries.upsert.mockResolvedValue({ id: 'series-1' });
    prisma.monitoringImportJob.create.mockResolvedValue({ id: 'job-1' });
    prisma.monitoringImportJob.update.mockResolvedValue({});
    prisma.omnidotsProviderConnection.update.mockResolvedValue({});
    omnidotsCredentialsService.decryptToken.mockReturnValue('secret-token');
    omnidotsClient.getPeakRecords.mockResolvedValue([OMNIDOTS_PEAK_RECORD_FIXTURE]);
    prisma.monitoringSample.upsert.mockResolvedValue({});
    prisma.monitoringSample.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ sampledAt: new Date(OMNIDOTS_PEAK_RECORD_FIXTURE.timestamp) }]);

    const firstResult = await service.importPeakRecords({
      connectionId: 'connection-1',
      localMeasuringPointId: 'point-1',
      dateFrom: new Date('2026-04-20T00:00:00.000Z'),
      dateTo: new Date('2026-04-21T00:00:00.000Z'),
    });
    const secondResult = await service.importPeakRecords({
      connectionId: 'connection-1',
      localMeasuringPointId: 'point-1',
      dateFrom: new Date('2026-04-20T00:00:00.000Z'),
      dateTo: new Date('2026-04-21T00:00:00.000Z'),
    });

    expect(firstResult).toMatchObject({
      status: 'completed',
      createdCount: 1,
      updatedCount: 0,
    });
    expect(secondResult).toMatchObject({
      status: 'completed',
      createdCount: 0,
      updatedCount: 1,
    });
    expect(prisma.monitoringSample.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          seriesId_sampledAt: {
            seriesId: 'series-1',
            sampledAt: new Date(OMNIDOTS_PEAK_RECORD_FIXTURE.timestamp),
          },
        },
        create: expect.objectContaining({
          metricKey: 'vtop',
          xValue: 1.2,
          fdomX: 12.2,
        }),
      }),
    );
  });

  it('marks sync jobs as failed with redacted errors', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ role: 'admin' });
    prisma.omnidotsProviderConnection.findFirst.mockResolvedValue(buildStoredConnection());
    prisma.monitoringImportJob.create.mockResolvedValue({ id: 'job-1' });
    omnidotsCredentialsService.decryptToken.mockReturnValue('super-secret-token');
    omnidotsClient.listMeasuringPoints.mockRejectedValue(
      new Error(
        'Request failed for https://honeycomb.omnidots.com/api/v1/list_measuring_points?token=super-secret-token',
      ),
    );
    prisma.omnidotsProviderConnection.update.mockResolvedValue(buildConnectionSummary());

    await expect(
      service.syncMeasuringPoints('org-1', 'connection-1', 'user-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.omnidotsProviderConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'connection-1' },
        data: expect.objectContaining({
          status: MonitoringProviderConnectionStatus.error,
          lastError: expect.stringContaining('[REDACTED]'),
        }),
      }),
    );
    expect(prisma.monitoringImportJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: expect.stringContaining('[REDACTED]'),
        }),
      }),
    );
    const errorMessages = prisma.monitoringImportJob.update.mock.calls.map(
      (call) => call[0].data.errorMessage,
    );
    expect(errorMessages.join(' ')).not.toContain('super-secret-token');
  });

  it('builds a frozen report dataset snapshot from imported samples', async () => {
    prisma.omnidotsProviderConnection.findUnique.mockResolvedValue(buildStoredConnection());
    prisma.projectEnvironmentalMonitoringReport.findFirst.mockResolvedValue({
      id: 'report-1',
      projectId: 'project-1',
      reportType: 'vibration_monitoring',
      title: 'Vibration report',
      project: {
        id: 'project-1',
        organisationId: 'org-1',
      },
      selectedCriteria: [
        {
          id: 'selection-1',
          selectionPurpose: 'vibration_structural',
          isEnforceableOnThisProject: true,
          projectConditionReference: 'Condition C1',
          selectionNote: 'Apply for structural vibration review.',
          criterionRow: {
            id: 'criterion-1',
            rowKey: 'row-1',
            label: 'Structural PPV',
            basisType: 'maximum',
            unit: 'mm/s',
            sourceClause: 'Clause 4.2',
            criterionValue: new Prisma.Decimal('10'),
            maximumValue: new Prisma.Decimal('10'),
            alertValue: new Prisma.Decimal('7.5'),
            stopWorkValue: new Prisma.Decimal('12.5'),
            absoluteMaxValue: new Prisma.Decimal('15'),
            criterionGroup: {
              id: 'group-1',
              slug: 'group-1',
              title: 'Structural vibration',
              criterionCategory: 'vibration_structural',
              metric: 'ppv',
              standardSource: {
                id: 'source-1',
                shortName: 'DIN4150-3',
                name: 'DIN 4150-3',
                publisher: 'DIN',
                sourceCitation: 'DIN 4150-3:1999',
                sourceUrl: 'https://example.com/din4150-3',
              },
            },
          },
        },
      ],
    });
    prisma.omnidotsMeasuringPoint.findFirst.mockResolvedValue(buildStoredMeasuringPoint());
    prisma.monitoringImportJob.create.mockResolvedValue({ id: 'job-1' });
    prisma.monitoringSeries.findMany.mockResolvedValue([
      {
        id: 'series-1',
        organisationId: 'org-1',
        measuringPointId: 'point-1',
        providerKey: 'omnidots',
        metricKey: 'vtop',
        metricLabel: 'Peak particle velocity (Vtop)',
        unit: 'mm/s',
        axisMode: 'xyz',
        sourceEndpoint: '/api/v1/get_peak_records',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prisma.monitoringSample.findMany.mockResolvedValue([
      {
        id: 'sample-1',
        seriesId: 'series-1',
        measuringPointId: 'point-1',
        sampledAt: new Date('2026-04-20T01:00:00.000Z'),
        sourceTimezone: 'Europe/Amsterdam',
        metricKey: 'vtop',
        xValue: 1.2,
        yValue: 0.8,
        zValue: 20.2,
        pvsValue: null,
        fdomX: 12.2,
        fdomY: 3.2,
        fdomZ: 1.1,
        category: 'CAT1',
        guideLine: 'DIN4150-3',
        measuringType: 'indicative',
        vibrationType: 'continuous',
        rawPayloadJson: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    snapshotService.computeHash.mockReturnValue('dataset-hash-1');
    prisma.projectEnvironmentalMonitoringDataset.findUnique.mockResolvedValue(null);
    prisma.projectEnvironmentalMonitoringDataset.create.mockResolvedValue(
      buildDatasetRecord('dataset-hash-1'),
    );

    const result = await service.buildReportDatasetSnapshot({
      monitoringReportId: 'report-1',
      connectionId: 'connection-1',
      measuringPointId: 'point-1',
      dateFrom: new Date('2026-04-20T00:00:00.000Z'),
      dateTo: new Date('2026-04-21T00:00:00.000Z'),
      selectedMetricKeys: ['vtop'],
    });

    expect(result).toMatchObject({
      created: true,
      dataset: expect.objectContaining({
        datasetHash: 'dataset-hash-1',
      }),
    });
    expect(prisma.projectEnvironmentalMonitoringDataset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          monitoringReportId: 'report-1',
          snapshotJson: expect.objectContaining({
            selectedMetricKeys: ['vtop'],
            metrics: [
              expect.objectContaining({
                metricKey: 'vtop',
                sampleCount: 1,
              }),
            ],
            criteriaReferences: [
              expect.objectContaining({
                selectionPurpose: 'vibration_structural',
              }),
            ],
          }),
        }),
      }),
    );
    expect(prisma.monitoringImportJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: 'completed',
        }),
      }),
    );
  });
});

function buildStoredConnection() {
  return {
    id: 'connection-1',
    organisationId: 'org-1',
    providerKey: 'omnidots',
    displayName: 'Omnidots Honeycomb',
    status: 'pending',
    authType: 'api_token',
    encryptedCredentials: {},
    lastValidatedAt: null,
    lastSyncAt: null,
    lastError: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildConnectionSummary() {
  const { encryptedCredentials: _encryptedCredentials, ...summary } = buildStoredConnection();
  return summary;
}

function buildStoredMeasuringPoint() {
  return {
    id: 'point-1',
    connectionId: 'connection-1',
    externalMeasuringPointId: '544',
    name: 'Test',
    active: true,
    timezone: 'Europe/Amsterdam',
    guideLine: 'DIN4150-3',
    category: 'CAT2',
    measuringType: 'indicative',
    vibrationType: 'continuous',
    userLatitude: null,
    userLongitude: null,
    sensorName: 'BANANA',
    sensorOnline: true,
    sensorLastseenAt: new Date('2018-12-14T11:10:32.770Z'),
    sensorConnectedUsing: 'GSM',
    sensorBatteryCharge: null,
    sensorLatitude: 53.00033187866211,
    sensorLongitude: 6.554333209991455,
    deepLinkUrl: null,
    rawPayloadJson: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildDatasetRecord(datasetHash: string) {
  return {
    id: 'dataset-1',
    monitoringReportId: 'report-1',
    sourceType: 'omnidots_api',
    connectionId: 'connection-1',
    measuringPointId: 'point-1',
    dateFrom: new Date('2026-04-20T00:00:00.000Z'),
    dateTo: new Date('2026-04-21T00:00:00.000Z'),
    timezone: 'Europe/Amsterdam',
    datasetHash,
    snapshotJson: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
