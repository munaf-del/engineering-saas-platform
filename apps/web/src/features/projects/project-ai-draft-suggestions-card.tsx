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
import {
  ProjectAiSuggestionsContent,
  filterSuggestionsForScope,
} from './project-ai-suggestions-content';

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

  const scopedSuggestions = useMemo(
    () => filterSuggestionsForScope(response?.suggestedFields ?? [], scope),
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
          <CardDescription>
            {resolveProjectAiDraftSuggestionsDescription(scope)}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Draft-only</Badge>
          {response ? (
            <Badge variant="secondary">
              {visibleItemCount} visible item{visibleItemCount === 1 ? '' : 's'}
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
            {response
              ? 'Refresh Suggestions'
              : resolveProjectAiDraftSuggestionsButtonLabel(scope)}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!response ? (
          <div className="rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
            {scope === 'project-geotechnical' ? (
              <>
                Click{' '}
                <span className="font-medium text-foreground">
                  Show Geotechnical AI Suggestions
                </span>{' '}
                to load visible report-derived candidate materials for the shared project
                geotechnical workspace.
              </>
            ) : scope === 'project-foundations' ? (
              <>
                Click <span className="font-medium text-foreground">Show Foundation AI Suggestions</span>{' '}
                to load visible report-derived draft suggestions for groundwater, CFA uplift,
                socket assumptions, founding notes, and project-level geotechnical commentary.
              </>
            ) : (
              <>
                Click <span className="font-medium text-foreground">Show AI Suggestions</span> to
                load visible report-derived draft suggestions for Project Details and report
                metadata on this page.
              </>
            )}
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
  if (scope === 'project-geotechnical') {
    return 'Geotechnical AI Suggestions';
  }
  if (scope === 'project-foundations') {
    return 'Foundation AI Suggestions';
  }
  return 'Project Details AI Suggestions';
}

function resolveProjectAiDraftSuggestionsDescription(
  scope: Extract<AiAssistantDraftActionAdapter, { kind: 'project' }>['scope'],
) {
  if (scope === 'project-geotechnical') {
    return 'This keeps shared Project Geotechnical material-candidate review on the materials workspace. You review and apply changes manually, and they only affect the current draft until you save.';
  }
  if (scope === 'project-foundations') {
    return 'This keeps report-grounded foundation/global GEO-control suggestions on the Foundations page. You review and apply changes manually, and they only affect this page draft until you save.';
  }
  return 'This uses the same grounded suggestion payload as the floating assistant, but keeps the Project Details review list visible on the page. You review and apply changes manually, and they only affect this page draft until you save.';
}

function resolveProjectAiDraftSuggestionsButtonLabel(
  scope: Extract<AiAssistantDraftActionAdapter, { kind: 'project' }>['scope'],
) {
  if (scope === 'project-geotechnical') {
    return 'Show Geotechnical AI Suggestions';
  }
  if (scope === 'project-foundations') {
    return 'Show Foundation AI Suggestions';
  }
  return 'Show AI Suggestions';
}
