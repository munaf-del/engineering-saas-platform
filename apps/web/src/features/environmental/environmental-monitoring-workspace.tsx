'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Plus, Save, Search, Trash2 } from 'lucide-react';
import type { MultiPileProjectReference, Project } from '@eng/shared';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_OPTIONS,
  ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUS_OPTIONS,
  ENVIRONMENTAL_MONITORING_METRIC_TYPE_OPTIONS,
  ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS,
  ENVIRONMENTAL_MONITORING_SELECTION_PURPOSE_OPTIONS,
  type EnvironmentalMonitoringAssessmentLocationBasis,
  type EnvironmentalMonitoringComplianceStatus,
  type EnvironmentalMonitoringMetricType,
  type EnvironmentalMonitoringReportType,
  type EnvironmentalMonitoringSelectionPurpose,
  type ProjectEnvironmentalMonitoringLocation,
  type ProjectEnvironmentalMonitoringLocationInput,
  type ProjectEnvironmentalMonitoringObservation,
  type ProjectEnvironmentalMonitoringObservationInput,
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
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import {
  NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS,
  NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS,
  NOISE_VIBRATION_TIME_PERIOD_OPTIONS,
  NOISE_VIBRATION_WORK_TYPE_OPTIONS,
  type NoiseVibrationCriteriaFilters,
  type NoiseVibrationCriterionRow,
  type NoiseVibrationReceiverType,
} from '@/features/standards/noise-vibration-types';
import { useAiDocuments } from '@/hooks/use-ai';
import {
  useCreateEnvironmentalMonitoringLocation,
  useCreateEnvironmentalMonitoringObservation,
  useCreateEnvironmentalMonitoringRecommendation,
  useCreateEnvironmentalMonitoringReference,
  useCreateEnvironmentalMonitoringSelectedCriterion,
  useCreateEnvironmentalNoiseResult,
  useCreateEnvironmentalVibrationResult,
  useDeleteEnvironmentalMonitoringLocation,
  useDeleteEnvironmentalMonitoringObservation,
  useDeleteEnvironmentalMonitoringRecommendation,
  useDeleteEnvironmentalMonitoringReference,
  useDeleteEnvironmentalMonitoringSelectedCriterion,
  useDeleteEnvironmentalNoiseResult,
  useDeleteEnvironmentalVibrationResult,
  useEnvironmentalMonitoringReport,
  useUpdateEnvironmentalMonitoringLocation,
  useUpdateEnvironmentalMonitoringObservation,
  useUpdateEnvironmentalMonitoringRecommendation,
  useUpdateEnvironmentalMonitoringReference,
  useUpdateEnvironmentalMonitoringReport,
  useUpdateEnvironmentalMonitoringSelectedCriterion,
  useUpdateEnvironmentalNoiseResult,
  useUpdateEnvironmentalVibrationResult,
} from '@/hooks/use-environmental-monitoring';
import { useNoiseVibrationCriteria } from '@/hooks/use-standards';
import { toast } from 'sonner';

const ALL_FILTER = '__all__';
const NONE_VALUE = '__none__';

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
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringReportRootInput | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const projectSpecifics = useMemo(() => extractProjectSpecifics(project), [project]);
  const projectReferences = useMemo(() => projectSpecifics.references, [projectSpecifics]);

  useEffect(() => {
    if (report && !isDirty) {
      setDraft(rootDraftFromReport(report));
    }
  }, [report, isDirty]);

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

  const projectIdentity = resolveProjectIdentity(project);
  const reportTypeLabel = labelFor(
    ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS,
    report.reportType,
  );
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
            <Badge variant="outline">{report.locations.length} locations</Badge>
            <Badge variant="outline">{report.selectedCriteria.length} criteria</Badge>
            <Badge variant="outline">{resultCount} results</Badge>
            {isDirty ? <Badge variant="warning">Unsaved changes</Badge> : <Badge variant="success">Saved</Badge>}
          </>
        }
        actions={
          <Button onClick={handleSave} disabled={!isDirty || updateReport.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save Report
          </Button>
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
      <SectionCard
        title="Project Identity"
        description="Inherited from the project workspace."
      >
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
              onSave={(data) => updateReference.mutateAsync({ id: row.id, data: normalizeReferenceInput(data) })}
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
  const createLocation = useCreateEnvironmentalMonitoringLocation(projectId, reportId);
  const updateLocation = useUpdateEnvironmentalMonitoringLocation(projectId, reportId);
  const deleteLocation = useDeleteEnvironmentalMonitoringLocation(projectId, reportId);
  const [draft, setDraft] = useState<ProjectEnvironmentalMonitoringLocationInput>({
    label: '',
    receiverType: 'residential',
  });

  async function handleAdd() {
    if (!draft.label?.trim()) {
      toast.error('Location label is required');
      return;
    }
    try {
      await createLocation.mutateAsync(draft);
      setDraft({ label: '', receiverType: 'residential' });
      toast.success('Location added');
    } catch {
      toast.error('Failed to add location');
    }
  }

  return (
    <SectionCard
      title="Monitoring Locations"
      description="Record monitoring locations and their receiver context."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      }
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
            value={draft.receiverType ?? 'residential'}
            onChange={(receiverType) => setDraft((current) => ({ ...current, receiverType }))}
          />
        </LabeledField>
        <LabeledField label="Distance note">
          <Input
            value={draft.distanceNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, distanceNote: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Chainage note">
          <Input
            value={draft.chainageNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, chainageNote: event.target.value }))}
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
    report.selectedCriteria.map((selection) => `${selection.criterionRowId}:${selection.selectionPurpose}`),
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
              (criteria ?? []).slice(0, 80).map((row) => (
                <CriterionPickerRow
                  key={row.id}
                  row={row}
                  selected={selectedCriterionKeys.has(`${row.id}:${defaultSelectionPurpose(row)}`)}
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
            onChange={(event) => setDraft((current) => ({ ...current, activityLabel: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Observed at">
          <Input
            type="datetime-local"
            value={draft.observedAt ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, observedAt: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Location">
          <OptionalSelect
            value={draft.locationId ?? null}
            placeholder="No location"
            options={report.locations.map((location) => ({ value: location.id, label: location.label }))}
            onChange={(locationId) => setDraft((current) => ({ ...current, locationId }))}
          />
        </LabeledField>
        <LabeledField label="Compliance status">
          <ComplianceStatusSelect
            value={draft.complianceStatus ?? 'not_assessed'}
            onChange={(complianceStatus) => setDraft((current) => ({ ...current, complianceStatus }))}
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
              onSave={(data) => updateResult.mutateAsync({ id: row.id, data: normalizeNoiseResultInput(data) })}
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
            onChange={(event) => setDraft((current) => ({ ...current, activityLabel: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Observed at">
          <Input
            type="datetime-local"
            value={draft.observedAt ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, observedAt: event.target.value }))}
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
            onChange={(complianceStatus) => setDraft((current) => ({ ...current, complianceStatus }))}
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
              onSave={(data) => updateResult.mutateAsync({ id: row.id, data: normalizeVibrationResultInput(data) })}
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
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Observation">
          <Input
            value={draft.observation ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, observation: event.target.value }))}
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {report.observations.length === 0 ? (
          <EmptyRows>No observations yet.</EmptyRows>
        ) : (
          report.observations.map((row) => (
            <ObservationRow
              key={row.id}
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
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Recommendation">
          <Input
            value={draft.recommendation ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, recommendation: event.target.value }))}
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
        labelFor(NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS, row.receiverType),
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
            value={draft.receiverType ?? 'residential'}
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
            onChange={(event) => setDraft((current) => ({ ...current, distanceNote: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Chainage note">
          <Input
            value={draft.chainageNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, chainageNote: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Coordinates note">
          <Input
            value={draft.coordinatesNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, coordinatesNote: event.target.value }))}
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
      ]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Selected criterion saved"
      deleteToast="Selected criterion deleted"
    >
      <div className="space-y-3">
        <p className="text-sm font-medium">{formatCriterionExpression(row.criterionRow)}</p>
        <CriterionBadges row={row.criterionRow} />
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
              onChange={(event) => setDraft((current) => ({ ...current, selectionNote: event.target.value }))}
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

  return (
    <EditableRow
      title={row.activityLabel}
      meta={[
        row.location?.label,
        row.laeq15min ? `LAeq ${row.laeq15min}` : null,
        row.lamax ? `LAmax ${row.lamax}` : null,
        labelFor(ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUS_OPTIONS, row.complianceStatus),
      ]}
      onSave={() => onSave(normalizeNoiseResultInput(draft))}
      onDelete={onDelete}
      saveToast="Noise result saved"
      deleteToast="Noise result deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Activity label">
          <Input
            value={draft.activityLabel ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, activityLabel: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Observed at">
          <Input
            type="datetime-local"
            value={draft.observedAt ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, observedAt: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Location">
          <OptionalSelect
            value={draft.locationId ?? null}
            placeholder="No location"
            options={report.locations.map((location) => ({ value: location.id, label: location.label }))}
            onChange={(locationId) => setDraft((current) => ({ ...current, locationId }))}
          />
        </LabeledField>
        <LabeledField label="Compliance status">
          <ComplianceStatusSelect
            value={draft.complianceStatus ?? 'not_assessed'}
            onChange={(complianceStatus) => setDraft((current) => ({ ...current, complianceStatus }))}
          />
        </LabeledField>
        <LabeledField label="Instrument note">
          <Input
            value={draft.instrumentNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, instrumentNote: event.target.value }))}
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
        <LabeledField label="LAeq,15min">
          <Input
            value={draft.laeq15min ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, laeq15min: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="LAmax">
          <Input
            value={draft.lamax ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, lamax: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="LAF1,1min">
          <Input
            value={draft.laf1_1min ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, laf1_1min: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Criterion">
          <OptionalSelect
            value={draft.criterionRowId ?? null}
            placeholder="No linked criterion"
            options={criteriaOptionsForNoise(report)}
            onChange={(criterionRowId) => setDraft((current) => ({ ...current, criterionRowId }))}
          />
        </LabeledField>
        <LabeledField label="Background note" className="md:col-span-2">
          <Textarea
            value={draft.backgroundNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, backgroundNote: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Result note" className="md:col-span-2">
          <Textarea
            value={draft.resultNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, resultNote: event.target.value }))}
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
            onChange={(event) => setDraft((current) => ({ ...current, activityLabel: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Observed at">
          <Input
            type="datetime-local"
            value={draft.observedAt ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, observedAt: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Location">
          <OptionalSelect
            value={draft.locationId ?? null}
            placeholder="No location"
            options={report.locations.map((location) => ({ value: location.id, label: location.label }))}
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
            onChange={(event) => setDraft((current) => ({ ...current, instrumentNote: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="PPV">
          <Input
            value={draft.ppvValue ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, ppvValue: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="VDV">
          <Input
            value={draft.vdvValue ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, vdvValue: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Lin Peak">
          <Input
            value={draft.linPeakValue ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, linPeakValue: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Dominant frequency (Hz)">
          <Input
            value={draft.dominantFrequencyHz ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, dominantFrequencyHz: event.target.value }))}
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
            onChange={(complianceStatus) => setDraft((current) => ({ ...current, complianceStatus }))}
          />
        </LabeledField>
        <LabeledField label="Axis note">
          <Input
            value={draft.axisNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, axisNote: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Result note" className="md:col-span-2 xl:col-span-4">
          <Textarea
            value={draft.resultNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, resultNote: event.target.value }))}
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function ObservationRow({
  row,
  onSave,
  onDelete,
}: {
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
      meta={[row.category]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Observation saved"
      deleteToast="Observation deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Observation" className="md:col-span-2">
          <Textarea
            value={draft.observation ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, observation: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Implication note">
          <Textarea
            value={draft.implicationNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, implicationNote: event.target.value }))}
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function RecommendationRow({
  row,
  onSave,
  onDelete,
}: {
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
      meta={[row.category, row.priority, row.responsibility]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Recommendation saved"
      deleteToast="Recommendation deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Recommendation" className="xl:col-span-3">
          <Textarea
            value={draft.recommendation ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, recommendation: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Priority">
          <Input
            value={draft.priority ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Responsibility">
          <Input
            value={draft.responsibility ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, responsibility: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Timing note">
          <Input
            value={draft.timingNote ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, timingNote: event.target.value }))}
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
          <Button type="button" variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete row">
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
        <Badge variant="secondary">{labelFor(NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS, row.receiverType)}</Badge>
      ) : null}
      {row.timePeriod ? (
        <Badge variant="outline">{labelFor(NOISE_VIBRATION_TIME_PERIOD_OPTIONS, row.timePeriod)}</Badge>
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
  value: NoiseVibrationReceiverType;
  onChange: (value: NoiseVibrationReceiverType) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as NoiseVibrationReceiverType)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
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
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as EnvironmentalMonitoringMetricType)}>
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

function ComplianceStatusSelect({
  value,
  onChange,
}: {
  value: EnvironmentalMonitoringComplianceStatus;
  onChange: (value: EnvironmentalMonitoringComplianceStatus) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as EnvironmentalMonitoringComplianceStatus)}>
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

function normalizeNoiseResultInput(
  input: ProjectEnvironmentalNoiseResultRowInput,
): ProjectEnvironmentalNoiseResultRowInput {
  return {
    ...blankStringsToNull({
      ...input,
      observedAt: toIsoDateTime(input.observedAt),
    }),
    locationId: input.locationId || null,
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
      value: row.criterionRowId,
      label: `${row.criterionRow.source.shortName} · ${row.criterionRow.label}`,
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
    row.sundayAllowed === false ? 'no Sunday work' : row.sundayAllowed === true ? 'Sunday allowed' : null,
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

function labelFor<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ');
}

function resolveProjectReferenceLabel(reference: MultiPileProjectReference) {
  return reference.title || reference.referenceId || reference.documentNumber || 'Untitled reference';
}
