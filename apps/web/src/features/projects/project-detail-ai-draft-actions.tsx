'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  Lock,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  AI_ASSISTANT_DRAFT_ACTION_TYPES,
  MULTI_PILE_PROJECT_MAP_SOURCES,
  MULTI_PILE_PROJECT_STATUSES,
  type AiAssistantDraftAction,
  type AiAssistantDraftActionStatus,
  type AiAssistantDraftActionType,
} from '@eng/shared';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  AiAssistantSuggestedField,
  AiAssistantSuggestionApplyAdapter,
} from '@/features/ai/assistant-page-context';
import { cn } from '@/lib/utils';

const PROJECT_DETAIL_ACTION_TYPE_BY_FIELD = {
  'identity.projectNumber': 'set_text',
  'identity.projectName': 'set_text',
  'identity.client': 'set_text',
  'identity.status': 'set_select',
  'identity.address': 'set_text',
  'identity.latitude': 'set_text',
  'identity.longitude': 'set_text',
  'identity.mapAddress': 'set_text',
  'identity.notes': 'set_textarea',
  'identity.archived': 'set_checkbox',
  'identity.mapSource': 'set_select',
  'reportMeta.reportTitle': 'set_text',
  'reportMeta.reportRevision': 'set_text',
  'reportMeta.issueDate': 'set_text',
  'reportMeta.preparedBy': 'set_text',
  'reportMeta.checkedBy': 'set_text',
  'reportMeta.purpose': 'set_text',
} as const satisfies Partial<Record<string, AiAssistantDraftActionType>>;

const PROJECT_DETAIL_SELECT_OPTIONS = {
  'identity.status': MULTI_PILE_PROJECT_STATUSES,
  'identity.mapSource': MULTI_PILE_PROJECT_MAP_SOURCES,
} as const satisfies Partial<Record<string, readonly string[]>>;

const ACTION_STATUS_ORDER: Record<AiAssistantDraftActionStatus, number> = {
  ready: 0,
  requires_manual_selection: 1,
  skipped_existing_value: 2,
  skipped_unresolved: 3,
  skipped_readonly: 4,
};

type ProjectDetailDraftActionItem = AiAssistantDraftAction & {
  id: string;
  suggestion: AiAssistantSuggestedField;
  selectable: boolean;
  selectedByDefault: boolean;
  confidence: number | null;
  sourceSummary: string;
};

export function ProjectDetailAiDraftActions({
  suggestions,
  draftActions,
  suggestionAdapter,
}: {
  suggestions: AiAssistantSuggestedField[];
  draftActions?: AiAssistantDraftAction[];
  suggestionAdapter: AiAssistantSuggestionApplyAdapter | null;
}) {
  const actions = useMemo(
    () =>
      buildProjectDetailDraftActions({
        suggestions,
        draftActions,
        suggestionAdapter,
      }),
    [draftActions, suggestionAdapter, suggestions],
  );
  const applicableActionIds = useMemo(
    () => actions.filter((action) => action.status === 'ready').map((action) => action.id),
    [actions],
  );
  const selectableActionIds = useMemo(
    () => actions.filter((action) => action.selectable).map((action) => action.id),
    [actions],
  );
  const actionSignature = useMemo(
    () =>
      actions
        .map((action) => [action.id, action.status, action.currentValue, action.proposedValue].join('::'))
        .join('\u001f'),
    [actions],
  );
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(
    () => new Set(applicableActionIds),
  );
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setSelectedActionIds(new Set(applicableActionIds));
    setIsDismissed(false);
  }, [actionSignature, applicableActionIds]);

  const selectedSelectableCount = useMemo(
    () => selectableActionIds.filter((id) => selectedActionIds.has(id)).length,
    [selectableActionIds, selectedActionIds],
  );
  const requiresManualSelectionCount = useMemo(
    () => actions.filter((action) => action.status === 'requires_manual_selection').length,
    [actions],
  );
  const skippedCount = useMemo(
    () => actions.filter((action) => action.status.startsWith('skipped_')).length,
    [actions],
  );

  function handleToggleAction(actionId: string, checked: boolean) {
    setSelectedActionIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(actionId);
      } else {
        next.delete(actionId);
      }
      return next;
    });
  }

  function applyActionIds(actionIds: string[]) {
    if (!suggestionAdapter) {
      toast.error('Applying Project Details draft actions is not available on this page yet.');
      return;
    }

    const selectedActions = actions.filter(
      (action) => actionIds.includes(action.id) && action.selectable,
    );
    if (selectedActions.length === 0) {
      toast.error('Select at least one Project Details draft action to apply.');
      return;
    }

    const result = suggestionAdapter.applySuggestions(
      selectedActions.map((action) => action.suggestion),
    );
    if (result.appliedCount > 0) {
      toast.success(
        `${result.appliedCount} Project Details draft action${result.appliedCount === 1 ? '' : 's'} applied. Save remains manual.`,
      );
    } else {
      toast.message('No selected Project Details draft actions were applied.');
    }

    if (result.appliedCount > 0) {
      setSelectedActionIds((current) => {
        const next = new Set(current);
        selectedActions.forEach((action) => next.delete(action.id));
        return next;
      });
    }
  }

  if (actions.length === 0) {
    return null;
  }

  if (isDismissed) {
    return (
      <div
        className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground"
        data-testid="project-detail-ai-draft-actions-dismissed"
      >
        Project Details draft actions dismissed for this response.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="project-detail-ai-draft-actions">
      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Project Details Draft Actions
            </div>
            <p className="text-sm text-muted-foreground">
              Review suggested changes first. Applying only updates the live Project Details draft on
              this page, and Save stays manual.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">
              {applicableActionIds.length} applicable
            </Badge>
            <Badge variant="warning">
              {requiresManualSelectionCount} manual selection
            </Badge>
            <Badge variant="outline">{skippedCount} skipped</Badge>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={applicableActionIds.length === 0}
            onClick={() => setSelectedActionIds(new Set(applicableActionIds))}
          >
            Select all applicable
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={selectedSelectableCount === 0}
            onClick={() => setSelectedActionIds(new Set())}
          >
            Clear selection
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selectedSelectableCount === 0}
            onClick={() => applyActionIds(Array.from(selectedActionIds))}
          >
            Apply selected
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={applicableActionIds.length === 0}
            onClick={() => applyActionIds(applicableActionIds)}
          >
            Apply all applicable
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            data-testid="project-detail-ai-draft-actions-dismiss"
            onClick={() => {
              setSelectedActionIds(new Set());
              setIsDismissed(true);
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Dismiss all
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className={cn(
                'rounded-xl border px-3 py-3',
                action.selectable ? 'bg-background' : 'bg-muted/10',
                cardClassesForStatus(action.status),
              )}
              data-testid={`project-detail-ai-draft-action-${sanitizeTestId(action.fieldKey)}`}
            >
              <div className="flex items-start gap-3">
                {action.selectable ? (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-input"
                    checked={selectedActionIds.has(action.id)}
                    onChange={(event) => handleToggleAction(action.id, event.target.checked)}
                  />
                ) : (
                  <div className="mt-1 h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                )}
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{action.label ?? action.fieldKey}</div>
                    <Badge variant={variantForStatus(action.status)}>
                      {labelForStatus(action.status)}
                    </Badge>
                    <Badge variant="secondary">{labelForActionType(action.actionType)}</Badge>
                    {action.confidence != null ? (
                      <Badge variant="outline">{Math.round(action.confidence * 100)}% confidence</Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr),minmax(0,0.9fr),minmax(0,1.2fr)]">
                    <ReviewCell title="Current value">
                      {formatDraftActionValue(action.currentValue)}
                    </ReviewCell>
                    <ReviewCell title="Proposed value">
                      {formatDraftActionValue(action.proposedValue)}
                    </ReviewCell>
                    <ReviewCell title="Grounding / rationale">
                      {[action.sourceSummary, action.reason].filter(Boolean).join('\n\n')}
                    </ReviewCell>
                  </div>

                  <StatusIndicator status={action.status} message={action.message} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function buildProjectDetailDraftActions({
  suggestions,
  draftActions = [],
  suggestionAdapter,
}: {
  suggestions: AiAssistantSuggestedField[];
  draftActions?: AiAssistantDraftAction[];
  suggestionAdapter: AiAssistantSuggestionApplyAdapter | null;
}): ProjectDetailDraftActionItem[] {
  const draftActionBySuggestionKey = new Map(
    draftActions.map((draftAction) => [
      draftActionKey(draftAction.fieldKey, draftAction.proposedValue),
      draftAction,
    ]),
  );

  return [...suggestions]
    .map((suggestion) =>
      createProjectDetailDraftAction(
        suggestion,
        suggestionAdapter,
        draftActionBySuggestionKey.get(
          draftActionKey(suggestion.fieldPath, suggestion.suggestedValue),
        ) ?? null,
      ),
    )
    .sort((left, right) => {
      const statusOrder =
        (ACTION_STATUS_ORDER[left.status] ?? 0) - (ACTION_STATUS_ORDER[right.status] ?? 0);
      if (statusOrder !== 0) {
        return statusOrder;
      }

      return (left.label ?? left.fieldKey).localeCompare(right.label ?? right.fieldKey);
    });
}

function createProjectDetailDraftAction(
  suggestion: AiAssistantSuggestedField,
  suggestionAdapter: AiAssistantSuggestionApplyAdapter | null,
  draftAction: AiAssistantDraftAction | null,
): ProjectDetailDraftActionItem {
  const actionType =
    draftAction?.actionType ?? resolveProjectDetailActionType(suggestion.fieldPath);
  const currentValue = suggestionAdapter?.getCurrentValue(suggestion.fieldPath) ?? null;
  const normalizedCurrentValue =
    actionType != null
      ? normalizeDraftActionValue(suggestion.fieldPath, actionType, currentValue)
      : currentValue;
  const normalizedProposedValue =
    actionType != null
      ? normalizeDraftActionValue(suggestion.fieldPath, actionType, suggestion.suggestedValue)
      : null;
  const canApplyField =
    suggestionAdapter == null
      ? false
      : suggestionAdapter.canApplyField
        ? suggestionAdapter.canApplyField(suggestion.fieldPath)
        : true;

  let status: AiAssistantDraftActionStatus = 'ready';
  let message: string | null = 'Ready to apply to the current Project Details draft.';

  if (actionType == null) {
    status = 'skipped_unresolved';
    message = 'This field is not wired to the Project Details draft in Phase 1.';
  } else if (!AI_ASSISTANT_DRAFT_ACTION_TYPES.includes(actionType)) {
    status = 'skipped_unresolved';
    message = 'This suggested action type is not supported in Phase 1.';
  } else if (suggestionAdapter == null) {
    status = 'skipped_unresolved';
    message = 'Project Details apply is not available on this page right now.';
  } else if (!canApplyField) {
    status = 'skipped_unresolved';
    message = 'This field is outside the current Project Details integration scope.';
  } else if (normalizedProposedValue == null) {
    status = 'skipped_unresolved';
    message = 'The proposed value could not be safely mapped into the current Project Details form state.';
  } else if (areDraftActionValuesEqual(actionType, normalizedCurrentValue, normalizedProposedValue)) {
    status = 'skipped_existing_value';
    message = 'The current Project Details draft already matches this value.';
  } else if (hasExistingDraftActionValue(actionType, normalizedCurrentValue)) {
    if (suggestion.applyMode === 'replace') {
      status = 'requires_manual_selection';
      message =
        'This would overwrite an existing Project Details value. Select it manually if you want to apply it.';
    } else {
      status = 'skipped_existing_value';
      message = 'This field already has a value, so overwrite is blocked by default.';
    }
  }

  return {
    id: suggestionKey(suggestion),
    fieldKey: suggestion.fieldPath,
    actionType: actionType ?? 'set_text',
    proposedValue: normalizedProposedValue ?? suggestion.suggestedValue,
    label: draftAction?.label ?? suggestion.label,
    currentValue: normalizedCurrentValue,
    reason: draftAction?.reason ?? suggestion.rationale,
    status,
    message: draftAction?.message ?? message,
    suggestion,
    selectable: status === 'ready' || status === 'requires_manual_selection',
    selectedByDefault: status === 'ready',
    confidence: suggestion.confidence,
    sourceSummary: suggestion.sourceSummary,
  };
}

function normalizeDraftActionValue(
  fieldKey: string,
  actionType: AiAssistantDraftActionType,
  value: string | null | undefined,
) {
  if (actionType === 'set_checkbox') {
    return parseCheckboxValue(value);
  }

  const normalized = value?.trim() ?? '';
  if (normalized.length === 0) {
    return null;
  }

  if (actionType === 'set_select') {
    const allowedValues = resolveProjectDetailSelectOptions(fieldKey);
    if (
      allowedValues != null &&
      !(allowedValues as readonly string[]).includes(normalized)
    ) {
      return null;
    }
  }

  return normalized;
}

function parseCheckboxValue(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (normalized.length === 0) {
    return null;
  }
  if (['true', 'yes', 'archived'].includes(normalized)) {
    return true;
  }
  if (['false', 'no', 'not archived', 'active'].includes(normalized)) {
    return false;
  }

  return null;
}

function hasExistingDraftActionValue(
  actionType: AiAssistantDraftActionType,
  value: string | boolean | null | undefined,
) {
  if (actionType === 'set_checkbox') {
    return value !== null && value !== undefined;
  }

  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0;
}

function areDraftActionValuesEqual(
  actionType: AiAssistantDraftActionType,
  currentValue: string | boolean | null | undefined,
  proposedValue: string | boolean | null | undefined,
) {
  if (actionType === 'set_checkbox') {
    return currentValue === proposedValue;
  }

  return (
    typeof currentValue === 'string' &&
    typeof proposedValue === 'string' &&
    currentValue.trim() === proposedValue.trim()
  );
}

function variantForStatus(status: AiAssistantDraftActionStatus) {
  switch (status) {
    case 'ready':
      return 'success' as const;
    case 'requires_manual_selection':
      return 'warning' as const;
    case 'skipped_unresolved':
      return 'secondary' as const;
    case 'skipped_readonly':
      return 'secondary' as const;
    case 'skipped_existing_value':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
}

function cardClassesForStatus(status: AiAssistantDraftActionStatus) {
  switch (status) {
    case 'ready':
      return 'border-emerald-200/80';
    case 'requires_manual_selection':
      return 'border-amber-200/80';
    case 'skipped_unresolved':
      return 'border-slate-300/80';
    case 'skipped_readonly':
      return 'border-zinc-300/80';
    case 'skipped_existing_value':
      return 'border-blue-200/80';
    default:
      return '';
  }
}

function labelForStatus(status: AiAssistantDraftActionStatus) {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'requires_manual_selection':
      return 'Manual selection';
    case 'skipped_unresolved':
      return 'Unresolved';
    case 'skipped_readonly':
      return 'Read only';
    case 'skipped_existing_value':
      return 'Skipped existing';
    default:
      return status;
  }
}

function statusMessageForStatus(status: AiAssistantDraftActionStatus) {
  switch (status) {
    case 'ready':
      return 'Ready to apply to the current Project Details draft.';
    case 'requires_manual_selection':
      return 'This action needs explicit manual selection before it can overwrite a current value.';
    case 'skipped_unresolved':
      return 'This action could not be resolved safely against the current page form state.';
    case 'skipped_readonly':
      return 'This field is currently read only and cannot be changed from the assistant.';
    case 'skipped_existing_value':
      return 'Field already has a value, so overwrite is blocked by default.';
    default:
      return '';
  }
}

function labelForActionType(actionType: AiAssistantDraftActionType) {
  switch (actionType) {
    case 'set_text':
      return 'Text';
    case 'set_textarea':
      return 'Textarea';
    case 'set_select':
      return 'Select';
    case 'set_checkbox':
      return 'Checkbox';
    default:
      return actionType;
  }
}

function formatDraftActionValue(value: string | boolean | null | undefined) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'Blank';
}

function sanitizeTestId(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function suggestionKey(field: AiAssistantSuggestedField) {
  return [field.fieldPath, field.suggestedValue, field.sourceSummary].join('::');
}

function draftActionKey(fieldKey: string, proposedValue: string | boolean) {
  return `${fieldKey}::${String(proposedValue)}`;
}

function resolveProjectDetailActionType(fieldKey: string) {
  if (!Object.hasOwn(PROJECT_DETAIL_ACTION_TYPE_BY_FIELD, fieldKey)) {
    return null;
  }

  return PROJECT_DETAIL_ACTION_TYPE_BY_FIELD[
    fieldKey as keyof typeof PROJECT_DETAIL_ACTION_TYPE_BY_FIELD
  ];
}

function resolveProjectDetailSelectOptions(fieldKey: string) {
  if (!Object.hasOwn(PROJECT_DETAIL_SELECT_OPTIONS, fieldKey)) {
    return null;
  }

  return PROJECT_DETAIL_SELECT_OPTIONS[
    fieldKey as keyof typeof PROJECT_DETAIL_SELECT_OPTIONS
  ];
}

function ReviewCell({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{children}</div>
    </div>
  );
}

function StatusIndicator({
  status,
  message,
}: {
  status: AiAssistantDraftActionStatus;
  message: string | null | undefined;
}) {
  const meta = statusMeta(status);
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2 text-xs',
        meta.containerClassName,
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon className={cn('h-4 w-4 shrink-0', meta.iconClassName)} />
        <span>{meta.label}</span>
      </div>
      <div className="mt-1 leading-relaxed">{message ?? statusMessageForStatus(status)}</div>
    </div>
  );
}

function statusMeta(status: AiAssistantDraftActionStatus): {
  label: string;
  icon: LucideIcon;
  containerClassName: string;
  iconClassName: string;
} {
  switch (status) {
    case 'ready':
      return {
        label: 'Ready',
        icon: CheckCircle2,
        containerClassName: 'bg-emerald-50 text-emerald-900',
        iconClassName: 'text-emerald-700',
      };
    case 'requires_manual_selection':
      return {
        label: 'Manual selection required',
        icon: TriangleAlert,
        containerClassName: 'bg-amber-50 text-amber-900',
        iconClassName: 'text-amber-700',
      };
    case 'skipped_unresolved':
      return {
        label: 'Skipped: unresolved',
        icon: AlertCircle,
        containerClassName: 'bg-slate-100 text-slate-900',
        iconClassName: 'text-slate-700',
      };
    case 'skipped_readonly':
      return {
        label: 'Skipped: read only',
        icon: Lock,
        containerClassName: 'bg-zinc-100 text-zinc-900',
        iconClassName: 'text-zinc-700',
      };
    case 'skipped_existing_value':
      return {
        label: 'Skipped: existing value',
        icon: CircleSlash,
        containerClassName: 'bg-blue-50 text-blue-900',
        iconClassName: 'text-blue-700',
      };
    default:
      return {
        label: 'Status',
        icon: AlertCircle,
        containerClassName: 'bg-slate-100 text-slate-900',
        iconClassName: 'text-slate-700',
      };
  }
}
