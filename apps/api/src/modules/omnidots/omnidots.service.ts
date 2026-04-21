import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MonitoringImportJobType,
  MonitoringProviderConnectionStatus,
  Prisma,
  type MonitoringSeries,
  type OmnidotsMeasuringPoint,
  type ProjectEnvironmentalMonitoringDataset,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SnapshotService } from '../calculations/snapshot.service';
import type {
  CreateOmnidotsProviderConnectionDto,
  UpdateOmnidotsProviderConnectionDto,
} from './dto/omnidots-connection.dto';
import { OmnidotsClient } from './omnidots.client';
import { OmnidotsCredentialsService } from './omnidots.credentials';
import { isOmnidotsInvalidTokenError } from './omnidots.errors';
import { buildOmnidotsSafeErrorMessage } from './omnidots.redaction';
import {
  OMNIDOTS_GET_PEAK_RECORDS_PATH,
  OMNIDOTS_GET_VDV_RECORDS_PATH,
  OMNIDOTS_GET_VEFF_RECORDS_PATH,
  OMNIDOTS_LIST_MEASURING_POINTS_PATH,
  OMNIDOTS_PROVIDER_DISPLAY_NAME,
} from './omnidots.constants';
import type {
  OmnidotsMeasuringPointResponseItem,
  OmnidotsPeakRecordResponseItem,
  OmnidotsVdvRecordResponseItem,
  OmnidotsVeffRecordResponseItem,
} from './omnidots.types';

const omnidotsConnectionSummarySelect = {
  id: true,
  organisationId: true,
  providerKey: true,
  displayName: true,
  status: true,
  authType: true,
  lastValidatedAt: true,
  lastSyncAt: true,
  lastError: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OmnidotsProviderConnectionSelect;

const omnidotsConnectionWithCredentialsSelect = {
  ...omnidotsConnectionSummarySelect,
  encryptedCredentials: true,
} satisfies Prisma.OmnidotsProviderConnectionSelect;

const monitoringDatasetSelect = {
  id: true,
  monitoringReportId: true,
  sourceType: true,
  connectionId: true,
  measuringPointId: true,
  dateFrom: true,
  dateTo: true,
  timezone: true,
  datasetHash: true,
  snapshotJson: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectEnvironmentalMonitoringDatasetSelect;

type OmnidotsConnectionSummary = Prisma.OmnidotsProviderConnectionGetPayload<{
  select: typeof omnidotsConnectionSummarySelect;
}>;

type OmnidotsConnectionWithCredentials = Prisma.OmnidotsProviderConnectionGetPayload<{
  select: typeof omnidotsConnectionWithCredentialsSelect;
}>;

type ReportDatasetRecord = Prisma.ProjectEnvironmentalMonitoringDatasetGetPayload<{
  select: typeof monitoringDatasetSelect;
}>;

type NormalizedMonitoringSample = {
  sampledAt: Date;
  xValue: number | null;
  yValue: number | null;
  zValue: number | null;
  pvsValue: number | null;
  fdomX: number | null;
  fdomY: number | null;
  fdomZ: number | null;
  category: string | null;
  guideLine: string | null;
  measuringType: string | null;
  vibrationType: string | null;
  rawPayloadJson: Prisma.InputJsonValue;
};

export type OmnidotsImportRecordsArgs = {
  connectionId: string;
  localMeasuringPointId?: string;
  externalMeasuringPointId?: string;
  dateFrom: Date;
  dateTo?: Date;
};

export type OmnidotsDatasetBuildArgs = {
  monitoringReportId: string;
  connectionId: string;
  measuringPointId: string;
  dateFrom: Date;
  dateTo: Date;
  selectedMetricKeys: string[];
};

type MonitoringMetricDefinition<TRecord> = {
  jobType: MonitoringImportJobType;
  metricKey: string;
  metricLabel: string;
  unit: string;
  axisMode: string;
  sourceEndpoint: string;
  fetchRecords: (
    token: string,
    measuringPointId: string,
    startTimeMs: number,
    endTimeMs?: number,
  ) => Promise<TRecord[]>;
  normalizeRecord: (
    record: TRecord,
    measuringPoint: OmnidotsMeasuringPoint,
  ) => NormalizedMonitoringSample;
};

@Injectable()
export class OmnidotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly omnidotsClient: OmnidotsClient,
    private readonly omnidotsCredentialsService: OmnidotsCredentialsService,
    private readonly snapshotService: SnapshotService,
  ) {}

  async listConnections(organisationId: string, userId: string) {
    await this.assertMembership(organisationId, userId);

    const connections = await this.prisma.omnidotsProviderConnection.findMany({
      where: { organisationId },
      select: omnidotsConnectionSummarySelect,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return connections.map(serializeConnection);
  }

  async createConnection(
    organisationId: string,
    userId: string,
    dto: CreateOmnidotsProviderConnectionDto,
  ) {
    await this.assertRole(organisationId, userId, ['owner', 'admin']);

    const connection = await this.prisma.omnidotsProviderConnection.create({
      data: {
        organisationId,
        displayName: dto.displayName?.trim() || OMNIDOTS_PROVIDER_DISPLAY_NAME,
        encryptedCredentials: toJson(this.omnidotsCredentialsService.encryptToken(dto.token)),
        createdBy: userId,
      },
      select: omnidotsConnectionSummarySelect,
    });

    return serializeConnection(connection);
  }

  async updateConnection(
    organisationId: string,
    connectionId: string,
    userId: string,
    dto: UpdateOmnidotsProviderConnectionDto,
  ) {
    await this.assertRole(organisationId, userId, ['owner', 'admin']);
    await this.findConnectionSummaryForOrganisation(organisationId, connectionId);

    const data: Prisma.OmnidotsProviderConnectionUpdateInput = {};

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName?.trim() || OMNIDOTS_PROVIDER_DISPLAY_NAME;
    }

    if (dto.token !== undefined) {
      data.encryptedCredentials = toJson(this.omnidotsCredentialsService.encryptToken(dto.token));
      data.status = MonitoringProviderConnectionStatus.pending;
      data.lastValidatedAt = null;
      data.lastSyncAt = null;
      data.lastError = null;
    }

    const connection = await this.prisma.omnidotsProviderConnection.update({
      where: { id: connectionId },
      data,
      select: omnidotsConnectionSummarySelect,
    });

    return serializeConnection(connection);
  }

  async validateStoredConnection(organisationId: string, connectionId: string, userId: string) {
    await this.assertRole(organisationId, userId, ['owner', 'admin']);
    const connection = await this.findStoredConnectionForOrganisation(organisationId, connectionId);

    const job = await this.createMonitoringJob({
      connectionId: connection.id,
      organisationId,
      jobType: MonitoringImportJobType.validate_token,
      requestParams: {
        endpoint: 'token_details',
      },
    });

    let token: string | null = null;

    try {
      token = this.omnidotsCredentialsService.decryptToken(connection.encryptedCredentials);
      const details = await this.omnidotsClient.validateToken(token);
      const updatedConnection = await this.prisma.omnidotsProviderConnection.update({
        where: { id: connection.id },
        data: {
          status: MonitoringProviderConnectionStatus.active,
          lastValidatedAt: new Date(),
          lastError: null,
        },
        select: omnidotsConnectionSummarySelect,
      });

      await this.completeMonitoringJob(job.id, {
        valid: true,
        accountName: details.account_name ?? null,
        accountId: details.account_id ?? null,
      });

      return {
        connection: serializeConnection(updatedConnection),
        validation: {
          valid: true,
          accountName: details.account_name ?? null,
          accountId: details.account_id ?? null,
        },
      };
    } catch (error) {
      const safeMessage = buildOmnidotsSafeErrorMessage(error, [token]);

      if (isOmnidotsInvalidTokenError(error)) {
        const invalidConnection = await this.prisma.omnidotsProviderConnection.update({
          where: { id: connection.id },
          data: {
            status: MonitoringProviderConnectionStatus.invalid,
            lastValidatedAt: new Date(),
            lastError: safeMessage,
          },
          select: omnidotsConnectionSummarySelect,
        });

        await this.failMonitoringJob(job.id, safeMessage);

        return {
          connection: serializeConnection(invalidConnection),
          validation: {
            valid: false,
            message: safeMessage,
          },
        };
      }

      await this.prisma.omnidotsProviderConnection.update({
        where: { id: connection.id },
        data: {
          status: MonitoringProviderConnectionStatus.error,
          lastValidatedAt: new Date(),
          lastError: safeMessage,
        },
      });
      await this.failMonitoringJob(job.id, safeMessage);

      throw new ServiceUnavailableException('Omnidots token validation failed');
    }
  }

  async syncMeasuringPoints(organisationId: string, connectionId: string, userId: string) {
    await this.assertRole(organisationId, userId, ['owner', 'admin']);
    const connection = await this.findStoredConnectionForOrganisation(organisationId, connectionId);

    const job = await this.createMonitoringJob({
      connectionId: connection.id,
      organisationId,
      jobType: MonitoringImportJobType.sync_measuring_points,
      requestParams: {
        endpoint: 'list_measuring_points',
      },
    });

    let token: string | null = null;

    try {
      token = this.omnidotsCredentialsService.decryptToken(connection.encryptedCredentials);
      const measuringPoints = await this.omnidotsClient.listMeasuringPoints(token);
      const existingPoints = await this.prisma.omnidotsMeasuringPoint.findMany({
        where: { connectionId: connection.id },
        select: {
          externalMeasuringPointId: true,
        },
      });
      const existingPointIds = new Set(
        existingPoints.map((measuringPoint) => measuringPoint.externalMeasuringPointId),
      );

      let createdCount = 0;
      let updatedCount = 0;

      for (const measuringPoint of measuringPoints) {
        const externalMeasuringPointId = String(measuringPoint.id);
        if (existingPointIds.has(externalMeasuringPointId)) {
          updatedCount += 1;
        } else {
          createdCount += 1;
          existingPointIds.add(externalMeasuringPointId);
        }

        await this.prisma.omnidotsMeasuringPoint.upsert({
          where: {
            connectionId_externalMeasuringPointId: {
              connectionId: connection.id,
              externalMeasuringPointId,
            },
          },
          create: buildMeasuringPointUpsertData(connection.id, measuringPoint),
          update: buildMeasuringPointUpdateData(measuringPoint),
        });
      }

      const updatedConnection = await this.prisma.omnidotsProviderConnection.update({
        where: { id: connection.id },
        data: {
          status: MonitoringProviderConnectionStatus.active,
          lastSyncAt: new Date(),
          lastError: null,
        },
        select: omnidotsConnectionSummarySelect,
      });

      await this.completeMonitoringJob(job.id, {
        totalCount: measuringPoints.length,
        createdCount,
        updatedCount,
      });

      return {
        connection: serializeConnection(updatedConnection),
        sync: {
          status: 'completed' as const,
          totalCount: measuringPoints.length,
          createdCount,
          updatedCount,
        },
      };
    } catch (error) {
      const safeMessage = buildOmnidotsSafeErrorMessage(error, [token]);

      if (isOmnidotsInvalidTokenError(error)) {
        const invalidConnection = await this.prisma.omnidotsProviderConnection.update({
          where: { id: connection.id },
          data: {
            status: MonitoringProviderConnectionStatus.invalid,
            lastError: safeMessage,
          },
          select: omnidotsConnectionSummarySelect,
        });
        await this.failMonitoringJob(job.id, safeMessage);

        return {
          connection: serializeConnection(invalidConnection),
          sync: {
            status: 'invalid' as const,
            totalCount: 0,
            createdCount: 0,
            updatedCount: 0,
            errorMessage: safeMessage,
          },
        };
      }

      await this.prisma.omnidotsProviderConnection.update({
        where: { id: connection.id },
        data: {
          status: MonitoringProviderConnectionStatus.error,
          lastError: safeMessage,
        },
      });
      await this.failMonitoringJob(job.id, safeMessage);

      throw new ServiceUnavailableException('Omnidots measuring point sync failed');
    }
  }

  async importPeakRecords(args: OmnidotsImportRecordsArgs) {
    return this.importMetricRecords(args, {
      jobType: MonitoringImportJobType.import_peak_records,
      metricKey: 'vtop',
      metricLabel: 'Peak particle velocity (Vtop)',
      unit: 'mm/s',
      axisMode: 'xyz',
      sourceEndpoint: OMNIDOTS_GET_PEAK_RECORDS_PATH,
      fetchRecords: (token, measuringPointId, startTimeMs, endTimeMs) =>
        this.omnidotsClient.getPeakRecords(token, measuringPointId, startTimeMs, endTimeMs),
      normalizeRecord: normalizePeakRecord,
    });
  }

  async importVdvRecords(args: OmnidotsImportRecordsArgs) {
    return this.importMetricRecords(args, {
      jobType: MonitoringImportJobType.import_vdv_records,
      metricKey: 'vdv',
      metricLabel: 'Vibration dose value',
      unit: 'm/s^1.75',
      axisMode: 'xyz',
      sourceEndpoint: OMNIDOTS_GET_VDV_RECORDS_PATH,
      fetchRecords: (token, measuringPointId, startTimeMs, endTimeMs) =>
        this.omnidotsClient.getVdvRecords(token, measuringPointId, startTimeMs, endTimeMs),
      normalizeRecord: normalizeVdvRecord,
    });
  }

  async importVeffRecords(args: OmnidotsImportRecordsArgs) {
    return this.importMetricRecords(args, {
      jobType: MonitoringImportJobType.import_veff_records,
      metricKey: 'veff_max',
      metricLabel: 'Maximum Veff',
      unit: 'mm/s',
      axisMode: 'xyz',
      sourceEndpoint: OMNIDOTS_GET_VEFF_RECORDS_PATH,
      fetchRecords: (token, measuringPointId, startTimeMs, endTimeMs) =>
        this.omnidotsClient.getVeffRecords(token, measuringPointId, startTimeMs, endTimeMs),
      normalizeRecord: normalizeVeffRecord,
    });
  }

  async buildReportDatasetSnapshot(args: OmnidotsDatasetBuildArgs) {
    const metricKeys = Array.from(
      new Set(args.selectedMetricKeys.map((metricKey) => metricKey.trim()).filter(Boolean)),
    );

    if (metricKeys.length === 0) {
      throw new BadRequestException('At least one monitoring metric must be selected');
    }

    assertDateRange(args.dateFrom, args.dateTo);

    const connection = await this.findStoredConnectionById(args.connectionId);
    const report = await this.prisma.projectEnvironmentalMonitoringReport.findFirst({
      where: {
        id: args.monitoringReportId,
        reportType: 'vibration_monitoring',
        project: {
          organisationId: connection.organisationId,
        },
      },
      select: {
        id: true,
        projectId: true,
        reportType: true,
        title: true,
        project: {
          select: {
            id: true,
            organisationId: true,
          },
        },
        selectedCriteria: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            selectionPurpose: true,
            isEnforceableOnThisProject: true,
            projectConditionReference: true,
            selectionNote: true,
            criterionRow: {
              select: {
                id: true,
                rowKey: true,
                label: true,
                basisType: true,
                unit: true,
                sourceClause: true,
                criterionValue: true,
                maximumValue: true,
                alertValue: true,
                stopWorkValue: true,
                absoluteMaxValue: true,
                criterionGroup: {
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                    criterionCategory: true,
                    metric: true,
                    standardSource: {
                      select: {
                        id: true,
                        shortName: true,
                        name: true,
                        publisher: true,
                        sourceCitation: true,
                        sourceUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Environmental monitoring report not found');
    }

    const measuringPoint = await this.prisma.omnidotsMeasuringPoint.findFirst({
      where: {
        id: args.measuringPointId,
        connectionId: args.connectionId,
      },
    });

    if (!measuringPoint) {
      throw new NotFoundException('Omnidots measuring point not found');
    }

    const job = await this.createMonitoringJob({
      connectionId: connection.id,
      organisationId: connection.organisationId,
      jobType: MonitoringImportJobType.build_report_dataset,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      requestParams: {
        monitoringReportId: args.monitoringReportId,
        measuringPointId: args.measuringPointId,
        selectedMetricKeys: metricKeys,
      },
    });

    try {
      const series = await this.prisma.monitoringSeries.findMany({
        where: {
          organisationId: connection.organisationId,
          measuringPointId: measuringPoint.id,
          metricKey: {
            in: metricKeys,
          },
        },
        orderBy: [{ metricKey: 'asc' }, { createdAt: 'asc' }],
      });

      const seriesByMetricKey = new Map(series.map((row) => [row.metricKey, row]));
      const samples = series.length
        ? await this.prisma.monitoringSample.findMany({
            where: {
              seriesId: {
                in: series.map((row) => row.id),
              },
              sampledAt: {
                gte: args.dateFrom,
                lte: args.dateTo,
              },
            },
            orderBy: [{ sampledAt: 'asc' }, { createdAt: 'asc' }],
          })
        : [];

      const metricSummaries = metricKeys.map((metricKey) => {
        const seriesRow = seriesByMetricKey.get(metricKey) ?? null;
        const seriesSamples = seriesRow
          ? samples.filter((sample) => sample.seriesId === seriesRow.id)
          : [];

        return {
          metricKey,
          metricLabel: seriesRow?.metricLabel ?? defaultMetricLabel(metricKey),
          unit: seriesRow?.unit ?? null,
          axisMode: seriesRow?.axisMode ?? null,
          sourceEndpoint: seriesRow?.sourceEndpoint ?? null,
          sampleCount: seriesSamples.length,
          firstSampleAt: seriesSamples[0]?.sampledAt.toISOString() ?? null,
          lastSampleAt: seriesSamples[seriesSamples.length - 1]?.sampledAt.toISOString() ?? null,
          maxima: summarizeMetricSamples(seriesSamples),
          samples: seriesSamples.map((sample) => ({
            sampledAt: sample.sampledAt.toISOString(),
            sourceTimezone: sample.sourceTimezone,
            xValue: sample.xValue,
            yValue: sample.yValue,
            zValue: sample.zValue,
            pvsValue: sample.pvsValue,
            fdomX: sample.fdomX,
            fdomY: sample.fdomY,
            fdomZ: sample.fdomZ,
            category: sample.category,
            guideLine: sample.guideLine,
            measuringType: sample.measuringType,
            vibrationType: sample.vibrationType,
          })),
        };
      });

      const snapshotJson = {
        providerKey: connection.providerKey,
        providerDisplayName: connection.displayName,
        sourceType: 'omnidots_api',
        report: {
          id: report.id,
          projectId: report.projectId,
          reportType: report.reportType,
          title: report.title,
        },
        connection: {
          id: connection.id,
          displayName: connection.displayName,
          status: connection.status,
        },
        measuringPoint: serializeMeasuringPointSnapshot(measuringPoint),
        dateRange: {
          dateFrom: args.dateFrom.toISOString(),
          dateTo: args.dateTo.toISOString(),
          timezone: measuringPoint.timezone ?? 'UTC',
        },
        selectedMetricKeys: metricKeys,
        criteriaReferences: report.selectedCriteria.map((selection) => ({
          id: selection.id,
          selectionPurpose: selection.selectionPurpose,
          isEnforceableOnThisProject: selection.isEnforceableOnThisProject,
          projectConditionReference: selection.projectConditionReference,
          selectionNote: selection.selectionNote,
          criterionRow: {
            id: selection.criterionRow.id,
            rowKey: selection.criterionRow.rowKey,
            label: selection.criterionRow.label,
            basisType: selection.criterionRow.basisType,
            unit: selection.criterionRow.unit,
            sourceClause: selection.criterionRow.sourceClause,
            criterionValue: serializeDecimal(selection.criterionRow.criterionValue),
            maximumValue: serializeDecimal(selection.criterionRow.maximumValue),
            alertValue: serializeDecimal(selection.criterionRow.alertValue),
            stopWorkValue: serializeDecimal(selection.criterionRow.stopWorkValue),
            absoluteMaxValue: serializeDecimal(selection.criterionRow.absoluteMaxValue),
            group: {
              id: selection.criterionRow.criterionGroup.id,
              slug: selection.criterionRow.criterionGroup.slug,
              title: selection.criterionRow.criterionGroup.title,
              criterionCategory: selection.criterionRow.criterionGroup.criterionCategory,
              metric: selection.criterionRow.criterionGroup.metric,
            },
            source: selection.criterionRow.criterionGroup.standardSource,
          },
        })),
        metrics: metricSummaries,
      };

      const datasetHash = this.snapshotService.computeHash(snapshotJson);
      const existingDataset = await this.prisma.projectEnvironmentalMonitoringDataset.findUnique({
        where: {
          monitoringReportId_datasetHash: {
            monitoringReportId: args.monitoringReportId,
            datasetHash,
          },
        },
        select: monitoringDatasetSelect,
      });

      if (existingDataset) {
        await this.completeMonitoringJob(job.id, {
          created: false,
          datasetId: existingDataset.id,
          datasetHash,
          metricCount: metricSummaries.length,
          sampleCount: samples.length,
        });

        return {
          created: false,
          dataset: existingDataset,
        };
      }

      const dataset = await this.prisma.projectEnvironmentalMonitoringDataset.create({
        data: {
          monitoringReportId: args.monitoringReportId,
          sourceType: 'omnidots_api',
          connectionId: args.connectionId,
          measuringPointId: args.measuringPointId,
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          timezone: measuringPoint.timezone ?? 'UTC',
          datasetHash,
          snapshotJson: toJson(snapshotJson),
        },
        select: monitoringDatasetSelect,
      });

      await this.completeMonitoringJob(job.id, {
        created: true,
        datasetId: dataset.id,
        datasetHash,
        metricCount: metricSummaries.length,
        sampleCount: samples.length,
      });

      return {
        created: true,
        dataset,
      };
    } catch (error) {
      await this.failMonitoringJob(job.id, buildOmnidotsSafeErrorMessage(error));
      throw new ServiceUnavailableException('Environmental monitoring dataset build failed');
    }
  }

  private async importMetricRecords<TRecord>(
    args: OmnidotsImportRecordsArgs,
    metric: MonitoringMetricDefinition<TRecord>,
  ) {
    assertDateRange(args.dateFrom, args.dateTo);

    const connection = await this.findStoredConnectionById(args.connectionId);
    const measuringPoint = await this.findMeasuringPointForImport(connection.id, args);
    const series = await this.prisma.monitoringSeries.upsert({
      where: {
        measuringPointId_metricKey_sourceEndpoint: {
          measuringPointId: measuringPoint.id,
          metricKey: metric.metricKey,
          sourceEndpoint: metric.sourceEndpoint,
        },
      },
      create: {
        organisationId: connection.organisationId,
        measuringPointId: measuringPoint.id,
        metricKey: metric.metricKey,
        metricLabel: metric.metricLabel,
        unit: metric.unit,
        axisMode: metric.axisMode,
        sourceEndpoint: metric.sourceEndpoint,
      },
      update: {
        organisationId: connection.organisationId,
        metricLabel: metric.metricLabel,
        unit: metric.unit,
        axisMode: metric.axisMode,
      },
    });

    const job = await this.createMonitoringJob({
      connectionId: connection.id,
      organisationId: connection.organisationId,
      jobType: metric.jobType,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      requestParams: {
        metricKey: metric.metricKey,
        localMeasuringPointId: measuringPoint.id,
        externalMeasuringPointId: measuringPoint.externalMeasuringPointId,
        sourceEndpoint: metric.sourceEndpoint,
      },
    });

    let token: string | null = null;

    try {
      token = this.omnidotsCredentialsService.decryptToken(connection.encryptedCredentials);
      const existingSamples = await this.prisma.monitoringSample.findMany({
        where: {
          seriesId: series.id,
          sampledAt: {
            gte: args.dateFrom,
            ...(args.dateTo ? { lte: args.dateTo } : {}),
          },
        },
        select: {
          sampledAt: true,
        },
      });
      const existingSampleKeys = new Set(
        existingSamples.map((sample) => sample.sampledAt.toISOString()),
      );
      const records = await metric.fetchRecords(
        token,
        measuringPoint.externalMeasuringPointId,
        args.dateFrom.getTime(),
        args.dateTo?.getTime(),
      );

      let createdCount = 0;
      let updatedCount = 0;

      for (const record of records) {
        const sample = metric.normalizeRecord(record, measuringPoint);
        const sampleKey = sample.sampledAt.toISOString();

        if (existingSampleKeys.has(sampleKey)) {
          updatedCount += 1;
        } else {
          createdCount += 1;
          existingSampleKeys.add(sampleKey);
        }

        await this.prisma.monitoringSample.upsert({
          where: {
            seriesId_sampledAt: {
              seriesId: series.id,
              sampledAt: sample.sampledAt,
            },
          },
          create: {
            seriesId: series.id,
            measuringPointId: measuringPoint.id,
            sampledAt: sample.sampledAt,
            sourceTimezone: measuringPoint.timezone,
            metricKey: metric.metricKey,
            xValue: sample.xValue,
            yValue: sample.yValue,
            zValue: sample.zValue,
            pvsValue: sample.pvsValue,
            fdomX: sample.fdomX,
            fdomY: sample.fdomY,
            fdomZ: sample.fdomZ,
            category: sample.category,
            guideLine: sample.guideLine,
            measuringType: sample.measuringType,
            vibrationType: sample.vibrationType,
            rawPayloadJson: sample.rawPayloadJson,
          },
          update: {
            sourceTimezone: measuringPoint.timezone,
            metricKey: metric.metricKey,
            xValue: sample.xValue,
            yValue: sample.yValue,
            zValue: sample.zValue,
            pvsValue: sample.pvsValue,
            fdomX: sample.fdomX,
            fdomY: sample.fdomY,
            fdomZ: sample.fdomZ,
            category: sample.category,
            guideLine: sample.guideLine,
            measuringType: sample.measuringType,
            vibrationType: sample.vibrationType,
            rawPayloadJson: sample.rawPayloadJson,
          },
        });
      }

      await this.prisma.omnidotsProviderConnection.update({
        where: { id: connection.id },
        data: {
          status: MonitoringProviderConnectionStatus.active,
          lastSyncAt: new Date(),
          lastError: null,
        },
      });
      await this.completeMonitoringJob(job.id, {
        metricKey: metric.metricKey,
        processedCount: records.length,
        createdCount,
        updatedCount,
        seriesId: series.id,
      });

      return {
        status: 'completed' as const,
        metricKey: metric.metricKey,
        seriesId: series.id,
        processedCount: records.length,
        createdCount,
        updatedCount,
        jobId: job.id,
      };
    } catch (error) {
      const safeMessage = buildOmnidotsSafeErrorMessage(error, [token]);

      if (isOmnidotsInvalidTokenError(error)) {
        await this.prisma.omnidotsProviderConnection.update({
          where: { id: connection.id },
          data: {
            status: MonitoringProviderConnectionStatus.invalid,
            lastError: safeMessage,
          },
        });
        await this.failMonitoringJob(job.id, safeMessage);

        return {
          status: 'invalid' as const,
          metricKey: metric.metricKey,
          processedCount: 0,
          createdCount: 0,
          updatedCount: 0,
          jobId: job.id,
          errorMessage: safeMessage,
        };
      }

      await this.prisma.omnidotsProviderConnection.update({
        where: { id: connection.id },
        data: {
          status: MonitoringProviderConnectionStatus.error,
          lastError: safeMessage,
        },
      });
      await this.failMonitoringJob(job.id, safeMessage);

      throw new ServiceUnavailableException(`Omnidots ${metric.metricKey} import failed`);
    }
  }

  private async createMonitoringJob(args: {
    connectionId: string;
    organisationId: string;
    jobType: MonitoringImportJobType;
    dateFrom?: Date;
    dateTo?: Date;
    requestParams?: Record<string, unknown>;
  }) {
    return this.prisma.monitoringImportJob.create({
      data: {
        connectionId: args.connectionId,
        organisationId: args.organisationId,
        jobType: args.jobType,
        status: 'running',
        dateFrom: args.dateFrom,
        dateTo: args.dateTo,
        requestParamsJson: args.requestParams ? toJson(args.requestParams) : undefined,
      },
      select: {
        id: true,
      },
    });
  }

  private async completeMonitoringJob(jobId: string, resultSummary: Record<string, unknown>) {
    await this.prisma.monitoringImportJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        resultSummaryJson: toJson(resultSummary),
        errorMessage: null,
        completedAt: new Date(),
      },
    });
  }

  private async failMonitoringJob(jobId: string, errorMessage: string) {
    await this.prisma.monitoringImportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  private async assertMembership(organisationId: string, userId: string) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: {
          organisationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Organisation not found');
    }

    return membership;
  }

  private async assertRole(organisationId: string, userId: string, allowedRoles: string[]) {
    const membership = await this.assertMembership(organisationId, userId);

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to manage Omnidots connections');
    }

    return membership;
  }

  private async findConnectionSummaryForOrganisation(organisationId: string, connectionId: string) {
    const connection = await this.prisma.omnidotsProviderConnection.findFirst({
      where: {
        id: connectionId,
        organisationId,
      },
      select: omnidotsConnectionSummarySelect,
    });

    if (!connection) {
      throw new NotFoundException('Omnidots connection not found');
    }

    return connection;
  }

  private async findStoredConnectionForOrganisation(organisationId: string, connectionId: string) {
    const connection = await this.prisma.omnidotsProviderConnection.findFirst({
      where: {
        id: connectionId,
        organisationId,
      },
      select: omnidotsConnectionWithCredentialsSelect,
    });

    if (!connection) {
      throw new NotFoundException('Omnidots connection not found');
    }

    return connection;
  }

  private async findStoredConnectionById(connectionId: string) {
    const connection = await this.prisma.omnidotsProviderConnection.findUnique({
      where: {
        id: connectionId,
      },
      select: omnidotsConnectionWithCredentialsSelect,
    });

    if (!connection) {
      throw new NotFoundException('Omnidots connection not found');
    }

    return connection;
  }

  private async findMeasuringPointForImport(
    connectionId: string,
    args: OmnidotsImportRecordsArgs,
  ): Promise<OmnidotsMeasuringPoint> {
    if (args.localMeasuringPointId) {
      const measuringPoint = await this.prisma.omnidotsMeasuringPoint.findFirst({
        where: {
          id: args.localMeasuringPointId,
          connectionId,
        },
      });

      if (!measuringPoint) {
        throw new NotFoundException('Omnidots measuring point not found');
      }

      return measuringPoint;
    }

    if (args.externalMeasuringPointId) {
      const measuringPoint = await this.prisma.omnidotsMeasuringPoint.findUnique({
        where: {
          connectionId_externalMeasuringPointId: {
            connectionId,
            externalMeasuringPointId: args.externalMeasuringPointId,
          },
        },
      });

      if (!measuringPoint) {
        throw new NotFoundException('Omnidots measuring point not found');
      }

      return measuringPoint;
    }

    throw new BadRequestException(
      'A local measuring point id or external measuring point id is required',
    );
  }
}

function buildMeasuringPointUpsertData(
  connectionId: string,
  measuringPoint: OmnidotsMeasuringPointResponseItem,
): Prisma.OmnidotsMeasuringPointUncheckedCreateInput {
  return {
    connectionId,
    externalMeasuringPointId: String(measuringPoint.id),
    name: measuringPoint.name,
    active: measuringPoint.active,
    timezone: measuringPoint.timezone ?? null,
    guideLine: measuringPoint.guide_line ?? null,
    category: measuringPoint.category ?? null,
    measuringType: measuringPoint.measuring_type ?? null,
    vibrationType: measuringPoint.vibration_type ?? null,
    userLatitude: measuringPoint.user_location?.latitude ?? null,
    userLongitude: measuringPoint.user_location?.longitude ?? null,
    sensorName: measuringPoint.sensor?.name ?? null,
    sensorOnline: measuringPoint.sensor?.online ?? null,
    sensorLastseenAt: parseDateOrNull(measuringPoint.sensor?.lastseen),
    sensorConnectedUsing: measuringPoint.sensor?.connected_using ?? null,
    sensorBatteryCharge: measuringPoint.sensor?.battery_charge ?? null,
    sensorLatitude: measuringPoint.sensor?.location?.latitude ?? null,
    sensorLongitude: measuringPoint.sensor?.location?.longitude ?? null,
    deepLinkUrl: extractDeepLinkUrl(measuringPoint),
    rawPayloadJson: toJson(measuringPoint),
  };
}

function buildMeasuringPointUpdateData(
  measuringPoint: OmnidotsMeasuringPointResponseItem,
): Prisma.OmnidotsMeasuringPointUncheckedUpdateInput {
  return {
    name: measuringPoint.name,
    active: measuringPoint.active,
    timezone: measuringPoint.timezone ?? null,
    guideLine: measuringPoint.guide_line ?? null,
    category: measuringPoint.category ?? null,
    measuringType: measuringPoint.measuring_type ?? null,
    vibrationType: measuringPoint.vibration_type ?? null,
    userLatitude: measuringPoint.user_location?.latitude ?? null,
    userLongitude: measuringPoint.user_location?.longitude ?? null,
    sensorName: measuringPoint.sensor?.name ?? null,
    sensorOnline: measuringPoint.sensor?.online ?? null,
    sensorLastseenAt: parseDateOrNull(measuringPoint.sensor?.lastseen),
    sensorConnectedUsing: measuringPoint.sensor?.connected_using ?? null,
    sensorBatteryCharge: measuringPoint.sensor?.battery_charge ?? null,
    sensorLatitude: measuringPoint.sensor?.location?.latitude ?? null,
    sensorLongitude: measuringPoint.sensor?.location?.longitude ?? null,
    deepLinkUrl: extractDeepLinkUrl(measuringPoint),
    rawPayloadJson: toJson(measuringPoint),
  };
}

function normalizePeakRecord(
  record: OmnidotsPeakRecordResponseItem,
  measuringPoint: OmnidotsMeasuringPoint,
): NormalizedMonitoringSample {
  return {
    sampledAt: new Date(record.timestamp),
    xValue: record.x?.Vtop ?? null,
    yValue: record.y?.Vtop ?? null,
    zValue: record.z?.Vtop ?? null,
    pvsValue: null,
    fdomX: record.x?.Fdom ?? null,
    fdomY: record.y?.Fdom ?? null,
    fdomZ: record.z?.Fdom ?? null,
    category: record.category ?? measuringPoint.category,
    guideLine: record.guide_line ?? measuringPoint.guideLine,
    measuringType: record.measuring_type ?? measuringPoint.measuringType,
    vibrationType: record.vibration_type ?? measuringPoint.vibrationType,
    rawPayloadJson: toJson(record),
  };
}

function normalizeVdvRecord(
  record: OmnidotsVdvRecordResponseItem,
  measuringPoint: OmnidotsMeasuringPoint,
): NormalizedMonitoringSample {
  return {
    sampledAt: new Date(record.timestamp),
    xValue: record.x ?? null,
    yValue: record.y ?? null,
    zValue: record.z ?? null,
    pvsValue: null,
    fdomX: null,
    fdomY: null,
    fdomZ: null,
    category: measuringPoint.category,
    guideLine: measuringPoint.guideLine,
    measuringType: measuringPoint.measuringType,
    vibrationType: measuringPoint.vibrationType,
    rawPayloadJson: toJson(record),
  };
}

function normalizeVeffRecord(
  record: OmnidotsVeffRecordResponseItem,
  measuringPoint: OmnidotsMeasuringPoint,
): NormalizedMonitoringSample {
  return {
    sampledAt: new Date(record.timestamp),
    xValue: record.x ?? null,
    yValue: record.y ?? null,
    zValue: record.z ?? null,
    pvsValue: null,
    fdomX: null,
    fdomY: null,
    fdomZ: null,
    category: measuringPoint.category,
    guideLine: measuringPoint.guideLine,
    measuringType: measuringPoint.measuringType,
    vibrationType: measuringPoint.vibrationType,
    rawPayloadJson: toJson(record),
  };
}

function serializeConnection(connection: OmnidotsConnectionSummary) {
  return {
    ...connection,
    hasStoredToken: true,
  };
}

function parseDateOrNull(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractDeepLinkUrl(measuringPoint: OmnidotsMeasuringPointResponseItem) {
  const payload = measuringPoint as Record<string, unknown>;

  const directValue =
    typeof payload['deep_link_url'] === 'string'
      ? payload['deep_link_url']
      : typeof payload['deep_link'] === 'string'
        ? payload['deep_link']
        : typeof payload['url'] === 'string'
          ? payload['url']
          : null;

  return directValue?.trim() || null;
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function assertDateRange(dateFrom: Date, dateTo?: Date) {
  if (Number.isNaN(dateFrom.getTime())) {
    throw new BadRequestException('dateFrom must be a valid date');
  }

  if (dateTo && Number.isNaN(dateTo.getTime())) {
    throw new BadRequestException('dateTo must be a valid date');
  }

  if (dateTo && dateTo.getTime() < dateFrom.getTime()) {
    throw new BadRequestException('dateTo must be greater than or equal to dateFrom');
  }
}

function serializeMeasuringPointSnapshot(measuringPoint: OmnidotsMeasuringPoint) {
  return {
    id: measuringPoint.id,
    externalMeasuringPointId: measuringPoint.externalMeasuringPointId,
    name: measuringPoint.name,
    active: measuringPoint.active,
    timezone: measuringPoint.timezone,
    guideLine: measuringPoint.guideLine,
    category: measuringPoint.category,
    measuringType: measuringPoint.measuringType,
    vibrationType: measuringPoint.vibrationType,
    userLatitude: measuringPoint.userLatitude,
    userLongitude: measuringPoint.userLongitude,
    sensorName: measuringPoint.sensorName,
    sensorOnline: measuringPoint.sensorOnline,
    sensorLastseenAt: measuringPoint.sensorLastseenAt?.toISOString() ?? null,
    sensorConnectedUsing: measuringPoint.sensorConnectedUsing,
    sensorBatteryCharge: measuringPoint.sensorBatteryCharge,
    sensorLatitude: measuringPoint.sensorLatitude,
    sensorLongitude: measuringPoint.sensorLongitude,
    deepLinkUrl: measuringPoint.deepLinkUrl,
  };
}

function serializeDecimal(value: Prisma.Decimal | null) {
  return value === null ? null : value.toString();
}

function summarizeMetricSamples(
  samples: Array<{
    xValue: number | null;
    yValue: number | null;
    zValue: number | null;
    pvsValue: number | null;
    fdomX: number | null;
    fdomY: number | null;
    fdomZ: number | null;
  }>,
) {
  return {
    xValue: maxNullable(samples.map((sample) => sample.xValue)),
    yValue: maxNullable(samples.map((sample) => sample.yValue)),
    zValue: maxNullable(samples.map((sample) => sample.zValue)),
    pvsValue: maxNullable(samples.map((sample) => sample.pvsValue)),
    fdomX: maxNullable(samples.map((sample) => sample.fdomX)),
    fdomY: maxNullable(samples.map((sample) => sample.fdomY)),
    fdomZ: maxNullable(samples.map((sample) => sample.fdomZ)),
  };
}

function maxNullable(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null);
  return filtered.length ? Math.max(...filtered) : null;
}

function defaultMetricLabel(metricKey: string) {
  switch (metricKey) {
    case 'vtop':
      return 'Peak particle velocity (Vtop)';
    case 'vdv':
      return 'Vibration dose value';
    case 'veff_max':
      return 'Maximum Veff';
    default:
      return metricKey;
  }
}
