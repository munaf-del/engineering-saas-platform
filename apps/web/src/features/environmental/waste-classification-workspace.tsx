'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Eye, FlaskConical, Plus, Save, Trash2 } from 'lucide-react';
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
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import { WasteClassificationAutofillPanel } from '@/features/environmental/waste-classification-autofill-panel';
import { WasteClassificationDisposalHelper } from '@/features/environmental/waste-classification-disposal-helper';
import {
  applyAssAutofillResultToPathway,
  applyWasteClassificationDraftSuggestion,
  buildWasteClassificationDraftSuggestions,
} from '@/features/environmental/waste-classification-draft-helpers';
import { WasteClassificationStep5Helper } from '@/features/environmental/waste-classification-step5-helper';
import { useAiDocuments } from '@/hooks/use-ai';
import {
  useAutofillWasteClassificationAssPathway,
  useCreateWasteClassificationLabResult,
  useCreateWasteClassificationRecommendation,
  useCreateWasteClassificationReference,
  useDeleteWasteClassificationLabResult,
  useDeleteWasteClassificationRecommendation,
  useDeleteWasteClassificationReference,
  useUpdateWasteClassificationChecklistItem,
  useUpdateWasteClassificationLabResult,
  useUpdateWasteClassificationMaterialPathway,
  useUpdateWasteClassificationRecommendation,
  useUpdateWasteClassificationReference,
  useUpdateWasteClassificationRelatedPathway,
  useUpdateWasteClassificationReport,
  useUpdateWasteClassificationStepDecision,
  useWasteClassificationReport,
} from '@/hooks/use-waste-classification';
import { toast } from 'sonner';
import {
  ACID_SULFATE_SOIL_CLASS_OPTIONS,
  WASTE_CLASSIFICATION_OUTCOME_STATUS_OPTIONS,
  WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_OPTIONS,
  WASTE_CLASSIFICATION_PATHWAY_CODE_OPTIONS,
  WASTE_CLASSIFICATION_MATERIAL_PATHWAY_CODE_OPTIONS,
  WASTE_CLASSIFICATION_REFERENCE_TYPE_OPTIONS,
  WASTE_CLASS_OPTIONS,
  type ProjectWasteClassificationAcidSulfateSoilClass,
  type ProjectWasteClass,
  type ProjectWasteClassificationChecklistItem,
  type ProjectWasteClassificationChecklistItemInput,
  type ProjectWasteClassificationLabResult,
  type ProjectWasteClassificationLabResultInput,
  type ProjectWasteClassificationMaterialPathway,
  type ProjectWasteClassificationMaterialPathwayChecklistItem,
  type ProjectWasteClassificationMaterialPathwayChecklistItemInput,
  type ProjectWasteClassificationMaterialPathwayInput,
  type ProjectWasteClassificationRecommendation,
  type ProjectWasteClassificationRecommendationInput,
  type ProjectWasteClassificationReference,
  type ProjectWasteClassificationReferenceInput,
  type ProjectWasteClassificationRelatedPathway,
  type ProjectWasteClassificationRelatedPathwayInput,
  type ProjectWasteClassificationReport,
  type ProjectWasteClassificationReportRootInput,
  type ProjectWasteClassificationStepDecision,
  type ProjectWasteClassificationStepDecisionInput,
} from './waste-classification-types';

const NONE_VALUE = '__none__';

type WasteClassificationWorkspaceProps = {
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

export function WasteClassificationWorkspace({
  projectId,
  reportId,
  project,
}: WasteClassificationWorkspaceProps) {
  const { data: report, isLoading } = useWasteClassificationReport(projectId, reportId);
  const updateReport = useUpdateWasteClassificationReport(projectId, reportId);
  const [draft, setDraft] = useState<ProjectWasteClassificationReportRootInput | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const projectSpecifics = useMemo(() => extractProjectSpecifics(project), [project]);
  const projectReferences = projectSpecifics.references;
  const { data: aiDocuments } = useAiDocuments(projectId);
  const draftSuggestions = useMemo(
    () =>
      report
        ? buildWasteClassificationDraftSuggestions({
            report,
            projectReferences,
            aiDocuments: aiDocuments ?? [],
          })
        : [],
    [aiDocuments, projectReferences, report],
  );

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
      toast.success('Waste classification report saved');
    } catch {
      toast.error('Failed to save waste classification report');
    }
  }

  if (isLoading || !report || !draft) {
    return <PageLoading />;
  }

  const projectIdentity = resolveProjectIdentity(project);
  const firstReachedStepIndex = report.stepDecisions.findIndex((step) => step.classificationReached);

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/environmental/waste-classification`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to waste classification reports
        </Link>
      </div>

      <PageHeader
        title={report.title?.trim() || 'Waste Classification Report'}
        description={`${projectIdentity.projectNumber} · NSW EPA step-based authored waste classification`}
        badges={
          <>
            <Badge variant="outline">{projectIdentity.projectName}</Badge>
            <Badge variant="outline">{report.references.length} references</Badge>
            <Badge variant="outline">{report.stepDecisions.length} steps</Badge>
            <Badge variant="outline">{report.labResults.length} lab results</Badge>
            <Badge variant={draft.finalWasteClass === 'not_yet_classified' ? 'warning' : 'success'}>
              {labelFor(WASTE_CLASS_OPTIONS, draft.finalWasteClass ?? 'not_yet_classified')}
            </Badge>
            {isDirty ? <Badge variant="warning">Unsaved changes</Badge> : <Badge variant="success">Saved</Badge>}
          </>
        }
        actions={
          <>
            <Link
              href={`/projects/${projectId}/environmental/waste-classification/${reportId}/preview`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
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
        <AlertTitle>Authored Environmental deliverable</AlertTitle>
        <AlertDescription>
          This report mirrors the NSW EPA waste classification sequence as a structured authored
          workflow. Project identity is inherited from the main project record, while the report
          stores the step-by-step waste assessment, references, lab evidence, and management
          recommendations.
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

      <ReferencesSection
        projectId={projectId}
        reportId={reportId}
        report={report}
        projectReferences={projectReferences}
        aiDocuments={aiDocuments ?? []}
      />

      <SectionCard
        title="Draft Suggestions / Autofill"
        description="Review draft-only suggestions derived from linked project references, linked AI documents, and current lab evidence. Applying updates the current report draft only."
      >
        <WasteClassificationAutofillPanel
          suggestions={draftSuggestions}
          onApplySuggestion={(suggestion) => {
            setDraft((current) => {
              if (!current) {
                return current;
              }
              return applyWasteClassificationDraftSuggestion(current, suggestion);
            });
            setIsDirty(true);
            toast.success(`Applied ${suggestion.label.toLowerCase()} draft suggestion`);
          }}
        />
      </SectionCard>

      <MaterialReusePathwaysSection projectId={projectId} reportId={reportId} report={report} />

      <StepWorkflowSection
        projectId={projectId}
        reportId={reportId}
        report={report}
        firstReachedStepIndex={firstReachedStepIndex}
      />

      <LabResultsSection projectId={projectId} reportId={reportId} report={report} />

      <RelatedPathwaysSection projectId={projectId} reportId={reportId} report={report} />

      <FinalClassificationSection
        projectId={projectId}
        reportId={reportId}
        draft={draft}
        onChange={(patch) => {
          setDraft((current) => ({ ...(current ?? {}), ...patch }));
          setIsDirty(true);
        }}
      />

      <RecommendationsSection projectId={projectId} reportId={reportId} report={report} />

      <AssumptionsSection
        draft={draft}
        onChange={(patch) => {
          setDraft((current) => ({ ...(current ?? {}), ...patch }));
          setIsDirty(true);
        }}
      />
    </>
  );
}

function RootSections({
  draft,
  projectIdentity,
  onChange,
}: {
  draft: ProjectWasteClassificationReportRootInput;
  projectIdentity: ProjectIdentity;
  onChange: (patch: ProjectWasteClassificationReportRootInput) => void;
}) {
  return (
    <>
      <SectionCard title="Project Identity" description="Inherited from the project workspace by default.">
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
        description="Set the report title, revision, issue date, document status, authorship, and purpose."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Report title" className="xl:col-span-2">
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
              placeholder="e.g. draft, review, issued"
              onChange={(event) => onChange({ documentStatus: event.target.value })}
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
          <LabeledField label="Purpose" className="xl:col-span-4">
            <Textarea
              value={draft.purpose ?? ''}
              rows={3}
              onChange={(event) => onChange({ purpose: event.target.value })}
            />
          </LabeledField>
        </div>
      </SectionCard>

      <SectionCard
        title="Waste Stream Summary"
        description="Capture the specific waste stream, source, description, and sampling context for this authored report."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Waste stream name">
            <Input
              value={draft.wasteStreamName ?? ''}
              onChange={(event) => onChange({ wasteStreamName: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Sampling date">
            <Input
              type="date"
              value={draft.samplingDate ?? ''}
              onChange={(event) => onChange({ samplingDate: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Quantity / volume estimate">
            <Input
              value={draft.quantityEstimate ?? ''}
              onChange={(event) => onChange({ quantityEstimate: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Waste source / origin" className="xl:col-span-4">
            <Textarea
              value={draft.wasteSourceOrigin ?? ''}
              rows={3}
              onChange={(event) => onChange({ wasteSourceOrigin: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Waste description" className="xl:col-span-4">
            <Textarea
              value={draft.wasteDescription ?? ''}
              rows={4}
              onChange={(event) => onChange({ wasteDescription: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Proposed receiving facility note" className="xl:col-span-4">
            <Textarea
              value={draft.proposedReceivingFacilityNote ?? ''}
              rows={3}
              onChange={(event) => onChange({ proposedReceivingFacilityNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Executive summary" className="xl:col-span-4">
            <Textarea
              value={draft.executiveSummary ?? ''}
              rows={5}
              onChange={(event) => onChange({ executiveSummary: event.target.value })}
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
  aiDocuments,
}: {
  projectId: string;
  reportId: string;
  report: ProjectWasteClassificationReport;
  projectReferences: MultiPileProjectReference[];
  aiDocuments: AiDocument[];
}) {
  const createReference = useCreateWasteClassificationReference(projectId, reportId);
  const updateReference = useUpdateWasteClassificationReference(projectId, reportId);
  const deleteReference = useDeleteWasteClassificationReference(projectId, reportId);
  const [newReference, setNewReference] = useState<ProjectWasteClassificationReferenceInput>({
    referenceType: 'other',
    title: '',
    sourceUrl: '',
    projectReferenceId: '',
    aiDocumentId: '',
    note: '',
    isIncluded: true,
  });

  async function handleCreate() {
    try {
      await createReference.mutateAsync(normalizeReferenceInput(newReference));
      setNewReference({
        referenceType: 'other',
        title: '',
        sourceUrl: '',
        projectReferenceId: '',
        aiDocumentId: '',
        note: '',
        isIncluded: true,
      });
      toast.success('Reference added');
    } catch {
      toast.error('Failed to add reference');
    }
  }

  return (
    <SectionCard
      title="Prefilled References"
      description="The report starts with key NSW EPA guidance references and can link project references, AI reports, and lab evidence."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Reference
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="Reference type">
              <Select
                value={newReference.referenceType ?? 'other'}
                onValueChange={(value) =>
                  setNewReference((current) => ({
                    ...current,
                    referenceType: value as ProjectWasteClassificationReference['referenceType'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_CLASSIFICATION_REFERENCE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
            <LabeledField label="Title" className="xl:col-span-2">
              <Input
                value={newReference.title ?? ''}
                onChange={(event) =>
                  setNewReference((current) => ({ ...current, title: event.target.value }))
                }
              />
            </LabeledField>
            <LabeledField label="Included in report">
              <BooleanInput
                checked={newReference.isIncluded ?? true}
                label="Include reference"
                onChange={(checked) =>
                  setNewReference((current) => ({ ...current, isIncluded: checked }))
                }
              />
            </LabeledField>
            <LabeledField label="Source URL" className="xl:col-span-2">
              <Input
                value={newReference.sourceUrl ?? ''}
                onChange={(event) =>
                  setNewReference((current) => ({ ...current, sourceUrl: event.target.value }))
                }
              />
            </LabeledField>
            <LabeledField label="Project reference">
              <Select
                value={newReference.projectReferenceId || NONE_VALUE}
                onValueChange={(value) =>
                  setNewReference((current) => ({
                    ...current,
                    projectReferenceId: value === NONE_VALUE ? '' : value,
                    title:
                      (current.title ?? '').trim().length > 0
                        ? current.title
                        : projectReferenceLabel(
                            projectReferences.find((reference) => reference.id === value) ?? null,
                          ),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {projectReferences.map((reference) => (
                    <SelectItem key={reference.id} value={reference.id}>
                      {projectReferenceLabel(reference)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
            <LabeledField label="AI document">
              <Select
                value={newReference.aiDocumentId || NONE_VALUE}
                onValueChange={(value) =>
                  setNewReference((current) => ({
                    ...current,
                    aiDocumentId: value === NONE_VALUE ? '' : value,
                    title:
                      (current.title ?? '').trim().length > 0
                        ? current.title
                        : aiDocuments.find((document) => document.id === value)?.filename ?? current.title,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {aiDocuments.map((document) => (
                    <SelectItem key={document.id} value={document.id}>
                      {document.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
            <LabeledField label="Note" className="xl:col-span-4">
              <Textarea
                value={newReference.note ?? ''}
                rows={3}
                onChange={(event) =>
                  setNewReference((current) => ({ ...current, note: event.target.value }))
                }
              />
            </LabeledField>
          </div>
        </div>

        {report.references.length === 0 ? (
          <EmptyRows>No linked references yet.</EmptyRows>
        ) : (
          <div className="space-y-4">
            {report.references.map((reference) => (
              <ReferenceEditor
                key={reference.id}
                row={reference}
                projectReferences={projectReferences}
                aiDocuments={aiDocuments}
                onSave={async (input) => {
                  try {
                    await updateReference.mutateAsync({
                      id: reference.id,
                      data: normalizeReferenceInput(input),
                    });
                    toast.success('Reference saved');
                  } catch {
                    toast.error('Failed to save reference');
                  }
                }}
                onDelete={
                  reference.isPrefilled
                    ? undefined
                    : async () => {
                        try {
                          await deleteReference.mutateAsync(reference.id);
                          toast.success('Reference deleted');
                        } catch {
                          toast.error('Failed to delete reference');
                        }
                      }
                }
              />
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function MaterialReusePathwaysSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectWasteClassificationReport;
}) {
  return (
    <SectionCard
      title="Material / Reuse Pathways"
      description="Structured NSW EPA and NSW Planning Portal helper pathways for VENM, ENM, and Acid Sulfate Soils. These pathways inform the authored report but do not replace the final waste class automatically."
    >
      <div className="space-y-4">
        {report.materialPathways.map((pathway) => (
          <MaterialPathwayEditor
            key={pathway.id}
            projectId={projectId}
            reportId={reportId}
            pathway={pathway}
            references={report.references}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function MaterialPathwayEditor({
  projectId,
  reportId,
  pathway,
  references,
}: {
  projectId: string;
  reportId: string;
  pathway: ProjectWasteClassificationMaterialPathway;
  references: ProjectWasteClassificationReference[];
}) {
  const updateMaterialPathway = useUpdateWasteClassificationMaterialPathway(projectId, reportId);
  const autofillAssPathway = useAutofillWasteClassificationAssPathway(projectId, reportId);
  const [draft, setDraft] = useState<ProjectWasteClassificationMaterialPathway>(pathway);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isAssPathway = draft.pathwayCode === 'acid_sulfate_soils';

  useEffect(() => {
    if (!isDirty) {
      setDraft(pathway);
    }
  }, [pathway, isDirty]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateMaterialPathway.mutateAsync({
        id: pathway.id,
        data: normalizeMaterialPathwayInput(draft),
      });
      setIsDirty(false);
      toast.success(`${draft.title} pathway saved`);
    } catch {
      toast.error(`Failed to save ${draft.title.toLowerCase()} pathway`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card data-testid={`waste-pathway-${draft.pathwayCode}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{draft.title}</CardTitle>
          <Badge variant="outline">
            {labelFor(WASTE_CLASSIFICATION_MATERIAL_PATHWAY_CODE_OPTIONS, draft.pathwayCode)}
          </Badge>
          <Badge variant="outline">
            {labelFor(WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_OPTIONS, draft.outcomeStatus)}
          </Badge>
          {isAssPathway ? (
            <Badge variant={(draft.isRelevant ?? false) ? 'success' : 'outline'}>
              {(draft.isRelevant ?? false) ? 'Relevant' : 'Not relevant'}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {draft.pathwayCode === 'venm' ? (
          <Alert>
            <ClipboardList className="h-4 w-4" />
            <AlertTitle>VENM note</AlertTitle>
            <AlertDescription>
              If VENM is a waste, it is pre-classified as general solid waste
              {' '}
              (non-putrescible).
            </AlertDescription>
          </Alert>
        ) : null}

        {draft.pathwayCode === 'enm' ? (
          <Alert>
            <ClipboardList className="h-4 w-4" />
            <AlertTitle>ENM note</AlertTitle>
            <AlertDescription>
              ENM should be recorded as a structured helper pathway so the authored report can
              explain whether the material fits reuse settings before final waste classification is
              confirmed.
            </AlertDescription>
          </Alert>
        ) : null}

        {isAssPathway ? (
          <Alert>
            <ClipboardList className="h-4 w-4" />
            <AlertTitle>Planning Portal ASS autofill</AlertTitle>
            <AlertDescription>
              Use the autofill action to derive a draft ASS class from the project location, then
              review and save the authored pathway manually.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isAssPathway ? (
            <LabeledField label="ASS relevance">
              <BooleanInput
                checked={draft.isRelevant ?? false}
                label="ASS pathway is relevant"
                onChange={(checked) => {
                  setDraft((current) => ({ ...current, isRelevant: checked }));
                  setIsDirty(true);
                }}
              />
            </LabeledField>
          ) : null}

          <LabeledField label="Outcome">
            <Select
              value={draft.outcomeStatus}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  outcomeStatus: value as ProjectWasteClassificationMaterialPathway['outcomeStatus'],
                }));
                setIsDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>

          <LabeledField label="Linked reference" className={isAssPathway ? 'md:col-span-2' : undefined}>
            <Select
              value={draft.linkedReferenceId || NONE_VALUE}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  linkedReferenceId: value === NONE_VALUE ? '' : value,
                }));
                setIsDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {references.map((reference) => (
                  <SelectItem key={reference.id} value={reference.id}>
                    {reference.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>

          {!isAssPathway ? (
            <LabeledField label="Testing / analytical note" className="md:col-span-2 xl:col-span-4">
              <Textarea
                value={draft.testingNote ?? ''}
                rows={3}
                placeholder="Optional testing note, analytical evidence, or chemical testing rationale"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, testingNote: event.target.value }));
                  setIsDirty(true);
                }}
              />
            </LabeledField>
          ) : null}

          <LabeledField label="Supporting reasoning" className="md:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.supportingReasoning ?? ''}
              rows={4}
              onChange={(event) => {
                setDraft((current) => ({ ...current, supportingReasoning: event.target.value }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="text-sm font-medium">Structured criteria / prompts</div>
          {draft.checklistItems.map((item, index) => (
            <div key={item.id} className="rounded-lg border bg-background p-3">
              <div className="flex flex-col gap-3">
                <BooleanInput
                  checked={item.isChecked}
                  label={item.label}
                  onChange={(checked) => {
                    setDraft((current) => ({
                      ...current,
                      checklistItems: current.checklistItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, isChecked: checked } : entry,
                      ),
                    }));
                    setIsDirty(true);
                  }}
                />
                <Textarea
                  value={item.note ?? ''}
                  rows={2}
                  placeholder="Supporting note or evidence reference"
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      checklistItems: current.checklistItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, note: event.target.value } : entry,
                      ),
                    }));
                    setIsDirty(true);
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {isAssPathway ? (
          <div className="space-y-4 rounded-xl border p-4">
            <div className="text-sm font-medium">Acid Sulfate Soils workflow</div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="waste-classification-ass-autofill"
                onClick={async () => {
                  try {
                    const result = await autofillAssPathway.mutateAsync(pathway.id);
                    setDraft((current) => applyAssAutofillResultToPathway(current, result));
                    setIsDirty(true);
                    toast.success('ASS autofill applied to pathway draft');
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : 'Failed to autofill ASS class',
                    );
                  }
                }}
                disabled={autofillAssPathway.isPending}
              >
                Autofill from project location
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <LabeledField label="ASS class">
                <Select
                  value={draft.assClass ?? 'not_mapped_unknown'}
                  onValueChange={(value) => {
                    setDraft((current) => ({
                      ...current,
                      assClass: value as ProjectWasteClassificationAcidSulfateSoilClass,
                    }));
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACID_SULFATE_SOIL_CLASS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
              <LabeledField label="ASS class source" className="md:col-span-2">
                <Input
                  value={draft.assClassSource ?? ''}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, assClassSource: event.target.value }));
                    setIsDirty(true);
                  }}
                />
              </LabeledField>
              <LabeledField label="Step 5 chemical assessment">
                <BooleanInput
                  checked={draft.step5ChemicalAssessmentApplies ?? true}
                  label="Step 5 still applies"
                  onChange={(checked) => {
                    setDraft((current) => ({
                      ...current,
                      step5ChemicalAssessmentApplies: checked,
                    }));
                    setIsDirty(true);
                  }}
                />
              </LabeledField>
              <LabeledField label="Project / location note" className="md:col-span-2 xl:col-span-4">
                <Textarea
                  value={draft.projectLocationNote ?? ''}
                  rows={3}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, projectLocationNote: event.target.value }));
                    setIsDirty(true);
                  }}
                />
              </LabeledField>
              <LabeledField label="Treatment / management note" className="md:col-span-2 xl:col-span-4">
                <Textarea
                  value={draft.treatmentManagementNote ?? ''}
                  rows={3}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      treatmentManagementNote: event.target.value,
                    }));
                    setIsDirty(true);
                  }}
                />
              </LabeledField>
              <LabeledField label="ASS Order relevance">
                <BooleanInput
                  checked={draft.assOrderRelevant ?? false}
                  label="ASS Order pathway relevant"
                  onChange={(checked) => {
                    setDraft((current) => ({ ...current, assOrderRelevant: checked }));
                    setIsDirty(true);
                  }}
                />
              </LabeledField>
              <LabeledField label="ASS Exemption relevance">
                <BooleanInput
                  checked={draft.assExemptionRelevant ?? false}
                  label="ASS Exemption pathway relevant"
                  onChange={(checked) => {
                    setDraft((current) => ({ ...current, assExemptionRelevant: checked }));
                    setIsDirty(true);
                  }}
                />
              </LabeledField>
              <LabeledField label="Order / Exemption note" className="md:col-span-2 xl:col-span-4">
                <Textarea
                  value={draft.orderExemptionNote ?? ''}
                  rows={3}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, orderExemptionNote: event.target.value }));
                    setIsDirty(true);
                  }}
                />
              </LabeledField>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p>Class 1: likely on and below natural ground surface.</p>
              <p>Class 2: likely below natural ground surface.</p>
              <p>Class 3: likely beyond 1 metre below natural ground surface.</p>
              <p>Class 4: likely beyond 2 metres below natural ground surface.</p>
              <p>Class 5: generally not found, but within 500 m of adjacent Class 1–4 land.</p>
            </div>
          </div>
        ) : null}

        <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
          Save Pathway
        </Button>
      </CardContent>
    </Card>
  );
}

function StepWorkflowSection({
  projectId,
  reportId,
  report,
  firstReachedStepIndex,
}: {
  projectId: string;
  reportId: string;
  report: ProjectWasteClassificationReport;
  firstReachedStepIndex: number;
}) {
  return (
    <SectionCard
      title="Step 1–6 Workflow"
      description="The report mirrors the NSW EPA sequence in order. Once classification is reached at a step, later steps remain editable but are marked as usually not required."
    >
      <div className="space-y-4">
        {report.stepDecisions.map((step, index) => (
          <StepDecisionEditor
            key={step.id}
            projectId={projectId}
            reportId={reportId}
            step={step}
            references={report.references}
            usuallyNotRequired={firstReachedStepIndex !== -1 && index > firstReachedStepIndex}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function LabResultsSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectWasteClassificationReport;
}) {
  const createLabResult = useCreateWasteClassificationLabResult(projectId, reportId);
  const updateLabResult = useUpdateWasteClassificationLabResult(projectId, reportId);
  const deleteLabResult = useDeleteWasteClassificationLabResult(projectId, reportId);
  const [newRow, setNewRow] = useState<ProjectWasteClassificationLabResultInput>({
    contaminant: '',
    sampleId: '',
    analyticalMethod: '',
    sccMgKg: '',
    tclpMgL: '',
    thresholdReferenceNote: '',
    resultInterpretation: '',
  });

  async function handleCreate() {
    if (!(newRow.contaminant ?? '').trim()) {
      toast.error('Contaminant is required');
      return;
    }

    try {
      await createLabResult.mutateAsync(normalizeLabResultInput(newRow));
      setNewRow({
        contaminant: '',
        sampleId: '',
        analyticalMethod: '',
        sccMgKg: '',
        tclpMgL: '',
        thresholdReferenceNote: '',
        resultInterpretation: '',
      });
      toast.success('Lab result row added');
    } catch {
      toast.error('Failed to add lab result row');
    }
  }

  return (
    <SectionCard
      title="Lab / Chemical Assessment Table"
      description="Record structured SCC and TCLP evidence, analytical methods, and threshold notes without trying to encode the full contaminant schedule in this first pass."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lab Result
        </Button>
      }
    >
      <div className="space-y-4">
        <Alert>
          <FlaskConical className="h-4 w-4" />
          <AlertTitle>Step 5 authored note</AlertTitle>
          <AlertDescription>
            If Step 5 is required but chemical assessment is not undertaken, the waste must be
            treated as hazardous in the authored report logic.
          </AlertDescription>
        </Alert>

        <LabResultEditor
          row={{
            id: 'new',
            reportId,
            contaminant: newRow.contaminant ?? '',
            sampleId: newRow.sampleId ?? null,
            analyticalMethod: newRow.analyticalMethod ?? null,
            sccMgKg: newRow.sccMgKg ?? null,
            tclpMgL: newRow.tclpMgL ?? null,
            thresholdReferenceNote: newRow.thresholdReferenceNote ?? null,
            resultInterpretation: newRow.resultInterpretation ?? null,
            sortOrder: report.labResults.length,
          }}
          isCreate
          onChange={setNewRow}
        />

        {report.labResults.length === 0 ? (
          <EmptyRows>No lab result rows yet.</EmptyRows>
        ) : (
          <div className="space-y-4">
            {report.labResults.map((row) => (
              <LabResultEditor
                key={row.id}
                row={row}
                onSave={async (input) => {
                  try {
                    await updateLabResult.mutateAsync({
                      id: row.id,
                      data: normalizeLabResultInput(input),
                    });
                    toast.success('Lab result row saved');
                  } catch {
                    toast.error('Failed to save lab result row');
                  }
                }}
                onDelete={async () => {
                  try {
                    await deleteLabResult.mutateAsync(row.id);
                    toast.success('Lab result row deleted');
                  } catch {
                    toast.error('Failed to delete lab result row');
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function RelatedPathwaysSection({
  projectId,
  reportId,
  report,
}: {
  projectId: string;
  reportId: string;
  report: ProjectWasteClassificationReport;
}) {
  const updatePathway = useUpdateWasteClassificationRelatedPathway(projectId, reportId);

  return (
    <SectionCard
      title="Related Parts / Special Pathways"
      description="Capture whether the immobilisation, radioactive material, acid sulfate soils, or addendum pathways are relevant, plus the key note and resulting action."
    >
      <div className="space-y-4">
        {report.relatedPathways.map((pathway) => (
          <RelatedPathwayEditor
            key={pathway.id}
            row={pathway}
            references={report.references}
            onSave={async (input) => {
              try {
                await updatePathway.mutateAsync({
                  id: pathway.id,
                  data: normalizeRelatedPathwayInput(input),
                });
                toast.success('Related pathway saved');
              } catch {
                toast.error('Failed to save related pathway');
              }
            }}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function FinalClassificationSection({
  projectId,
  reportId,
  draft,
  onChange,
}: {
  projectId: string;
  reportId: string;
  draft: ProjectWasteClassificationReportRootInput;
  onChange: (patch: ProjectWasteClassificationReportRootInput) => void;
}) {
  const finalWasteClass = draft.finalWasteClass ?? 'not_yet_classified';

  return (
    <SectionCard
      title="Final Classification Summary"
      description="Set the report-level final waste class, record the authored classification reasoning, and summarise the management / disposal recommendation."
    >
      <div className="mb-4 rounded-xl border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Current report classification</span>
          <Badge variant={finalWasteClass === 'not_yet_classified' ? 'warning' : 'success'}>
            {labelFor(WASTE_CLASS_OPTIONS, finalWasteClass)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabeledField label="Final waste class">
          <Select
            value={finalWasteClass}
            onValueChange={(value) =>
              onChange({ finalWasteClass: value as ProjectWasteClass })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WASTE_CLASS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LabeledField>
        <LabeledField label="Final classification reasoning" className="md:col-span-2 xl:col-span-4">
          <Textarea
            value={draft.finalClassificationReasoning ?? ''}
            rows={5}
            onChange={(event) =>
              onChange({ finalClassificationReasoning: event.target.value })
            }
          />
        </LabeledField>
        <LabeledField label="Management / disposal recommendation" className="md:col-span-2 xl:col-span-4">
          <Textarea
            value={draft.managementRecommendation ?? ''}
            rows={4}
            onChange={(event) => onChange({ managementRecommendation: event.target.value })}
          />
        </LabeledField>
      </div>

      <div className="mt-6">
        <WasteClassificationDisposalHelper
          projectId={projectId}
          reportId={reportId}
          finalWasteClass={finalWasteClass}
          hasAuthoredRecommendation={Boolean(draft.managementRecommendation?.trim())}
          onApplySummary={(value) => onChange({ managementRecommendation: value })}
        />
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
  report: ProjectWasteClassificationReport;
}) {
  const createRecommendation = useCreateWasteClassificationRecommendation(projectId, reportId);
  const updateRecommendation = useUpdateWasteClassificationRecommendation(projectId, reportId);
  const deleteRecommendation = useDeleteWasteClassificationRecommendation(projectId, reportId);
  const [newRecommendation, setNewRecommendation] = useState<ProjectWasteClassificationRecommendationInput>({
    category: '',
    recommendation: '',
    priority: '',
    responsibility: '',
    timingNote: '',
  });

  async function handleCreate() {
    if (!(newRecommendation.category ?? '').trim() || !(newRecommendation.recommendation ?? '').trim()) {
      toast.error('Category and recommendation are required');
      return;
    }

    try {
      await createRecommendation.mutateAsync(normalizeRecommendationInput(newRecommendation));
      setNewRecommendation({
        category: '',
        recommendation: '',
        priority: '',
        responsibility: '',
        timingNote: '',
      });
      toast.success('Recommendation added');
    } catch {
      toast.error('Failed to add recommendation');
    }
  }

  return (
    <SectionCard
      title="Recommendations / Management Actions"
      description="Record priority actions, responsibilities, and timing notes that arise from the waste classification outcome."
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Recommendation
        </Button>
      }
    >
      <div className="space-y-4">
        <RecommendationEditor
          row={{
            id: 'new',
            reportId,
            category: newRecommendation.category ?? '',
            recommendation: newRecommendation.recommendation ?? '',
            priority: newRecommendation.priority ?? null,
            responsibility: newRecommendation.responsibility ?? null,
            timingNote: newRecommendation.timingNote ?? null,
            sortOrder: report.recommendations.length,
          }}
          isCreate
          onChange={setNewRecommendation}
        />

        {report.recommendations.length === 0 ? (
          <EmptyRows>No recommendations yet.</EmptyRows>
        ) : (
          <div className="space-y-4">
            {report.recommendations.map((row) => (
              <RecommendationEditor
                key={row.id}
                row={row}
                onSave={async (input) => {
                  try {
                    await updateRecommendation.mutateAsync({
                      id: row.id,
                      data: normalizeRecommendationInput(input),
                    });
                    toast.success('Recommendation saved');
                  } catch {
                    toast.error('Failed to save recommendation');
                  }
                }}
                onDelete={async () => {
                  try {
                    await deleteRecommendation.mutateAsync(row.id);
                    toast.success('Recommendation deleted');
                  } catch {
                    toast.error('Failed to delete recommendation');
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function AssumptionsSection({
  draft,
  onChange,
}: {
  draft: ProjectWasteClassificationReportRootInput;
  onChange: (patch: ProjectWasteClassificationReportRootInput) => void;
}) {
  return (
    <SectionCard
      title="Assumptions / Limitations"
      description="Record any sampling limitations, reliance assumptions, or report caveats that should travel with the authored classification."
    >
      <Textarea
        value={draft.assumptionsLimitations ?? ''}
        rows={5}
        onChange={(event) => onChange({ assumptionsLimitations: event.target.value })}
      />
    </SectionCard>
  );
}

function ReferenceEditor({
  row,
  projectReferences,
  aiDocuments,
  onSave,
  onDelete,
}: {
  row: ProjectWasteClassificationReference;
  projectReferences: MultiPileProjectReference[];
  aiDocuments: AiDocument[];
  onSave: (input: ProjectWasteClassificationReferenceInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ProjectWasteClassificationReferenceInput>(row);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setDraft(row);
    }
  }, [row, isDirty]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{row.title}</CardTitle>
          <Badge variant="outline">
            {labelFor(WASTE_CLASSIFICATION_REFERENCE_TYPE_OPTIONS, draft.referenceType ?? row.referenceType)}
          </Badge>
          {row.isPrefilled ? <Badge variant="secondary">Prefilled</Badge> : null}
          <Badge variant={(draft.isIncluded ?? row.isIncluded) ? 'success' : 'warning'}>
            {(draft.isIncluded ?? row.isIncluded) ? 'Included' : 'Not included'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Reference type">
            <Select
              value={draft.referenceType ?? row.referenceType}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  referenceType: value as ProjectWasteClassificationReference['referenceType'],
                }));
                setIsDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WASTE_CLASSIFICATION_REFERENCE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <LabeledField label="Title" className="xl:col-span-2">
            <Input
              value={draft.title ?? ''}
              onChange={(event) => {
                setDraft((current) => ({ ...current, title: event.target.value }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
          <LabeledField label="Included in report">
            <BooleanInput
              checked={draft.isIncluded ?? row.isIncluded}
              label="Include reference"
              onChange={(checked) => {
                setDraft((current) => ({ ...current, isIncluded: checked }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
          <LabeledField label="Source URL" className="xl:col-span-2">
            <Input
              value={draft.sourceUrl ?? ''}
              onChange={(event) => {
                setDraft((current) => ({ ...current, sourceUrl: event.target.value }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
          <LabeledField label="Project reference">
            <Select
              value={draft.projectReferenceId || NONE_VALUE}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  projectReferenceId: value === NONE_VALUE ? '' : value,
                }));
                setIsDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {projectReferences.map((reference) => (
                  <SelectItem key={reference.id} value={reference.id}>
                    {projectReferenceLabel(reference)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <LabeledField label="AI document">
            <Select
              value={draft.aiDocumentId || NONE_VALUE}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  aiDocumentId: value === NONE_VALUE ? '' : value,
                }));
                setIsDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {aiDocuments.map((document) => (
                  <SelectItem key={document.id} value={document.id}>
                    {document.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <LabeledField label="Note" className="xl:col-span-4">
            <Textarea
              value={draft.note ?? ''}
              rows={3}
              onChange={(event) => {
                setDraft((current) => ({ ...current, note: event.target.value }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
        </div>
        {draft.sourceUrl ? (
          <a
            href={draft.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Open source link
          </a>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
            Save Reference
          </Button>
          {onDelete ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void onDelete()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StepDecisionEditor({
  projectId,
  reportId,
  step,
  references,
  usuallyNotRequired,
}: {
  projectId: string;
  reportId: string;
  step: ProjectWasteClassificationStepDecision;
  references: ProjectWasteClassificationReference[];
  usuallyNotRequired: boolean;
}) {
  const updateStep = useUpdateWasteClassificationStepDecision(projectId, reportId);
  const updateChecklistItem = useUpdateWasteClassificationChecklistItem(projectId, reportId);
  const [draft, setDraft] = useState<ProjectWasteClassificationStepDecision>(step);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setDraft(step);
    }
  }, [step, isDirty]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateStep.mutateAsync({
        id: step.id,
        data: normalizeStepDecisionInput(draft),
      });

      for (const item of draft.checklistItems) {
        await updateChecklistItem.mutateAsync({
          stepDecisionId: step.id,
          id: item.id,
          data: normalizeChecklistItemInput(item),
        });
      }

      setIsDirty(false);
      toast.success(`${draft.stepTitle} saved`);
    } catch {
      toast.error(`Failed to save ${draft.stepTitle.toLowerCase()}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card
      data-testid={`waste-step-${draft.stepCode}`}
      className={usuallyNotRequired ? 'border-amber-200 bg-amber-50/40' : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{draft.stepTitle}</CardTitle>
          <Badge variant="outline">
            {labelFor(WASTE_CLASSIFICATION_OUTCOME_STATUS_OPTIONS, draft.outcomeStatus)}
          </Badge>
          {draft.classificationReached ? <Badge variant="success">Classification reached</Badge> : null}
          {draft.resultingWasteClass ? (
            <Badge variant={draft.resultingWasteClass === 'not_yet_classified' ? 'warning' : 'success'}>
              {labelFor(WASTE_CLASS_OPTIONS, draft.resultingWasteClass)}
            </Badge>
          ) : null}
          {usuallyNotRequired ? <Badge variant="warning">Usually not required after earlier step</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {draft.stepCode === 'step_5_chemical_assessment' ? (
          <WasteClassificationStep5Helper references={references} />
        ) : null}
        {draft.stepCode === 'step_1_special_waste' ? (
          <Alert>
            <ClipboardList className="h-4 w-4" />
            <AlertTitle>Mixed waste note</AlertTitle>
            <AlertDescription>
              Special waste mixed with hazardous or restricted solid waste should record the dual
              management implication in the authored reasoning.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Outcome status">
            <Select
              value={draft.outcomeStatus}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  outcomeStatus: value as ProjectWasteClassificationStepDecision['outcomeStatus'],
                }));
                setIsDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WASTE_CLASSIFICATION_OUTCOME_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <LabeledField label="Resulting waste class">
            <Select
              value={draft.resultingWasteClass ?? NONE_VALUE}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  resultingWasteClass: value === NONE_VALUE ? null : (value as ProjectWasteClass),
                }));
                setIsDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Not set</SelectItem>
                {WASTE_CLASS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <LabeledField label="Classification reached">
            <BooleanInput
              checked={draft.classificationReached}
              label="Classification reached at this step"
              onChange={(checked) => {
                setDraft((current) => ({ ...current, classificationReached: checked }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
          <LabeledField label="Applicable">
            <BooleanInput
              checked={draft.isApplicable}
              label="Step is applicable"
              onChange={(checked) => {
                setDraft((current) => ({ ...current, isApplicable: checked }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
          <LabeledField label="Decision summary" className="md:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.decisionSummary ?? ''}
              rows={3}
              onChange={(event) => {
                setDraft((current) => ({ ...current, decisionSummary: event.target.value }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
          <LabeledField label="Detailed reasoning" className="md:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.detailedReasoning ?? ''}
              rows={5}
              onChange={(event) => {
                setDraft((current) => ({ ...current, detailedReasoning: event.target.value }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="text-sm font-medium">Checklist / helper prompts</div>
          {draft.checklistItems.map((item, index) => (
            <div key={item.id} className="rounded-lg border bg-background p-3">
              <div className="flex flex-col gap-3">
                <BooleanInput
                  checked={item.isChecked}
                  label={item.label}
                  onChange={(checked) => {
                    setDraft((current) => ({
                      ...current,
                      checklistItems: current.checklistItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, isChecked: checked } : entry,
                      ),
                    }));
                    setIsDirty(true);
                  }}
                />
                <Textarea
                  value={item.note ?? ''}
                  rows={2}
                  placeholder="Supporting note, reasoning, or evidence reference"
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      checklistItems: current.checklistItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, note: event.target.value } : entry,
                      ),
                    }));
                    setIsDirty(true);
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
          Save Step
        </Button>
      </CardContent>
    </Card>
  );
}

function LabResultEditor({
  row,
  isCreate = false,
  onChange,
  onSave,
  onDelete,
}: {
  row: ProjectWasteClassificationLabResult;
  isCreate?: boolean;
  onChange?: (input: ProjectWasteClassificationLabResultInput) => void;
  onSave?: (input: ProjectWasteClassificationLabResultInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ProjectWasteClassificationLabResultInput>(row);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isCreate || !isDirty) {
      setDraft(row);
    }
  }, [row, isCreate, isDirty]);

  function update(patch: ProjectWasteClassificationLabResultInput) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setIsDirty(true);
    onChange?.(next);
  }

  async function handleSave() {
    if (!onSave) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isCreate ? 'New lab result row' : draft.contaminant || 'Lab result row'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Contaminant">
            <Input
              value={draft.contaminant ?? ''}
              onChange={(event) => update({ contaminant: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Sample ID">
            <Input
              value={draft.sampleId ?? ''}
              onChange={(event) => update({ sampleId: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Analytical method">
            <Input
              value={draft.analyticalMethod ?? ''}
              onChange={(event) => update({ analyticalMethod: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="SCC (mg/kg)">
            <Input
              value={draft.sccMgKg ?? ''}
              onChange={(event) => update({ sccMgKg: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="TCLP (mg/L)">
            <Input
              value={draft.tclpMgL ?? ''}
              onChange={(event) => update({ tclpMgL: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Threshold / rationale note" className="md:col-span-2 xl:col-span-3">
            <Textarea
              value={draft.thresholdReferenceNote ?? ''}
              rows={2}
              onChange={(event) => update({ thresholdReferenceNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Result interpretation" className="md:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.resultInterpretation ?? ''}
              rows={3}
              onChange={(event) => update({ resultInterpretation: event.target.value })}
            />
          </LabeledField>
        </div>

        {!isCreate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
              Save Row
            </Button>
            {onDelete ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void onDelete()}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RelatedPathwayEditor({
  row,
  references,
  onSave,
}: {
  row: ProjectWasteClassificationRelatedPathway;
  references: ProjectWasteClassificationReference[];
  onSave: (input: ProjectWasteClassificationRelatedPathwayInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ProjectWasteClassificationRelatedPathwayInput>(row);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setDraft(row);
    }
  }, [row, isDirty]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{row.title}</CardTitle>
          <Badge variant={(draft.isRelevant ?? row.isRelevant) ? 'success' : 'outline'}>
            {(draft.isRelevant ?? row.isRelevant) ? 'Relevant' : 'Not relevant'}
          </Badge>
          <Badge variant="outline">
            {labelFor(WASTE_CLASSIFICATION_PATHWAY_CODE_OPTIONS, row.pathwayCode)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Relevant">
            <BooleanInput
              checked={draft.isRelevant ?? row.isRelevant}
              label="Pathway is relevant to this report"
              onChange={(checked) => {
                setDraft((current) => ({ ...current, isRelevant: checked }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
          <LabeledField label="Linked report reference" className="md:col-span-2">
            <Select
              value={draft.linkedReferenceId || NONE_VALUE}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  linkedReferenceId: value === NONE_VALUE ? '' : value,
                }));
                setIsDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {references.map((reference) => (
                  <SelectItem key={reference.id} value={reference.id}>
                    {reference.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <LabeledField label="Summary note" className="md:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.summaryNote ?? ''}
              rows={3}
              onChange={(event) => {
                setDraft((current) => ({ ...current, summaryNote: event.target.value }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
          <LabeledField label="Resulting action / implication" className="md:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.resultingAction ?? ''}
              rows={3}
              onChange={(event) => {
                setDraft((current) => ({ ...current, resultingAction: event.target.value }));
                setIsDirty(true);
              }}
            />
          </LabeledField>
        </div>
        <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
          Save Pathway
        </Button>
      </CardContent>
    </Card>
  );
}

function RecommendationEditor({
  row,
  isCreate = false,
  onChange,
  onSave,
  onDelete,
}: {
  row: ProjectWasteClassificationRecommendation;
  isCreate?: boolean;
  onChange?: (input: ProjectWasteClassificationRecommendationInput) => void;
  onSave?: (input: ProjectWasteClassificationRecommendationInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ProjectWasteClassificationRecommendationInput>(row);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isCreate || !isDirty) {
      setDraft(row);
    }
  }, [row, isCreate, isDirty]);

  function update(patch: ProjectWasteClassificationRecommendationInput) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setIsDirty(true);
    onChange?.(next);
  }

  async function handleSave() {
    if (!onSave) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isCreate ? 'New recommendation' : draft.category || 'Recommendation'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LabeledField label="Category">
            <Input
              value={draft.category ?? ''}
              onChange={(event) => update({ category: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Priority">
            <Input
              value={draft.priority ?? ''}
              onChange={(event) => update({ priority: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Responsibility">
            <Input
              value={draft.responsibility ?? ''}
              onChange={(event) => update({ responsibility: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Timing note">
            <Input
              value={draft.timingNote ?? ''}
              onChange={(event) => update({ timingNote: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="Recommendation" className="md:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.recommendation ?? ''}
              rows={3}
              onChange={(event) => update({ recommendation: event.target.value })}
            />
          </LabeledField>
        </div>
        {!isCreate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
              Save Recommendation
            </Button>
            {onDelete ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void onDelete()}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
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

function BooleanInput({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border/80 px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      <span>{label}</span>
    </label>
  );
}

function rootDraftFromReport(
  report: ProjectWasteClassificationReport,
): ProjectWasteClassificationReportRootInput {
  return {
    title: report.title ?? '',
    revision: report.revision ?? '',
    issueDate: toDateInput(report.issueDate),
    documentStatus: report.documentStatus ?? 'draft',
    preparedBy: report.preparedBy ?? '',
    checkedBy: report.checkedBy ?? '',
    purpose: report.purpose ?? '',
    wasteStreamName: report.wasteStreamName ?? '',
    wasteSourceOrigin: report.wasteSourceOrigin ?? '',
    wasteDescription: report.wasteDescription ?? '',
    samplingDate: toDateInput(report.samplingDate),
    quantityEstimate: report.quantityEstimate ?? '',
    proposedReceivingFacilityNote: report.proposedReceivingFacilityNote ?? '',
    executiveSummary: report.executiveSummary ?? '',
    finalWasteClass: report.finalWasteClass,
    finalClassificationReasoning: report.finalClassificationReasoning ?? '',
    managementRecommendation: report.managementRecommendation ?? '',
    assumptionsLimitations: report.assumptionsLimitations ?? '',
  };
}

function normalizeRootInput(
  input: ProjectWasteClassificationReportRootInput,
): ProjectWasteClassificationReportRootInput {
  return {
    ...blankStringsToNull(input),
    issueDate: input.issueDate || null,
    samplingDate: input.samplingDate || null,
    finalWasteClass: input.finalWasteClass ?? 'not_yet_classified',
  };
}

function normalizeReferenceInput(
  input: ProjectWasteClassificationReferenceInput,
): ProjectWasteClassificationReferenceInput {
  return {
    referenceType: input.referenceType,
    title: blankToUndefined(input.title),
    sourceUrl: blankToNull(input.sourceUrl),
    projectReferenceId: input.projectReferenceId || null,
    aiDocumentId: input.aiDocumentId || null,
    note: blankToNull(input.note),
    isPrefilled: input.isPrefilled,
    isIncluded: input.isIncluded ?? true,
    sortOrder: input.sortOrder,
  };
}

function normalizeStepDecisionInput(
  input: ProjectWasteClassificationStepDecisionInput,
): ProjectWasteClassificationStepDecisionInput {
  return {
    stepCode: input.stepCode,
    stepTitle: blankToUndefined(input.stepTitle),
    outcomeStatus: input.outcomeStatus,
    resultingWasteClass: input.resultingWasteClass || null,
    decisionSummary: blankToNull(input.decisionSummary),
    detailedReasoning: blankToNull(input.detailedReasoning),
    classificationReached: input.classificationReached ?? false,
    isApplicable: input.isApplicable ?? true,
    sortOrder: input.sortOrder,
  };
}

function normalizeChecklistItemInput(
  input: ProjectWasteClassificationChecklistItemInput | ProjectWasteClassificationChecklistItem,
): ProjectWasteClassificationChecklistItemInput {
  return {
    label: blankToUndefined(input.label),
    isChecked: input.isChecked ?? false,
    note: blankToNull(input.note),
    sortOrder: input.sortOrder,
  };
}

function normalizeLabResultInput(
  input: ProjectWasteClassificationLabResultInput,
): ProjectWasteClassificationLabResultInput {
  return {
    contaminant: blankToUndefined(input.contaminant),
    sampleId: blankToNull(input.sampleId),
    analyticalMethod: blankToNull(input.analyticalMethod),
    sccMgKg: blankToNull(input.sccMgKg),
    tclpMgL: blankToNull(input.tclpMgL),
    thresholdReferenceNote: blankToNull(input.thresholdReferenceNote),
    resultInterpretation: blankToNull(input.resultInterpretation),
    sortOrder: input.sortOrder,
  };
}

function normalizeRecommendationInput(
  input: ProjectWasteClassificationRecommendationInput,
): ProjectWasteClassificationRecommendationInput {
  return {
    category: blankToUndefined(input.category),
    recommendation: blankToUndefined(input.recommendation),
    priority: blankToNull(input.priority),
    responsibility: blankToNull(input.responsibility),
    timingNote: blankToNull(input.timingNote),
    sortOrder: input.sortOrder,
  };
}

function normalizeMaterialPathwayInput(
  input: ProjectWasteClassificationMaterialPathwayInput | ProjectWasteClassificationMaterialPathway,
): ProjectWasteClassificationMaterialPathwayInput {
  return {
    pathwayCode: input.pathwayCode,
    title: blankToUndefined(input.title),
    isRelevant: input.isRelevant ?? true,
    outcomeStatus: input.outcomeStatus,
    testingNote: blankToNull(input.testingNote),
    supportingReasoning: blankToNull(input.supportingReasoning),
    linkedReferenceId: input.linkedReferenceId || null,
    assClass: input.assClass || null,
    assClassSource: blankToNull(input.assClassSource),
    projectLocationNote: blankToNull(input.projectLocationNote),
    treatmentManagementNote: blankToNull(input.treatmentManagementNote),
    step5ChemicalAssessmentApplies: input.step5ChemicalAssessmentApplies ?? null,
    assOrderRelevant: input.assOrderRelevant ?? null,
    assExemptionRelevant: input.assExemptionRelevant ?? null,
    orderExemptionNote: blankToNull(input.orderExemptionNote),
    sortOrder: input.sortOrder,
    checklistItems: input.checklistItems?.map((item) => normalizeMaterialPathwayChecklistItemInput(item)),
  };
}

function normalizeMaterialPathwayChecklistItemInput(
  input:
    | ProjectWasteClassificationMaterialPathwayChecklistItemInput
    | ProjectWasteClassificationMaterialPathwayChecklistItem,
): ProjectWasteClassificationMaterialPathwayChecklistItemInput {
  return {
    id: input.id,
    label: blankToUndefined(input.label),
    isChecked: input.isChecked ?? false,
    note: blankToNull(input.note),
    sortOrder: input.sortOrder,
  };
}

function normalizeRelatedPathwayInput(
  input: ProjectWasteClassificationRelatedPathwayInput,
): ProjectWasteClassificationRelatedPathwayInput {
  return {
    pathwayCode: input.pathwayCode,
    title: blankToUndefined(input.title),
    summaryNote: blankToNull(input.summaryNote),
    linkedReferenceId: input.linkedReferenceId || null,
    isRelevant: input.isRelevant ?? false,
    resultingAction: blankToNull(input.resultingAction),
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

function blankToNull(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : null;
}

function blankToUndefined(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : undefined;
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

function projectReferenceLabel(reference: MultiPileProjectReference | null) {
  if (!reference) {
    return '';
  }

  const left = reference.referenceId || reference.documentNumber || 'Project reference';
  const right = reference.title || reference.documentType;
  return `${left} · ${right}`;
}

function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ');
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
}
