'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AiAssistantDraftActionAdapter,
  AiAssistantSuggestedField,
  AiAssistantSuggestionApplyAdapter,
} from '@/features/ai/assistant-page-context';
import type { AiAssistantStructuredResponse } from '@/features/ai/assistant-types';
import {
  isProjectGeotechnicalBasisSuggestionFieldPath,
  isProjectFoundationsSuggestionFieldPath,
  isProjectPageSuggestionFieldPath,
} from './project-ai-suggestion-adapter';
import {
  collectProjectGeotechnicalMaterialCandidates,
  findStrongProjectGeotechnicalMaterialCandidateMatchIndex,
  isProjectGeotechnicalMaterialCandidateSuggestion,
  resolveProjectGeotechnicalMaterialCandidateLabel,
  resolveProjectGeotechnicalMaterialTargetLabel,
  type ProjectGeotechnicalMaterialCandidate,
} from './project-ai-geotechnical-material-candidates';

type ProjectDraftActionAdapter = Extract<AiAssistantDraftActionAdapter, { kind: 'project' }>;

type ProjectAiSuggestionsContentProps = {
  response: AiAssistantStructuredResponse;
  suggestionAdapter: AiAssistantSuggestionApplyAdapter | null;
  draftActionAdapter: ProjectDraftActionAdapter;
  presentation?: 'card' | 'assistant';
};

type SuggestionSection = {
  id: string;
  title: string;
  description: string;
  suggestions: AiAssistantSuggestedField[];
};

type AppliedDraftAction = {
  id: string;
  title: string;
  detail: string;
};

export function ProjectAiSuggestionsContent({
  response,
  suggestionAdapter,
  draftActionAdapter,
  presentation = 'card',
}: ProjectAiSuggestionsContentProps) {
  const router = useRouter();
  const [candidateTargets, setCandidateTargets] = useState<Record<string, string>>({});
  const [appliedFieldKeys, setAppliedFieldKeys] = useState<Set<string>>(() => new Set());
  const [appliedCandidateIds, setAppliedCandidateIds] = useState<Set<string>>(() => new Set());
  const [appliedActions, setAppliedActions] = useState<AppliedDraftAction[]>([]);

  const responseSignature = useMemo(
    () =>
      response.suggestedFields
        .map((suggestion) => suggestionKey(suggestion))
        .concat(response.limitationNote ?? '')
        .join('\u001f'),
    [response.limitationNote, response.suggestedFields],
  );

  useEffect(() => {
    setCandidateTargets({});
    setAppliedFieldKeys(new Set());
    setAppliedCandidateIds(new Set());
    setAppliedActions([]);
  }, [responseSignature]);

  const scopedSuggestions = useMemo(
    () => filterSuggestionsForScope(response.suggestedFields, draftActionAdapter.scope),
    [draftActionAdapter.scope, response.suggestedFields],
  );

  const visibleRegularSuggestions = useMemo(
    () =>
      scopedSuggestions.filter(
        (field) =>
          !isProjectGeotechnicalMaterialCandidateSuggestion(field) &&
          !appliedFieldKeys.has(suggestionKey(field)),
      ),
    [appliedFieldKeys, scopedSuggestions],
  );

  const suggestionSections = useMemo(
    () => buildSuggestionSections(visibleRegularSuggestions, draftActionAdapter.scope),
    [draftActionAdapter.scope, visibleRegularSuggestions],
  );

  const materialCandidates = useMemo(
    () =>
      draftActionAdapter.scope === 'project-geotechnical'
        ? collectProjectGeotechnicalMaterialCandidates(scopedSuggestions).filter(
            (candidate) => !appliedCandidateIds.has(candidate.id),
          )
        : [],
    [appliedCandidateIds, draftActionAdapter.scope, scopedSuggestions],
  );

  const hasSuggestedContent = suggestionSections.length > 0 || materialCandidates.length > 0;
  const needsSelection =
    draftActionAdapter.scope === 'project-geotechnical' &&
    typeof draftActionAdapter.onApplyMaterialCandidateToExisting === 'function' &&
    materialCandidates.length > 0 &&
    draftActionAdapter.projectSpecifics.geotechnicalMaterials.materials.length > 0;
  const shouldShowAiReportsAction =
    Boolean(draftActionAdapter.aiReportsHref) && shouldOfferAiReportsAction(response);

  function recordAppliedActions(nextActions: AppliedDraftAction[]) {
    setAppliedActions((current) => {
      const existingIds = new Set(current.map((action) => action.id));
      const deduped = nextActions.filter((action) => !existingIds.has(action.id));
      return [...deduped, ...current].slice(0, 12);
    });
  }

  function handleApplySuggestions(suggestions: AiAssistantSuggestedField[]) {
    if (!suggestionAdapter) {
      toast.error('Applying suggestions is not available on this page.');
      return;
    }

    const applicableSuggestions = suggestions.filter(
      (field) =>
        !appliedFieldKeys.has(suggestionKey(field)) && canApplySuggestion(suggestionAdapter, field),
    );

    if (applicableSuggestions.length === 0) {
      toast.message('No draft values were changed.', {
        description:
          'Those suggestions were already applied, already filled, or are not applicable to the current draft.',
      });
      return;
    }

    const result = suggestionAdapter.applySuggestions(applicableSuggestions);
    if (result.appliedCount === 0) {
      toast.message('No draft values were changed.', {
        description:
          'Those suggestions were skipped because the target fields are already filled or not applicable.',
      });
      return;
    }

    setAppliedFieldKeys((current) => {
      const next = new Set(current);
      applicableSuggestions.forEach((suggestion) => next.add(suggestionKey(suggestion)));
      return next;
    });
    recordAppliedActions(
      applicableSuggestions.map((suggestion) => ({
        id: `field:${suggestionKey(suggestion)}`,
        title: suggestion.label,
        detail: `Applied ${formatSuggestionSection(suggestion.fieldPath)} to the current draft.`,
      })),
    );
    toast.success(
      `Applied ${result.appliedCount} draft suggestion${result.appliedCount === 1 ? '' : 's'}. Changes are not saved yet.`,
    );
  }

  function markCandidateApplied(candidate: ProjectGeotechnicalMaterialCandidate, detail: string) {
    setAppliedCandidateIds((current) => {
      const next = new Set(current);
      next.add(candidate.id);
      return next;
    });
    recordAppliedActions([
      {
        id: `candidate:${candidate.id}`,
        title: resolveProjectGeotechnicalMaterialCandidateLabel(candidate),
        detail,
      },
    ]);
  }

  function handleAddCandidateMaterial(
    candidate: ProjectGeotechnicalMaterialCandidate,
    includeInProject: boolean,
  ) {
    if (!draftActionAdapter.onAddMaterialCandidate) {
      toast.error('Adding suggested project materials is not available on this page.');
      return;
    }

    draftActionAdapter.onAddMaterialCandidate(candidate, includeInProject);
    markCandidateApplied(
      candidate,
      includeInProject
        ? 'Added as a new included project geotechnical material.'
        : 'Added as a new project geotechnical material option.',
    );
    toast.success(
      includeInProject
        ? 'Added candidate and included it in the project draft. Changes are not saved yet.'
        : 'Added candidate as a new project material option. Changes are not saved yet.',
    );
  }

  function handleApplyCandidateToExisting(
    candidate: ProjectGeotechnicalMaterialCandidate,
    targetIndex: number,
  ) {
    if (!draftActionAdapter.onApplyMaterialCandidateToExisting) {
      toast.error('Applying a candidate into an existing material row is not available here.');
      return;
    }

    const targetMaterial =
      draftActionAdapter.projectSpecifics.geotechnicalMaterials.materials[targetIndex] ?? null;
    draftActionAdapter.onApplyMaterialCandidateToExisting(candidate, targetIndex);
    setCandidateTargets((current) => ({ ...current, [candidate.id]: '' }));
    markCandidateApplied(
      candidate,
      `Applied to ${targetMaterial ? resolveProjectGeotechnicalMaterialTargetLabel(targetMaterial, targetIndex) : `material row ${targetIndex + 1}`} in the current draft.`,
    );
    toast.success('Applied candidate into the selected material row. Changes are not saved yet.');
  }

  return (
    <div
      className={presentation === 'assistant' ? 'mt-3 space-y-4' : 'space-y-4'}
      data-testid="project-ai-suggestions-content"
    >
      {hasSuggestedContent ? (
        <SuggestionBlock
          title="Suggested"
          description="Safe draft-only actions you can apply now. Nothing saves or runs automatically."
        >
          {suggestionSections.length > 0 ? (
            <div className="space-y-4" data-testid="project-ai-section-suggested">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {visibleRegularSuggestions.length} field
                  {visibleRegularSuggestions.length === 1 ? '' : 's'}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplySuggestions(visibleRegularSuggestions)}
                  disabled={!suggestionAdapter || visibleRegularSuggestions.length === 0}
                >
                  Apply all suggested fields
                </Button>
              </div>

              {suggestionSections.map((section) => (
                <div
                  key={section.id}
                  className="space-y-3 rounded-xl border p-4"
                  data-testid={`project-ai-section-${section.id}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">{section.title}</div>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {section.suggestions.length} field
                        {section.suggestions.length === 1 ? '' : 's'}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplySuggestions(section.suggestions)}
                        disabled={!suggestionAdapter}
                      >
                        Apply section
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {section.suggestions.map((suggestion) => {
                      const currentValue =
                        suggestionAdapter?.getCurrentValue(suggestion.fieldPath) ?? null;
                      const isApplicable = suggestionAdapter
                        ? canApplySuggestion(suggestionAdapter, suggestion)
                        : false;

                      return (
                        <div
                          key={suggestionKey(suggestion)}
                          className="rounded-lg border bg-background px-3 py-3"
                          data-testid={`project-ai-suggestion-${sanitizeSuggestionTestId(suggestion.fieldPath)}`}
                        >
                          <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1.1fr),minmax(0,0.85fr),minmax(0,0.95fr),auto] xl:items-start">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium">{suggestion.label}</div>
                                <Badge variant="secondary">
                                  {formatSuggestionSourceType(suggestion.sourceType)}
                                </Badge>
                                <Badge variant="outline">
                                  {formatApplyMode(suggestion.applyMode)}
                                </Badge>
                                {suggestion.confidence != null ? (
                                  <Badge variant="outline">
                                    {formatConfidence(suggestion.confidence)}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {suggestion.sourceSummary}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {suggestion.rationale}
                              </div>
                            </div>

                            <ReviewCell title="Current value">
                              {formatSuggestionValue(currentValue)}
                            </ReviewCell>
                            <ReviewCell title="Suggested value">
                              {formatSuggestionValue(suggestion.suggestedValue)}
                            </ReviewCell>

                            <div className="flex flex-col gap-2 xl:items-end">
                              <Button
                                type="button"
                                size="sm"
                                variant={isApplicable ? 'default' : 'outline'}
                                disabled={!isApplicable}
                                onClick={() => handleApplySuggestions([suggestion])}
                              >
                                Apply
                              </Button>
                              {!isApplicable ? (
                                <div className="text-xs text-muted-foreground">
                                  Not applicable on this page
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">Draft only</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {materialCandidates.length > 0 ? (
            <div
              className="space-y-4 rounded-xl border p-4"
              data-testid="project-ai-section-suggested-project-geotechnical-materials"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">
                    Suggested Project Geotechnical Materials
                  </div>
                  <Badge variant="outline">
                    {materialCandidates.length} candidate
                    {materialCandidates.length === 1 ? '' : 's'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Extracted parameter-table rows are surfaced here as candidate project materials.
                  They are never applied to an existing row by index.
                </p>
              </div>

              <div className="space-y-4">
                {materialCandidates.map((candidate) => {
                  const strongMatchIndex = findStrongProjectGeotechnicalMaterialCandidateMatchIndex(
                    draftActionAdapter.projectSpecifics,
                    candidate,
                  );
                  const strongMatchMaterial =
                    strongMatchIndex != null
                      ? (draftActionAdapter.projectSpecifics.geotechnicalMaterials.materials[
                          strongMatchIndex
                        ] ?? null)
                      : null;
                  const strongMatchLabel =
                    strongMatchMaterial && strongMatchIndex != null
                      ? resolveProjectGeotechnicalMaterialTargetLabel(
                          strongMatchMaterial,
                          strongMatchIndex,
                        )
                      : null;

                  return (
                    <div
                      key={candidate.id}
                      className="space-y-4 rounded-lg border bg-background px-4 py-4"
                      data-testid={`project-ai-geotech-candidate-${candidate.id}`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium">
                              {resolveProjectGeotechnicalMaterialCandidateLabel(candidate)}
                            </div>
                            <Badge variant="secondary">Report-derived candidate</Badge>
                            {candidate.confidence != null ? (
                              <Badge variant="outline">
                                {formatConfidence(candidate.confidence)}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {candidate.sourceSummary}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Per-candidate actions only
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <ReviewCell title="Extracted material / unit name">
                          {formatMaterialIdentity(candidate)}
                        </ReviewCell>
                        <ReviewCell title="Source document">
                          {formatSuggestionValue(candidate.sourceDocument)}
                        </ReviewCell>
                        <ReviewCell title="Source project">
                          {formatSuggestionValue(candidate.sourceProject)}
                        </ReviewCell>
                        <ReviewCell title="Source site">
                          {formatSuggestionValue(candidate.sourceSite)}
                        </ReviewCell>
                        <ReviewCell title="Source section / page">
                          {formatSuggestionValue(candidate.sourceSection)}
                        </ReviewCell>
                        <ReviewCell title="Source table">
                          {formatSuggestionValue(candidate.sourceTable)}
                        </ReviewCell>
                        <ReviewCell title="Notes">
                          {formatSuggestionValue(candidate.notes)}
                        </ReviewCell>
                        <ReviewCell title="Report-derived parameter values">
                          {formatCandidateParameterValues(candidate)}
                        </ReviewCell>
                      </div>

                      <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
                        {strongMatchLabel ? (
                          <div className="text-sm text-muted-foreground">
                            Safe row match available:{' '}
                            <span className="font-medium text-foreground">{strongMatchLabel}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No safe row match was found. Existing rows only change if you choose a
                            target below.
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddCandidateMaterial(candidate, false)}
                            data-testid={`project-ai-geotech-candidate-add-new-${candidate.id}`}
                          >
                            Add as new material option
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddCandidateMaterial(candidate, true)}
                            data-testid={`project-ai-geotech-candidate-add-include-${candidate.id}`}
                          >
                            Add and include in project
                          </Button>
                          {strongMatchIndex != null ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                handleApplyCandidateToExisting(candidate, strongMatchIndex)
                              }
                              data-testid={`project-ai-geotech-candidate-apply-match-${candidate.id}`}
                            >
                              Apply to matching row
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </SuggestionBlock>
      ) : null}

      {needsSelection ? (
        <SuggestionBlock
          title="Requires your selection"
          description="Ambiguous row updates stay manual. Choose an existing project material row before applying."
        >
          <div className="space-y-4" data-testid="project-ai-section-requires-selection">
            {materialCandidates.map((candidate) => {
              const strongMatchIndex = findStrongProjectGeotechnicalMaterialCandidateMatchIndex(
                draftActionAdapter.projectSpecifics,
                candidate,
              );
              const strongMatchMaterial =
                strongMatchIndex != null
                  ? (draftActionAdapter.projectSpecifics.geotechnicalMaterials.materials[
                      strongMatchIndex
                    ] ?? null)
                  : null;
              const selectedTarget = candidateTargets[candidate.id] ?? '';
              const selectedTargetIndex =
                selectedTarget.trim().length > 0 ? Number(selectedTarget) : null;

              return (
                <div
                  key={`selection-${candidate.id}`}
                  className="space-y-3 rounded-lg border bg-background px-4 py-4"
                  data-testid={`project-ai-geotech-candidate-target-${candidate.id}`}
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {resolveProjectGeotechnicalMaterialCandidateLabel(candidate)}
                    </div>
                    <div className="text-sm text-muted-foreground">{candidate.sourceSummary}</div>
                    {strongMatchMaterial && strongMatchIndex != null ? (
                      <div className="text-xs text-muted-foreground">
                        Safe match available:{' '}
                        {resolveProjectGeotechnicalMaterialTargetLabel(
                          strongMatchMaterial,
                          strongMatchIndex,
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No safe row match was found, so an existing row update requires your
                        explicit selection.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr),auto]">
                    <div>
                      <Select
                        value={selectedTarget || '__none__'}
                        onValueChange={(nextValue) =>
                          setCandidateTargets((current) => ({
                            ...current,
                            [candidate.id]: nextValue === '__none__' ? '' : nextValue,
                          }))
                        }
                      >
                        <SelectTrigger
                          data-testid={`project-ai-geotech-candidate-target-trigger-${candidate.id}`}
                        >
                          <SelectValue placeholder="Choose existing project material row" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Choose existing project material row
                          </SelectItem>
                          {draftActionAdapter.projectSpecifics.geotechnicalMaterials.materials.map(
                            (material, index) => (
                              <SelectItem
                                key={material.id || `candidate-target-${index}`}
                                value={String(index)}
                              >
                                {resolveProjectGeotechnicalMaterialTargetLabel(material, index)}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={selectedTargetIndex == null}
                      onClick={() =>
                        selectedTargetIndex != null
                          ? handleApplyCandidateToExisting(candidate, selectedTargetIndex)
                          : null
                      }
                      data-testid={`project-ai-geotech-candidate-apply-selected-${candidate.id}`}
                    >
                      Apply to existing row
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </SuggestionBlock>
      ) : null}

      {appliedActions.length > 0 ? (
        <SuggestionBlock
          title="Applied to draft"
          description={`Changes are staged in the current ${resolveDraftScopeLabel(draftActionAdapter.scope)} draft only. Save stays manual.`}
        >
          <div className="space-y-3" data-testid="project-ai-section-applied-to-draft">
            {appliedActions.map((action) => (
              <div key={action.id} className="rounded-lg border bg-background px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{action.title}</div>
                  <Badge variant="success">Applied to draft</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{action.detail}</div>
              </div>
            ))}
          </div>
        </SuggestionBlock>
      ) : null}

      {response.limitationNote ? (
        <Alert>
          <AlertTitle>Use caution</AlertTitle>
          <AlertDescription className="space-y-3">
            <div>{response.limitationNote}</div>
            {shouldShowAiReportsAction && draftActionAdapter.aiReportsHref ? (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(draftActionAdapter.aiReportsHref ?? '')}
                >
                  Open AI Reports upload
                </Button>
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {!hasSuggestedContent && appliedActions.length === 0 && !response.limitationNote ? (
        <Alert>
          <AlertTitle>No visible draft suggestions for this page scope</AlertTitle>
          <AlertDescription>
            The current assistant response included suggestions, but none of them are safely
            actionable on this page.
          </AlertDescription>
        </Alert>
      ) : null}

      {hasSuggestedContent || appliedActions.length > 0 || shouldShowAiReportsAction ? (
        <div className="text-xs text-muted-foreground" data-testid="project-ai-suggestions-footer">
          The floating assistant only changes the current draft. It never auto-saves, never
          auto-runs, and the page keeps showing unsaved changes until you click{' '}
          {resolveSaveButtonLabel(draftActionAdapter.scope)}.
        </div>
      ) : null}
    </div>
  );
}

function SuggestionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ReviewCell({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-lg border bg-muted/10 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{children}</div>
    </div>
  );
}

export function filterSuggestionsForScope(
  suggestions: AiAssistantSuggestedField[],
  scope: ProjectDraftActionAdapter['scope'],
) {
  if (scope === 'project-geotechnical') {
    return suggestions.filter((field) => isProjectGeotechnicalMaterialCandidateSuggestion(field));
  }

  if (scope === 'project-foundations') {
    return suggestions.filter((field) => isProjectFoundationsSuggestionFieldPath(field.fieldPath));
  }

  return suggestions.filter((field) => isProjectPageSuggestionFieldPath(field.fieldPath));
}

function buildSuggestionSections(
  suggestions: AiAssistantSuggestedField[],
  scope: ProjectDraftActionAdapter['scope'],
) {
  const reportMetadata = suggestions.filter((field) => field.fieldPath.startsWith('reportMeta.'));
  const projectGeotechnicalNotes = suggestions.filter((field) =>
    field.fieldPath.startsWith('geotechnicalBasis.'),
  );
  const projectNotes = suggestions.filter((field) => field.fieldPath.startsWith('identity.'));
  const projectReferences = suggestions.filter((field) =>
    field.fieldPath.startsWith('references['),
  );

  const sections: SuggestionSection[] = [];
  if (reportMetadata.length > 0) {
    sections.push({
      id: 'report-metadata',
      title: 'Report Metadata',
      description:
        'Report-title, revision, issue, and sign-off values grounded in the current extracted report.',
      suggestions: reportMetadata,
    });
  }
  if (projectNotes.length > 0) {
    sections.push({
      id: 'project-notes',
      title: 'Project Notes',
      description: 'Project-level summary text suggested from extracted report context.',
      suggestions: projectNotes,
    });
  }
  if (projectReferences.length > 0) {
    sections.push({
      id: 'project-references',
      title: 'Project References',
      description:
        'Reference metadata that can be copied into the current Project References draft.',
      suggestions: projectReferences,
    });
  }
  if (scope === 'project-foundations' && projectGeotechnicalNotes.length > 0) {
    sections.push({
      id: 'foundation-global-geo-controls',
      title: 'Foundation / Global GEO Controls',
      description:
        'Draft-only groundwater, socket, founding, commentary, and uplift settings suggested from the current AI report extraction.',
      suggestions: projectGeotechnicalNotes,
    });
  }

  return sections;
}

function canApplySuggestion(
  suggestionAdapter: AiAssistantSuggestionApplyAdapter,
  field: AiAssistantSuggestedField,
) {
  return suggestionAdapter.canApplyField ? suggestionAdapter.canApplyField(field.fieldPath) : true;
}

function suggestionKey(field: AiAssistantSuggestedField) {
  return [field.fieldPath, field.suggestedValue, field.sourceSummary].join('::');
}

function shouldOfferAiReportsAction(response: AiAssistantStructuredResponse) {
  const searchableText = [
    response.answer,
    response.limitationNote,
    ...response.suggestedNextSteps,
    ...response.toolFindings,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    searchableText.includes('upload') ||
    searchableText.includes('ai report') ||
    searchableText.includes('extract')
  );
}

function resolveDraftScopeLabel(scope: ProjectDraftActionAdapter['scope']) {
  if (scope === 'project-geotechnical') {
    return 'project geotechnical';
  }
  if (scope === 'project-foundations') {
    return 'foundations';
  }
  return 'project';
}

function resolveSaveButtonLabel(scope: ProjectDraftActionAdapter['scope']) {
  if (scope === 'project-geotechnical') {
    return 'Save Project Geotechnical';
  }
  if (scope === 'project-foundations') {
    return 'Save Foundations Settings';
  }
  return 'Save Project Details';
}

function formatSuggestionSourceType(sourceType: AiAssistantSuggestedField['sourceType']) {
  switch (sourceType) {
    case 'report_derived':
      return 'Report-derived';
    case 'project_state':
      return 'Project state';
    case 'standards_reference':
      return 'Reference-only';
    case 'internal_tool':
      return 'Internal tool';
    case 'page_context_inference':
      return 'Page inference';
    default:
      return 'Suggestion';
  }
}

function formatApplyMode(applyMode: AiAssistantSuggestedField['applyMode']) {
  return applyMode === 'replace' ? 'Replace' : 'Fill if empty';
}

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}% confidence`;
}

function formatSuggestionValue(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'Blank';
}

function formatMaterialIdentity(candidate: ProjectGeotechnicalMaterialCandidate) {
  const label = resolveProjectGeotechnicalMaterialCandidateLabel(candidate);
  if (candidate.unitCode.trim() && candidate.displayName.trim()) {
    return `${candidate.unitCode.trim()} - ${candidate.displayName.trim()}`;
  }
  return label === 'Material row' ? 'Blank' : label;
}

function formatCandidateParameterValues(candidate: ProjectGeotechnicalMaterialCandidate) {
  const lines = [
    candidate.gamma_b != null ? `gamma_b: ${candidate.gamma_b}` : null,
    candidate.phi_prime != null ? `phi': ${candidate.phi_prime}` : null,
    candidate.c_prime != null ? `c': ${candidate.c_prime}` : null,
    candidate.cu != null ? `c_u: ${candidate.cu}` : null,
    candidate.E_MPa != null ? `E: ${candidate.E_MPa} MPa` : null,
    candidate.nu != null ? `nu: ${candidate.nu}` : null,
    candidate.Ka != null ? `K_a: ${candidate.Ka}` : null,
    candidate.Ko != null ? `K_o: ${candidate.Ko}` : null,
    candidate.Kp != null ? `K_p: ${candidate.Kp}` : null,
    candidate.pile_fms_comp_kPa != null ? `f_m,s comp: ${candidate.pile_fms_comp_kPa}` : null,
    candidate.pile_fms_tension_kPa != null
      ? `f_m,s tension: ${candidate.pile_fms_tension_kPa}`
      : null,
    candidate.pile_fb_ult_kPa != null ? `f_b ult: ${candidate.pile_fb_ult_kPa}` : null,
    candidate.pile_fms_allow_kPa != null ? `f_m,s allow: ${candidate.pile_fms_allow_kPa}` : null,
    candidate.pile_fb_allow_kPa != null ? `f_b allow: ${candidate.pile_fb_allow_kPa}` : null,
    candidate.cfaUpliftTensionFactor != null
      ? `CFA uplift tension factor: ${candidate.cfaUpliftTensionFactor}`
      : null,
  ].filter((line): line is string => line != null);

  return lines.length > 0 ? lines.join('\n') : 'Blank';
}

function formatSuggestionSection(fieldPath: string) {
  if (fieldPath.startsWith('identity.')) {
    return 'project notes';
  }
  if (fieldPath.startsWith('reportMeta.')) {
    return 'report metadata';
  }
  if (fieldPath.startsWith('references[')) {
    return 'project references';
  }
  if (fieldPath.startsWith('geotechnicalBasis.')) {
    return 'foundation / global GEO controls';
  }

  return 'draft values';
}

function sanitizeSuggestionTestId(fieldPath: string) {
  return fieldPath
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
