'use client';

import { useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCreateWasteClassificationRecommendation,
  useGenerateWasteClassificationDraftRecommendation,
} from '@/hooks/use-waste-classification';
import type { ProjectWasteClassificationDraftRecommendation, ProjectWasteClass } from './waste-classification-types';

export function WasteClassificationDisposalHelper({
  projectId,
  reportId,
  finalWasteClass,
  hasAuthoredRecommendation,
  onApplySummary,
}: {
  projectId: string;
  reportId: string;
  finalWasteClass: ProjectWasteClass;
  hasAuthoredRecommendation: boolean;
  onApplySummary: (value: string) => void;
}) {
  const generateDraftRecommendation = useGenerateWasteClassificationDraftRecommendation(
    projectId,
    reportId,
  );
  const createRecommendation = useCreateWasteClassificationRecommendation(projectId, reportId);
  const [draftRecommendation, setDraftRecommendation] =
    useState<ProjectWasteClassificationDraftRecommendation | null>(null);

  async function handleGenerate() {
    try {
      const result = await generateDraftRecommendation.mutateAsync({
        finalWasteClass,
      });
      setDraftRecommendation(result);
      toast.success('Draft recommendation helper generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate draft recommendation');
    }
  }

  async function handleAddRecommendationRow() {
    if (!draftRecommendation) {
      return;
    }

    try {
      await createRecommendation.mutateAsync(draftRecommendation.recommendationRow);
      toast.success('Draft recommendation row added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add draft recommendation row');
    }
  }

  const disabled = finalWasteClass === 'not_yet_classified';

  return (
    <Card data-testid="waste-classification-disposal-helper">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Draft Disposal / Management Helper</CardTitle>
          <CardDescription>
            Generate an editable draft direction from the currently selected final waste class. This
            does not replace facility-specific review or legal advice.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          data-testid="waste-classification-generate-draft-recommendation"
          onClick={handleGenerate}
          disabled={disabled || generateDraftRecommendation.isPending}
        >
          {generateDraftRecommendation.isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {draftRecommendation ? 'Refresh Draft Suggestion' : 'Generate Draft Recommendation'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {disabled ? (
          <div className="rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
            Select a final waste class first to generate a draft disposal / management recommendation.
          </div>
        ) : null}

        {draftRecommendation ? (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{draftRecommendation.finalWasteClass.replace(/_/g, ' ')}</Badge>
              {hasAuthoredRecommendation || draftRecommendation.authoredManagementRecommendationPresent ? (
                <Badge variant="warning">Authored summary already present</Badge>
              ) : null}
              <Badge variant="secondary">Draft only</Badge>
            </div>

            <p className="text-sm">{draftRecommendation.summary}</p>
            <p className="text-xs text-muted-foreground">{draftRecommendation.disclaimer}</p>

            <div className="rounded-lg border bg-background p-3 text-sm">
              <div className="font-medium">{draftRecommendation.recommendationRow.category}</div>
              <p className="mt-2">{draftRecommendation.recommendationRow.recommendation}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Priority: {draftRecommendation.recommendationRow.priority}</span>
                <span>Responsibility: {draftRecommendation.recommendationRow.responsibility}</span>
                <span>Timing: {draftRecommendation.recommendationRow.timingNote}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                data-testid="waste-classification-apply-draft-summary"
                onClick={() => onApplySummary(draftRecommendation.summary)}
              >
                Apply to report summary
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="waste-classification-add-draft-recommendation-row"
                onClick={() => void handleAddRecommendationRow()}
                disabled={createRecommendation.isPending}
              >
                Add as recommendation row
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
