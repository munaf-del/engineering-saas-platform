'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ClipboardList,
  Eye,
  ExternalLink,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import type { MultiPileProjectReference, Project } from '@eng/shared';
import { PROJECT_SPATIAL_FEATURE_TYPES } from '@eng/shared';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AiDocument } from '@/features/ai/types';
import {
  coerceMonitoringAnnexureTemplateSnapshot,
  coerceMonitoringSpatialAnnexureBinding,
  ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_OPTIONS,
  ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUS_OPTIONS,
  ENVIRONMENTAL_MONITORING_CRITERION_APPLICABILITY_OPTIONS,
  ENVIRONMENTAL_MONITORING_METRIC_TYPE_OPTIONS,
  ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS,
  ENVIRONMENTAL_MONITORING_SELECTION_PURPOSE_OPTIONS,
  type EnvironmentalMonitoringAssessmentLocationBasis,
  type EnvironmentalMonitoringComplianceStatus,
  type EnvironmentalMonitoringCriterionApplicabilityStatus,
  type EnvironmentalMonitoringMetricType,
  type EnvironmentalMonitoringReportType,
  type MonitoringSpatialAnnexureBinding,
  type ProjectEnvironmentalMonitoringAnnexure,
  type ProjectEnvironmentalMonitoringAnnexureInput,
  type EnvironmentalMonitoringSelectionPurpose,
  type ProjectEnvironmentalMonitoringLocation,
  type ProjectEnvironmentalMonitoringLocationInput,
  type ProjectEnvironmentalMonitoringObservation,
  type ProjectEnvironmentalMonitoringObservationInput,
  type ProjectEnvironmentalMonitoringReportPackageIssueCreateInput,
  type ProjectEnvironmentalMonitoringRecommendation,
  type ProjectEnvironmentalMonitoringRecommendationInput,
  type ProjectEnvironmentalMonitoringReference,
  type ProjectEnvironmentalMonitoringReferenceInput,
  type ProjectEnvironmentalMonitoringReport,
  type ProjectEnvironmentalMonitoringReportRootInput,
  type ProjectEnvironmentalMonitoringSelectedCriterion,
  type ProjectEnvironmentalMonitoringSelectedCriterionInput,
  type ProjectEnvironmentalNoiseResultRow,
  type ProjectEnvironmentalNoiseResultRowInput,
  type ProjectEnvironmentalVibrationResultRow,
  type ProjectEnvironmentalVibrationResultRowInput,
} from '@/features/environmental/environmental-monitoring-types';
import { resolveMonitoringSpatialAnnexureTemplateDisplaySpec } from '@/features/environmental/monitoring-annexure-templates';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import type { ProjectSpatialViewRecord } from '@/features/spatial/project-spatial-record-types';
import { formatSpatialLabel } from '@/features/spatial/project-spatial-utils';
import {
  NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS,
  NOISE_VIBRATION_METRIC_OPTIONS,
  NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS,
  NOISE_VIBRATION_TIME_PERIOD_OPTIONS,
  NOISE_VIBRATION_WORK_TYPE_OPTIONS,
  type NoiseVibrationCriteriaFilters,
  type NoiseVibrationCriterionRow,
  type NoiseVibrationReceiverType,
} from '@/features/standards/noise-vibration-types';
import {
  createRootSheetTemplateSnapshot,
  resolveSpatialSheetTemplateOption,
  useSpatialSheetTemplateCatalog,
} from '@/features/templates/spatial-sheet-template-catalog';
import {
  getSpatialSheetCapabilityBadgeLabel,
  getSpatialSheetCapabilityBadgeVariant,
} from '@/features/templates/root-sheet-template-suitability';
import {
  formatGenericRootSheetTemplateLabel,
  formatOperatorFacingSheetLabel,
} from '@/features/templates/sheet-display-labels';
import { useAiDocuments } from '@/hooks/use-ai';
import {
  useCreateEnvironmentalMonitoringAnnexure,
  useCreateEnvironmentalMonitoringLocation,
  useCreateEnvironmentalMonitoringObservation,
  useCreateEnvironmentalMonitoringReportPackageIssue,
  useCreateEnvironmentalMonitoringRecommendation,
  useCreateEnvironmentalMonitoringReference,
  useCreateEnvironmentalMonitoringSelectedCriterion,
  useCreateEnvironmentalNoiseResult,
  useCreateEnvironmentalVibrationResult,
  useDeleteEnvironmentalMonitoringAnnexure,
  useDeleteEnvironmentalMonitoringLocation,
  useDeleteEnvironmentalMonitoringObservation,
  useDeleteEnvironmentalMonitoringRecommendation,
  useDeleteEnvironmentalMonitoringReference,
  useDeleteEnvironmentalMonitoringSelectedCriterion,
  useDeleteEnvironmentalNoiseResult,
  useDeleteEnvironmentalVibrationResult,
  useEnvironmentalMonitoringReport,
  useImportEnvironmentalMonitoringLocationsFromView,
  useReorderEnvironmentalMonitoringAnnexures,
  useUpdateEnvironmentalMonitoringAnnexure,
  useUpdateEnvironmentalMonitoringLocation,
  useUpdateEnvironmentalMonitoringObservation,
  useUpdateEnvironmentalMonitoringRecommendation,
  useUpdateEnvironmentalMonitoringReference,
  useUpdateEnvironmentalMonitoringReport,
  useUpdateEnvironmentalMonitoringSelectedCriterion,
  useUpdateEnvironmentalNoiseResult,
  useUpdateEnvironmentalVibrationResult,
} from '@/hooks/use-environmental-monitoring';
import { useProjectSpatialViews } from '@/hooks/use-project-spatial';
import { ApiError } from '@/lib/api-client';
import { useNoiseVibrationCriteria } from '@/hooks/use-standards';
import { toast } from 'sonner';
import {
  calculateNoiseResultAssessment,
  formatMonitoringComplianceStatusLabel,
  formatMonitoringCriterionApplicabilityLabel,
  formatMonitoringCriterionSourceType,
  resolveNoiseResultMeasuredValueLabel,
  resolveNoiseResultMetricLabel,
} from '@/features/environmental/monitoring-report-helpers';
import { MonitoringOmnidotsImportPanel } from '@/features/environmental/monitoring-omnidots-import-panel';

const ALL_FILTER = '__all__';
const NONE_VALUE = '__none__';
const PERSISTED_SNAPSHOT_VALUE = '__persisted_snapshot__';

type EnvironmentalMonitoringWorkspaceProps = {
  projectId: string;
  reportId: string;
  project: Project;
};

type ProjectIdentity = {
  projectNumber: string;
  projectName: string;
  client: string;
  address: string;
};

export function EnvironmentalMonitoringWorkspace({
  projectId,
  reportId,
  project,
}: EnvironmentalMonitoringWorkspaceProps) {
  const { data: report, isLoading } = useEnvironmentalMonitoringReport(projectId, reportId);
  const updateReport = useUpdateEnvironmentalMonitoringReport(projectId, reportId);
  const createPackageIssue = useCreateEnvironmentalMonitoringReportPackageIssue(
    projectId,
    reportId,
  );
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringReportRootInput | null>(null);
  const [packageIssueDraft, setPackageIssueDraft] =
    useState<ProjectEnvironmentalMonitoringReportPackageIssueCreateInput | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const projectSpecifics = useMemo(() => extractProjectSpecifics(project), [project]);
  const projectReferences = useMemo(() => projectSpecifics.references, [projectSpecifics]);

  useEffect(() => {
    if (report && !isDirty) {
      setDraft(rootDraftFromReport(report));
    }
  }, [report, isDirty]);

  useEffect(() => {
    if (report) {
      setPackageIssueDraft(buildPackageIssueDraft(report));
    }
  }, [report]);

  async function handleSave() {
    if (!draft) {
      return;
    }

    try {
      await updateReport.mutateAsync(normalizeRootInput(draft));
      setIsDirty(false);
      toast.success('Monitoring report saved');
    } catch {
      toast.error('Failed to save monitoring report');
    }
  }

  if (isLoading || !report || !draft) {
    return <PageLoading />;
  }

  const effectivePackageIssueDraft = packageIssueDraft ?? buildPackageIssueDraft(report);

  const projectIdentity = resolveProjectIdentity(project);
  const reportTypeLabel = labelFor(ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS, report.reportType);
  const resultCount =
    report.reportType === 'noise_monitoring'
      ? report.noiseResults.length
      : report.vibrationResults.length;

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/environmental/monitoring`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to monitoring reports
        </Link>
      </div>

      <PageHeader
        title={displayReportTitle(report)}
        description={`${projectIdentity.projectNumber} · ${reportTypeLabel}`}
        badges={
          <>
            <Badge variant="outline">{projectIdentity.projectName}</Badge>
            <Badge variant="outline">{report.annexures.length} annexures</Badge>
            <Badge variant="outline">{report.locations.length} locations</Badge>
            <Badge variant="outline">{report.selectedCriteria.length} criteria</Badge>
            <Badge variant="outline">{resultCount} results</Badge>
            {isDirty ? (
              <Badge variant="warning">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
          </>
        }
        actions={
          <>
            <Link
              href={`/projects/${projectId}/environmental/monitoring/${reportId}/preview`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview / Print
            </Link>
            <Button onClick={handleSave} disabled={!isDirty || updateReport.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save Report
            </Button>
          </>
        }
      />

      <Alert className="mb-6">
        <ClipboardList className="h-4 w-4" />
        <AlertTitle>Environmental monitoring deliverable</AlertTitle>
        <AlertDescription>
          Project identity is inherited from the main project. Author the monitoring event,
          criteria, measured results, observations, and recommendations here.
        </AlertDescription>
      </Alert>

      <RootSections
        reportType={report.reportType}
        draft={draft}
        projectIdentity={projectIdentity}
        onChange={(patch) => {
          setDraft((current) => ({ ...(current ?? {}), ...patch }));
          setIsDirty(true);
        }}
      />

      {report.reportType === 'vibration_monitoring' ? (
        <MonitoringOmnidotsImportPanel projectId={projectId} reportId={reportId} report={report} />
      ) : null}

      <ReportPackageIssuesSection
        draft={effectivePackageIssueDraft}
        isReportDirty={isDirty}
        isSavingReport={updateReport.isPending}
        projectId={projectId}
        report={report}
        reportId={reportId}
        onChange={(patch) =>
          setPackageIssueDraft((current) => ({
            ...(current ?? buildPackageIssueDraft(report)),
            ...patch,
          }))
        }
        onCreateIssue={async () => {
          const nextIssueDraft = effectivePackageIssueDraft;

          if (isDirty) {
            await updateReport.mutateAsync(normalizeRootInput(draft));
            setIsDirty(false);
          }

          return createPackageIssue.mutateAsync(normalizePackageIssueInput(nextIssueDraft));
        }}
      />

      <ReferencesSection
        projectId={projectId}
        reportId={reportId}
        report={report}
        projectReferences={projectReferences}
      />

      <LocationsSection projectId={projectId} reportId={reportId} report={report} />

      <CriteriaSection projectId={projectId} reportId={reportId} report={report} />

      {report.reportType === 'noise_monitoring' ? (
        <NoiseResultsSection projectId={projectId} reportId={reportId} report={report} />
      ) : (
        <VibrationResultsSection projectId={projectId} reportId={reportId} report={report} />
      )}

      <ObservationsSection projectId={projectId} reportId={reportId} report={report} />

      <RecommendationsSection projectId={projectId} reportId={reportId} report={report} />

      <AnnexuresSection projectId={projectId} reportId={reportId} report={report} />
    </>
  );
}

function RootSections({
  reportType,
  draft,
  projectIdentity,
  onChange,
}: {
  reportType: EnvironmentalMonitoringReportType;
  draft: ProjectEnvironmentalMonitoringReportRootInput;
  projectIdentity: ProjectIdentity;
  onChange: (patch: ProjectEnvironmentalMonitoringReportRootInput) => void;
}) {
  return (
    <>
      <SectionCard title="Project Identity" description="Inherited from the project workspace.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Project number">
            <ReadOnlyFieldValue value={projectIdentity.projectNumber} />
          </LabeledField>
          <LabeledField label="Project name">
            <ReadOnlyFieldValue value={projectIdentity.projectName} />
          </LabeledField>
          <LabeledField label="Client">
            <ReadOnlyFieldValue value={projectIdentity.client} />
          </LabeledField>
          <LabeledField label="Project address" className="xl:col-span-4">
            <ReadOnlyFieldValue value={projectIdentity.address} />
          </LabeledField>
        </div>
      </SectionCard>

      <SectionCard
        title="Document Setup"
        description={`Set the authored report details for this ${labelFor(
          ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS,
          reportType,
        ).toLowerCase()}.`}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LabeledField label="Title" className="md:col-span-2">
            <Input
              value={draft.title ?? ''}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Revision">
            <Input
              value={draft.revision ?? ''}
              onChange={(event) => onChange({ revision: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Issue date">
            <Input
              type="date"
              value={draft.issueDate ?? ''}
              onChange={(event) => onChange({ issueDate: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Document status">
            <Input
              value={draft.documentStatus ?? ''}
              onChange={(event) => onChange({ documentStatus: event.target.value })}
              placeholder="draft"
            />
          </LabeledField>
          <LabeledField label="Prepared by">
            <Input
              value={draft.preparedBy ?? ''}
              onChange={(event) => onChange({ preparedBy: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Checked by">
            <Input
              value={draft.checkedBy ?? ''}
              onChange={(event) => onChange({ checkedBy: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Purpose" className="md:col-span-2 xl:col-span-3">
            <Textarea
              value={draft.purpose ?? ''}
              onChange={(event) => onChange({ purpose: event.target.value })}
            />
          </LabeledField>
        </div>
      </SectionCard>

      <SectionCard
        title="Monitoring Event / Context"
        description="Capture the monitoring event, site activity context, and summary text for the report."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Monitoring date">
            <Input
              type="date"
              value={draft.monitoringDate ?? ''}
              onChange={(event) => onChange({ monitoringDate: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Monitoring window start">
            <Input
              type="datetime-local"
              value={draft.monitoringWindowStart ?? ''}
              onChange={(event) => onChange({ monitoringWindowStart: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Monitoring window end">
            <Input
              type="datetime-local"
              value={draft.monitoringWindowEnd ?? ''}
              onChange={(event) => onChange({ monitoringWindowEnd: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Weather conditions">
            <Input
              value={draft.weatherConditions ?? ''}
              onChange={(event) => onChange({ weatherConditions: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Site activity summary" className="md:col-span-2">
            <Textarea
              value={draft.siteActivitySummary ?? ''}
              onChange={(event) => onChange({ siteActivitySummary: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Executive summary" className="md:col-span-2">
            <Textarea
              value={draft.executiveSummary ?? ''}
              onChange={(event) => onChange({ executiveSummary: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="General observations" className="md:col-span-2">
            <Textarea
              value={draft.generalObservations ?? ''}
              onChange={(event) => onChange({ generalObservations: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Conclusion" className="md:col-span-2">
            <Textarea
              value={draft.conclusion ?? ''}
              onChange={(event) => onChange({ conclusion: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Recommendations summary" className="md:col-span-2">
            <Textarea
              value={draft.recommendationsSummary ?? ''}
              onChange={(event) => onChange({ recommendationsSummary: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Assumptions / limitations" className="md:col-span-2">
            <Textarea
              value={draft.assumptionsLimitations ?? ''}
              onChange={(event) => onChange({ assumptionsLimitations: event.target.value })}
            />
          </LabeledField>
        </div>
      </SectionCard>
    </>
  );
}

function ReferencesSection({
  projectId,
  reportId,
  report,
  projectReferences,
}: {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
  projectReferences: MultiPileProjectReference[];
}) {
  const { data: aiDocuments } = useAiDocuments(projectId);
  const createReference = useCreateEnvironmentalMonitoringReference(projectId, reportId);
  const updateReference = useUpdateEnvironmentalMonitoringReference(projectId, reportId);
  const deleteReference = useDeleteEnvironmentalMonitoringReference(projectId, reportId);
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringReferenceInput>({
    label: '',
  });

  async function handleAdd() {
    try {
      await createReference.mutateAsync(normalizeReferenceInput(draft));
      setDraft({ label: '' });
      toast.success('Reference added');
    } catch {
      toast.error('Failed to add reference');
    }
  }

  return (
    <SectionCard
      title="Linked References"
      description="Link project references or AI reports that support this monitoring report."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reference
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Project reference">
          <OptionalSelect
            value={draft.projectReferenceId ?? null}
            placeholder="No project reference"
            options={projectReferences.map((reference) => ({
              value: reference.id,
              label: resolveProjectReferenceLabel(reference),
            }))}
            onChange={(projectReferenceId) =>
              setDraft((current) => ({ ...current, projectReferenceId }))
            }
          />
        </LabeledField>
        <LabeledField label="AI report">
          <OptionalSelect
            value={draft.aiDocumentId ?? null}
            placeholder="No AI report"
            options={(aiDocuments ?? []).map((document) => ({
              value: document.id,
              label: document.filename,
            }))}
            onChange={(aiDocumentId) => setDraft((current) => ({ ...current, aiDocumentId }))}
          />
        </LabeledField>
        <LabeledField label="Label">
          <Input
            value={draft.label ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Note">
          <Input
            value={draft.note ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {report.references.length === 0 ? (
          <EmptyRows>No linked references yet.</EmptyRows>
        ) : (
          report.references.map((row) => (
            <ReferenceRow
              key={row.id}
              row={row}
              projectReferences={projectReferences}
              aiDocuments={aiDocuments ?? []}
              onSave={(data) =>
                updateReference.mutateAsync({ id: row.id, data: normalizeReferenceInput(data) })
              }
              onDelete={() => deleteReference.mutateAsync(row.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function LocationsSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
}) {
  const { data: projectSpatialViews = [] } = useProjectSpatialViews(projectId);
  const createLocation = useCreateEnvironmentalMonitoringLocation(projectId, reportId);
  const updateLocation = useUpdateEnvironmentalMonitoringLocation(projectId, reportId);
  const deleteLocation = useDeleteEnvironmentalMonitoringLocation(projectId, reportId);
  const importLocations = useImportEnvironmentalMonitoringLocationsFromView(projectId, reportId);
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringLocationInput>({
    label: '',
  });
  const [selectedImportViewId, setSelectedImportViewId] = useState<string>(NONE_VALUE);

  useEffect(() => {
    if (projectSpatialViews.length === 0) {
      setSelectedImportViewId(NONE_VALUE);
      return;
    }

    setSelectedImportViewId((current) => {
      if (current !== NONE_VALUE && projectSpatialViews.some((view) => view.id === current)) {
        return current;
      }

      const annexureSourceView =
        report.annexures.find((annexure) => annexure.sourceLabel?.trim())?.sourceLabel ?? null;
      const matchingView = annexureSourceView
        ? (projectSpatialViews.find((view) => view.name.trim() === annexureSourceView.trim()) ??
          null)
        : null;

      return matchingView?.id ?? projectSpatialViews[0]?.id ?? NONE_VALUE;
    });
  }, [projectSpatialViews, report.annexures]);

  async function handleAdd() {
    if (!draft.label?.trim()) {
      toast.error('Location label is required');
      return;
    }
    try {
      await createLocation.mutateAsync(draft);
      setDraft({ label: '' });
      toast.success('Location added');
    } catch {
      toast.error('Failed to add location');
    }
  }

  async function handleImportLocations(mode: 'new_only' | 'refresh_imported') {
    if (!selectedImportViewId || selectedImportViewId === NONE_VALUE) {
      toast.error('Choose a Project Spatial View first');
      return;
    }

    try {
      await importLocations.mutateAsync({
        projectSpatialViewId: selectedImportViewId,
        mode,
      });
      toast.success(
        mode === 'refresh_imported'
          ? 'Imported locations refreshed from Project Spatial View'
          : 'Locations imported from Project Spatial View',
      );
    } catch {
      toast.error('Failed to import monitoring locations');
    }
  }

  return (
    <SectionCard
      title="Monitoring Locations"
      description="Record monitoring locations and their receiver context, or import them from a Project Spatial View."
      action={
        <>
          <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleImportLocations('new_only')}
            disabled={selectedImportViewId === NONE_VALUE || importLocations.isPending}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Import New From View
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleImportLocations('refresh_imported')}
            disabled={selectedImportViewId === NONE_VALUE || importLocations.isPending}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh Imported
          </Button>
        </>
      }
    >
      <div className="mb-4 rounded-md border bg-muted/20 p-3">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <LabeledField label="Import locations from Project Spatial View">
            <Select value={selectedImportViewId} onValueChange={setSelectedImportViewId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Project Spatial View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No Project Spatial View selected</SelectItem>
                {projectSpatialViews.map((view) => (
                  <SelectItem key={view.id} value={view.id}>
                    {formatOperatorFacingSheetLabel(view.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Imports visible monitoring-relevant spatial features such as noise monitors, vibration
              monitors, receivers, and reference points. “Import New” preserves existing rows;
              “Refresh Imported” only fills blank editable fields and refreshes source provenance.
            </div>
          </LabeledField>
          <div className="flex items-end">
            <Link
              href={buildMonitoringSpatialViewsHref(projectId, reportId)}
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Spatial Views
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Location label">
          <Input
            value={draft.label ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Receiver type">
          <ReceiverTypeSelect
            value={draft.receiverType ?? null}
            onChange={(receiverType) => setDraft((current) => ({ ...current, receiverType }))}
          />
        </LabeledField>
        <LabeledField label="Distance note">
          <Input
            value={draft.distanceNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, distanceNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Chainage note">
          <Input
            value={draft.chainageNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, chainageNote: event.target.value }))
            }
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {report.locations.length === 0 ? (
          <EmptyRows>No monitoring locations yet.</EmptyRows>
        ) : (
          report.locations.map((row) => (
            <LocationRow
              key={row.id}
              row={row}
              onSave={(data) => updateLocation.mutateAsync({ id: row.id, data })}
              onDelete={() => deleteLocation.mutateAsync(row.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function CriteriaSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
}) {
  const [filters, setFilters] = useState<NoiseVibrationCriteriaFilters>({});
  const { data: criteria, isLoading: criteriaLoading } = useNoiseVibrationCriteria(filters);
  const createCriterion = useCreateEnvironmentalMonitoringSelectedCriterion(projectId, reportId);
  const updateCriterion = useUpdateEnvironmentalMonitoringSelectedCriterion(projectId, reportId);
  const deleteCriterion = useDeleteEnvironmentalMonitoringSelectedCriterion(projectId, reportId);

  const selectedCriterionKeys = new Set(
    report.selectedCriteria.map(
      (selection) => `${selection.criterionRowId}:${selection.selectionPurpose}`,
    ),
  );

  async function handleAddCriterion(row: NoiseVibrationCriterionRow) {
    const selectionPurpose = defaultSelectionPurpose(row);
    if (selectedCriterionKeys.has(`${row.id}:${selectionPurpose}`)) {
      toast.error('That criterion is already selected for this purpose');
      return;
    }

    try {
      await createCriterion.mutateAsync({
        criterionRowId: row.id,
        selectionPurpose,
        isEnforceableOnThisProject: false,
      });
      toast.success('Criterion selected');
    } catch {
      toast.error('Failed to select criterion');
    }
  }

  function setFilter(key: keyof NoiseVibrationCriteriaFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value === ALL_FILTER ? undefined : value,
    }));
  }

  return (
    <SectionCard
      title="Applicable Standards and Criteria"
      description="Select applicable criterion rows from the Noise and Vibration Standards registry."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FilterSelect
                label="Category"
                value={filters.criterionCategory}
                placeholder="All categories"
                options={NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS}
                onChange={(value) => setFilter('criterionCategory', value)}
              />
              <FilterSelect
                label="Receiver"
                value={filters.receiverType}
                placeholder="All receivers"
                options={NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS}
                onChange={(value) => setFilter('receiverType', value)}
              />
              <FilterSelect
                label="Work type"
                value={filters.workType}
                placeholder="All work types"
                options={NOISE_VIBRATION_WORK_TYPE_OPTIONS}
                onChange={(value) => setFilter('workType', value)}
              />
              <FilterSelect
                label="Time period"
                value={filters.timePeriod}
                placeholder="All time periods"
                options={NOISE_VIBRATION_TIME_PERIOD_OPTIONS}
                onChange={(value) => setFilter('timePeriod', value)}
              />
              <LabeledField label="Search" className="md:col-span-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.q ?? ''}
                    onChange={(event) => setFilter('q', event.target.value)}
                    placeholder="ICNG, DIN, VDV, PPV"
                    className="pl-9"
                  />
                </div>
              </LabeledField>
            </div>
          </div>

          <div className="max-h-[620px] space-y-3 overflow-auto pr-1">
            {criteriaLoading ? (
              <PageLoading />
            ) : (criteria ?? []).length === 0 ? (
              <EmptyRows>No criteria match the current filters.</EmptyRows>
            ) : (
              (criteria ?? [])
                .slice(0, 80)
                .map((row) => (
                  <CriterionPickerRow
                    key={row.id}
                    row={row}
                    selected={selectedCriterionKeys.has(
                      `${row.id}:${defaultSelectionPurpose(row)}`,
                    )}
                    onAdd={() => handleAddCriterion(row)}
                  />
                ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Selected Criteria</h3>
          {report.selectedCriteria.length === 0 ? (
            <EmptyRows>No selected criteria yet.</EmptyRows>
          ) : (
            report.selectedCriteria.map((row) => (
              <SelectedCriterionRow
                key={row.id}
                row={row}
                onSave={(data) => updateCriterion.mutateAsync({ id: row.id, data })}
                onDelete={() => deleteCriterion.mutateAsync(row.id)}
              />
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function NoiseResultsSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
}) {
  const createResult = useCreateEnvironmentalNoiseResult(projectId, reportId);
  const updateResult = useUpdateEnvironmentalNoiseResult(projectId, reportId);
  const deleteResult = useDeleteEnvironmentalNoiseResult(projectId, reportId);
  const [draft, setDraft] = useState<ProjectEnvironmentalNoiseResultRowInput>({
    activityLabel: '',
    complianceStatus: 'not_assessed',
  });

  async function handleAdd() {
    if (!draft.activityLabel?.trim()) {
      toast.error('Activity label is required');
      return;
    }
    try {
      await createResult.mutateAsync(normalizeNoiseResultInput(draft));
      setDraft({ activityLabel: '', complianceStatus: 'not_assessed' });
      toast.success('Noise result added');
    } catch {
      toast.error('Failed to add noise result');
    }
  }

  return (
    <SectionCard
      title="Noise Results"
      description="Enter measured noise results and link them to selected criteria where relevant."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Noise Result
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Activity label">
          <Input
            value={draft.activityLabel ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, activityLabel: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Observed at">
          <Input
            type="datetime-local"
            value={draft.observedAt ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, observedAt: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Location">
          <OptionalSelect
            value={draft.locationId ?? null}
            placeholder="No location"
            options={report.locations.map((location) => ({
              value: location.id,
              label: location.label,
            }))}
            onChange={(locationId) => setDraft((current) => ({ ...current, locationId }))}
          />
        </LabeledField>
        <LabeledField label="Selected criterion">
          <OptionalSelect
            value={draft.selectedCriterionId ?? null}
            placeholder="No linked criterion"
            options={criteriaOptionsForNoise(report)}
            onChange={(selectedCriterionId) =>
              setDraft((current) => ({ ...current, selectedCriterionId }))
            }
          />
        </LabeledField>
        <LabeledField label="Descriptor / metric">
          <NoiseDescriptorMetricSelect
            value={draft.descriptorMetric ?? null}
            onChange={(descriptorMetric) =>
              setDraft((current) => ({ ...current, descriptorMetric }))
            }
          />
        </LabeledField>
        <LabeledField label="Measured value">
          <Input
            value={draft.measuredValue ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, measuredValue: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Unit">
          <Input
            value={draft.measuredUnit ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, measuredUnit: event.target.value }))
            }
            placeholder="dB"
          />
        </LabeledField>
        <LabeledField label="Compliance status">
          <ComplianceStatusSelect
            value={draft.complianceStatus ?? 'not_assessed'}
            onChange={(complianceStatus) =>
              setDraft((current) => ({ ...current, complianceStatus }))
            }
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {report.noiseResults.length === 0 ? (
          <EmptyRows>No noise result rows yet.</EmptyRows>
        ) : (
          report.noiseResults.map((row) => (
            <NoiseResultRowEditor
              key={row.id}
              row={row}
              report={report}
              onSave={(data) =>
                updateResult.mutateAsync({ id: row.id, data: normalizeNoiseResultInput(data) })
              }
              onDelete={() => deleteResult.mutateAsync(row.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function VibrationResultsSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
}) {
  const createResult = useCreateEnvironmentalVibrationResult(projectId, reportId);
  const updateResult = useUpdateEnvironmentalVibrationResult(projectId, reportId);
  const deleteResult = useDeleteEnvironmentalVibrationResult(projectId, reportId);
  const [draft, setDraft] = useState<ProjectEnvironmentalVibrationResultRowInput>({
    activityLabel: '',
    metricType: 'ppv',
    complianceStatus: 'not_assessed',
  });

  async function handleAdd() {
    if (!draft.activityLabel?.trim()) {
      toast.error('Activity label is required');
      return;
    }
    try {
      await createResult.mutateAsync(normalizeVibrationResultInput(draft));
      setDraft({ activityLabel: '', metricType: 'ppv', complianceStatus: 'not_assessed' });
      toast.success('Vibration result added');
    } catch {
      toast.error('Failed to add vibration result');
    }
  }

  return (
    <SectionCard
      title="Vibration Results"
      description="Enter measured vibration results and link them to selected criteria where relevant."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vibration Result
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Activity label">
          <Input
            value={draft.activityLabel ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, activityLabel: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Observed at">
          <Input
            type="datetime-local"
            value={draft.observedAt ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, observedAt: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Metric type">
          <MetricTypeSelect
            value={draft.metricType ?? 'ppv'}
            onChange={(metricType) => setDraft((current) => ({ ...current, metricType }))}
          />
        </LabeledField>
        <LabeledField label="Compliance status">
          <ComplianceStatusSelect
            value={draft.complianceStatus ?? 'not_assessed'}
            onChange={(complianceStatus) =>
              setDraft((current) => ({ ...current, complianceStatus }))
            }
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {report.vibrationResults.length === 0 ? (
          <EmptyRows>No vibration result rows yet.</EmptyRows>
        ) : (
          report.vibrationResults.map((row) => (
            <VibrationResultRowEditor
              key={row.id}
              row={row}
              report={report}
              onSave={(data) =>
                updateResult.mutateAsync({ id: row.id, data: normalizeVibrationResultInput(data) })
              }
              onDelete={() => deleteResult.mutateAsync(row.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function ObservationsSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
}) {
  const createObservation = useCreateEnvironmentalMonitoringObservation(projectId, reportId);
  const updateObservation = useUpdateEnvironmentalMonitoringObservation(projectId, reportId);
  const deleteObservation = useDeleteEnvironmentalMonitoringObservation(projectId, reportId);
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringObservationInput>({
    category: '',
    observation: '',
  });

  async function handleAdd() {
    if (!draft.category?.trim() || !draft.observation?.trim()) {
      toast.error('Category and observation are required');
      return;
    }
    try {
      await createObservation.mutateAsync(draft);
      setDraft({ category: '', observation: '' });
      toast.success('Observation added');
    } catch {
      toast.error('Failed to add observation');
    }
  }

  return (
    <SectionCard
      title="Observations"
      description="Record observations and their implications."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Observation
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Linked location">
          <OptionalSelect
            value={draft.locationId ?? null}
            placeholder="No linked location"
            options={report.locations.map((location) => ({
              value: location.id,
              label: location.label,
            }))}
            onChange={(locationId) => setDraft((current) => ({ ...current, locationId }))}
          />
        </LabeledField>
        <LabeledField label="Linked noise result">
          <OptionalSelect
            value={draft.noiseResultId ?? null}
            placeholder="No linked result"
            options={report.noiseResults.map((result) => ({
              value: result.id,
              label: `${result.activityLabel}${result.location?.label ? ` · ${result.location.label}` : ''}`,
            }))}
            onChange={(noiseResultId) => setDraft((current) => ({ ...current, noiseResultId }))}
          />
        </LabeledField>
        <LabeledField label="Implication / severity">
          <Input
            value={draft.implicationSeverity ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, implicationSeverity: event.target.value }))
            }
            placeholder="Low / Medium / High"
          />
        </LabeledField>
        <LabeledField label="Observation" className="md:col-span-2 xl:col-span-4">
          <Textarea
            value={draft.observation ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, observation: event.target.value }))
            }
          />
        </LabeledField>
        <ToggleField
          label="Follow-up required"
          checked={draft.followUpRequired ?? false}
          onChange={(followUpRequired) => setDraft((current) => ({ ...current, followUpRequired }))}
        />
      </div>

      <div className="mt-4 space-y-3">
        {report.observations.length === 0 ? (
          <EmptyRows>No observations yet.</EmptyRows>
        ) : (
          report.observations.map((row) => (
            <ObservationRow
              key={row.id}
              report={report}
              row={row}
              onSave={(data) => updateObservation.mutateAsync({ id: row.id, data })}
              onDelete={() => deleteObservation.mutateAsync(row.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function RecommendationsSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
}) {
  const createRecommendation = useCreateEnvironmentalMonitoringRecommendation(projectId, reportId);
  const updateRecommendation = useUpdateEnvironmentalMonitoringRecommendation(projectId, reportId);
  const deleteRecommendation = useDeleteEnvironmentalMonitoringRecommendation(projectId, reportId);
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringRecommendationInput>({
    category: '',
    recommendation: '',
  });

  async function handleAdd() {
    if (!draft.category?.trim() || !draft.recommendation?.trim()) {
      toast.error('Category and recommendation are required');
      return;
    }
    try {
      await createRecommendation.mutateAsync(draft);
      setDraft({ category: '', recommendation: '' });
      toast.success('Recommendation added');
    } catch {
      toast.error('Failed to add recommendation');
    }
  }

  return (
    <SectionCard
      title="Recommendations"
      description="Record recommended actions arising from the monitoring event."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Recommendation
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Linked observation">
          <OptionalSelect
            value={draft.observationId ?? null}
            placeholder="No linked observation"
            options={report.observations.map((observation) => ({
              value: observation.id,
              label: `${observation.category} · ${observation.observation}`,
            }))}
            onChange={(observationId) => setDraft((current) => ({ ...current, observationId }))}
          />
        </LabeledField>
        <LabeledField label="Linked noise result">
          <OptionalSelect
            value={draft.noiseResultId ?? null}
            placeholder="No linked result"
            options={report.noiseResults.map((result) => ({
              value: result.id,
              label: `${result.activityLabel}${result.location?.label ? ` · ${result.location.label}` : ''}`,
            }))}
            onChange={(noiseResultId) => setDraft((current) => ({ ...current, noiseResultId }))}
          />
        </LabeledField>
        <LabeledField label="Recommendation" className="md:col-span-2 xl:col-span-4">
          <Textarea
            value={draft.recommendation ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, recommendation: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Priority">
          <Input
            value={draft.priority ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, priority: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Responsible party">
          <Input
            value={draft.responsibility ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, responsibility: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Due date / timing">
          <Input
            type="date"
            value={draft.dueDate ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, dueDate: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Status">
          <Input
            value={draft.status ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, status: event.target.value }))
            }
            placeholder="Open / In progress / Closed"
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {report.recommendations.length === 0 ? (
          <EmptyRows>No recommendations yet.</EmptyRows>
        ) : (
          report.recommendations.map((row) => (
            <RecommendationRow
              key={row.id}
              report={report}
              row={row}
              onSave={(data) => updateRecommendation.mutateAsync({ id: row.id, data })}
              onDelete={() => deleteRecommendation.mutateAsync(row.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function AnnexuresSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
}) {
  const createAnnexure = useCreateEnvironmentalMonitoringAnnexure(projectId, reportId);
  const updateAnnexure = useUpdateEnvironmentalMonitoringAnnexure(projectId, reportId);
  const deleteAnnexure = useDeleteEnvironmentalMonitoringAnnexure(projectId, reportId);
  const reorderAnnexures = useReorderEnvironmentalMonitoringAnnexures(projectId, reportId);
  const spatialViewsQuery = useProjectSpatialViews(projectId);
  const projectSpatialViews = spatialViewsQuery.data ?? [];
  const {
    generalTemplateCount,
    refreshTemplateOptions,
    selectableTemplateOptions,
    templateOptions,
  } = useSpatialSheetTemplateCatalog();
  const hasSavedRootSheetTemplates = templateOptions.length > 0;
  const hasSelectableRootSheetTemplates = selectableTemplateOptions.length > 0;
  const annexureMutationError = extractEnvironmentalMonitoringMutationError(
    createAnnexure.error ?? updateAnnexure.error ?? deleteAnnexure.error ?? reorderAnnexures.error,
    'Failed to update annexures',
  );
  const refreshProjectSpatialViews = useCallback(() => {
    void spatialViewsQuery.refetch();
  }, [spatialViewsQuery]);
  const spatialViewsHref = buildMonitoringSpatialViewsHref(projectId, reportId);

  useEffect(() => {
    const refresh = () => refreshProjectSpatialViews();
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    refresh();
    refreshTemplateOptions();
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, [refreshProjectSpatialViews, refreshTemplateOptions]);

  async function handleAdd() {
    if (!hasSavedRootSheetTemplates) {
      toast.error(
        'Create and save a Root Sheet Template at /templates before adding a monitoring annexure.',
      );
      return;
    }

    try {
      const defaultTemplateOption = selectableTemplateOptions[0] ?? templateOptions[0] ?? null;
      await createAnnexure.mutateAsync({
        annexureType: 'spatial_sheet',
        ...buildMonitoringAnnexureTemplateSelection(defaultTemplateOption),
      });
      toast.success('Annexure added');
    } catch {
      toast.error('Failed to add annexure');
    }
  }

  async function moveAnnexure(annexureId: string, direction: -1 | 1) {
    const currentIndex = report.annexures.findIndex((annexure) => annexure.id === annexureId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= report.annexures.length) {
      return;
    }

    const nextIds = report.annexures.map((annexure) => annexure.id);
    const [moved] = nextIds.splice(currentIndex, 1);
    if (!moved) {
      return;
    }
    nextIds.splice(nextIndex, 0, moved);

    try {
      await reorderAnnexures.mutateAsync({ orderedIds: nextIds });
      toast.success('Annexure order updated');
    } catch {
      toast.error('Failed to reorder annexures');
    }
  }

  return (
    <SectionCard
      title="Annexures"
      description="Attach ordered report-linked annexure sheets. Normal flow: choose Project Spatial View, choose Root Sheet Template, review the imported snapshot, then save the Report Annexure."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={createAnnexure.isPending || !hasSavedRootSheetTemplates}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Spatial Annexure
        </Button>
      }
    >
      {annexureMutationError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Annexure action failed</AlertTitle>
          <AlertDescription>{annexureMutationError}</AlertDescription>
        </Alert>
      ) : null}

      {!hasSavedRootSheetTemplates ? (
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-950">
          <AlertTitle>No saved Root Sheet Templates available</AlertTitle>
          <AlertDescription>
            Monitoring report annexures now use saved Root Sheet Templates only. Create and save a
            template at <code>/templates</code>, then return here.
          </AlertDescription>
        </Alert>
      ) : !hasSelectableRootSheetTemplates ? (
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-950">
          <AlertTitle>No Spatial-ready Root Sheet Templates yet</AlertTitle>
          <AlertDescription>
            Saved Root Sheet Templates now appear in the monitoring picker, but none of them has a
            Map Frame yet. Add a Map Frame at <code>/templates</code> before saving a spatial
            annexure.
          </AlertDescription>
        </Alert>
      ) : null}

      <div id="annexures" className="sr-only" aria-hidden />

      <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p>
              Project Spatial Views available: {projectSpatialViews.length}. Views are durable
              project records. After you import one here and save the Report Annexure, the report
              stores its own self-contained snapshot for preview/print.
            </p>
            {projectSpatialViews.length === 0 ? (
              <ol className="list-decimal space-y-1 pl-5 text-xs">
                <li>Open Spatial Views.</li>
                <li>Create or update a view.</li>
                <li>Return here.</li>
                <li>Select it from the Project Spatial View dropdown.</li>
                <li>Save the annexure.</li>
              </ol>
            ) : (
              <p className="text-xs">
                Open Spatial Views whenever you need to create or update a Project Spatial View,
                then return here to import its latest snapshot into the annexure.
              </p>
            )}
            {generalTemplateCount > 0 ? (
              <p className="text-xs">
                {generalTemplateCount} saved Root Sheet Template
                {generalTemplateCount === 1 ? ' is' : 's are'} currently not spatial-ready. You can
                still choose them here, but a Map Frame must be added at <code>/templates</code>{' '}
                before the annexure can be saved.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={spatialViewsHref} className={buttonVariants({ size: 'sm' })}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Spatial Views
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={refreshProjectSpatialViews}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh Views
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {report.annexures.length === 0 ? (
          <EmptyRows>No annexures added yet.</EmptyRows>
        ) : (
          report.annexures.map((annexure, index) => (
            <AnnexureRow
              key={annexure.id}
              annexure={annexure}
              annexureCode={annexureCodeFromIndex(index)}
              canMoveDown={index < report.annexures.length - 1}
              canMoveUp={index > 0}
              projectSpatialViews={projectSpatialViews}
              projectId={projectId}
              report={report}
              reportId={reportId}
              templateOptions={templateOptions}
              selectableTemplateOptions={selectableTemplateOptions}
              onDelete={() => deleteAnnexure.mutateAsync(annexure.id)}
              onMoveDown={() => moveAnnexure(annexure.id, 1)}
              onMoveUp={() => moveAnnexure(annexure.id, -1)}
              onRefreshProjectSpatialViews={refreshProjectSpatialViews}
              onSave={(data) => updateAnnexure.mutateAsync({ id: annexure.id, data })}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function AnnexureRow({
  annexure,
  annexureCode,
  canMoveDown,
  canMoveUp,
  projectSpatialViews,
  projectId,
  report,
  reportId,
  templateOptions,
  selectableTemplateOptions,
  onDelete,
  onMoveDown,
  onMoveUp,
  onRefreshProjectSpatialViews,
  onSave,
}: {
  annexure: ProjectEnvironmentalMonitoringAnnexure;
  annexureCode: string;
  canMoveDown: boolean;
  canMoveUp: boolean;
  projectSpatialViews: ProjectSpatialViewRecord[];
  projectId: string;
  report: ProjectEnvironmentalMonitoringReport;
  reportId: string;
  templateOptions: ReturnType<typeof useSpatialSheetTemplateCatalog>['templateOptions'];
  selectableTemplateOptions: ReturnType<
    typeof useSpatialSheetTemplateCatalog
  >['selectableTemplateOptions'];
  onDelete: () => Promise<unknown>;
  onMoveDown: () => Promise<unknown> | void;
  onMoveUp: () => Promise<unknown> | void;
  onRefreshProjectSpatialViews: () => void;
  onSave: (data: ProjectEnvironmentalMonitoringAnnexureInput) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringAnnexureInput>(
    normalizeAnnexureInput(annexure),
  );
  const [selectedLocalViewId, setSelectedLocalViewId] = useState<string>(NONE_VALUE);
  const [didImportSelectedView, setDidImportSelectedView] = useState(false);
  const selectedTemplateValue = resolveMonitoringAnnexureTemplateValue(draft, annexure);
  const selectedTemplateOption =
    templateOptions.find((templateOption) => templateOption.value === selectedTemplateValue) ??
    null;
  const templateOptionsForSelect = templateOptions;
  const monitoringRecommendedTemplateOptions = templateOptionsForSelect.filter((option) =>
    option.moduleRecommendations.some(
      (recommendation) => recommendation.id === 'monitoring_report_annexures',
    ),
  );
  const templateSpec = resolveMonitoringSpatialAnnexureTemplateDisplaySpec({
    bindingJson: coerceMonitoringSpatialAnnexureBinding(draft.bindingJson),
    templateReferenceId: draft.templateReferenceId ?? annexure.templateReferenceId,
    templateSnapshotJson: draft.templateSnapshotJson ?? annexure.templateSnapshotJson ?? null,
    templateSourceKind: draft.templateSourceKind ?? annexure.templateSourceKind,
  });
  const spatialViewsHref = buildMonitoringSpatialViewsHref(projectId, reportId, annexure.id);
  const selectedLocalView =
    selectedLocalViewId === NONE_VALUE || selectedLocalViewId === PERSISTED_SNAPSHOT_VALUE
      ? null
      : (projectSpatialViews.find((savedView) => savedView.id === selectedLocalViewId) ?? null);
  const currentSnapshot = coerceMonitoringSpatialAnnexureBinding(draft.bindingJson);
  const persistedSnapshot = coerceMonitoringSpatialAnnexureBinding(annexure.bindingJson);
  const activeTemplateLabel = selectedTemplateOption
    ? formatOperatorFacingSheetLabel(selectedTemplateOption.label)
    : templateSpec.sourceKind === 'root_sheet_template'
      ? formatOperatorFacingSheetLabel(templateSpec.label)
      : null;
  const activeTemplatePaperSize =
    selectedTemplateOption?.paperSize ??
    (templateSpec.sourceKind === 'root_sheet_template' ? templateSpec.paperSize : null);
  const activeTemplateOrientation =
    selectedTemplateOption?.orientation ??
    (templateSpec.sourceKind === 'root_sheet_template' ? templateSpec.orientation : null);
  const legacyBuiltInTemplateDetected =
    !selectedTemplateOption &&
    isLegacyMonitoringBuiltInTemplateReferenceId(
      draft.templateReferenceId ?? annexure.templateReferenceId,
    );
  const selectedTemplateSupportsSpatial = selectedTemplateOption?.isSelectableForSpatial ?? false;
  const canSaveAnnexure =
    currentSnapshot !== null && Boolean(selectedTemplateOption) && selectedTemplateSupportsSpatial;
  const hasPersistedSnapshot = persistedSnapshot !== null;
  const isPersistedSnapshotUnchanged =
    currentSnapshot !== null &&
    persistedSnapshot !== null &&
    areMonitoringSpatialAnnexureBindingsEqual(currentSnapshot, persistedSnapshot);
  const saveDisabledReason = !selectedTemplateOption
    ? 'Choose a saved Spatial-ready Root Sheet Template before saving this annexure.'
    : !selectedTemplateSupportsSpatial
      ? 'Choose a Spatial-ready Root Sheet Template before saving this annexure.'
      : canSaveAnnexure
        ? null
        : projectSpatialViews.length === 0
          ? 'Open Spatial Views, create a Project Spatial View, return here, then import it before saving.'
          : 'Import a Project Spatial View snapshot before saving this annexure.';
  const selectedViewDisplayLabel = selectedLocalView
    ? formatOperatorFacingSheetLabel(selectedLocalView.name)
    : annexure.sourceLabel?.trim()
      ? formatOperatorFacingSheetLabel(annexure.sourceLabel)
      : 'No Project Spatial View selected yet';
  const hasProjectSpatialViewSelected =
    selectedLocalView !== null ||
    currentSnapshot !== null ||
    Boolean(draft.sourceLabel?.trim() || annexure.sourceLabel?.trim());
  const primaryMapFrameStatusLabel = !selectedTemplateOption
    ? 'Missing'
    : !selectedTemplateOption.suitability?.primaryMapFrame
      ? 'Missing'
      : selectedTemplateOption.suitability.primaryMapFrameUsesMostOfPage
        ? 'OK'
        : 'Too small';
  const hasOptionalTitleBlockGaps =
    !report.preparedBy?.trim() || !report.checkedBy?.trim() || !report.revision?.trim();
  const titleBlockMetadataStatusLabel =
    draft.title?.trim() && !hasOptionalTitleBlockGaps ? 'OK' : 'Missing optional values';
  const printFitStatusLabel =
    selectedTemplateSupportsSpatial &&
    activeTemplatePaperSize === 'a3' &&
    activeTemplateOrientation === 'landscape' &&
    primaryMapFrameStatusLabel !== 'Too small' &&
    primaryMapFrameStatusLabel !== 'Missing'
      ? 'OK'
      : 'Warning';
  const preflightChecks = [
    {
      label: 'Project Spatial View selected',
      value: hasProjectSpatialViewSelected ? 'Yes' : 'No',
    },
    {
      label: 'Root Sheet Template selected',
      value: selectedTemplateOption ? 'Yes' : 'No',
    },
    {
      label: 'Spatial-ready',
      value: selectedTemplateSupportsSpatial ? 'Yes' : 'No',
    },
    {
      label: 'Primary Map Frame',
      value: primaryMapFrameStatusLabel,
    },
    {
      label: 'Title block metadata',
      value: titleBlockMetadataStatusLabel,
    },
    {
      label: 'Print fit',
      value: printFitStatusLabel,
    },
  ] as const;
  const preferredRootTemplateOption = useMemo(
    () =>
      resolvePreferredMonitoringAnnexureRootTemplateOption(
        selectedTemplateOption,
        monitoringRecommendedTemplateOptions,
        templateOptionsForSelect,
      ),
    [monitoringRecommendedTemplateOptions, selectedTemplateOption, templateOptionsForSelect],
  );
  const hasRootTemplateSnapshot = Boolean(currentSnapshot?.rootSheetTemplateSnapshot);
  const currentRootTemplateVersionId =
    draft.rootSheetTemplateVersionId ??
    annexure.rootSheetTemplateVersionId ??
    currentSnapshot?.rootSheetTemplateSnapshot?.versionId ??
    null;
  const canRebaseToRootSheetTemplate =
    Boolean(preferredRootTemplateOption) &&
    (legacyBuiltInTemplateDetected ||
      !hasRootTemplateSnapshot ||
      draft.rootSheetTemplateId !== preferredRootTemplateOption?.templateId ||
      currentRootTemplateVersionId !== preferredRootTemplateOption?.templateVersionId);

  useEffect(() => {
    const normalizedDraft = normalizeAnnexureInput(annexure);
    setDraft(
      reconcileLegacyMonitoringAnnexureTemplateSelection(
        normalizedDraft,
        annexure,
        templateOptions,
      ),
    );
    const matchingViewId = findMatchingProjectSpatialViewId(
      projectSpatialViews,
      annexure.sourceLabel,
    );
    setSelectedLocalViewId(
      matchingViewId ?? (annexure.sourceLabel?.trim() ? PERSISTED_SNAPSHOT_VALUE : NONE_VALUE),
    );
    setDidImportSelectedView(false);
  }, [annexure, projectSpatialViews, templateOptions]);

  async function handleSave() {
    if (!canSaveAnnexure) {
      toast.error(saveDisabledReason ?? 'Import a local spatial view snapshot before saving.');
      return;
    }

    try {
      await onSave(normalizeAnnexureInputPayload(draft));
      toast.success('Report Annexure saved');
    } catch {
      toast.error('Failed to save Report Annexure');
    }
  }

  async function handleDelete() {
    try {
      await onDelete();
      toast.success('Annexure deleted');
    } catch {
      toast.error('Failed to delete annexure');
    }
  }

  function applyTemplateOption(value: string) {
    const nextTemplateOption =
      templateOptions.find((templateOption) => templateOption.value === value) ?? null;
    setDraft((current) => ({
      ...current,
      bindingJson: mergeAnnexureBindingTemplateSnapshot(current.bindingJson, nextTemplateOption),
      ...buildMonitoringAnnexureTemplateSelection(nextTemplateOption),
    }));
  }

  function importLatestSelectedViewSnapshot() {
    if (selectedLocalViewId === NONE_VALUE || selectedLocalViewId === PERSISTED_SNAPSHOT_VALUE) {
      return;
    }

    const selectedView = projectSpatialViews.find(
      (savedView) => savedView.id === selectedLocalViewId,
    );
    if (!selectedView) {
      return;
    }

    setDraft((current) => ({
      ...current,
      bindingJson: buildSpatialAnnexureBinding(selectedView, selectedTemplateOption),
      sourceLabel: selectedView.name,
      title: current.title?.trim() || selectedView.name.trim() || annexure.title,
      ...buildMonitoringAnnexureTemplateSelection(selectedTemplateOption),
    }));
    setDidImportSelectedView(true);
  }

  function rebaseAnnexureToRootSheetTemplate() {
    if (!preferredRootTemplateOption) {
      toast.error('No compatible Root Sheet Template is available for this annexure yet');
      return;
    }

    const matchedPersistedView =
      selectedLocalView ??
      projectSpatialViews.find(
        (savedView) => savedView.name.trim() === annexure.sourceLabel?.trim(),
      ) ??
      null;
    const baseBinding =
      (matchedPersistedView
        ? buildSpatialAnnexureBinding(matchedPersistedView, preferredRootTemplateOption)
        : mergeAnnexureBindingTemplateSnapshot(
            draft.bindingJson ?? annexure.bindingJson,
            preferredRootTemplateOption,
          )) ?? null;

    if (!baseBinding) {
      toast.error('Choose or import a Project Spatial View before rebasing this annexure');
      return;
    }

    setDraft((current) => ({
      ...current,
      bindingJson: baseBinding,
      sourceLabel:
        matchedPersistedView?.name ??
        current.sourceLabel?.trim() ??
        annexure.sourceLabel ??
        current.sourceLabel,
      title: current.title?.trim() || annexure.title,
      ...buildMonitoringAnnexureTemplateSelection(preferredRootTemplateOption),
    }));
    setSelectedLocalViewId(
      matchedPersistedView?.id ??
        (annexure.sourceLabel?.trim() ? PERSISTED_SNAPSHOT_VALUE : selectedLocalViewId),
    );
    setDidImportSelectedView(Boolean(matchedPersistedView));
    toast.success('Annexure draft rebased to the current Root Sheet Template. Save to persist it.');
  }

  function selectLocalSavedView(localSavedViewId: string) {
    setSelectedLocalViewId(localSavedViewId);
    setDidImportSelectedView(false);
    if (localSavedViewId !== NONE_VALUE && localSavedViewId !== PERSISTED_SNAPSHOT_VALUE) {
      const selectedView = projectSpatialViews.find(
        (savedView) => savedView.id === localSavedViewId,
      );
      if (selectedView) {
        setDraft((current) => ({
          ...current,
          sourceLabel: selectedView.name,
          title: current.title?.trim() || selectedView.name.trim() || annexure.title,
        }));
      }
    }
  }

  return (
    <div id={`annexure-${annexure.id}`} className="rounded-md border bg-background p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            Annexure {annexureCode} —{' '}
            {formatOperatorFacingSheetLabel(draft.title?.trim() || annexure.title)}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeTemplateLabel && activeTemplatePaperSize && activeTemplateOrientation
              ? `Root Sheet Template · ${activeTemplatePaperSize.toUpperCase()} ${activeTemplateOrientation} · ${activeTemplateLabel}`
              : 'Root Sheet Template not selected'}
            {draft.sourceLabel?.trim()
              ? ` · ${formatOperatorFacingSheetLabel(draft.sourceLabel.trim())}`
              : ''}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Root Sheet Template name stays generic. Report Annexure title and Project Spatial View
            label stay report-specific.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMoveUp}
            disabled={!canMoveUp}
          >
            <ArrowUp className="mr-2 h-4 w-4" />
            Up
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMoveDown}
            disabled={!canMoveDown}
          >
            <ArrowDown className="mr-2 h-4 w-4" />
            Down
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!canSaveAnnexure}>
            Save Report Annexure
          </Button>
          {canRebaseToRootSheetTemplate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={rebaseAnnexureToRootSheetTemplate}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Rebase To Root Sheet Template
            </Button>
          ) : null}
          <Link
            href={buildMonitoringAnnexurePreviewHref(projectId, reportId, annexure.id)}
            className={buttonVariants({ size: 'sm', variant: 'outline' })}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview This Sheet
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            aria-label="Delete annexure"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={spatialViewsHref} className={buttonVariants({ size: 'sm' })}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Spatial Views
        </Link>
        <Button type="button" variant="outline" size="sm" onClick={onRefreshProjectSpatialViews}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh Views
        </Button>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-4">
        {[
          ['1', 'Choose Project Spatial View'],
          ['2', 'Choose Root Sheet Template'],
          ['3', 'Review imported snapshot'],
          ['4', 'Save Report Annexure'],
        ].map(([step, label]) => (
          <div key={step} className="rounded-md border bg-muted/20 px-3 py-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Step {step}
            </div>
            <div className="mt-1 text-sm">{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-md border bg-muted/20 p-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Spatial Annexure Preflight
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {preflightChecks.map((check) => (
            <div key={check.label} className="rounded-md border bg-background px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {check.label}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Badge
                  variant={
                    check.value === 'OK' || check.value === 'Yes'
                      ? 'success'
                      : check.value === 'Warning' ||
                          check.value === 'Too small' ||
                          check.value === 'Missing optional values'
                        ? 'outline'
                        : 'secondary'
                  }
                >
                  {check.value}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {projectSpatialViews.length === 0 ? (
        <div className="mb-4 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">No Project Spatial Views yet.</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
            <li>Open Spatial Views.</li>
            <li>Create or update a Project Spatial View.</li>
            <li>Return here.</li>
            <li>Select the view from the import dropdown.</li>
            <li>Save the annexure to persist a self-contained snapshot.</li>
          </ol>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Report Annexure title" className="md:col-span-2">
          <Input
            value={draft.title ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="1. Choose Project Spatial View">
          <Select value={selectedLocalViewId} onValueChange={selectLocalSavedView}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  hasPersistedSnapshot
                    ? `Persisted snapshot · ${selectedViewDisplayLabel}`
                    : 'Select a Project Spatial View to import'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {hasPersistedSnapshot ? (
                <SelectItem value={PERSISTED_SNAPSHOT_VALUE}>
                  Persisted snapshot · {selectedViewDisplayLabel}
                </SelectItem>
              ) : (
                <SelectItem value={NONE_VALUE}>No Project Spatial View selected</SelectItem>
              )}
              {projectSpatialViews.map((savedView) => (
                <SelectItem key={savedView.id} value={savedView.id}>
                  {formatOperatorFacingSheetLabel(savedView.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            Views control what map content appears.
          </div>
        </LabeledField>
        <LabeledField label="2. Choose Root Sheet Template">
          {monitoringRecommendedTemplateOptions.length > 0 ? (
            <div className="mb-2 space-y-2 rounded-md border bg-muted/20 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Module Recommendation
              </div>
              <div className="text-xs text-muted-foreground">
                Recommended saved Root Sheet Templates for Monitoring Report Annexures. Only
                templates from <code>/templates</code> appear here.
              </div>
              <div className="flex flex-wrap gap-2">
                {monitoringRecommendedTemplateOptions.slice(0, 4).map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={
                      option.value === selectedTemplateOption?.value ? 'secondary' : 'outline'
                    }
                    onClick={() => applyTemplateOption(option.value)}
                  >
                    {formatOperatorFacingSheetLabel(option.label)}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <Select value={selectedTemplateOption?.value} onValueChange={applyTemplateOption}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a saved Root Sheet Template" />
            </SelectTrigger>
            <SelectContent>
              {templateOptionsForSelect.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {getSpatialSheetCapabilityBadgeLabel(option.capability)} ·{' '}
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {legacyBuiltInTemplateDetected ? (
            <Alert className="mt-2 border-amber-200 bg-amber-50 text-amber-950">
              <AlertTitle>Older template reference removed</AlertTitle>
              <AlertDescription>
                This annexure was still pointing at an older archived template reference. Choose a
                saved Root Sheet Template to replace it, then save the annexure to clean it up.
              </AlertDescription>
            </Alert>
          ) : null}
          {selectedTemplateOption?.moduleRecommendations.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTemplateOption.moduleRecommendations.map((recommendation) => (
                <Badge key={recommendation.id} variant="outline">
                  {recommendation.label}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="text-xs text-muted-foreground">
            Root Sheet Templates control the printable paper/layout. Only saved Spatial-ready Root
            Sheet Templates are available in this picker.
          </div>
        </LabeledField>
        <LabeledField label="Source Project Spatial View label" className="md:col-span-2">
          <Input
            value={draft.sourceLabel ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, sourceLabel: event.target.value }))
            }
            placeholder="View Name"
          />
        </LabeledField>
        <LabeledField label="Snapshot summary" className="md:col-span-2 xl:col-span-2">
          <ReadOnlyFieldValue value={describeSpatialAnnexureBinding(draft.bindingJson)} />
        </LabeledField>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={importLatestSelectedViewSnapshot}
          disabled={!selectedLocalView}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          {currentSnapshot && selectedLocalView
            ? 'Re-import Current View'
            : 'Import Latest View Snapshot'}
        </Button>
        {selectedLocalView ? (
          <span className="text-xs text-muted-foreground">
            Import the current snapshot from Project Spatial View{' '}
            <span className="font-medium text-foreground">
              {formatOperatorFacingSheetLabel(selectedLocalView.name)}
            </span>
            .
          </span>
        ) : hasPersistedSnapshot ? (
          <span className="text-xs text-muted-foreground">
            A frozen snapshot is already persisted for preview/print. Choose a current Project
            Spatial View to refresh it.
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-md border bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={canSaveAnnexure ? 'success' : 'outline'}>
            {canSaveAnnexure
              ? isPersistedSnapshotUnchanged
                ? 'Persisted snapshot ready'
                : 'Imported snapshot ready to save'
              : 'Snapshot required'}
          </Badge>
          {draft.sourceLabel?.trim() ? (
            <Badge variant="outline">
              {formatOperatorFacingSheetLabel(draft.sourceLabel.trim())}
            </Badge>
          ) : null}
          <Badge variant="outline">
            Report Annexure title ·{' '}
            {formatOperatorFacingSheetLabel(draft.title?.trim() || annexure.title, 'Untitled')}
          </Badge>
          {activeTemplatePaperSize && activeTemplateOrientation ? (
            <Badge variant="outline">
              {activeTemplatePaperSize.toUpperCase()} {activeTemplateOrientation}
            </Badge>
          ) : (
            <Badge variant="outline">Root Sheet Template required</Badge>
          )}
          {selectedTemplateOption ? (
            <Badge
              variant={getSpatialSheetCapabilityBadgeVariant(selectedTemplateOption.capability)}
            >
              {getSpatialSheetCapabilityBadgeLabel(selectedTemplateOption.capability)}
            </Badge>
          ) : null}
          <Badge variant="outline">
            {activeTemplateLabel
              ? `Root Sheet Template · ${activeTemplateLabel}`
              : 'Root Sheet Template not selected'}
          </Badge>
        </div>

        {!selectedTemplateSupportsSpatial ? (
          <Alert className="mt-3 border-amber-200 bg-amber-50 text-amber-950">
            <AlertTitle>Spatial-ready template required</AlertTitle>
            <AlertDescription>
              {selectedTemplateOption
                ? 'This Root Sheet Template does not contain a Map Frame, so it cannot be used for a spatial Report Annexure yet. Add a Map Frame at `/templates` or choose another Spatial-ready Root Sheet Template.'
                : 'Choose a saved Spatial-ready Root Sheet Template before importing or saving this monitoring annexure.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <SnapshotStatusCard
            label="Current snapshot source"
            value={
              selectedLocalView
                ? didImportSelectedView
                  ? `Imported from Project Spatial View ${formatOperatorFacingSheetLabel(selectedLocalView.name)} at ${formatDateTime(selectedLocalView.capturedAt)}`
                  : `Project Spatial View ${formatOperatorFacingSheetLabel(selectedLocalView.name)} selected. Import its latest snapshot to refresh the draft.`
                : currentSnapshot
                  ? annexure.sourceLabel?.trim()
                    ? `Draft snapshot loaded from ${formatOperatorFacingSheetLabel(annexure.sourceLabel)}`
                    : 'Draft snapshot currently loaded'
                  : 'No draft snapshot imported yet'
            }
          />
          <SnapshotStatusCard
            label="Persisted for preview/print"
            value={
              hasPersistedSnapshot
                ? `Saved on the Report Annexure${annexure.sourceLabel?.trim() ? ` from ${formatOperatorFacingSheetLabel(annexure.sourceLabel)}` : ''}`
                : 'Not saved yet'
            }
          />
          <SnapshotStatusCard
            label="Frozen preview/print state"
            value={
              isPersistedSnapshotUnchanged
                ? 'Draft matches the persisted Report Annexure snapshot'
                : hasPersistedSnapshot
                  ? 'Preview / Print still uses the persisted snapshot until you save again'
                  : 'Preview / Print will start using this annexure after the first save'
            }
          />
        </div>

        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          {selectedLocalView ? (
            <p>
              Imported from Project Spatial View{' '}
              <span className="font-medium text-foreground">
                {formatOperatorFacingSheetLabel(selectedLocalView.name)}
              </span>
              . Save the annexure to replace the persisted snapshot used by Preview / Print.
            </p>
          ) : canSaveAnnexure && hasPersistedSnapshot ? (
            <p>
              This annexure already has a persisted snapshot for preview/print. It does not rely on
              the original Project Spatial View id anymore.
            </p>
          ) : (
            <p>{saveDisabledReason}</p>
          )}
          <p>
            Selecting a Project Spatial View imports its current basemap, visible layers, geology
            toggle, and view state into the annexure draft. Saving the Report Annexure stores a
            snapshot so the report preview does not depend on the original Project Spatial View
            record after save. Use “Refresh Views” and import the latest view again if you want to
            update the frozen preview/print state.
          </p>
        </div>
      </div>
    </div>
  );
}

function SnapshotStatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function ReportPackageIssuesSection({
  draft,
  isReportDirty,
  isSavingReport,
  projectId,
  report,
  reportId,
  onChange,
  onCreateIssue,
}: {
  draft: ProjectEnvironmentalMonitoringReportPackageIssueCreateInput;
  isReportDirty: boolean;
  isSavingReport: boolean;
  projectId: string;
  report: ProjectEnvironmentalMonitoringReport;
  reportId: string;
  onChange: (patch: ProjectEnvironmentalMonitoringReportPackageIssueCreateInput) => void;
  onCreateIssue: () => Promise<unknown>;
}) {
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateIssue() {
    try {
      setIsCreating(true);
      await onCreateIssue();
      toast.success('Report Package Issue created');
    } catch {
      toast.error('Failed to create Report Package Issue');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <SectionCard
      title="Report Package Issues"
      description="Freeze the current report and ordered Report Annexures into an issued package snapshot. Issue previews stay frozen even if the live draft changes later."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Issue label">
          <Input
            value={draft.issueLabel ?? ''}
            onChange={(event) => onChange({ issueLabel: event.target.value })}
            placeholder="Rev A"
          />
        </LabeledField>
        <LabeledField label="Revision">
          <Input
            value={draft.revision ?? ''}
            onChange={(event) => onChange({ revision: event.target.value })}
            placeholder="A"
          />
        </LabeledField>
        <LabeledField label="Document status">
          <Input
            value={draft.documentStatus ?? ''}
            onChange={(event) => onChange({ documentStatus: event.target.value })}
            placeholder="Issued for information"
          />
        </LabeledField>
        <LabeledField label="Issue date">
          <Input
            type="date"
            value={draft.issueDate ?? ''}
            onChange={(event) => onChange({ issueDate: event.target.value })}
          />
        </LabeledField>
        <LabeledField label="Prepared by">
          <Input
            value={draft.preparedBy ?? ''}
            onChange={(event) => onChange({ preparedBy: event.target.value })}
          />
        </LabeledField>
        <LabeledField label="Checked by">
          <Input
            value={draft.checkedBy ?? ''}
            onChange={(event) => onChange({ checkedBy: event.target.value })}
          />
        </LabeledField>
        <LabeledField label="Approved by" className="md:col-span-2">
          <Input
            value={draft.approvedBy ?? ''}
            onChange={(event) => onChange({ approvedBy: event.target.value })}
            placeholder="Optional"
          />
        </LabeledField>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleCreateIssue} disabled={isCreating || isSavingReport}>
          <Save className="mr-2 h-4 w-4" />
          Create Report Package Issue
        </Button>
        {isReportDirty ? (
          <Badge variant="warning">Unsaved report changes will be saved first</Badge>
        ) : (
          <Badge variant="outline">Current saved draft ready to issue</Badge>
        )}
      </div>

      <div className="mt-4 rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Creating a Report Package Issue freezes the report body, summary sheet content, annexure
        register, and ordered Report Annexure snapshots at issue time. Browser print / PDF is still
        the export path in this MVP.
      </div>

      <div className="mt-4 space-y-3">
        {report.packageIssues.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            No Report Package Issues created yet.
          </div>
        ) : (
          report.packageIssues.map((issue) => (
            <div key={issue.id} className="rounded-md border bg-background px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">
                    {issue.issueLabel}
                    {issue.revision?.trim() ? ` · Revision ${issue.revision.trim()}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      issue.documentStatus,
                      issue.issueDate ? `Issued ${formatDate(issue.issueDate)}` : null,
                      issue.preparedBy ? `Prepared by ${issue.preparedBy}` : null,
                      issue.checkedBy ? `Checked by ${issue.checkedBy}` : null,
                      issue.approvedBy ? `Approved by ${issue.approvedBy}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Frozen package snapshot'}
                  </div>
                </div>
                <Link
                  href={`/projects/${projectId}/environmental/monitoring/${reportId}/preview?issueId=${issue.id}`}
                  className={buttonVariants({ size: 'sm', variant: 'outline' })}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Open Issue Preview
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function ReferenceRow({
  row,
  projectReferences,
  aiDocuments,
  onSave,
  onDelete,
}: {
  row: ProjectEnvironmentalMonitoringReference;
  projectReferences: MultiPileProjectReference[];
  aiDocuments: AiDocument[];
  onSave: (data: ProjectEnvironmentalMonitoringReferenceInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringReferenceInput>(
    normalizeReferenceInput(row),
  );

  useEffect(() => {
    setDraft(normalizeReferenceInput(row));
  }, [row]);

  return (
    <EditableRow
      title={row.label || row.aiDocument?.filename || 'Monitoring reference'}
      meta={[
        row.projectReferenceId ? 'Project reference linked' : null,
        row.aiDocument ? row.aiDocument.filename : null,
      ]}
      onSave={() => onSave(normalizeReferenceInput(draft))}
      onDelete={onDelete}
      saveToast="Reference saved"
      deleteToast="Reference deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Project reference">
          <OptionalSelect
            value={draft.projectReferenceId ?? null}
            placeholder="No project reference"
            options={projectReferences.map((reference) => ({
              value: reference.id,
              label: resolveProjectReferenceLabel(reference),
            }))}
            onChange={(projectReferenceId) =>
              setDraft((current) => ({ ...current, projectReferenceId }))
            }
          />
        </LabeledField>
        <LabeledField label="AI report">
          <OptionalSelect
            value={draft.aiDocumentId ?? null}
            placeholder="No AI report"
            options={aiDocuments.map((document) => ({
              value: document.id,
              label: document.filename,
            }))}
            onChange={(aiDocumentId) => setDraft((current) => ({ ...current, aiDocumentId }))}
          />
        </LabeledField>
        <LabeledField label="Label">
          <Input
            value={draft.label ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Note">
          <Input
            value={draft.note ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function LocationRow({
  row,
  onSave,
  onDelete,
}: {
  row: ProjectEnvironmentalMonitoringLocation;
  onSave: (data: ProjectEnvironmentalMonitoringLocationInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringLocationInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.label}
      meta={[
        row.receiverType ? labelFor(NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS, row.receiverType) : null,
        row.sourceSpatialFeatureType ? formatSpatialLabel(row.sourceSpatialFeatureType) : null,
        row.distanceNote,
        row.chainageNote,
      ]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Location saved"
      deleteToast="Location deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Location label">
          <Input
            value={draft.label ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Receiver type">
          <ReceiverTypeSelect
            value={draft.receiverType ?? null}
            onChange={(receiverType) => setDraft((current) => ({ ...current, receiverType }))}
          />
        </LabeledField>
        <LabeledField label="Location description">
          <Input
            value={draft.locationDescription ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, locationDescription: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Distance note">
          <Input
            value={draft.distanceNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, distanceNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Chainage note">
          <Input
            value={draft.chainageNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, chainageNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Coordinates note">
          <Input
            value={draft.coordinatesNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, coordinatesNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Assessment location basis">
          <OptionalSelect
            value={draft.assessmentLocationBasis ?? null}
            placeholder="No basis"
            options={ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_OPTIONS}
            onChange={(assessmentLocationBasis) =>
              setDraft((current) => ({ ...current, assessmentLocationBasis }))
            }
          />
        </LabeledField>
        <LabeledField label="Imported source" className="md:col-span-2 xl:col-span-2">
          <ReadOnlyFieldValue
            value={
              [
                row.sourceSpatialFeatureType
                  ? formatSpatialLabel(row.sourceSpatialFeatureType)
                  : null,
                row.sourceSpatialFeatureLabel,
                row.sourceSpatialViewLabel
                  ? `from ${formatOperatorFacingSheetLabel(row.sourceSpatialViewLabel)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Manual row'
            }
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function CriterionPickerRow({
  row,
  selected,
  onAdd,
}: {
  row: NoiseVibrationCriterionRow;
  selected: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">{row.label}</h3>
            <p className="text-xs text-muted-foreground">
              {row.source.shortName} · {row.group.title} · {row.sourceClause || 'No clause'}
            </p>
          </div>
          <p className="text-sm">{formatCriterionExpression(row)}</p>
          <CriterionBadges row={row} />
        </div>
        <Button
          type="button"
          variant={selected ? 'secondary' : 'outline'}
          size="sm"
          onClick={onAdd}
          disabled={selected}
        >
          {selected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </div>
  );
}

function SelectedCriterionRow({
  row,
  onSave,
  onDelete,
}: {
  row: ProjectEnvironmentalMonitoringSelectedCriterion;
  onSave: (data: ProjectEnvironmentalMonitoringSelectedCriterionInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringSelectedCriterionInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.criterionRow.label}
      meta={[
        row.criterionRow.source.shortName,
        labelFor(ENVIRONMENTAL_MONITORING_SELECTION_PURPOSE_OPTIONS, row.selectionPurpose),
        formatMonitoringCriterionApplicabilityLabel(row.applicabilityStatus),
      ]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Selected criterion saved"
      deleteToast="Selected criterion deleted"
    >
      <div className="space-y-3">
        <p className="text-sm font-medium">{formatCriterionExpression(row.criterionRow)}</p>
        <CriterionBadges row={row.criterionRow} />
        <div className="grid gap-3 md:grid-cols-2">
          <SnapshotStatusCard
            label="Source type"
            value={formatMonitoringCriterionSourceType(row)}
          />
          <SnapshotStatusCard
            label="Source traceability"
            value={[
              row.criterionRow.source.name,
              row.criterionRow.source.sourceCitation,
              row.criterionRow.sourceClause ?? row.criterionRow.group.title,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Selection purpose">
            <Select
              value={draft.selectionPurpose ?? row.selectionPurpose}
              onValueChange={(selectionPurpose) =>
                setDraft((current) => ({
                  ...current,
                  selectionPurpose: selectionPurpose as EnvironmentalMonitoringSelectionPurpose,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENTAL_MONITORING_SELECTION_PURPOSE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <LabeledField label="Applicability">
            <Select
              value={draft.applicabilityStatus ?? row.applicabilityStatus}
              onValueChange={(applicabilityStatus) =>
                setDraft((current) => ({
                  ...current,
                  applicabilityStatus:
                    applicabilityStatus as EnvironmentalMonitoringCriterionApplicabilityStatus,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENTAL_MONITORING_CRITERION_APPLICABILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <ToggleField
            label="Enforceable on this project"
            checked={draft.isEnforceableOnThisProject ?? false}
            onChange={(isEnforceableOnThisProject) =>
              setDraft((current) => ({ ...current, isEnforceableOnThisProject }))
            }
          />
          <LabeledField label="Condition reference" className="xl:col-span-2">
            <Input
              value={draft.projectConditionReference ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  projectConditionReference: event.target.value,
                }))
              }
            />
          </LabeledField>
          <LabeledField label="Selection note" className="md:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.selectionNote ?? ''}
              onChange={(event) =>
                setDraft((current) => ({ ...current, selectionNote: event.target.value }))
              }
            />
          </LabeledField>
        </div>
      </div>
    </EditableRow>
  );
}

function NoiseResultRowEditor({
  row,
  report,
  onSave,
  onDelete,
}: {
  row: ProjectEnvironmentalNoiseResultRow;
  report: ProjectEnvironmentalMonitoringReport;
  onSave: (data: ProjectEnvironmentalNoiseResultRowInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectEnvironmentalNoiseResultRowInput>({
    ...row,
    observedAt: toDateTimeInput(row.observedAt),
  });

  useEffect(() => {
    setDraft({
      ...row,
      observedAt: toDateTimeInput(row.observedAt),
    });
  }, [row]);

  const selectedCriterion =
    report.selectedCriteria.find(
      (criterion) => criterion.id === (draft.selectedCriterionId ?? row.selectedCriterionId),
    ) ??
    report.selectedCriteria.find(
      (criterion) => criterion.criterionRowId === (draft.criterionRowId ?? row.criterionRowId),
    ) ??
    null;
  const assessment = calculateNoiseResultAssessment({
    result: {
      criterionRow: selectedCriterion?.criterionRow ?? row.criterionRow,
      descriptorMetric:
        draft.descriptorMetric ??
        resolveNoiseResultMetricLabel({
          criterionRow: row.criterionRow,
          descriptorMetric: row.descriptorMetric,
        }),
      measuredUnit: draft.measuredUnit ?? row.measuredUnit,
      measuredValue:
        draft.measuredValue ?? row.measuredValue ?? row.laeq15min ?? row.lamax ?? row.laf1_1min,
    },
    selectedCriterion,
  });

  return (
    <EditableRow
      title={row.activityLabel}
      meta={[
        row.location?.label,
        resolveNoiseResultMetricLabel(row),
        resolveNoiseResultMeasuredValueLabel(row),
        formatMonitoringComplianceStatusLabel(row.complianceStatus),
      ]}
      onSave={() => onSave(normalizeNoiseResultInput(draft))}
      onDelete={onDelete}
      saveToast="Noise result saved"
      deleteToast="Noise result deleted"
    >
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SnapshotStatusCard
          label="Selected criterion"
          value={selectedCriterion?.criterionRow.label ?? 'No linked criterion'}
        />
        <SnapshotStatusCard
          label="Criterion value"
          value={assessment.criterionValueLabel ?? 'Manual assessment required'}
        />
        <SnapshotStatusCard
          label="Assessment"
          value={
            assessment.requiresSelection
              ? 'Link a selected criterion'
              : assessment.requiresManualAssessment
                ? 'Manual assessment required'
                : (assessment.exceedanceAmountLabel ?? 'No exceedance')
          }
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Activity label">
          <Input
            value={draft.activityLabel ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, activityLabel: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Observed at">
          <Input
            type="datetime-local"
            value={draft.observedAt ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, observedAt: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Location">
          <OptionalSelect
            value={draft.locationId ?? null}
            placeholder="No location"
            options={report.locations.map((location) => ({
              value: location.id,
              label: location.label,
            }))}
            onChange={(locationId) => setDraft((current) => ({ ...current, locationId }))}
          />
        </LabeledField>
        <LabeledField label="Selected criterion">
          <OptionalSelect
            value={draft.selectedCriterionId ?? null}
            placeholder="No linked criterion"
            options={criteriaOptionsForNoise(report)}
            onChange={(selectedCriterionId) =>
              setDraft((current) => ({ ...current, selectedCriterionId }))
            }
          />
        </LabeledField>
        <LabeledField label="Descriptor / metric">
          <NoiseDescriptorMetricSelect
            value={draft.descriptorMetric ?? null}
            onChange={(descriptorMetric) =>
              setDraft((current) => ({ ...current, descriptorMetric }))
            }
          />
        </LabeledField>
        <LabeledField label="Measured value">
          <Input
            value={draft.measuredValue ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, measuredValue: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Unit">
          <Input
            value={draft.measuredUnit ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, measuredUnit: event.target.value }))
            }
            placeholder="dB"
          />
        </LabeledField>
        <LabeledField label="Compliance status">
          <ComplianceStatusSelect
            value={draft.complianceStatus ?? 'not_assessed'}
            onChange={(complianceStatus) =>
              setDraft((current) => ({ ...current, complianceStatus }))
            }
          />
        </LabeledField>
        <LabeledField label="Instrument note">
          <Input
            value={draft.instrumentNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, instrumentNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Measurement period note">
          <Input
            value={draft.measurementPeriodNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, measurementPeriodNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Legacy LAeq,15min">
          <Input
            value={draft.laeq15min ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, laeq15min: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Legacy LAmax">
          <Input
            value={draft.lamax ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, lamax: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Legacy LAF1,1min">
          <Input
            value={draft.laf1_1min ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, laf1_1min: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Background note" className="md:col-span-2">
          <Textarea
            value={draft.backgroundNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, backgroundNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Notes / response action" className="md:col-span-2">
          <Textarea
            value={draft.resultNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, resultNote: event.target.value }))
            }
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function VibrationResultRowEditor({
  row,
  report,
  onSave,
  onDelete,
}: {
  row: ProjectEnvironmentalVibrationResultRow;
  report: ProjectEnvironmentalMonitoringReport;
  onSave: (data: ProjectEnvironmentalVibrationResultRowInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectEnvironmentalVibrationResultRowInput>({
    ...row,
    observedAt: toDateTimeInput(row.observedAt),
  });

  useEffect(() => {
    setDraft({
      ...row,
      observedAt: toDateTimeInput(row.observedAt),
    });
  }, [row]);

  return (
    <EditableRow
      title={row.activityLabel}
      meta={[
        row.location?.label,
        labelFor(ENVIRONMENTAL_MONITORING_METRIC_TYPE_OPTIONS, row.metricType),
        row.ppvValue ? `PPV ${row.ppvValue}` : null,
        row.vdvValue ? `VDV ${row.vdvValue}` : null,
      ]}
      onSave={() => onSave(normalizeVibrationResultInput(draft))}
      onDelete={onDelete}
      saveToast="Vibration result saved"
      deleteToast="Vibration result deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Activity label">
          <Input
            value={draft.activityLabel ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, activityLabel: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Observed at">
          <Input
            type="datetime-local"
            value={draft.observedAt ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, observedAt: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Location">
          <OptionalSelect
            value={draft.locationId ?? null}
            placeholder="No location"
            options={report.locations.map((location) => ({
              value: location.id,
              label: location.label,
            }))}
            onChange={(locationId) => setDraft((current) => ({ ...current, locationId }))}
          />
        </LabeledField>
        <LabeledField label="Metric type">
          <MetricTypeSelect
            value={draft.metricType ?? 'ppv'}
            onChange={(metricType) => setDraft((current) => ({ ...current, metricType }))}
          />
        </LabeledField>
        <LabeledField label="Instrument note">
          <Input
            value={draft.instrumentNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, instrumentNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="PPV">
          <Input
            value={draft.ppvValue ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, ppvValue: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="VDV">
          <Input
            value={draft.vdvValue ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, vdvValue: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Lin Peak">
          <Input
            value={draft.linPeakValue ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, linPeakValue: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Dominant frequency (Hz)">
          <Input
            value={draft.dominantFrequencyHz ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, dominantFrequencyHz: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Criterion">
          <OptionalSelect
            value={draft.criterionRowId ?? null}
            placeholder="No linked criterion"
            options={criteriaOptionsForVibration(report)}
            onChange={(criterionRowId) => setDraft((current) => ({ ...current, criterionRowId }))}
          />
        </LabeledField>
        <LabeledField label="Compliance status">
          <ComplianceStatusSelect
            value={draft.complianceStatus ?? 'not_assessed'}
            onChange={(complianceStatus) =>
              setDraft((current) => ({ ...current, complianceStatus }))
            }
          />
        </LabeledField>
        <LabeledField label="Axis note">
          <Input
            value={draft.axisNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, axisNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Result note" className="md:col-span-2 xl:col-span-4">
          <Textarea
            value={draft.resultNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, resultNote: event.target.value }))
            }
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function ObservationRow({
  report,
  row,
  onSave,
  onDelete,
}: {
  report: ProjectEnvironmentalMonitoringReport;
  row: ProjectEnvironmentalMonitoringObservation;
  onSave: (data: ProjectEnvironmentalMonitoringObservationInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringObservationInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.observation}
      meta={[
        row.category,
        row.implicationSeverity,
        row.followUpRequired ? 'Follow-up required' : null,
      ]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Observation saved"
      deleteToast="Observation deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Observation" className="md:col-span-2">
          <Textarea
            value={draft.observation ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, observation: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Linked location">
          <OptionalSelect
            value={draft.locationId ?? null}
            placeholder="No linked location"
            options={report.locations.map((location) => ({
              value: location.id,
              label: location.label,
            }))}
            onChange={(locationId) => setDraft((current) => ({ ...current, locationId }))}
          />
        </LabeledField>
        <LabeledField label="Linked noise result">
          <OptionalSelect
            value={draft.noiseResultId ?? null}
            placeholder="No linked result"
            options={report.noiseResults.map((result) => ({
              value: result.id,
              label: `${result.activityLabel}${result.location?.label ? ` · ${result.location.label}` : ''}`,
            }))}
            onChange={(noiseResultId) => setDraft((current) => ({ ...current, noiseResultId }))}
          />
        </LabeledField>
        <LabeledField label="Implication / severity">
          <Input
            value={draft.implicationSeverity ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, implicationSeverity: event.target.value }))
            }
          />
        </LabeledField>
        <ToggleField
          label="Follow-up required"
          checked={draft.followUpRequired ?? false}
          onChange={(followUpRequired) => setDraft((current) => ({ ...current, followUpRequired }))}
        />
        <LabeledField label="Implication note">
          <Textarea
            value={draft.implicationNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, implicationNote: event.target.value }))
            }
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function RecommendationRow({
  report,
  row,
  onSave,
  onDelete,
}: {
  report: ProjectEnvironmentalMonitoringReport;
  row: ProjectEnvironmentalMonitoringRecommendation;
  onSave: (data: ProjectEnvironmentalMonitoringRecommendationInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringRecommendationInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.recommendation}
      meta={[row.category, row.priority, row.responsibility, row.status]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Recommendation saved"
      deleteToast="Recommendation deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Recommendation" className="xl:col-span-3">
          <Textarea
            value={draft.recommendation ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, recommendation: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Linked observation">
          <OptionalSelect
            value={draft.observationId ?? null}
            placeholder="No linked observation"
            options={report.observations.map((observation) => ({
              value: observation.id,
              label: `${observation.category} · ${observation.observation}`,
            }))}
            onChange={(observationId) => setDraft((current) => ({ ...current, observationId }))}
          />
        </LabeledField>
        <LabeledField label="Linked noise result">
          <OptionalSelect
            value={draft.noiseResultId ?? null}
            placeholder="No linked result"
            options={report.noiseResults.map((result) => ({
              value: result.id,
              label: `${result.activityLabel}${result.location?.label ? ` · ${result.location.label}` : ''}`,
            }))}
            onChange={(noiseResultId) => setDraft((current) => ({ ...current, noiseResultId }))}
          />
        </LabeledField>
        <LabeledField label="Priority">
          <Input
            value={draft.priority ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, priority: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Responsibility">
          <Input
            value={draft.responsibility ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, responsibility: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Timing note">
          <Input
            value={draft.timingNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, timingNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Due date">
          <Input
            type="date"
            value={draft.dueDate ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, dueDate: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Status">
          <Input
            value={draft.status ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, status: event.target.value }))
            }
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function EditableRow({
  title,
  meta,
  children,
  onSave,
  onDelete,
  saveToast,
  deleteToast,
}: {
  title: string;
  meta: Array<string | null | undefined>;
  children: ReactNode;
  onSave: () => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  saveToast: string;
  deleteToast: string;
}) {
  const visibleMeta = meta.filter((value): value is string => Boolean(value && value.trim()));

  async function handleSave() {
    try {
      await onSave();
      toast.success(saveToast);
    } catch {
      toast.error('Save failed');
    }
  }

  async function handleDelete() {
    try {
      await onDelete();
      toast.success(deleteToast);
    } catch {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {visibleMeta.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">{visibleMeta.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSave}>
            Save Row
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            aria-label="Delete row"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function CriterionBadges({ row }: { row: NoiseVibrationCriterionRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {row.receiverType ? (
        <Badge variant="secondary">
          {labelFor(NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS, row.receiverType)}
        </Badge>
      ) : null}
      {row.timePeriod ? (
        <Badge variant="outline">
          {labelFor(NOISE_VIBRATION_TIME_PERIOD_OPTIONS, row.timePeriod)}
        </Badge>
      ) : null}
      <Badge variant="outline">{row.group.metric.replace(/_/g, ' ')}</Badge>
      {row.workTypes.map((workType) => (
        <Badge key={workType} variant="outline">
          {labelFor(NOISE_VIBRATION_WORK_TYPE_OPTIONS, workType)}
        </Badge>
      ))}
    </div>
  );
}

function ReceiverTypeSelect({
  value,
  onChange,
}: {
  value: NoiseVibrationReceiverType | null;
  onChange: (value: NoiseVibrationReceiverType | null) => void;
}) {
  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(nextValue) =>
        onChange(nextValue === NONE_VALUE ? null : (nextValue as NoiseVibrationReceiverType))
      }
    >
      <SelectTrigger>
        <SelectValue placeholder="Unknown / not set" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>Unknown / not set</SelectItem>
        {NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MetricTypeSelect({
  value,
  onChange,
}: {
  value: EnvironmentalMonitoringMetricType;
  onChange: (value: EnvironmentalMonitoringMetricType) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as EnvironmentalMonitoringMetricType)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ENVIRONMENTAL_MONITORING_METRIC_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NoiseDescriptorMetricSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const options = NOISE_VIBRATION_METRIC_OPTIONS.filter((option) =>
    ['laeq_15min', 'lamax', 'laf1_1min', 'none'].includes(option.value),
  );

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(nextValue) => onChange(nextValue === NONE_VALUE ? null : nextValue)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Choose metric" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>No metric selected</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ComplianceStatusSelect({
  value,
  onChange,
}: {
  value: EnvironmentalMonitoringComplianceStatus;
  onChange: (value: EnvironmentalMonitoringComplianceStatus) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as EnvironmentalMonitoringComplianceStatus)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value?: T;
  placeholder: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T | typeof ALL_FILTER) => void;
}) {
  return (
    <LabeledField label={label}>
      <Select value={value ?? ALL_FILTER} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </LabeledField>
  );
}

function OptionalSelect<T extends string>({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: T | null;
  placeholder: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T | null) => void;
}) {
  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(nextValue) => onChange(nextValue === NONE_VALUE ? null : (nextValue as T))}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}

function LabeledField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyFieldValue({ value }: { value: string }) {
  return (
    <div className="min-h-10 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap">
      {value}
    </div>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyRows({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function rootDraftFromReport(
  report: ProjectEnvironmentalMonitoringReport,
): ProjectEnvironmentalMonitoringReportRootInput {
  return {
    title: report.title ?? '',
    revision: report.revision ?? '',
    issueDate: toDateInput(report.issueDate),
    documentStatus: report.documentStatus ?? 'draft',
    preparedBy: report.preparedBy ?? '',
    checkedBy: report.checkedBy ?? '',
    purpose: report.purpose ?? '',
    monitoringDate: toDateInput(report.monitoringDate),
    monitoringWindowStart: toDateTimeInput(report.monitoringWindowStart),
    monitoringWindowEnd: toDateTimeInput(report.monitoringWindowEnd),
    weatherConditions: report.weatherConditions ?? '',
    siteActivitySummary: report.siteActivitySummary ?? '',
    executiveSummary: report.executiveSummary ?? '',
    generalObservations: report.generalObservations ?? '',
    conclusion: report.conclusion ?? '',
    recommendationsSummary: report.recommendationsSummary ?? '',
    assumptionsLimitations: report.assumptionsLimitations ?? '',
  };
}

function normalizeRootInput(
  input: ProjectEnvironmentalMonitoringReportRootInput,
): ProjectEnvironmentalMonitoringReportRootInput {
  return {
    ...blankStringsToNull({
      ...input,
      monitoringWindowStart: toIsoDateTime(input.monitoringWindowStart),
      monitoringWindowEnd: toIsoDateTime(input.monitoringWindowEnd),
    }),
    issueDate: input.issueDate || null,
    monitoringDate: input.monitoringDate || null,
  };
}

function normalizeReferenceInput(
  input: ProjectEnvironmentalMonitoringReferenceInput,
): ProjectEnvironmentalMonitoringReferenceInput {
  return {
    projectReferenceId: input.projectReferenceId || null,
    aiDocumentId: input.aiDocumentId || null,
    label: input.label || null,
    note: input.note || null,
    sortOrder: input.sortOrder,
  };
}

function normalizeAnnexureInput(
  annexure: ProjectEnvironmentalMonitoringAnnexure,
): ProjectEnvironmentalMonitoringAnnexureInput {
  return {
    annexureType: annexure.annexureType,
    bindingJson: coerceMonitoringSpatialAnnexureBinding(annexure.bindingJson),
    rootSheetTemplateId: annexure.rootSheetTemplateId,
    rootSheetTemplateVersionId: annexure.rootSheetTemplateVersionId,
    sourceLabel: annexure.sourceLabel ?? '',
    templateReferenceId: annexure.templateReferenceId,
    templateSnapshotJson: annexure.templateSnapshotJson,
    templateSourceKind: annexure.templateSourceKind,
    title: annexure.title,
  };
}

function normalizeAnnexureInputPayload(
  input: ProjectEnvironmentalMonitoringAnnexureInput,
): ProjectEnvironmentalMonitoringAnnexureInput {
  return {
    annexureType: input.annexureType,
    bindingJson: coerceMonitoringSpatialAnnexureBinding(input.bindingJson) ?? null,
    rootSheetTemplateId: input.rootSheetTemplateId ?? null,
    rootSheetTemplateVersionId: input.rootSheetTemplateVersionId ?? null,
    sourceLabel: input.sourceLabel || null,
    templateReferenceId: input.templateReferenceId ?? null,
    templateSnapshotJson: coerceMonitoringAnnexureTemplateSnapshot(input.templateSnapshotJson),
    templateSourceKind:
      input.templateSourceKind ??
      (input.rootSheetTemplateId || input.rootSheetTemplateVersionId
        ? 'root_sheet_template'
        : null),
    title: input.title || null,
  };
}

function buildPackageIssueDraft(
  report: ProjectEnvironmentalMonitoringReport,
): ProjectEnvironmentalMonitoringReportPackageIssueCreateInput {
  return {
    issueLabel: report.revision?.trim() || `Issue ${report.packageIssues.length + 1}`,
    revision: report.revision ?? '',
    documentStatus: report.documentStatus ?? '',
    issueDate: toDateInput(report.issueDate),
    preparedBy: report.preparedBy ?? '',
    checkedBy: report.checkedBy ?? '',
    approvedBy: '',
  };
}

function normalizePackageIssueInput(
  input: ProjectEnvironmentalMonitoringReportPackageIssueCreateInput,
): ProjectEnvironmentalMonitoringReportPackageIssueCreateInput {
  return {
    issueLabel: input.issueLabel || null,
    revision: input.revision || null,
    documentStatus: input.documentStatus || null,
    issueDate: input.issueDate || null,
    preparedBy: input.preparedBy || null,
    checkedBy: input.checkedBy || null,
    approvedBy: input.approvedBy || null,
  };
}

function normalizeNoiseResultInput(
  input: ProjectEnvironmentalNoiseResultRowInput,
): ProjectEnvironmentalNoiseResultRowInput {
  return {
    ...blankStringsToNull({
      ...input,
      observedAt: toIsoDateTime(input.observedAt),
    }),
    locationId: input.locationId || null,
    selectedCriterionId: input.selectedCriterionId || null,
    criterionRowId: input.criterionRowId || null,
  };
}

function normalizeVibrationResultInput(
  input: ProjectEnvironmentalVibrationResultRowInput,
): ProjectEnvironmentalVibrationResultRowInput {
  return {
    ...blankStringsToNull({
      ...input,
      observedAt: toIsoDateTime(input.observedAt),
    }),
    locationId: input.locationId || null,
    criterionRowId: input.criterionRowId || null,
  };
}

function blankStringsToNull<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === 'string' && value.trim().length === 0 ? null : value,
    ]),
  ) as T;
}

function buildSpatialAnnexureBinding(
  savedView: ProjectSpatialViewRecord,
  templateOption: ReturnType<typeof resolveSpatialSheetTemplateOption>,
): MonitoringSpatialAnnexureBinding {
  const viewState = coerceProjectSpatialViewState(savedView);
  return {
    // Persist a self-contained Report Annexure snapshot rather than relying on the Project Spatial View id.
    activeBasemap: savedView.basemap,
    rootSheetTemplateSnapshot: createRootSheetTemplateSnapshot(templateOption),
    showGeologyOverlay: coerceProjectSpatialViewShowGeologyOverlay(savedView),
    visibleFeatureTypes: coerceProjectSpatialVisibleFeatureTypes(savedView.visibleLayersJson),
    viewState: viewState ?? DEFAULT_PROJECT_SPATIAL_VIEW_STATE,
  };
}

function mergeAnnexureBindingTemplateSnapshot(
  binding: MonitoringSpatialAnnexureBinding | null | undefined,
  templateOption: ReturnType<typeof resolveSpatialSheetTemplateOption>,
): MonitoringSpatialAnnexureBinding | null {
  const snapshot = coerceMonitoringSpatialAnnexureBinding(binding);
  if (!snapshot) {
    return null;
  }

  return {
    ...snapshot,
    rootSheetTemplateSnapshot: createRootSheetTemplateSnapshot(templateOption),
  };
}

function buildMonitoringSpatialViewsHref(projectId: string, reportId: string, annexureId?: string) {
  const returnTo = annexureId
    ? `/projects/${projectId}/environmental/monitoring/${reportId}#annexure-${annexureId}`
    : `/projects/${projectId}/environmental/monitoring/${reportId}#annexures`;

  return `/projects/${projectId}/spatial/views?source=monitoring-annexure&returnTo=${encodeURIComponent(returnTo)}`;
}

function resolvePreferredMonitoringAnnexureRootTemplateOption(
  selectedTemplateOption: ReturnType<typeof resolveSpatialSheetTemplateOption>,
  monitoringRecommendedTemplateOptions: ReturnType<
    typeof useSpatialSheetTemplateCatalog
  >['selectableTemplateOptions'],
  templateOptionsForSelect: ReturnType<
    typeof useSpatialSheetTemplateCatalog
  >['selectableTemplateOptions'],
) {
  if (selectedTemplateOption?.sourceKind === 'root_sheet_template') {
    return selectedTemplateOption;
  }

  return (
    monitoringRecommendedTemplateOptions.find(
      (option) => option.sourceKind === 'root_sheet_template' && option.isSelectableForSpatial,
    ) ??
    templateOptionsForSelect.find(
      (option) => option.sourceKind === 'root_sheet_template' && option.isSelectableForSpatial,
    ) ??
    null
  );
}

function buildMonitoringAnnexurePreviewHref(
  projectId: string,
  reportId: string,
  annexureId: string,
) {
  return `/projects/${projectId}/environmental/monitoring/${reportId}/preview?annexureId=${encodeURIComponent(annexureId)}`;
}

function findMatchingProjectSpatialViewId(
  projectSpatialViews: ProjectSpatialViewRecord[],
  sourceLabel: string | null | undefined,
) {
  const normalizedSourceLabel = sourceLabel?.trim();
  if (!normalizedSourceLabel) {
    return null;
  }

  const directMatch =
    projectSpatialViews.find((savedView) => savedView.name.trim() === normalizedSourceLabel) ??
    null;
  if (directMatch) {
    return directMatch.id;
  }

  const normalizedOperatorLabel = formatOperatorFacingSheetLabel(normalizedSourceLabel, '');
  if (!normalizedOperatorLabel) {
    return null;
  }

  return (
    projectSpatialViews.find(
      (savedView) => formatOperatorFacingSheetLabel(savedView.name, '') === normalizedOperatorLabel,
    )?.id ?? null
  );
}

function buildMonitoringAnnexureTemplateSelection(
  templateOption: ReturnType<typeof resolveSpatialSheetTemplateOption>,
): Pick<
  ProjectEnvironmentalMonitoringAnnexureInput,
  | 'rootSheetTemplateId'
  | 'rootSheetTemplateVersionId'
  | 'templateReferenceId'
  | 'templateSnapshotJson'
  | 'templateSourceKind'
> {
  if (!templateOption) {
    return {
      rootSheetTemplateId: null,
      rootSheetTemplateVersionId: null,
      templateReferenceId: null,
      templateSnapshotJson: null,
      templateSourceKind: null,
    };
  }

  return {
    rootSheetTemplateId:
      templateOption.sourceKind === 'root_sheet_template' ? templateOption.templateId : null,
    rootSheetTemplateVersionId:
      templateOption.sourceKind === 'root_sheet_template' ? templateOption.templateVersionId : null,
    templateReferenceId: templateOption.templateId,
    templateSnapshotJson:
      templateOption.sourceKind === 'root_sheet_template' && templateOption.rootSheetTemplate
        ? templateOption.rootSheetTemplate
        : null,
    templateSourceKind: templateOption.sourceKind,
  };
}

function resolveMonitoringAnnexureTemplateValue(
  draft: ProjectEnvironmentalMonitoringAnnexureInput,
  annexure: ProjectEnvironmentalMonitoringAnnexure,
) {
  return (
    draft.rootSheetTemplateId ??
    annexure.rootSheetTemplateId ??
    draft.templateReferenceId ??
    annexure.templateReferenceId ??
    null
  );
}

function isLegacyMonitoringBuiltInTemplateReferenceId(value: string | null | undefined) {
  return (
    value === 'builtin-spatial-annexure-a3-landscape' ||
    value === 'builtin-spatial-annexure-a4-landscape'
  );
}

function areMonitoringSpatialAnnexureBindingsEqual(
  left: MonitoringSpatialAnnexureBinding,
  right: MonitoringSpatialAnnexureBinding,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function describeSpatialAnnexureBinding(
  binding: MonitoringSpatialAnnexureBinding | null | undefined,
) {
  const snapshot = coerceMonitoringSpatialAnnexureBinding(binding);
  if (!snapshot) {
    return 'No spatial view snapshot imported yet.';
  }

  const [lon, lat] = snapshot.viewState.centerLonLat;
  const zoomLabel =
    typeof snapshot.viewState.zoom === 'number'
      ? snapshot.viewState.zoom.toFixed(2).replace(/\.00$/, '')
      : 'Auto';

  return `${snapshot.activeBasemap.replace(/_/g, ' ')} · geology ${
    snapshot.showGeologyOverlay ? 'on' : 'off'
  } · ${snapshot.visibleFeatureTypes.length} visible layer${
    snapshot.visibleFeatureTypes.length === 1 ? '' : 's'
  } · zoom ${zoomLabel} · ${lat.toFixed(5)}, ${lon.toFixed(5)}${
    snapshot.rootSheetTemplateSnapshot
      ? ` · Root Sheet Template ${formatGenericRootSheetTemplateLabel(snapshot.rootSheetTemplateSnapshot.label)}`
      : ''
  }`;
}

function reconcileLegacyMonitoringAnnexureTemplateSelection(
  draft: ProjectEnvironmentalMonitoringAnnexureInput,
  annexure: ProjectEnvironmentalMonitoringAnnexure,
  templateOptions: ReturnType<typeof useSpatialSheetTemplateCatalog>['templateOptions'],
): ProjectEnvironmentalMonitoringAnnexureInput {
  const rootTemplateOptions = templateOptions.filter(
    (templateOption) => templateOption.sourceKind === 'root_sheet_template',
  );
  if (rootTemplateOptions.length === 0) {
    return draft;
  }

  const resolvedTemplateValue = resolveMonitoringAnnexureTemplateValue(draft, annexure);
  const normalizedTemplateValue = resolvedTemplateValue?.trim();
  if (
    !normalizedTemplateValue ||
    templateOptions.some((templateOption) => templateOption.value === normalizedTemplateValue)
  ) {
    return draft;
  }

  const legacyTemplateSpec = resolveMonitoringSpatialAnnexureTemplateDisplaySpec({
    bindingJson: coerceMonitoringSpatialAnnexureBinding(draft.bindingJson),
    templateReferenceId: draft.templateReferenceId ?? annexure.templateReferenceId,
    templateSnapshotJson: draft.templateSnapshotJson ?? annexure.templateSnapshotJson ?? null,
    templateSourceKind: draft.templateSourceKind ?? annexure.templateSourceKind,
  });
  const legacyTemplateLabel =
    coerceMonitoringSpatialAnnexureBinding(draft.bindingJson)?.rootSheetTemplateSnapshot?.label ??
    coerceMonitoringSpatialAnnexureBinding(annexure.bindingJson)?.rootSheetTemplateSnapshot
      ?.label ??
    coerceMonitoringAnnexureTemplateSnapshot(draft.templateSnapshotJson)?.name ??
    coerceMonitoringAnnexureTemplateSnapshot(annexure.templateSnapshotJson)?.name ??
    null;
  const normalizedLegacyTemplateLabel = legacyTemplateLabel?.trim().toLowerCase() ?? null;
  const replacementTemplateOption =
    (normalizedLegacyTemplateLabel
      ? (rootTemplateOptions.find(
          (templateOption) =>
            templateOption.templateLabel.trim().toLowerCase() === normalizedLegacyTemplateLabel,
        ) ?? null)
      : null) ??
    (legacyTemplateSpec.sourceKind === 'built_in_sheet_template'
      ? (rootTemplateOptions.find(
          (templateOption) =>
            templateOption.paperSize === legacyTemplateSpec.paperSize &&
            templateOption.orientation === legacyTemplateSpec.orientation,
        ) ?? null)
      : null) ??
    rootTemplateOptions[0] ??
    null;
  if (!replacementTemplateOption) {
    return draft;
  }

  return {
    ...draft,
    bindingJson: mergeAnnexureBindingTemplateSnapshot(draft.bindingJson, replacementTemplateOption),
    ...buildMonitoringAnnexureTemplateSelection(replacementTemplateOption),
  };
}

function extractEnvironmentalMonitoringMutationError(error: unknown, fallback: string) {
  if (process.env.NODE_ENV === 'production') {
    return error ? fallback : null;
  }

  if (error instanceof ApiError) {
    const body = asRecord(error.body);
    const message =
      extractFirstEnvironmentalMonitoringErrorMessage(body.message) ??
      extractFirstEnvironmentalMonitoringErrorMessage(body.errors);

    return message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return error ? fallback : null;
}

function extractFirstEnvironmentalMonitoringErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim()) {
      return entry.trim();
    }

    if (entry && typeof entry === 'object') {
      const nested = extractFirstEnvironmentalMonitoringErrorMessage(asRecord(entry).message);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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

const DEFAULT_PROJECT_SPATIAL_VIEW_STATE = {
  centerLonLat: [151.2093, -33.8688] as [number, number],
  rotation: 0,
  zoom: 16,
};

function coerceProjectSpatialViewState(view: Pick<ProjectSpatialViewRecord, 'viewStateJson'>) {
  const record = asRecord(view.viewStateJson);
  const center = Array.isArray(record.centerLonLat) ? record.centerLonLat : [];
  const longitude = Number(center[0]);
  const latitude = Number(center[1]);
  const rotation = Number(record.rotation);
  const zoomRaw = record.zoom;
  const zoom =
    zoomRaw === undefined || zoomRaw === null || zoomRaw === '' ? undefined : Number(zoomRaw);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(rotation) ||
    (zoom !== undefined && !Number.isFinite(zoom))
  ) {
    return null;
  }

  return {
    centerLonLat: [longitude, latitude] as [number, number],
    rotation,
    zoom,
  };
}

function coerceProjectSpatialVisibleFeatureTypes(
  visibleLayersJson: Record<string, unknown> | null | undefined,
) {
  const record = asRecord(visibleLayersJson);
  const rawFeatureTypes = Array.isArray(record.featureTypes)
    ? record.featureTypes
    : Array.isArray(record.visibleFeatureTypes)
      ? record.visibleFeatureTypes
      : null;

  if (!rawFeatureTypes) {
    return [...PROJECT_SPATIAL_FEATURE_TYPES];
  }

  return rawFeatureTypes.filter(
    (featureType): featureType is MonitoringSpatialAnnexureBinding['visibleFeatureTypes'][number] =>
      typeof featureType === 'string',
  );
}

function coerceProjectSpatialViewShowGeologyOverlay(
  view: Pick<ProjectSpatialViewRecord, 'labelsOrStyleJson'>,
) {
  const record = asRecord(view.labelsOrStyleJson);
  return Boolean(record.showGeologyOverlay);
}

function resolveProjectIdentity(project: Project): ProjectIdentity {
  const identity = extractProjectSpecifics(project).identity;

  return {
    projectNumber: identity.projectNumber || project.code || 'Not set',
    projectName: identity.projectName || project.name || 'Untitled Project',
    client: identity.client || 'Not set',
    address: identity.address || 'Not set',
  };
}

function displayReportTitle(report: ProjectEnvironmentalMonitoringReport) {
  return report.title?.trim()
    ? report.title
    : labelFor(ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS, report.reportType);
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function toDateTimeInput(value: string | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(0, 16);
}

function toIsoDateTime(value?: string | null) {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString();
}

function defaultSelectionPurpose(
  row: NoiseVibrationCriterionRow,
): EnvironmentalMonitoringSelectionPurpose {
  if (row.group.criterionCategory === 'vibration_human_comfort' || row.group.metric === 'vdv') {
    return 'vibration_human_comfort';
  }
  if (row.group.criterionCategory === 'vibration_structural_damage' || row.group.metric === 'ppv') {
    return 'vibration_structural';
  }
  if (
    row.group.criterionCategory === 'blasting_airblast' ||
    row.group.criterionCategory === 'blasting_ground_vibration'
  ) {
    return 'blasting';
  }
  if (row.group.criterionCategory === 'time_period_definition') {
    return 'time_definition';
  }
  return 'noise';
}

function criteriaOptionsForNoise(report: ProjectEnvironmentalMonitoringReport) {
  return report.selectedCriteria
    .filter((row) => ['noise', 'time_definition', 'other'].includes(row.selectionPurpose))
    .map((row) => ({
      value: row.id,
      label: `${row.criterionRow.source.shortName} · ${row.criterionRow.label} · ${formatMonitoringCriterionApplicabilityLabel(row.applicabilityStatus)}`,
    }));
}

function criteriaOptionsForVibration(report: ProjectEnvironmentalMonitoringReport) {
  return report.selectedCriteria
    .filter((row) =>
      ['vibration_human_comfort', 'vibration_structural', 'blasting', 'other'].includes(
        row.selectionPurpose,
      ),
    )
    .map((row) => ({
      value: row.criterionRowId,
      label: `${row.criterionRow.source.shortName} · ${row.criterionRow.label}`,
    }));
}

function formatCriterionExpression(row: NoiseVibrationCriterionRow) {
  if (row.weekdayStart || row.saturdayStart) {
    return formatWorkingHours(row);
  }

  if (row.basisType === 'relative_to_rbl') {
    return `${row.referenceBase ?? 'RBL'} + ${formatNumber(row.relativeOffset)} ${row.unit ?? 'dB'}`;
  }

  const parts: string[] = [];
  const frequency = formatFrequency(row);
  if (row.preferredValue !== null || row.maximumValue !== null) {
    parts.push(
      [
        row.preferredValue !== null
          ? `preferred ${formatNumber(row.preferredValue)} ${row.unit ?? ''}`.trim()
          : null,
        row.maximumValue !== null
          ? `maximum ${formatNumber(row.maximumValue)} ${row.unit ?? ''}`.trim()
          : null,
      ]
        .filter(Boolean)
        .join(', '),
    );
  }
  if (row.valueMin !== null || row.valueMax !== null) {
    parts.push(
      `${formatNumber(row.valueMin)}-${formatNumber(row.valueMax)} ${row.unit ?? ''}${frequency}`.trim(),
    );
  }
  if (row.criterionValue !== null) {
    parts.push(`${formatNumber(row.criterionValue)} ${row.unit ?? ''}${frequency}`.trim());
  }
  if (row.alertValue !== null) {
    parts.push(`alert ${formatNumber(row.alertValue)} ${row.unit ?? ''}`.trim());
  }
  if (row.stopWorkValue !== null) {
    parts.push(`stop work ${formatNumber(row.stopWorkValue)} ${row.unit ?? ''}`.trim());
  }
  if (row.absoluteMaxValue !== null) {
    parts.push(`absolute max ${formatNumber(row.absoluteMaxValue)} ${row.unit ?? ''}`.trim());
  }

  return parts.filter(Boolean).join('; ') || 'Descriptive criterion';
}

function formatWorkingHours(row: NoiseVibrationCriterionRow) {
  const parts = [
    row.weekdayStart && row.weekdayEnd ? `Mon-Fri ${row.weekdayStart}-${row.weekdayEnd}` : null,
    row.saturdayStart && row.saturdayEnd ? `Sat ${row.saturdayStart}-${row.saturdayEnd}` : null,
    row.sundayAllowed === false
      ? 'no Sunday work'
      : row.sundayAllowed === true
        ? 'Sunday allowed'
        : null,
    row.publicHolidayAllowed === false
      ? 'no public holiday work'
      : row.publicHolidayAllowed === true
        ? 'public holidays allowed'
        : null,
  ];
  return parts.filter(Boolean).join('; ');
}

function formatFrequency(row: NoiseVibrationCriterionRow) {
  if (row.frequencyMinHz !== null && row.frequencyMaxHz !== null) {
    return ` @ ${formatNumber(row.frequencyMinHz)}-${formatNumber(row.frequencyMaxHz)} Hz`;
  }
  if (row.frequencyMinHz !== null) {
    return ` @ >=${formatNumber(row.frequencyMinHz)} Hz`;
  }
  if (row.frequencyMaxHz !== null) {
    return ` @ <${formatNumber(row.frequencyMaxHz)} Hz`;
  }
  return '';
}

function formatNumber(value: string | null) {
  if (value === null) {
    return '';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return Number.isInteger(numeric) ? String(numeric) : String(numeric);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not captured';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
  }).format(date);
}

function labelFor<T extends string>(options: ReadonlyArray<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ');
}

function resolveProjectReferenceLabel(reference: MultiPileProjectReference) {
  return (
    reference.title || reference.referenceId || reference.documentNumber || 'Untitled reference'
  );
}
