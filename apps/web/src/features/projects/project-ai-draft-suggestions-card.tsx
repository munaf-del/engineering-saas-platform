'use client';

import { useMemo, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import type { MultiPileProjectSpecifics } from '@eng/shared';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAiAssistantRespond } from '@/hooks/use-ai';
import type { CurrentPageActionExecutor } from '@/features/ai/current-page-action-executor';
import type {
  AiAssistantDraftActionAdapter,
  AiAssistantPageContext,
  AiAssistantSuggestionApplyAdapter,
} from '@/features/ai/assistant-page-context';
import type { AiAssistantStructuredResponse } from '@/features/ai/assistant-types';
import {
  collectProjectGeotechnicalMaterialCandidates,
  type ProjectGeotechnicalMaterialCandidate,
} from './project-ai-geotechnical-material-candidates';
import { ProjectAiSuggestionsContent } from './project-ai-suggestions-content';
import {
  filterProjectAssistantSuggestionsForScope,
  resolveProjectAssistantPageCapabilityByScope,
} from './project-assistant-page-capabilities';

type ProjectAiDraftSuggestionsCardProps = {
  pageContext: AiAssistantPageContext;
  projectSpecifics: MultiPileProjectSpecifics;
  suggestionAdapter: AiAssistantSuggestionApplyAdapter | null;
  currentPageActionExecutor?: CurrentPageActionExecutor | null;
  scope?: Extract<AiAssistantDraftActionAdapter, { kind: 'project' }>['scope'];
  onAddMaterialCandidate?: (
    candidate: ProjectGeotechnicalMaterialCandidate,
    includeInProject: boolean,
  ) => void;
  onApplyMaterialCandidateToExisting?: (
    candidate: ProjectGeotechnicalMaterialCandidate,
    targetIndex: number,
  ) => void;
};

export function ProjectAiDraftSuggestionsCard({
  pageContext,
  projectSpecifics,
  suggestionAdapter,
  currentPageActionExecutor = null,
  scope = 'project-page',
  onAddMaterialCandidate,
  onApplyMaterialCandidateToExisting,
}: ProjectAiDraftSuggestionsCardProps) {
  const respond = useAiAssistantRespond();
  const [response, setResponse] = useState<AiAssistantStructuredResponse | null>(null);
  const capability = resolveProjectAssistantPageCapabilityByScope(scope);

  const scopedSuggestions = useMemo(
    () => filterProjectAssistantSuggestionsForScope(response?.suggestedFields ?? [], scope),
    [response?.suggestedFields, scope],
  );
  const visibleRegularSuggestionCount = useMemo(
    () =>
      scopedSuggestions.filter(
        (suggestion) => !suggestion.fieldPath.startsWith('geotechnicalMaterials.candidates['),
      ).length,
    [scopedSuggestions],
  );
  const visibleMaterialCandidateCount = useMemo(
    () =>
      scope === 'project-geotechnical'
        ? collectProjectGeotechnicalMaterialCandidates(scopedSuggestions).length
        : 0,
    [scope, scopedSuggestions],
  );
  const visibleItemCount = visibleRegularSuggestionCount + visibleMaterialCandidateCount;
  const previewItemCount =
    response == null
      ? 0
      : capability.supported
        ? response.suggestedFields.length
        : visibleItemCount;

  async function handleLoadSuggestions() {
    try {
      const nextResponse = await respond.mutateAsync({
        mode: 'assistant',
        messages: [{ role: 'user', content: 'Suggest values for this page.' }],
        pageContext,
        quickAction: 'suggest_fields',
      });
      setResponse(nextResponse);
      if (nextResponse.suggestedFields.length > 0) {
        toast.success(
          `Loaded ${nextResponse.suggestedFields.length} draft suggestion${nextResponse.suggestedFields.length === 1 ? '' : 's'}`,
        );
      } else {
        toast.message('No draft suggestions were returned for this page.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load AI draft suggestions';
      toast.error(message);
    }
  }

  const draftActionAdapter = useMemo(
    () => ({
      kind: 'project' as const,
      scope,
      projectSpecifics,
      aiReportsHref: pageContext.projectId ? `/projects/${pageContext.projectId}/ai-reports` : null,
      onAddMaterialCandidate,
      onApplyMaterialCandidateToExisting,
    }),
    [
      onAddMaterialCandidate,
      onApplyMaterialCandidateToExisting,
      pageContext.projectId,
      projectSpecifics,
      scope,
    ],
  );

  return (
    <Card id="project-ai-draft-suggestions" data-testid="project-ai-draft-suggestions">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {resolveProjectAiDraftSuggestionsTitle(scope)}
          </CardTitle>
          <CardDescription>{resolveProjectAiDraftSuggestionsDescription(scope)}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Draft-only</Badge>
          {response ? (
            <Badge variant="secondary">
              {previewItemCount} visible item{previewItemCount === 1 ? '' : 's'}
            </Badge>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={handleLoadSuggestions}
            disabled={respond.isPending}
            data-testid="load-project-ai-suggestions"
          >
            {respond.isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {response ? 'Refresh Suggestions' : resolveProjectAiDraftSuggestionsButtonLabel(scope)}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!response ? (
          <div className="rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
            {resolveProjectAiDraftSuggestionsEmptyState(scope)}
          </div>
        ) : null}

        {response?.answer ? (
          <div
            className="rounded-lg border bg-muted/20 px-4 py-3 text-sm"
            data-testid="project-ai-suggestions-answer"
          >
            {response.answer}
          </div>
        ) : null}

        {response?.toolFindings?.length ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Grounding Notes
            </div>
            <div className="flex flex-wrap gap-2">
              {response.toolFindings.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="max-w-full whitespace-normal text-left"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {response ? (
          <ProjectAiSuggestionsContent
            response={response}
            suggestionAdapter={suggestionAdapter}
            currentPageActionExecutor={currentPageActionExecutor}
            draftActionAdapter={draftActionAdapter}
            presentation="card"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function resolveProjectAiDraftSuggestionsTitle(
  scope: Extract<AiAssistantDraftActionAdapter, { kind: 'project' }>['scope'],
) {
  return (
    resolveProjectAssistantPageCapabilityByScope(scope).capabilityCopy.cardTitle ?? 'AI Suggestions'
  );
}

function resolveProjectAiDraftSuggestionsDescription(
  scope: Extract<AiAssistantDraftActionAdapter, { kind: 'project' }>['scope'],
) {
  return (
    resolveProjectAssistantPageCapabilityByScope(scope).capabilityCopy.cardDescription ??
    'AI suggestions are not available on this page.'
  );
}

function resolveProjectAiDraftSuggestionsButtonLabel(
  scope: Extract<AiAssistantDraftActionAdapter, { kind: 'project' }>['scope'],
) {
  return (
    resolveProjectAssistantPageCapabilityByScope(scope).capabilityCopy.loadButtonLabel ??
    'Show AI Suggestions'
  );
}

function resolveProjectAiDraftSuggestionsEmptyState(
  scope: Extract<AiAssistantDraftActionAdapter, { kind: 'project' }>['scope'],
) {
  return resolveProjectAssistantPageCapabilityByScope(scope).capabilityCopy.emptyState;
}
