'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Plus, Save, Search, Trash2 } from 'lucide-react';
import type { MultiPileProjectReference, MultiPileProjectSpecifics, Project } from '@eng/shared';
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
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import type { AiDocument } from '@/features/ai/types';
import {
  NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS,
  NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS,
  NOISE_VIBRATION_TIME_PERIOD_OPTIONS,
  NOISE_VIBRATION_WORK_TYPE_OPTIONS,
  type NoiseVibrationCriteriaFilters,
  type NoiseVibrationCriterionRow,
  type NoiseVibrationReceiverType,
  type NoiseVibrationStandardSource,
  type NoiseVibrationWorkType,
} from '@/features/standards/noise-vibration-types';
import { useAiDocuments } from '@/hooks/use-ai';
import {
  useCreateCnvmpActivity,
  useCreateCnvmpMitigationMeasure,
  useCreateCnvmpMonitoringRow,
  useCreateCnvmpReceiver,
  useCreateCnvmpReference,
  useCreateCnvmpSelectedCriterion,
  useCreateCnvmpSelectedSource,
  useDeleteCnvmpActivity,
  useDeleteCnvmpMitigationMeasure,
  useDeleteCnvmpMonitoringRow,
  useDeleteCnvmpReceiver,
  useDeleteCnvmpReference,
  useDeleteCnvmpSelectedCriterion,
  useDeleteCnvmpSelectedSource,
  useProjectCnvmp,
  useUpdateCnvmpActivity,
  useUpdateCnvmpMitigationMeasure,
  useUpdateCnvmpMonitoringRow,
  useUpdateCnvmpReceiver,
  useUpdateCnvmpReference,
  useUpdateCnvmpSelectedCriterion,
  useUpdateCnvmpSelectedSource,
  useUpdateProjectCnvmp,
} from '@/hooks/use-cnvmp';
import { useNoiseVibrationCriteria, useNoiseVibrationSources } from '@/hooks/use-standards';
import { toast } from 'sonner';
import type {
  CnvmpSelectionPurpose,
  ProjectCnvmp,
  ProjectCnvmpActivity,
  ProjectCnvmpActivityInput,
  ProjectCnvmpMitigationMeasure,
  ProjectCnvmpMitigationMeasureInput,
  ProjectCnvmpMonitoringRow,
  ProjectCnvmpMonitoringRowInput,
  ProjectCnvmpReceiver,
  ProjectCnvmpReceiverInput,
  ProjectCnvmpReference,
  ProjectCnvmpReferenceInput,
  ProjectCnvmpRootInput,
  ProjectCnvmpSelectedCriterion,
  ProjectCnvmpSelectedCriterionInput,
  ProjectCnvmpSelectedSource,
  ProjectCnvmpSelectedSourceInput,
} from './cnvmp-types';
import {
  CNVMP_ASSESSMENT_LOCATION_OPTIONS,
  CNVMP_DOCUMENT_STATUS_OPTIONS,
  CNVMP_SELECTION_PURPOSE_OPTIONS,
} from './cnvmp-types';

const ALL_FILTER = '__all__';
const NONE_VALUE = '__none__';
const SUGGESTED_SOURCE_SLUGS = [
  'nsw-epa-icng-2009',
  'nsw-assessing-vibration-technical-guideline',
  'din-4150-3',
];

type CnvmpWorkspaceProps = {
  projectId: string;
  project: Project;
};

type CnvmpProjectIdentity = {
  projectNumber: string;
  projectName: string;
  client: string;
  address: string;
};

export function CnvmpWorkspace({ projectId, project }: CnvmpWorkspaceProps) {
  const { data: cnvmp, isLoading } = useProjectCnvmp(projectId);
  const saveCnvmp = useUpdateProjectCnvmp(projectId);
  const [draft, setDraft] = useState<ProjectCnvmpRootInput | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const projectSpecifics = useMemo(() => extractProjectSpecifics(project), [project]);
  const projectReferences = useMemo(() => projectSpecifics.references, [projectSpecifics]);

  useEffect(() => {
    if (cnvmp && !isDirty) {
      setDraft(rootDraftFromCnvmp(cnvmp));
    }
  }, [cnvmp, isDirty]);

  async function handleSaveRoot() {
    if (!draft) {
      return;
    }

    try {
      await saveCnvmp.mutateAsync(normalizeRootInput(draft));
      setIsDirty(false);
      toast.success('CNVMP saved');
    } catch {
      toast.error('Failed to save CNVMP');
    }
  }

  if (isLoading || !cnvmp || !draft) {
    return <PageLoading />;
  }

  const projectIdentity = resolveProjectIdentity(project, projectSpecifics, cnvmp);
  const selectedNoiseCount = cnvmp.selectedCriteria.filter(
    (selection) => selection.selectionPurpose === 'noise',
  ).length;
  const selectedVibrationCount = cnvmp.selectedCriteria.filter(
    (selection) =>
      selection.selectionPurpose === 'vibration_human_comfort' ||
      selection.selectionPurpose === 'vibration_structural' ||
      selection.selectionPurpose === 'blasting',
  ).length;

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/environmental`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to environmental
        </Link>
      </div>

      <PageHeader
        title="CNVMP"
        description={`${projectIdentity.projectNumber} · Construction Noise and Vibration Management Plan`}
        badges={
          <>
            <Badge variant="outline">{projectIdentity.projectName}</Badge>
            <Badge variant="outline">{cnvmp.receivers.length} receivers</Badge>
            <Badge variant="outline">{cnvmp.activities.length} activities</Badge>
            <Badge variant="outline">{selectedNoiseCount} noise criteria</Badge>
            <Badge variant="outline">{selectedVibrationCount} vibration criteria</Badge>
            {isDirty ? (
              <Badge variant="warning">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
          </>
        }
        actions={
          <Button onClick={handleSaveRoot} disabled={!isDirty || saveCnvmp.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save CNVMP
          </Button>
        }
      />

      <Alert className="mb-6">
        <ClipboardList className="h-4 w-4" />
        <AlertTitle>Authored project deliverable</AlertTitle>
        <AlertDescription>
          CNVMP sits inside Environmental. Project identity comes from the main project record by
          default, then project-specific receivers, activities, controls, monitoring, and
          communication notes are authored here.
        </AlertDescription>
      </Alert>

      <RootSections
        draft={draft}
        projectIdentity={projectIdentity}
        onChange={(patch) => {
          setDraft((current) => ({ ...(current ?? {}), ...patch }));
          setIsDirty(true);
        }}
      />

      <CnvmpReferencesSection
        projectId={projectId}
        cnvmp={cnvmp}
        projectReferences={projectReferences}
      />

      <ReceiverRegisterSection projectId={projectId} cnvmp={cnvmp} />

      <ActivitiesSection projectId={projectId} cnvmp={cnvmp} />

      <ApplicableStandardsSection projectId={projectId} cnvmp={cnvmp} />

      <MitigationMeasuresSection projectId={projectId} cnvmp={cnvmp} />

      <MonitoringRowsSection projectId={projectId} cnvmp={cnvmp} />
    </>
  );
}

function RootSections({
  draft,
  projectIdentity,
  onChange,
}: {
  draft: ProjectCnvmpRootInput;
  projectIdentity: CnvmpProjectIdentity;
  onChange: (patch: ProjectCnvmpRootInput) => void;
}) {
  return (
    <>
      <SectionCard
        title="Project Identity"
        description="Inherited from the project workspace. Legacy CNVMP values are used only as a fallback if project identity is incomplete."
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
        description="Set the report title, revision, status, authorship, and purpose for this CNVMP."
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
            <Select
              value={draft.documentStatus || 'draft'}
              onValueChange={(value) => onChange({ documentStatus: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CNVMP_DOCUMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        title="Project / Site Context"
        description="Author the report-specific site context and construction scope used to frame the CNVMP."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <LabeledField label="Report-specific project description">
            <Textarea
              value={draft.projectDescription ?? ''}
              onChange={(event) => onChange({ projectDescription: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Scope of works">
            <Textarea
              value={draft.scopeOfWorks ?? ''}
              onChange={(event) => onChange({ scopeOfWorks: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Indicative construction activities">
            <Textarea
              value={draft.constructionActivitiesNote ?? ''}
              onChange={(event) => onChange({ constructionActivitiesNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Nearby sensitive receivers summary">
            <Textarea
              value={draft.sensitiveReceiversNote ?? ''}
              onChange={(event) => onChange({ sensitiveReceiversNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Standard construction hours">
            <Textarea
              value={draft.standardHoursNote ?? ''}
              onChange={(event) => onChange({ standardHoursNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Out-of-hours work notes">
            <Textarea
              value={draft.outOfHoursNote ?? ''}
              onChange={(event) => onChange({ outOfHoursNote: event.target.value })}
            />
          </LabeledField>
        </div>
      </SectionCard>

      <SectionCard
        title="Community / Complaints"
        description="Keep the communication and complaints handling text ready for a later report export."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <LabeledField label="Community notification approach">
            <Textarea
              value={draft.communityCommunicationNote ?? ''}
              onChange={(event) => onChange({ communityCommunicationNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Contact details placeholder">
            <Textarea
              value={draft.contactDetailsNote ?? ''}
              onChange={(event) => onChange({ contactDetailsNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Complaints handling summary">
            <Textarea
              value={draft.complaintsHandlingNote ?? ''}
              onChange={(event) => onChange({ complaintsHandlingNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Respite / out-of-hours communication note">
            <Textarea
              value={draft.respiteCommunicationNote ?? ''}
              onChange={(event) => onChange({ respiteCommunicationNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Assumptions / limitations" className="md:col-span-2">
            <Textarea
              value={draft.assumptionsLimitations ?? ''}
              onChange={(event) => onChange({ assumptionsLimitations: event.target.value })}
              className="min-h-32"
            />
          </LabeledField>
        </div>
      </SectionCard>
    </>
  );
}

function CnvmpReferencesSection({
  projectId,
  cnvmp,
  projectReferences,
}: {
  projectId: string;
  cnvmp: ProjectCnvmp;
  projectReferences: MultiPileProjectReference[];
}) {
  const { data: aiDocuments } = useAiDocuments(projectId);
  const createReference = useCreateCnvmpReference(projectId);
  const updateReference = useUpdateCnvmpReference(projectId);
  const deleteReference = useDeleteCnvmpReference(projectId);
  const [draft, setDraft] = useState<ProjectCnvmpReferenceInput>({
    projectReferenceId: null,
    aiDocumentId: null,
    label: '',
    note: '',
  });

  async function handleAdd() {
    try {
      await createReference.mutateAsync(normalizeReferenceInput(draft));
      setDraft({ projectReferenceId: null, aiDocumentId: null, label: '', note: '' });
      toast.success('CNVMP reference linked');
    } catch {
      toast.error('Failed to link CNVMP reference');
    }
  }

  return (
    <SectionCard
      title="Linked Report References"
      description="Link existing project references and AI report registry documents without moving CNVMP into AI Reports."
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
            onChange={(value) => setDraft((current) => ({ ...current, projectReferenceId: value }))}
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
            onChange={(value) => setDraft((current) => ({ ...current, aiDocumentId: value }))}
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
        {cnvmp.references.length === 0 ? (
          <EmptyRows>No linked CNVMP references yet.</EmptyRows>
        ) : (
          cnvmp.references.map((reference) => (
            <ReferenceRow
              key={reference.id}
              row={reference}
              projectReferences={projectReferences}
              aiDocuments={aiDocuments ?? []}
              onSave={(data) =>
                updateReference.mutateAsync({ id: reference.id, data: normalizeReferenceInput(data) })
              }
              onDelete={() => deleteReference.mutateAsync(reference.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function ReceiverRegisterSection({ projectId, cnvmp }: { projectId: string; cnvmp: ProjectCnvmp }) {
  const createReceiver = useCreateCnvmpReceiver(projectId);
  const updateReceiver = useUpdateCnvmpReceiver(projectId);
  const deleteReceiver = useDeleteCnvmpReceiver(projectId);
  const [draft, setDraft] = useState<ProjectCnvmpReceiverInput>({
    label: '',
    receiverType: 'residential',
    isHeritage: false,
    isCritical: false,
    assessmentLocationBasis: 'external',
  });

  async function handleAdd() {
    if (!draft.label?.trim()) {
      toast.error('Receiver label is required');
      return;
    }
    try {
      await createReceiver.mutateAsync(draft);
      setDraft({
        label: '',
        receiverType: 'residential',
        isHeritage: false,
        isCritical: false,
        assessmentLocationBasis: 'external',
      });
      toast.success('Receiver added');
    } catch {
      toast.error('Failed to add receiver');
    }
  }

  return (
    <SectionCard
      title="Receiver Register"
      description="Author the sensitive receiver list used by the plan and selected criteria."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Receiver
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Receiver label">
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
        <LabeledField label="Distance / chainage note">
          <Input
            value={draft.distanceNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, distanceNote: event.target.value }))
            }
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {cnvmp.receivers.length === 0 ? (
          <EmptyRows>No receiver rows yet.</EmptyRows>
        ) : (
          cnvmp.receivers.map((receiver) => (
            <ReceiverRow
              key={receiver.id}
              row={receiver}
              onSave={(data) => updateReceiver.mutateAsync({ id: receiver.id, data })}
              onDelete={() => deleteReceiver.mutateAsync(receiver.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function ActivitiesSection({ projectId, cnvmp }: { projectId: string; cnvmp: ProjectCnvmp }) {
  const createActivity = useCreateCnvmpActivity(projectId);
  const updateActivity = useUpdateCnvmpActivity(projectId);
  const deleteActivity = useDeleteCnvmpActivity(projectId);
  const [draft, setDraft] = useState<ProjectCnvmpActivityInput>({
    label: '',
    workType: 'general_construction',
    isOutsideStandardHours: false,
  });

  async function handleAdd() {
    if (!draft.label?.trim()) {
      toast.error('Activity name is required');
      return;
    }
    try {
      await createActivity.mutateAsync(draft);
      setDraft({ label: '', workType: 'general_construction', isOutsideStandardHours: false });
      toast.success('Activity added');
    } catch {
      toast.error('Failed to add activity');
    }
  }

  return (
    <SectionCard
      title="Construction Activities"
      description="List construction activities and the authored noise/vibration risk notes for each."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Activity name">
          <Input
            value={draft.label ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Work type">
          <WorkTypeSelect
            value={draft.workType ?? 'general_construction'}
            onChange={(workType) => setDraft((current) => ({ ...current, workType }))}
          />
        </LabeledField>
        <ToggleField
          label="Outside standard hours"
          checked={draft.isOutsideStandardHours ?? false}
          onChange={(isOutsideStandardHours) =>
            setDraft((current) => ({ ...current, isOutsideStandardHours }))
          }
        />
        <LabeledField label="Expected timing">
          <Input
            value={draft.timingNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, timingNote: event.target.value }))
            }
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {cnvmp.activities.length === 0 ? (
          <EmptyRows>No construction activity rows yet.</EmptyRows>
        ) : (
          cnvmp.activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              row={activity}
              onSave={(data) => updateActivity.mutateAsync({ id: activity.id, data })}
              onDelete={() => deleteActivity.mutateAsync(activity.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function ApplicableStandardsSection({
  projectId,
  cnvmp,
}: {
  projectId: string;
  cnvmp: ProjectCnvmp;
}) {
  const [filters, setFilters] = useState<NoiseVibrationCriteriaFilters>({});
  const { data: sources } = useNoiseVibrationSources();
  const { data: criteria, isLoading: criteriaLoading } = useNoiseVibrationCriteria(filters);
  const createSource = useCreateCnvmpSelectedSource(projectId);
  const updateSource = useUpdateCnvmpSelectedSource(projectId);
  const deleteSource = useDeleteCnvmpSelectedSource(projectId);
  const createCriterion = useCreateCnvmpSelectedCriterion(projectId);
  const updateCriterion = useUpdateCnvmpSelectedCriterion(projectId);
  const deleteCriterion = useDeleteCnvmpSelectedCriterion(projectId);
  const [sourceToAdd, setSourceToAdd] = useState<string | null>(null);

  const selectedSourceIds = new Set(cnvmp.selectedSources.map((source) => source.standardSourceId));
  const selectedCriterionKeys = new Set(
    cnvmp.selectedCriteria.map(
      (selection) => `${selection.criterionRowId}:${selection.selectionPurpose}`,
    ),
  );
  const suggestedSources = (sources ?? []).filter((source) =>
    SUGGESTED_SOURCE_SLUGS.includes(source.slug),
  );

  async function handleAddSource(sourceId: string | null) {
    if (!sourceId) {
      toast.error('Select a standards source first');
      return;
    }
    const source = sources?.find((entry) => entry.id === sourceId);
    try {
      await createSource.mutateAsync({
        standardSourceId: sourceId,
        isGuidanceOnly: source?.legalStatus !== 'enforceable',
        isEnforceableOnThisProject: false,
      });
      setSourceToAdd(null);
      toast.success('Standards source selected');
    } catch {
      toast.error('Failed to select standards source');
    }
  }

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
      description="Select applicable sources and criterion rows from the read-only Noise and Vibration Standards registry."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <LabeledField label="Add source" className="flex-1">
                <OptionalSelect
                  value={sourceToAdd}
                  placeholder="Choose standards source"
                  options={(sources ?? [])
                    .filter((source) => !selectedSourceIds.has(source.id))
                    .map((source) => ({ value: source.id, label: source.shortName }))}
                  onChange={setSourceToAdd}
                />
              </LabeledField>
              <Button type="button" variant="outline" onClick={() => handleAddSource(sourceToAdd)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Source
              </Button>
            </div>
            {suggestedSources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestedSources.map((source) => (
                  <Button
                    key={source.id}
                    type="button"
                    size="sm"
                    variant={selectedSourceIds.has(source.id) ? 'secondary' : 'outline'}
                    disabled={selectedSourceIds.has(source.id)}
                    onClick={() => handleAddSource(source.id)}
                  >
                    {source.shortName}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          {cnvmp.selectedSources.length === 0 ? (
            <EmptyRows>No applicable standards sources selected yet.</EmptyRows>
          ) : (
            cnvmp.selectedSources.map((source) => (
              <SelectedSourceRow
                key={source.id}
                row={source}
                onSave={(data) => updateSource.mutateAsync({ id: source.id, data })}
                onDelete={() => deleteSource.mutateAsync(source.id)}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FilterSelect
                label="Source"
                value={filters.sourceSlug}
                placeholder="All sources"
                options={(sources ?? []).map((source) => ({
                  value: source.slug,
                  label: source.shortName,
                }))}
                onChange={(value) => setFilter('sourceSlug', value)}
              />
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
              <LabeledField label="Search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.q ?? ''}
                    onChange={(event) => setFilter('q', event.target.value)}
                    placeholder="ICNG, VDV, DIN, PPV"
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
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold">Selected Criteria</h3>
        {cnvmp.selectedCriteria.length === 0 ? (
          <EmptyRows>No selected criterion rows yet.</EmptyRows>
        ) : (
          <div className="space-y-3">
            {cnvmp.selectedCriteria.map((selection) => (
              <SelectedCriterionRow
                key={selection.id}
                row={selection}
                onSave={(data) => updateCriterion.mutateAsync({ id: selection.id, data })}
                onDelete={() => deleteCriterion.mutateAsync(selection.id)}
              />
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function MitigationMeasuresSection({ projectId, cnvmp }: { projectId: string; cnvmp: ProjectCnvmp }) {
  const createMeasure = useCreateCnvmpMitigationMeasure(projectId);
  const updateMeasure = useUpdateCnvmpMitigationMeasure(projectId);
  const deleteMeasure = useDeleteCnvmpMitigationMeasure(projectId);
  const [draft, setDraft] = useState<ProjectCnvmpMitigationMeasureInput>({
    category: '',
    measure: '',
  });

  async function handleAdd() {
    if (!draft.category?.trim() || !draft.measure?.trim()) {
      toast.error('Category and measure are required');
      return;
    }
    try {
      await createMeasure.mutateAsync(draft);
      setDraft({ category: '', measure: '' });
      toast.success('Mitigation measure added');
    } catch {
      toast.error('Failed to add mitigation measure');
    }
  }

  return (
    <SectionCard
      title="Mitigation and Management Measures"
      description="Author management measures without adding a rules engine."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Measure
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <LabeledField label="Category">
          <Input
            value={draft.category ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Measure">
          <Input
            value={draft.measure ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, measure: event.target.value }))
            }
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {cnvmp.mitigationRows.length === 0 ? (
          <EmptyRows>No mitigation rows yet.</EmptyRows>
        ) : (
          cnvmp.mitigationRows.map((row) => (
            <MitigationMeasureRow
              key={row.id}
              row={row}
              onSave={(data) => updateMeasure.mutateAsync({ id: row.id, data })}
              onDelete={() => deleteMeasure.mutateAsync(row.id)}
            />
          ))
        )}
      </div>
    </SectionCard>
  );
}

function MonitoringRowsSection({ projectId, cnvmp }: { projectId: string; cnvmp: ProjectCnvmp }) {
  const createRow = useCreateCnvmpMonitoringRow(projectId);
  const updateRow = useUpdateCnvmpMonitoringRow(projectId);
  const deleteRow = useDeleteCnvmpMonitoringRow(projectId);
  const [draft, setDraft] = useState<ProjectCnvmpMonitoringRowInput>({
    parameter: '',
    method: '',
  });

  async function handleAdd() {
    if (!draft.parameter?.trim()) {
      toast.error('Monitoring parameter is required');
      return;
    }
    try {
      await createRow.mutateAsync(draft);
      setDraft({ parameter: '', method: '' });
      toast.success('Monitoring row added');
    } catch {
      toast.error('Failed to add monitoring row');
    }
  }

  return (
    <SectionCard
      title="Monitoring and Reporting Plan"
      description="Author monitoring parameters, triggers, responsibilities, and reporting notes."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Monitoring Row
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <LabeledField label="Parameter">
          <Input
            value={draft.parameter ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, parameter: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Method">
          <Input
            value={draft.method ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}
          />
        </LabeledField>
      </div>

      <div className="mt-4 space-y-3">
        {cnvmp.monitoringRows.length === 0 ? (
          <EmptyRows>No monitoring rows yet.</EmptyRows>
        ) : (
          cnvmp.monitoringRows.map((row) => (
            <MonitoringRow
              key={row.id}
              row={row}
              onSave={(data) => updateRow.mutateAsync({ id: row.id, data })}
              onDelete={() => deleteRow.mutateAsync(row.id)}
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
  row: ProjectCnvmpReference;
  projectReferences: MultiPileProjectReference[];
  aiDocuments: AiDocument[];
  onSave: (data: ProjectCnvmpReferenceInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectCnvmpReferenceInput>(normalizeReferenceInput(row));

  useEffect(() => {
    setDraft(normalizeReferenceInput(row));
  }, [row]);

  return (
    <EditableRow
      title={row.label || row.aiDocument?.filename || 'CNVMP reference'}
      meta={[
        row.projectReferenceId ? 'Project reference linked' : null,
        row.aiDocument ? row.aiDocument.filename : null,
      ]}
      onSave={() => onSave(normalizeReferenceInput(draft))}
      onDelete={onDelete}
      saveToast="CNVMP reference saved"
      deleteToast="CNVMP reference deleted"
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
            onChange={(value) => setDraft((current) => ({ ...current, projectReferenceId: value }))}
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
            onChange={(value) => setDraft((current) => ({ ...current, aiDocumentId: value }))}
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

function ReceiverRow({
  row,
  onSave,
  onDelete,
}: {
  row: ProjectCnvmpReceiver;
  onSave: (data: ProjectCnvmpReceiverInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectCnvmpReceiverInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.label}
      meta={[
        labelFor(NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS, row.receiverType),
        row.distanceNote,
        row.isHeritage ? 'Heritage' : null,
        row.isCritical ? 'Critical' : null,
      ]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Receiver saved"
      deleteToast="Receiver deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Receiver label">
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
        <LabeledField label="Distance / chainage note">
          <Input
            value={draft.distanceNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, distanceNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Sensitivity note">
          <Input
            value={draft.sensitivityNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, sensitivityNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Active time / use note">
          <Input
            value={draft.usePeriodNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, usePeriodNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Assessment location basis">
          <OptionalSelect
            value={draft.assessmentLocationBasis ?? null}
            placeholder="No basis"
            options={CNVMP_ASSESSMENT_LOCATION_OPTIONS}
            onChange={(assessmentLocationBasis) =>
              setDraft((current) => ({ ...current, assessmentLocationBasis }))
            }
          />
        </LabeledField>
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleField
            label="Heritage"
            checked={draft.isHeritage ?? false}
            onChange={(isHeritage) => setDraft((current) => ({ ...current, isHeritage }))}
          />
          <ToggleField
            label="Critical"
            checked={draft.isCritical ?? false}
            onChange={(isCritical) => setDraft((current) => ({ ...current, isCritical }))}
          />
        </div>
      </div>
    </EditableRow>
  );
}

function ActivityRow({
  row,
  onSave,
  onDelete,
}: {
  row: ProjectCnvmpActivity;
  onSave: (data: ProjectCnvmpActivityInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectCnvmpActivityInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.label}
      meta={[
        labelFor(NOISE_VIBRATION_WORK_TYPE_OPTIONS, row.workType),
        row.isOutsideStandardHours ? 'Outside standard hours' : 'Standard hours',
      ]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Activity saved"
      deleteToast="Activity deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Activity name">
          <Input
            value={draft.label ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Work type">
          <WorkTypeSelect
            value={draft.workType ?? 'general_construction'}
            onChange={(workType) => setDraft((current) => ({ ...current, workType }))}
          />
        </LabeledField>
        <LabeledField label="Expected timing">
          <Input
            value={draft.timingNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, timingNote: event.target.value }))
            }
          />
        </LabeledField>
        <ToggleField
          label="Outside standard hours"
          checked={draft.isOutsideStandardHours ?? false}
          onChange={(isOutsideStandardHours) =>
            setDraft((current) => ({ ...current, isOutsideStandardHours }))
          }
        />
        <LabeledField label="Description" className="md:col-span-2">
          <Textarea
            value={draft.description ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Noise risk note">
          <Textarea
            value={draft.noiseRiskNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, noiseRiskNote: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Vibration risk note">
          <Textarea
            value={draft.vibrationRiskNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, vibrationRiskNote: event.target.value }))
            }
          />
        </LabeledField>
      </div>
    </EditableRow>
  );
}

function SelectedSourceRow({
  row,
  onSave,
  onDelete,
}: {
  row: ProjectCnvmpSelectedSource;
  onSave: (data: ProjectCnvmpSelectedSourceInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectCnvmpSelectedSourceInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.standardSource.name}
      meta={[
        row.standardSource.shortName,
        row.standardSource.jurisdiction,
        row.standardSource.legalStatus.replace(/_/g, ' '),
        row.isEnforceableOnThisProject ? 'Project enforceable' : 'Guidance / reference',
      ]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Standards source saved"
      deleteToast="Standards source removed"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleField
            label="Guidance only"
            checked={draft.isGuidanceOnly ?? false}
            onChange={(isGuidanceOnly) => setDraft((current) => ({ ...current, isGuidanceOnly }))}
          />
          <ToggleField
            label="Enforceable on this project"
            checked={draft.isEnforceableOnThisProject ?? false}
            onChange={(isEnforceableOnThisProject) =>
              setDraft((current) => ({ ...current, isEnforceableOnThisProject }))
            }
          />
        </div>
        <LabeledField label="Condition / consent / licence reference">
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
        <LabeledField label="Project-specific note" className="md:col-span-2">
          <Textarea
            value={draft.selectionNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, selectionNote: event.target.value }))
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
          {row.rowNotes ? <p className="text-xs text-muted-foreground">{row.rowNotes}</p> : null}
        </div>
        <Button type="button" variant={selected ? 'secondary' : 'outline'} size="sm" onClick={onAdd} disabled={selected}>
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
  row: ProjectCnvmpSelectedCriterion;
  onSave: (data: ProjectCnvmpSelectedCriterionInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectCnvmpSelectedCriterionInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.criterionRow.label}
      meta={[
        row.criterionRow.source.shortName,
        labelFor(CNVMP_SELECTION_PURPOSE_OPTIONS, row.selectionPurpose),
        row.isEnforceableOnThisProject ? 'Project enforceable' : 'Not marked enforceable',
      ]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Selected criterion saved"
      deleteToast="Selected criterion removed"
    >
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{formatCriterionExpression(row.criterionRow)}</p>
          <CriterionBadges row={row.criterionRow} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Selection purpose">
            <Select
              value={draft.selectionPurpose ?? row.selectionPurpose}
              onValueChange={(selectionPurpose) =>
                setDraft((current) => ({
                  ...current,
                  selectionPurpose: selectionPurpose as CnvmpSelectionPurpose,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CNVMP_SELECTION_PURPOSE_OPTIONS.map((option) => (
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

function MitigationMeasureRow({
  row,
  onSave,
  onDelete,
}: {
  row: ProjectCnvmpMitigationMeasure;
  onSave: (data: ProjectCnvmpMitigationMeasureInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectCnvmpMitigationMeasureInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.measure}
      meta={[row.category, row.responsibility, row.timingStage]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Mitigation measure saved"
      deleteToast="Mitigation measure deleted"
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
        <LabeledField label="Measure" className="xl:col-span-3">
          <Input
            value={draft.measure ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, measure: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Trigger">
          <Input
            value={draft.triggerNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, triggerNote: event.target.value }))
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
        <LabeledField label="Timing / stage">
          <Input
            value={draft.timingStage ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, timingStage: event.target.value }))
            }
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

function MonitoringRow({
  row,
  onSave,
  onDelete,
}: {
  row: ProjectCnvmpMonitoringRow;
  onSave: (data: ProjectCnvmpMonitoringRowInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<ProjectCnvmpMonitoringRowInput>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <EditableRow
      title={row.parameter}
      meta={[row.method, row.location, row.frequency]}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      saveToast="Monitoring row saved"
      deleteToast="Monitoring row deleted"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Parameter">
          <Input
            value={draft.parameter ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, parameter: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Method">
          <Input
            value={draft.method ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Location">
          <Input
            value={draft.location ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, location: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Frequency">
          <Input
            value={draft.frequency ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, frequency: event.target.value }))
            }
          />
        </LabeledField>
        <LabeledField label="Trigger / action" className="md:col-span-2">
          <Textarea
            value={draft.triggerAction ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, triggerAction: event.target.value }))
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
        <LabeledField label="Reporting note">
          <Textarea
            value={draft.reportingNote ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, reportingNote: event.target.value }))
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

  const visibleMeta = meta.filter((value): value is string => Boolean(value && value.trim()));

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
        <Badge variant="secondary">
          {labelFor(NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS, row.receiverType)}
        </Badge>
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

function WorkTypeSelect({
  value,
  onChange,
}: {
  value: NoiseVibrationWorkType;
  onChange: (value: NoiseVibrationWorkType) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as NoiseVibrationWorkType)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {NOISE_VIBRATION_WORK_TYPE_OPTIONS.map((option) => (
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

function rootDraftFromCnvmp(cnvmp: ProjectCnvmp): ProjectCnvmpRootInput {
  return {
    title: cnvmp.title ?? '',
    revision: cnvmp.revision ?? '',
    issueDate: toDateInput(cnvmp.issueDate),
    preparedBy: cnvmp.preparedBy ?? '',
    checkedBy: cnvmp.checkedBy ?? '',
    purpose: cnvmp.purpose ?? '',
    documentStatus: cnvmp.documentStatus ?? 'draft',
    projectDescription: cnvmp.projectDescription ?? '',
    scopeOfWorks: cnvmp.scopeOfWorks ?? '',
    constructionActivitiesNote: cnvmp.constructionActivitiesNote ?? '',
    standardHoursNote: cnvmp.standardHoursNote ?? '',
    outOfHoursNote: cnvmp.outOfHoursNote ?? '',
    sensitiveReceiversNote: cnvmp.sensitiveReceiversNote ?? '',
    communityCommunicationNote: cnvmp.communityCommunicationNote ?? '',
    contactDetailsNote: cnvmp.contactDetailsNote ?? '',
    complaintsHandlingNote: cnvmp.complaintsHandlingNote ?? '',
    respiteCommunicationNote: cnvmp.respiteCommunicationNote ?? '',
    assumptionsLimitations: cnvmp.assumptionsLimitations ?? '',
  };
}

function normalizeRootInput(input: ProjectCnvmpRootInput): ProjectCnvmpRootInput {
  return {
    ...blankStringsToNull(input),
    issueDate: input.issueDate || null,
  };
}

function normalizeReferenceInput(input: ProjectCnvmpReferenceInput): ProjectCnvmpReferenceInput {
  return {
    projectReferenceId: input.projectReferenceId || null,
    aiDocumentId: input.aiDocumentId || null,
    label: input.label || null,
    note: input.note || null,
    sortOrder: input.sortOrder,
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

function resolveProjectIdentity(
  project: Project,
  projectSpecifics: MultiPileProjectSpecifics,
  cnvmp: ProjectCnvmp,
): CnvmpProjectIdentity {
  const identity = projectSpecifics.identity;

  return {
    projectNumber: identity.projectNumber || project.code || 'Not set',
    projectName: identity.projectName || project.name || cnvmp.projectName || 'Untitled Project',
    client: identity.client || cnvmp.client || 'Not set',
    address: identity.address || cnvmp.projectAddress || 'Not set',
  };
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function defaultSelectionPurpose(row: NoiseVibrationCriterionRow): CnvmpSelectionPurpose {
  if (
    row.group.criterionCategory === 'vibration_human_comfort' ||
    row.group.metric === 'vdv'
  ) {
    return 'vibration_human_comfort';
  }
  if (
    row.group.criterionCategory === 'vibration_structural_damage' ||
    row.group.metric === 'ppv'
  ) {
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
  if (row.exceedanceAllowancePercent !== null) {
    parts.push(
      `${formatNumber(row.exceedanceAllowancePercent)}% exceedance allowance${
        row.exceedanceWindowText
          ? ` over ${row.exceedanceWindowText.replace(/^5% of blasts over /, '')}`
          : ''
      }`,
    );
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
