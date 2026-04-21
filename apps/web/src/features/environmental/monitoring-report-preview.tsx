'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Eye, Printer } from 'lucide-react';
import type { Project } from '@eng/shared';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SharedSheetRenderer } from '@/features/templates/components/shared-sheet-renderer';
import { buildGenericTemplateSharedSheetRenderModel } from '@/features/templates/adapters/generic-template-render-model';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import { formatSpatialLabel } from '@/features/spatial/project-spatial-utils';
import {
  useEnvironmentalMonitoringReport,
  useEnvironmentalMonitoringReportPackageIssue,
} from '@/hooks/use-environmental-monitoring';
import type {
  MonitoringPackageAnnexureRegisterEntry,
  MonitoringPackageProjectIdentitySnapshot,
  MonitoringReportPackageSnapshot,
  ProjectEnvironmentalMonitoringAnnexure,
  ProjectEnvironmentalMonitoringReport,
  ProjectEnvironmentalMonitoringReportPackageIssue,
  ProjectEnvironmentalMonitoringReportRecord,
} from './environmental-monitoring-types';
import { createMonitoringReportSummaryTemplate } from './monitoring-report-template';
import { MonitoringSpatialAnnexureSheet } from './monitoring-spatial-annexure-sheet';
import { resolveMonitoringSpatialAnnexureTemplateDisplaySpec } from './monitoring-annexure-templates';
import {
  calculateNoiseResultAssessment,
  formatMonitoringComplianceStatusLabel,
  formatMonitoringCriterionApplicabilityLabel,
  formatMonitoringCriterionSourceType,
  resolveNoiseResultMeasuredValueLabel,
  resolveNoiseResultMetricLabel,
} from './monitoring-report-helpers';

type MonitoringReportPreviewProps = {
  projectId: string;
  reportId: string;
  project: Project;
};

export type MonitoringPackageArtifact = {
  mode: 'draft' | 'issue';
  packageSnapshot: MonitoringReportPackageSnapshot;
  report: ProjectEnvironmentalMonitoringReportRecord;
};

export function MonitoringReportPreview({
  projectId,
  reportId,
  project,
}: MonitoringReportPreviewProps) {
  const searchParams = useSearchParams();
  const annexureId = searchParams.get('annexureId')?.trim() ?? '';
  const issueId = searchParams.get('issueId')?.trim() ?? '';
  const liveReportQuery = useEnvironmentalMonitoringReport(projectId, reportId);
  const packageIssueQuery = useEnvironmentalMonitoringReportPackageIssue(
    projectId,
    reportId,
    issueId,
  );

  const isAnnexurePreview = annexureId.length > 0;
  const isIssuePreview = issueId.length > 0;
  const isLoading = isIssuePreview ? packageIssueQuery.isLoading : liveReportQuery.isLoading;

  const artifact = useMemo(() => {
    if (isIssuePreview) {
      if (!packageIssueQuery.data) {
        return null;
      }

      return buildMonitoringPackageArtifactFromIssue(packageIssueQuery.data);
    }

    if (!liveReportQuery.data) {
      return null;
    }

    return buildMonitoringPackageArtifactFromDraft(project, liveReportQuery.data);
  }, [isIssuePreview, liveReportQuery.data, packageIssueQuery.data, project]);

  if (isLoading || !artifact) {
    if (isIssuePreview && packageIssueQuery.error) {
      return (
        <div className="mx-auto max-w-3xl py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to load Report Package Issue</AlertTitle>
            <AlertDescription>
              The frozen package snapshot could not be loaded right now. Return to the live report
              preview and try again.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return <PageLoading />;
  }

  const focusedAnnexure = isAnnexurePreview
    ? (artifact.report.annexures.find((annexure) => annexure.id === annexureId) ?? null)
    : null;
  const focusedAnnexureIndex = focusedAnnexure
    ? artifact.report.annexures.findIndex((annexure) => annexure.id === focusedAnnexure.id)
    : -1;

  if (isAnnexurePreview && !focusedAnnexure) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Report Annexure not found</AlertTitle>
          <AlertDescription>
            That saved Report Annexure could not be found in this report anymore. Return to the
            report editor and choose another sheet to preview.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summaryTemplate = createMonitoringReportSummaryTemplate({
    projectIdentity: artifact.packageSnapshot.projectIdentity,
    report: artifact.report,
  });
  const summaryRenderModel = buildGenericTemplateSharedSheetRenderModel(summaryTemplate);
  const bodySectionCount = 3;
  const registerSectionCount = artifact.report.annexures.length > 0 ? 1 : 0;
  const totalPackageSections = isAnnexurePreview
    ? 1
    : 1 + bodySectionCount + registerSectionCount + artifact.report.annexures.length;
  const focusedAnnexureTemplateSpec = focusedAnnexure
    ? resolveMonitoringSpatialAnnexureTemplateDisplaySpec({
        bindingJson: focusedAnnexure.bindingJson,
        templateReferenceId: focusedAnnexure.templateReferenceId,
        templateSnapshotJson: focusedAnnexure.templateSnapshotJson,
        templateSourceKind: focusedAnnexure.templateSourceKind,
      })
    : null;

  return (
    <div
      className={`report-package-preview mx-auto ${
        isAnnexurePreview ? 'max-w-[1480px]' : 'max-w-[1120px]'
      } print:max-w-none`}
      data-preview-mode={isAnnexurePreview ? 'focused-annexure' : 'package'}
    >
      {isAnnexurePreview && focusedAnnexure ? (
        <FocusedAnnexureToolbar
          artifact={artifact}
          focusedAnnexure={focusedAnnexure}
          focusedAnnexureIndex={focusedAnnexureIndex}
          focusedAnnexureTemplateSpec={focusedAnnexureTemplateSpec}
          isIssuePreview={isIssuePreview}
          projectId={projectId}
          reportId={reportId}
        />
      ) : (
        <div className="mb-6 flex flex-col gap-4 print:hidden">
          <div>
            <Link
              href={`/projects/${projectId}/environmental/monitoring/${reportId}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to editor
            </Link>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  <Eye className="mr-1 h-3 w-3" />
                  {artifact.mode === 'issue' ? 'Issue Preview / Print' : 'Draft Preview / Print'}
                </Badge>
                <Badge variant="outline">{artifact.packageSnapshot.reportTypeLabel}</Badge>
                <Badge variant="outline">{totalPackageSections} package sections</Badge>
                <Badge variant="outline">{artifact.report.annexures.length} Report Annexures</Badge>
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{artifact.packageSnapshot.reportTitle}</h1>
                <p className="text-sm text-muted-foreground">
                  {artifact.packageSnapshot.projectIdentity.projectNumber} ·{' '}
                  {artifact.packageSnapshot.issueLabel}
                  {artifact.packageSnapshot.revision?.trim()
                    ? ` · Revision ${artifact.packageSnapshot.revision.trim()}`
                    : ''}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Preview the issued-style package below, then use Browser Print / PDF. The printed
                output is isolated to the package artifact only.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isIssuePreview ? (
                <Link
                  href={`/projects/${projectId}/environmental/monitoring/${reportId}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Back to editor
                </Link>
              ) : (
                <Link
                  href={`/projects/${projectId}/environmental/monitoring/${reportId}/preview`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Open Draft Preview
                </Link>
              )}
              <Button type="button" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Browser Print / PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      <article className="space-y-6 print:space-y-0">
        {isAnnexurePreview && focusedAnnexure ? (
          <FocusedSheetPage
            printLayout="sheet"
            printOrientation={focusedAnnexureTemplateSpec?.orientation ?? 'landscape'}
            printPaperSize={focusedAnnexureTemplateSpec?.paperSize ?? 'a4'}
          >
            <MonitoringSpatialAnnexureSheet
              annexure={focusedAnnexure}
              annexureCode={annexureCodeFromIndex(focusedAnnexureIndex)}
              project={project}
              projectId={projectId}
              projectIdentityOverride={artifact.packageSnapshot.projectIdentity}
              report={artifact.report}
            />
          </FocusedSheetPage>
        ) : (
          <>
            <PackagePage
              sectionLabel="Summary Sheet"
              printLayout="sheet"
              printOrientation={summaryTemplate.orientation}
              printPaperSize={summaryTemplate.paperSize}
              startOnNewPage={false}
            >
              <PackageIssueStrip artifact={artifact} />
              <div className="mt-5 overflow-hidden rounded-lg border bg-slate-100 p-4 print:rounded-none print:border-0 print:bg-transparent print:p-0">
                <div className="mx-auto w-fit">
                  <SharedSheetRenderer
                    model={summaryRenderModel}
                    previewMode
                    showDesignerChrome={false}
                  />
                </div>
              </div>
            </PackagePage>

            <PackagePage sectionLabel="Report Body · Context">
              <PackageSectionTitle
                title="Project identity and document setup"
                description="Structured monitoring report metadata captured for this package."
              />
              <PackageDefinitionGrid
                items={[
                  ['Project number', artifact.packageSnapshot.projectIdentity.projectNumber],
                  ['Project name', artifact.packageSnapshot.projectIdentity.projectName],
                  ['Client', artifact.packageSnapshot.projectIdentity.client],
                  ['Project address', artifact.packageSnapshot.projectIdentity.address],
                  ['Report title', artifact.packageSnapshot.reportTitle],
                  ['Report type', artifact.packageSnapshot.reportTypeLabel],
                  ['Issue label', artifact.packageSnapshot.issueLabel],
                  ['Revision', artifact.packageSnapshot.revision],
                  ['Document status', artifact.packageSnapshot.documentStatus],
                  ['Issue date', formatDate(artifact.packageSnapshot.issueDate)],
                  ['Prepared by', artifact.packageSnapshot.preparedBy],
                  ['Checked by', artifact.packageSnapshot.checkedBy],
                  ['Approved by', artifact.packageSnapshot.approvedBy],
                ]}
              />

              <PackageSectionTitle
                className="mt-8"
                title="Monitoring event and context"
                description="Live monitoring event details carried into the issued package."
              />
              <PackageDefinitionGrid
                items={[
                  ['Monitoring date', formatDate(artifact.report.monitoringDate)],
                  ['Window start', formatDateTime(artifact.report.monitoringWindowStart)],
                  ['Window end', formatDateTime(artifact.report.monitoringWindowEnd)],
                  ['Weather conditions', artifact.report.weatherConditions],
                  ['Purpose', artifact.report.purpose],
                  ['Site activity summary', artifact.report.siteActivitySummary],
                  ['Executive summary', artifact.report.executiveSummary],
                  ['General observations', artifact.report.generalObservations],
                ]}
              />

              <PackageSectionTitle
                className="mt-8"
                title="Linked references"
                description="Project and AI-document references linked to this monitoring package."
              />
              {artifact.report.references.length === 0 ? (
                <PackageEmptyState>No linked references recorded.</PackageEmptyState>
              ) : (
                <div className="space-y-3">
                  {artifact.report.references.map((reference) => (
                    <PackageInfoCard
                      key={reference.id}
                      title={reference.label || reference.aiDocument?.filename || 'Reference'}
                      rows={[
                        ['Project reference', reference.projectReferenceId],
                        ['AI document', reference.aiDocument?.filename ?? null],
                        ['Note', reference.note],
                      ]}
                    />
                  ))}
                </div>
              )}
            </PackagePage>

            <PackagePage sectionLabel="Report Body · Monitoring">
              <PackageSectionTitle
                title="Monitoring locations"
                description="Receiver-specific locations and assessment context used in the monitoring event."
              />
              {artifact.report.locations.length === 0 ? (
                <PackageEmptyState>No monitoring locations recorded.</PackageEmptyState>
              ) : (
                <div className="mt-4 overflow-hidden rounded-lg border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <PackageTableHeader>Location</PackageTableHeader>
                        <PackageTableHeader>Imported source</PackageTableHeader>
                        <PackageTableHeader>Receiver</PackageTableHeader>
                        <PackageTableHeader>Assessment context</PackageTableHeader>
                        <PackageTableHeader>Coordinates</PackageTableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {artifact.report.locations.map((location) => (
                        <tr key={location.id} className="border-t">
                          <PackageTableCell>
                            <div className="font-medium">{location.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {location.locationDescription?.trim() || 'No description'}
                            </div>
                          </PackageTableCell>
                          <PackageTableCell>
                            {[
                              location.sourceSpatialFeatureType
                                ? formatSpatialLabel(location.sourceSpatialFeatureType)
                                : null,
                              location.sourceSpatialFeatureLabel,
                              location.sourceSpatialViewLabel
                                ? `from ${formatOperatorFacingSheetLabel(location.sourceSpatialViewLabel)}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Manual row'}
                          </PackageTableCell>
                          <PackageTableCell>
                            {location.receiverType
                              ? formatNoiseReceiverType(location.receiverType)
                              : 'Not set'}
                          </PackageTableCell>
                          <PackageTableCell>
                            {[
                              location.distanceNote,
                              location.chainageNote,
                              location.assessmentLocationBasis
                                ? formatSpatialLabel(location.assessmentLocationBasis)
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Not set'}
                          </PackageTableCell>
                          <PackageTableCell>
                            {location.coordinatesNote || 'Not set'}
                          </PackageTableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <PackageSectionTitle
                className="mt-8"
                title="Criteria and reference traceability"
                description="Criteria are shown with source traceability, receiver/category context, work type/time period, and project-specific notes."
              />
              {artifact.report.selectedCriteria.length === 0 ? (
                <PackageEmptyState>No criteria selected on this report.</PackageEmptyState>
              ) : (
                <div className="mt-4 overflow-hidden rounded-lg border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <PackageTableHeader>Criterion</PackageTableHeader>
                        <PackageTableHeader>Source traceability</PackageTableHeader>
                        <PackageTableHeader>Applicability</PackageTableHeader>
                        <PackageTableHeader>Receiver / work / time</PackageTableHeader>
                        <PackageTableHeader>Value / descriptor</PackageTableHeader>
                        <PackageTableHeader>Notes</PackageTableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {artifact.report.selectedCriteria.map((criterion) => (
                        <tr key={criterion.id} className="border-t">
                          <PackageTableCell>
                            <div className="font-medium">{criterion.criterionRow.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatSpatialLabel(criterion.selectionPurpose)}
                            </div>
                          </PackageTableCell>
                          <PackageTableCell>
                            <div>{formatMonitoringCriterionSourceType(criterion)}</div>
                            <div className="text-xs text-muted-foreground">
                              {[
                                criterion.criterionRow.source.name,
                                criterion.criterionRow.source.sourceCitation,
                                criterion.criterionRow.sourceClause ??
                                  criterion.criterionRow.group.title,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </PackageTableCell>
                          <PackageTableCell>
                            <div>
                              {formatMonitoringCriterionApplicabilityLabel(
                                criterion.applicabilityStatus,
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {criterion.isEnforceableOnThisProject
                                ? 'Marked enforceable on this project'
                                : 'Not marked enforceable'}
                            </div>
                          </PackageTableCell>
                          <PackageTableCell>
                            {[
                              criterion.criterionRow.receiverType
                                ? formatNoiseReceiverType(criterion.criterionRow.receiverType)
                                : null,
                              criterion.criterionRow.workTypes
                                .map((value) => formatSpatialLabel(value))
                                .join(', ') || null,
                              criterion.criterionRow.timePeriod
                                ? formatSpatialLabel(criterion.criterionRow.timePeriod)
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Not set'}
                          </PackageTableCell>
                          <PackageTableCell>
                            {formatCriterionValue(criterion.criterionRow)}
                          </PackageTableCell>
                          <PackageTableCell>
                            {[
                              criterion.projectConditionReference
                                ? `Condition: ${criterion.projectConditionReference}`
                                : null,
                              criterion.selectionNote,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Not set'}
                          </PackageTableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PackagePage>

            <PackagePage sectionLabel="Report Body · Findings">
              <PackageSectionTitle
                title={
                  artifact.report.reportType === 'noise_monitoring'
                    ? 'Noise results'
                    : 'Vibration results'
                }
                description="Measured results and compliance traceability for the monitoring event."
              />
              {artifact.report.reportType === 'noise_monitoring' ? (
                artifact.report.noiseResults.length === 0 ? (
                  <PackageEmptyState>No noise result rows recorded.</PackageEmptyState>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-lg border">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <PackageTableHeader>Observed</PackageTableHeader>
                          <PackageTableHeader>Activity / location</PackageTableHeader>
                          <PackageTableHeader>Metric / result</PackageTableHeader>
                          <PackageTableHeader>Linked criterion</PackageTableHeader>
                          <PackageTableHeader>Assessment</PackageTableHeader>
                          <PackageTableHeader>Notes / response</PackageTableHeader>
                        </tr>
                      </thead>
                      <tbody>
                        {artifact.report.noiseResults.map((row) => {
                          const linkedSelectedCriterion =
                            artifact.report.selectedCriteria.find(
                              (criterion) => criterion.id === row.selectedCriterionId,
                            ) ??
                            artifact.report.selectedCriteria.find(
                              (criterion) => criterion.criterionRowId === row.criterionRowId,
                            ) ??
                            null;
                          const assessment = calculateNoiseResultAssessment({
                            result: row,
                            selectedCriterion: linkedSelectedCriterion,
                          });

                          return (
                            <tr key={row.id} className="border-t">
                              <PackageTableCell>{formatDateTime(row.observedAt)}</PackageTableCell>
                              <PackageTableCell>
                                <div className="font-medium">{row.activityLabel}</div>
                                <div className="text-xs text-muted-foreground">
                                  {row.location?.label || 'No linked monitoring location'}
                                </div>
                              </PackageTableCell>
                              <PackageTableCell>
                                <div>{resolveNoiseResultMetricLabel(row)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {resolveNoiseResultMeasuredValueLabel(row) || 'Not set'}
                                </div>
                              </PackageTableCell>
                              <PackageTableCell>
                                <div>
                                  {linkedSelectedCriterion?.criterionRow.label ??
                                    row.criterionRow?.label ??
                                    'Not linked'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {assessment.criterionValueLabel ?? 'Manual assessment required'}
                                </div>
                              </PackageTableCell>
                              <PackageTableCell>
                                <div>
                                  {formatMonitoringComplianceStatusLabel(row.complianceStatus)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {assessment.requiresManualAssessment
                                    ? 'Manual assessment required'
                                    : assessment.exceedanceAmountLabel || 'No exceedance'}
                                </div>
                              </PackageTableCell>
                              <PackageTableCell>
                                {[
                                  row.instrumentNote,
                                  row.measurementPeriodNote,
                                  row.backgroundNote,
                                  row.resultNote,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || 'Not set'}
                              </PackageTableCell>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : artifact.report.vibrationResults.length === 0 ? (
                <PackageEmptyState>No vibration result rows recorded.</PackageEmptyState>
              ) : (
                <div className="space-y-3">
                  {artifact.report.vibrationResults.map((row) => (
                    <PackageInfoCard
                      key={row.id}
                      title={row.activityLabel}
                      badges={[
                        row.location?.label ? `Location: ${row.location.label}` : null,
                        row.metricType.replace(/_/g, ' '),
                        row.complianceStatus.replace(/_/g, ' '),
                      ]}
                      rows={[
                        ['Observed at', formatDateTime(row.observedAt)],
                        ['PPV', row.ppvValue],
                        ['VDV', row.vdvValue],
                        ['Lin Peak', row.linPeakValue],
                        ['Dominant frequency (Hz)', row.dominantFrequencyHz],
                        ['Axis note', row.axisNote],
                        ['Instrument note', row.instrumentNote],
                        ['Criterion', row.criterionRow?.label ?? null],
                        ['Result note', row.resultNote],
                      ]}
                    />
                  ))}
                </div>
              )}

              <PackageSectionTitle
                className="mt-8"
                title="Observations, recommendations, and limitations"
                description="Narrative findings and actions recorded in the structured monitoring report."
              />
              {artifact.report.observations.length === 0 ? (
                <PackageEmptyState>No observations recorded.</PackageEmptyState>
              ) : (
                <div className="mt-4 overflow-hidden rounded-lg border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <PackageTableHeader>Category</PackageTableHeader>
                        <PackageTableHeader>Linked location / result</PackageTableHeader>
                        <PackageTableHeader>Observation</PackageTableHeader>
                        <PackageTableHeader>Implication / severity</PackageTableHeader>
                        <PackageTableHeader>Follow-up</PackageTableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {artifact.report.observations.map((observation) => (
                        <tr key={observation.id} className="border-t">
                          <PackageTableCell>{observation.category}</PackageTableCell>
                          <PackageTableCell>
                            {resolveObservationLinkLabel(artifact.report, observation)}
                          </PackageTableCell>
                          <PackageTableCell>{observation.observation}</PackageTableCell>
                          <PackageTableCell>
                            {[observation.implicationSeverity, observation.implicationNote]
                              .filter(Boolean)
                              .join(' · ') || 'Not set'}
                          </PackageTableCell>
                          <PackageTableCell>
                            {observation.followUpRequired ? 'Yes' : 'No'}
                          </PackageTableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {artifact.report.recommendations.length === 0 ? (
                <div className="mt-4">
                  <PackageEmptyState>No recommendations recorded.</PackageEmptyState>
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-lg border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <PackageTableHeader>Category</PackageTableHeader>
                        <PackageTableHeader>Linked item</PackageTableHeader>
                        <PackageTableHeader>Recommendation</PackageTableHeader>
                        <PackageTableHeader>Priority / responsibility</PackageTableHeader>
                        <PackageTableHeader>Due / status</PackageTableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {artifact.report.recommendations.map((recommendation) => (
                        <tr key={recommendation.id} className="border-t">
                          <PackageTableCell>{recommendation.category}</PackageTableCell>
                          <PackageTableCell>
                            {resolveRecommendationLinkLabel(artifact.report, recommendation)}
                          </PackageTableCell>
                          <PackageTableCell>{recommendation.recommendation}</PackageTableCell>
                          <PackageTableCell>
                            {[recommendation.priority, recommendation.responsibility]
                              .filter(Boolean)
                              .join(' · ') || 'Not set'}
                          </PackageTableCell>
                          <PackageTableCell>
                            {[
                              recommendation.dueDate ? formatDate(recommendation.dueDate) : null,
                              recommendation.timingNote,
                              recommendation.status,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Not set'}
                          </PackageTableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <PackageNarrativePanel title="Conclusion" body={artifact.report.conclusion} />
                <PackageNarrativePanel
                  title="Assumptions / limitations"
                  body={artifact.report.assumptionsLimitations}
                />
              </div>
            </PackagePage>

            {artifact.report.annexures.length > 0 ? (
              <PackagePage sectionLabel="Annexure Register / Contents">
                <PackageSectionTitle
                  title="Annexure register"
                  description="Ordered Report Annexures issued with this package."
                />
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <PackageTableHeader>Annexure</PackageTableHeader>
                        <PackageTableHeader>Title</PackageTableHeader>
                        <PackageTableHeader>Source view</PackageTableHeader>
                        <PackageTableHeader>Root Sheet Template</PackageTableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {artifact.packageSnapshot.annexureRegister.map((entry) => (
                        <tr key={entry.id} className="border-t">
                          <PackageTableCell>{entry.annexureCode}</PackageTableCell>
                          <PackageTableCell>
                            {formatOperatorFacingSheetLabel(entry.title)}
                          </PackageTableCell>
                          <PackageTableCell>
                            {entry.sourceLabel
                              ? formatOperatorFacingSheetLabel(entry.sourceLabel)
                              : 'Not set'}
                          </PackageTableCell>
                          <PackageTableCell>
                            {entry.templateLabel
                              ? formatAnnexureRegisterTemplateLabel(entry.templateLabel)
                              : 'Not set'}
                            <div className="text-xs text-muted-foreground">
                              Source type: {formatTemplateSourceKind(entry.sourceKind)}
                            </div>
                          </PackageTableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PackagePage>
            ) : null}

            {artifact.report.annexures.map((annexure, index) => {
              const annexureTemplateSpec = resolveMonitoringSpatialAnnexureTemplateDisplaySpec({
                bindingJson: annexure.bindingJson,
                templateReferenceId: annexure.templateReferenceId,
                templateSnapshotJson: annexure.templateSnapshotJson,
                templateSourceKind: annexure.templateSourceKind,
              });

              return (
                <PackagePage
                  key={annexure.id}
                  printLayout="sheet"
                  printOrientation={annexureTemplateSpec.orientation}
                  printPaperSize={annexureTemplateSpec.paperSize}
                  sectionLabel={`Annexure ${annexureCodeFromIndex(index)}`}
                  sectionSubtitle={formatOperatorFacingSheetLabel(annexure.title)}
                >
                  <div className="mb-4 rounded-lg border bg-background px-4 py-3 print:hidden">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline">Annexure {annexureCodeFromIndex(index)}</Badge>
                      <Badge variant="outline">
                        {formatOperatorFacingSheetLabel(annexure.title)}
                      </Badge>
                      {annexure.sourceLabel?.trim() ? (
                        <Badge variant="outline">
                          {formatOperatorFacingSheetLabel(annexure.sourceLabel)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <MonitoringSpatialAnnexureSheet
                    annexure={annexure}
                    annexureCode={annexureCodeFromIndex(index)}
                    project={project}
                    projectId={projectId}
                    projectIdentityOverride={artifact.packageSnapshot.projectIdentity}
                    report={artifact.report}
                  />
                </PackagePage>
              );
            })}
          </>
        )}
      </article>
    </div>
  );
}

function PackageIssueStrip({ artifact }: { artifact: MonitoringPackageArtifact }) {
  return (
    <div className="package-sheet-issue-strip rounded-xl border bg-white px-5 py-4 print:hidden">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {artifact.mode === 'issue' ? 'Report Package Issue' : 'Draft Package Preview'}
          </div>
          <div className="text-xl font-semibold">{artifact.packageSnapshot.reportTitle}</div>
          <div className="text-sm text-muted-foreground">
            {artifact.packageSnapshot.projectIdentity.projectNumber} ·{' '}
            {artifact.packageSnapshot.projectIdentity.projectName}
          </div>
        </div>
        <div className="grid gap-2 text-sm md:min-w-[320px] md:grid-cols-2">
          <PackageMetaPill label="Issue label" value={artifact.packageSnapshot.issueLabel} />
          <PackageMetaPill label="Revision" value={artifact.packageSnapshot.revision} />
          <PackageMetaPill label="Status" value={artifact.packageSnapshot.documentStatus} />
          <PackageMetaPill
            label="Issue date"
            value={formatDate(artifact.packageSnapshot.issueDate)}
          />
          <PackageMetaPill label="Prepared by" value={artifact.packageSnapshot.preparedBy} />
          <PackageMetaPill label="Checked by" value={artifact.packageSnapshot.checkedBy} />
        </div>
      </div>
    </div>
  );
}

function FocusedAnnexureToolbar({
  artifact,
  focusedAnnexure,
  focusedAnnexureIndex,
  focusedAnnexureTemplateSpec,
  isIssuePreview,
  projectId,
  reportId,
}: {
  artifact: MonitoringPackageArtifact;
  focusedAnnexure: ProjectEnvironmentalMonitoringAnnexure;
  focusedAnnexureIndex: number;
  focusedAnnexureTemplateSpec: ReturnType<
    typeof resolveMonitoringSpatialAnnexureTemplateDisplaySpec
  > | null;
  isIssuePreview: boolean;
  projectId: string;
  reportId: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 shadow-sm">
        <div className="space-y-2">
          <Link
            href={`/projects/${projectId}/environmental/monitoring/${reportId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to editor
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                <Eye className="mr-1 h-3 w-3" />
                {artifact.mode === 'issue' ? 'Report Annexure Issue Preview' : 'Preview This Sheet'}
              </Badge>
              <Badge variant="outline">
                Annexure {annexureCodeFromIndex(focusedAnnexureIndex)}
              </Badge>
              <Badge variant="outline">
                {focusedAnnexureTemplateSpec
                  ? formatOperatorFacingSheetLabel(focusedAnnexureTemplateSpec.label)
                  : 'Root Sheet Template not set'}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-semibold">
              {formatOperatorFacingSheetLabel(focusedAnnexure.title)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {artifact.packageSnapshot.reportTitle}
              {focusedAnnexure.sourceLabel?.trim()
                ? ` · ${formatOperatorFacingSheetLabel(focusedAnnexure.sourceLabel)}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isIssuePreview ? (
            <Link
              href={`/projects/${projectId}/environmental/monitoring/${reportId}/preview?annexureId=${encodeURIComponent(focusedAnnexure.id)}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Open Draft Sheet Preview
            </Link>
          ) : null}
          <Button type="button" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Browser Print / PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function FocusedSheetPage({
  children,
  printLayout = 'sheet',
  printOrientation,
  printPaperSize,
}: {
  children: ReactNode;
  printLayout?: 'narrative' | 'sheet';
  printOrientation?: 'landscape' | 'portrait';
  printPaperSize?: 'a0' | 'a1' | 'a2' | 'a3' | 'a4';
}) {
  const resolvedOrientation = printOrientation ?? 'portrait';
  const resolvedPaperSize = printPaperSize ?? 'a4';

  return (
    <section
      className="package-print-page overflow-hidden rounded-2xl border bg-slate-100 p-4 shadow-sm print:overflow-hidden print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none"
      data-print-layout={printLayout}
      data-print-orientation={resolvedOrientation}
      data-print-page-size={resolvedPaperSize}
    >
      {children}
    </section>
  );
}

function PackagePage({
  children,
  printLayout = 'narrative',
  printOrientation,
  printPaperSize,
  sectionLabel,
  sectionSubtitle,
  startOnNewPage = true,
}: {
  children: ReactNode;
  printLayout?: 'narrative' | 'sheet';
  printOrientation?: 'landscape' | 'portrait';
  printPaperSize?: 'a0' | 'a1' | 'a2' | 'a3' | 'a4';
  sectionLabel: string;
  sectionSubtitle?: string;
  startOnNewPage?: boolean;
}) {
  const isSheetPage = printLayout === 'sheet';
  const resolvedOrientation = printOrientation ?? 'portrait';
  const resolvedPaperSize = printPaperSize ?? 'a4';
  const style: CSSProperties | undefined = startOnNewPage
    ? {
        breakBefore: 'page',
        pageBreakBefore: 'always',
      }
    : undefined;

  return (
    <section
      className="package-print-page rounded-2xl border bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
      data-print-layout={printLayout}
      data-print-orientation={resolvedOrientation}
      data-print-page-size={resolvedPaperSize}
      style={style}
    >
      <div
        className={`mb-5 flex items-end justify-between border-b pb-3 ${isSheetPage ? 'print:hidden' : ''}`}
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {sectionLabel}
          </div>
          {sectionSubtitle ? (
            <div className="mt-1 text-lg font-semibold">{sectionSubtitle}</div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function PackageSectionTitle({
  className,
  description,
  title,
}: {
  className?: string;
  description?: string;
  title: string;
}) {
  return (
    <div className={className}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function PackageDefinitionGrid({ items }: { items: Array<[string, string | null | undefined]> }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-sm">
            {value?.trim() ? value : <span className="text-muted-foreground">Not set</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PackageInfoCard({
  badges,
  rows,
  title,
}: {
  badges?: Array<string | null>;
  rows: Array<[string, string | null | undefined]>;
  title: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium">{title}</div>
        {badges
          ?.filter((badge): badge is string => Boolean(badge))
          .map((badge) => (
            <Badge key={badge} variant="outline">
              {badge}
            </Badge>
          ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`}>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm">
              {value?.trim() ? value : <span className="text-muted-foreground">Not set</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageNarrativePanel({
  body,
  title,
}: {
  body: string | null | undefined;
  title: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-3 whitespace-pre-wrap text-sm">
        {body?.trim() ? body : <span className="text-muted-foreground">Not set</span>}
      </div>
    </div>
  );
}

function PackageMetaPill({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">{value?.trim() ? value : 'Not set'}</div>
    </div>
  );
}

function PackageEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function PackageTableHeader({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">{children}</th>;
}

function PackageTableCell({ children }: { children: ReactNode }) {
  return <td className="px-3 py-2 align-top text-sm">{children}</td>;
}

export function buildMonitoringPackageArtifactFromDraft(
  project: Project,
  report: ProjectEnvironmentalMonitoringReport,
): MonitoringPackageArtifact {
  const projectIdentity = resolveProjectIdentity(project);
  return {
    mode: 'draft',
    packageSnapshot: {
      annexureRegister: buildAnnexureRegister(report.annexures),
      approvedBy: null,
      checkedBy: report.checkedBy,
      documentStatus: report.documentStatus,
      issueDate: report.issueDate,
      issueLabel: report.revision?.trim() || 'Draft',
      preparedBy: report.preparedBy,
      projectIdentity,
      reportTitle: displayMonitoringReportTitle(report),
      reportTypeLabel: labelForMonitoringReportType(report.reportType),
      revision: report.revision,
    },
    report: stripMonitoringPackageIssues(report),
  };
}

export function buildMonitoringPackageArtifactFromIssue(
  issue: ProjectEnvironmentalMonitoringReportPackageIssue,
): MonitoringPackageArtifact {
  return {
    mode: 'issue',
    packageSnapshot: normalizeMonitoringPackageSnapshot(
      issue.packageSnapshotJson,
      issue.reportSnapshotJson,
      issue,
    ),
    report: issue.reportSnapshotJson,
  };
}

function normalizeMonitoringPackageSnapshot(
  packageSnapshot: MonitoringReportPackageSnapshot,
  report: ProjectEnvironmentalMonitoringReportRecord,
  issue: ProjectEnvironmentalMonitoringReportPackageIssue,
): MonitoringReportPackageSnapshot {
  return {
    annexureRegister:
      packageSnapshot.annexureRegister?.length > 0
        ? packageSnapshot.annexureRegister
        : buildAnnexureRegister(report.annexures),
    approvedBy: packageSnapshot.approvedBy ?? issue.approvedBy,
    checkedBy: packageSnapshot.checkedBy ?? issue.checkedBy,
    documentStatus: packageSnapshot.documentStatus ?? issue.documentStatus,
    issueDate: packageSnapshot.issueDate ?? issue.issueDate,
    issueLabel: packageSnapshot.issueLabel ?? issue.issueLabel,
    preparedBy: packageSnapshot.preparedBy ?? issue.preparedBy,
    projectIdentity: packageSnapshot.projectIdentity ?? {
      projectNumber: 'Not set',
      projectName: 'Untitled Project',
      client: 'Not set',
      address: 'Not set',
    },
    reportTitle: packageSnapshot.reportTitle ?? displayMonitoringReportTitle(report),
    reportTypeLabel:
      packageSnapshot.reportTypeLabel ?? labelForMonitoringReportType(report.reportType),
    revision: packageSnapshot.revision ?? issue.revision,
  };
}

function stripMonitoringPackageIssues(
  report: ProjectEnvironmentalMonitoringReport,
): ProjectEnvironmentalMonitoringReportRecord {
  const { packageIssues: _packageIssues, ...record } = report;
  return record;
}

export function buildAnnexureRegister(
  annexures: ProjectEnvironmentalMonitoringAnnexure[],
): MonitoringPackageAnnexureRegisterEntry[] {
  return annexures.map((annexure, index) => {
    const templateSpec = resolveMonitoringSpatialAnnexureTemplateDisplaySpec({
      bindingJson: annexure.bindingJson,
      templateReferenceId: annexure.templateReferenceId,
      templateSnapshotJson: annexure.templateSnapshotJson,
      templateSourceKind: annexure.templateSourceKind,
    });

    return {
      annexureCode: annexureCodeFromIndex(index),
      id: annexure.id,
      sourceKind: templateSpec.sourceKind,
      sourceLabel: annexure.sourceLabel
        ? formatOperatorFacingSheetLabel(annexure.sourceLabel)
        : null,
      templateLabel: formatOperatorFacingSheetLabel(templateSpec.label),
      title: formatOperatorFacingSheetLabel(annexure.title),
    };
  });
}

export function buildMonitoringPackageTextIndex(artifact: MonitoringPackageArtifact) {
  const parts = [
    artifact.packageSnapshot.reportTitle,
    ...artifact.report.locations.flatMap((location) => [
      location.label,
      location.sourceSpatialFeatureLabel,
      location.sourceSpatialViewLabel,
      location.coordinatesNote,
      location.distanceNote,
      location.chainageNote,
    ]),
    ...artifact.report.selectedCriteria.flatMap((criterion) => [
      criterion.criterionRow.label,
      formatMonitoringCriterionSourceType(criterion),
      formatMonitoringCriterionApplicabilityLabel(criterion.applicabilityStatus),
      formatCriterionValue(criterion.criterionRow),
      criterion.selectionNote,
      criterion.projectConditionReference,
    ]),
    ...artifact.report.noiseResults.flatMap((row) => {
      const linkedSelectedCriterion =
        artifact.report.selectedCriteria.find(
          (criterion) => criterion.id === row.selectedCriterionId,
        ) ??
        artifact.report.selectedCriteria.find(
          (criterion) => criterion.criterionRowId === row.criterionRowId,
        ) ??
        null;
      const assessment = calculateNoiseResultAssessment({
        result: row,
        selectedCriterion: linkedSelectedCriterion,
      });

      return [
        row.activityLabel,
        row.location?.label ?? null,
        resolveNoiseResultMetricLabel(row),
        resolveNoiseResultMeasuredValueLabel(row),
        linkedSelectedCriterion?.criterionRow.label ?? null,
        assessment.criterionValueLabel,
        assessment.exceedanceAmountLabel,
        formatMonitoringComplianceStatusLabel(row.complianceStatus),
        row.resultNote,
        row.measurementPeriodNote,
        row.instrumentNote,
      ];
    }),
    ...artifact.report.observations.flatMap((observation) => [
      observation.category,
      observation.observation,
      observation.implicationSeverity,
      observation.implicationNote,
      resolveObservationLinkLabel(artifact.report, observation),
    ]),
    ...artifact.report.recommendations.flatMap((recommendation) => [
      recommendation.category,
      recommendation.recommendation,
      recommendation.priority,
      recommendation.responsibility,
      recommendation.status,
      resolveRecommendationLinkLabel(artifact.report, recommendation),
    ]),
    ...artifact.packageSnapshot.annexureRegister.flatMap((entry) => [
      entry.title,
      entry.sourceLabel,
      entry.templateLabel ? formatAnnexureRegisterTemplateLabel(entry.templateLabel) : null,
      formatTemplateSourceKind(entry.sourceKind),
    ]),
  ];

  return parts.filter((value): value is string => Boolean(value?.trim())).join('\n');
}

function resolveProjectIdentity(project: Project): MonitoringPackageProjectIdentitySnapshot {
  const identity = extractProjectSpecifics(project).identity;

  return {
    projectNumber: identity.projectNumber || project.code || 'Not set',
    projectName: identity.projectName || project.name || 'Untitled Project',
    client: identity.client || 'Not set',
    address: identity.address || 'Not set',
  };
}

function displayMonitoringReportTitle(report: ProjectEnvironmentalMonitoringReportRecord) {
  if (report.title?.trim()) {
    return report.title.trim();
  }

  return labelForMonitoringReportType(report.reportType);
}

function labelForMonitoringReportType(
  reportType: ProjectEnvironmentalMonitoringReportRecord['reportType'],
) {
  return reportType === 'noise_monitoring'
    ? 'Noise Monitoring Report'
    : 'Vibration Monitoring Report';
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function annexureCodeFromIndex(index: number) {
  let value = index;
  let label = '';

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

function formatCriterionValue(
  criterion: ProjectEnvironmentalMonitoringReportRecord['selectedCriteria'][number]['criterionRow'],
) {
  const unit = criterion.unit?.trim() ? ` ${criterion.unit.trim()}` : '';
  const primary =
    criterion.criterionValue?.trim() ??
    criterion.maximumValue?.trim() ??
    criterion.preferredValue?.trim() ??
    criterion.absoluteMaxValue?.trim() ??
    criterion.valueMax?.trim() ??
    null;

  if (primary) {
    return `${primary}${unit}`;
  }

  const rangeMin = criterion.valueMin?.trim();
  const rangeMax = criterion.valueMax?.trim();
  if (rangeMin || rangeMax) {
    return `${rangeMin ?? '...'} to ${rangeMax ?? '...'}${unit}`;
  }

  return criterion.rowNotes?.trim() ?? criterion.basisType.replace(/_/g, ' ');
}

function formatNoiseReceiverType(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveObservationLinkLabel(
  report: ProjectEnvironmentalMonitoringReportRecord,
  observation: ProjectEnvironmentalMonitoringReportRecord['observations'][number],
) {
  const linkedLocation =
    report.locations.find((location) => location.id === observation.locationId)?.label ?? null;
  const linkedResult =
    report.noiseResults.find((result) => result.id === observation.noiseResultId)?.activityLabel ??
    null;

  return [linkedLocation, linkedResult].filter(Boolean).join(' · ') || 'Not linked';
}

function resolveRecommendationLinkLabel(
  report: ProjectEnvironmentalMonitoringReportRecord,
  recommendation: ProjectEnvironmentalMonitoringReportRecord['recommendations'][number],
) {
  const linkedObservation =
    report.observations.find((observation) => observation.id === recommendation.observationId)
      ?.observation ?? null;
  const linkedResult =
    report.noiseResults.find((result) => result.id === recommendation.noiseResultId)
      ?.activityLabel ?? null;

  return [linkedObservation, linkedResult].filter(Boolean).join(' · ') || 'Not linked';
}

export function formatTemplateSourceKind(
  sourceKind: MonitoringPackageAnnexureRegisterEntry['sourceKind'],
) {
  switch (sourceKind) {
    case 'root_sheet_template':
      return 'Root Sheet Template';
    case 'built_in_sheet_template':
      return 'Archived template snapshot';
    case 'legacy_spatial_layout':
      return 'Archived template snapshot';
  }
}

export function formatAnnexureRegisterTemplateLabel(value: string) {
  return formatOperatorFacingSheetLabel(value);
}
