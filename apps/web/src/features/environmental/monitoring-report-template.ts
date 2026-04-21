import type { Project } from '@eng/shared';
import {
  createGenericTemplateDetailRows,
  createGenericTemplateDocument,
  type GenericTemplateDocument,
  type GenericTemplateObject,
} from '@/features/templates/core/generic-template-document';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import {
  ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS,
  type MonitoringPackageProjectIdentitySnapshot,
  type ProjectEnvironmentalMonitoringReport,
  type ProjectEnvironmentalMonitoringReportRecord,
} from './environmental-monitoring-types';
import { BUILT_IN_MONITORING_REPORT_TEMPLATE_ID } from './monitoring-annexure-templates';

const BUILT_IN_MONITORING_REPORT_TEMPLATE_UPDATED_AT = '2026-04-17T08:30:00.000Z';

export function createMonitoringReportSummaryTemplate(args: {
  project?: Project;
  projectIdentity?: MonitoringPackageProjectIdentitySnapshot;
  report: ProjectEnvironmentalMonitoringReport | ProjectEnvironmentalMonitoringReportRecord;
}): GenericTemplateDocument {
  const { report } = args;
  const projectIdentity = resolveMonitoringSummaryProjectIdentity(args);
  const reportTypeLabel = labelForReportType(report.reportType);
  const resultCount =
    report.reportType === 'noise_monitoring'
      ? report.noiseResults.length
      : report.vibrationResults.length;
  const summaryBody = [
    report.executiveSummary?.trim(),
    report.conclusion?.trim() ? `Conclusion: ${report.conclusion.trim()}` : null,
    report.recommendationsSummary?.trim()
      ? `Recommendations: ${report.recommendationsSummary.trim()}`
      : null,
    !report.executiveSummary?.trim() &&
    !report.conclusion?.trim() &&
    !report.recommendationsSummary?.trim()
      ? 'Use the monitoring workspace to author the executive summary, conclusions, and recommendations that should appear in the issued report package.'
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n\n');

  const detailRows = createGenericTemplateDetailRows([
    { label: 'Document', value: reportTypeLabel },
    { label: 'Status', value: report.documentStatus?.trim() || 'Draft' },
    {
      label: 'Issue Date',
      value: formatDate(report.issueDate) || 'Not set',
    },
    {
      label: 'Monitoring Date',
      value: formatDate(report.monitoringDate) || 'Not set',
    },
    { label: 'Client', value: projectIdentity.client },
    {
      label: 'Scope',
      value: `${report.locations.length} locations · ${report.selectedCriteria.length} criteria · ${resultCount} results`,
    },
  ]);

  const template = createGenericTemplateDocument({
    name: `${displayReportTitle(report)} Summary`,
    orientation: 'portrait',
    paperSize: 'a4',
    presetId: 'as1100_inspired',
  });

  return {
    ...template,
    createdAt: BUILT_IN_MONITORING_REPORT_TEMPLATE_UPDATED_AT,
    id: BUILT_IN_MONITORING_REPORT_TEMPLATE_ID,
    updatedAt: BUILT_IN_MONITORING_REPORT_TEMPLATE_UPDATED_AT,
    objects: template.objects.map((object) =>
      bindMonitoringSummaryObject({
        object,
        projectIdentity,
        report,
        reportTypeLabel,
        summaryBody,
        detailRows,
      }),
    ),
  };
}

function resolveMonitoringSummaryProjectIdentity(args: {
  project?: Project;
  projectIdentity?: MonitoringPackageProjectIdentitySnapshot;
}) {
  if (args.projectIdentity) {
    return args.projectIdentity;
  }

  if (!args.project) {
    return {
      projectNumber: 'Not set',
      projectName: 'Untitled Project',
      client: 'Not set',
      address: 'Not set',
    };
  }

  const projectSpecifics = extractProjectSpecifics(args.project);
  return {
    projectNumber: projectSpecifics.identity.projectNumber || args.project.code || 'Not set',
    projectName: projectSpecifics.identity.projectName || args.project.name || 'Untitled Project',
    client: projectSpecifics.identity.client || 'Not set',
    address: projectSpecifics.identity.address || 'Not set',
  };
}

function bindMonitoringSummaryObject(args: {
  detailRows: ReturnType<typeof createGenericTemplateDetailRows>;
  object: GenericTemplateObject;
  projectIdentity: {
    address: string;
    client: string;
    projectName: string;
    projectNumber: string;
  };
  report: ProjectEnvironmentalMonitoringReport | ProjectEnvironmentalMonitoringReportRecord;
  reportTypeLabel: string;
  summaryBody: string;
}): GenericTemplateObject {
  const { detailRows, object, projectIdentity, report, reportTypeLabel, summaryBody } = args;

  if (object.type === 'titleBlock') {
    return {
      ...object,
      checkedBy: report.checkedBy ?? '',
      generatedAtLabel:
        formatDate(report.issueDate) ||
        formatDate(report.updatedAt) ||
        formatDate(report.createdAt) ||
        '',
      preparedBy: report.preparedBy ?? '',
      projectAddress: projectIdentity.address,
      projectCode: projectIdentity.projectNumber,
      projectName: projectIdentity.projectName,
      revision: report.revision ?? '',
      sheetNumber: '001',
      subtitle: reportTypeLabel,
      title: displayReportTitle(report),
    };
  }

  if (object.type === 'detailsBlock') {
    return {
      ...object,
      width: object.width + 18,
      x: Math.max(0, object.x - 18),
      rows: detailRows,
      title: 'Report Snapshot',
    };
  }

  if (object.type === 'textBlock') {
    return {
      ...object,
      width: Math.max(54, object.width - 18),
      body: summaryBody,
      title: 'Executive Summary',
    };
  }

  if (object.type === 'imageFrame') {
    return {
      ...object,
      visible: false,
    };
  }

  return object;
}

function labelForReportType(
  value:
    | ProjectEnvironmentalMonitoringReport['reportType']
    | ProjectEnvironmentalMonitoringReportRecord['reportType'],
) {
  return (
    ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    value.replace(/_/g, ' ')
  );
}

function displayReportTitle(
  report: ProjectEnvironmentalMonitoringReport | ProjectEnvironmentalMonitoringReportRecord,
) {
  return report.title?.trim() ? report.title.trim() : labelForReportType(report.reportType);
}

function formatDate(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString();
}
