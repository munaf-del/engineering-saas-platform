'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProjectWasteClassificationDraftSuggestion } from './waste-classification-types';

export function WasteClassificationAutofillPanel({
  suggestions,
  onApplySuggestion,
}: {
  suggestions: ProjectWasteClassificationDraftSuggestion[];
  onApplySuggestion: (suggestion: ProjectWasteClassificationDraftSuggestion) => void;
}) {
  return (
    <div data-testid="waste-classification-draft-suggestions" className="space-y-4">
      {suggestions.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
          Link project references, AI documents, or lab evidence to surface draft-only autofill
          suggestions here.
        </div>
      ) : (
        suggestions.map((suggestion) => (
          <div key={suggestion.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{suggestion.label}</div>
              <Badge variant="outline">{suggestion.sourceType.replace(/_/g, ' ')}</Badge>
            </div>
            <p className="mt-2 text-sm">{suggestion.suggestedValue}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Source: {suggestion.sourceLabel}</span>
              <span>{suggestion.rationale}</span>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                data-testid={`waste-classification-apply-suggestion-${suggestion.field}`}
                onClick={() => onApplySuggestion(suggestion)}
              >
                Apply to draft
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
