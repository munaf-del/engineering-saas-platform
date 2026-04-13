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
import type {
  AiAssistantDraftAction,
  AiAssistantDraftActionStatus,
  AiAssistantDraftActionType,
} from '@eng/shared';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  CurrentPageActionCandidate,
  CurrentPageActionExecutionResult,
  CurrentPageActionExecutor,
} from '@/features/ai/current-page-action-executor';
import { summarizeCurrentPageActionResults } from '@/features/ai/current-page-action-executor';
import type { AiAssistantSuggestedField } from '@/features/ai/assistant-page-context';
import { cn } from '@/lib/utils';
import {
  resolveProjectCurrentPageActionScopeLabel,
  resolveProjectCurrentPageActionScopeTitle,
  resolveProjectCurrentPageActionType,
  type ProjectCurrentPageActionScope,
} from './project-current-page-action-executor';

const ACTION_STATUS_ORDER: Record<AiAssistantDraftActionStatus, number> = {
  ready: 0,
  requires_manual_selection: 1,
  skipped_existing_value: 2,
  skipped_unresolved: 3,
  skipped_readonly: 4,
};

type ProjectDetailDraftActionItem = {
  id: string;
  fieldKey: string;
  actionType: AiAssistantDraftActionType;
  proposedValue: string | boolean;
  label?: string;
  currentValue: string | boolean | null;
  reason: string | null;
  status: AiAssistantDraftActionStatus;
  message: string | null;
  suggestion: AiAssistantSuggestedField;
  candidate: CurrentPageActionCandidate | null;
  selectable: boolean;
  selectedByDefault: boolean;
  confidence: number | null;
  sourceSummary: string;
};

export function ProjectDetailAiDraftActions({
  suggestions,
  draftActions,
  currentPageActionExecutor,
  scope = 'project-page',
}: {
  suggestions: AiAssistantSuggestedField[];
  draftActions?: AiAssistantDraftAction[];
  currentPageActionExecutor: CurrentPageActionExecutor | null;
  scope?: ProjectCurrentPageActionScope;
}) {
  const actions = useMemo(
    () =>
      buildProjectDetailDraftActions({
        suggestions,
        draftActions,
        currentPageActionExecutor,
        scope,
      }),
    [currentPageActionExecutor, draftActions, scope, suggestions],
  );
  const applicableActionIds = useMemo(
    () => actions.filter((action) => action.status === 'ready').map((action) => action.id),
    [actions],
  );
  const selectableActionIds = useMemo(
    () => actions.filter((action) => action.selectable).map((action) => action.id),
    [actions],
  );
  const responseSignature = useMemo(
    () => buildResponseSignature(suggestions, draftActions ?? [], scope),
    [draftActions, scope, suggestions],
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
  const [executionLog, setExecutionLog] = useState<CurrentPageActionExecutionResult[]>([]);

  useEffect(() => {
    setSelectedActionIds(new Set(applicableActionIds));
    setIsDismissed(false);
    setExecutionLog([]);
  }, [responseSignature]);

  useEffect(() => {
    if (isDismissed) {
      return;
    }

    setSelectedActionIds((current) => {
      const next = new Set(Array.from(current).filter((id) => selectableActionIds.includes(id)));
      return areStringSetsEqual(current, next) ? current : next;
    });
  }, [actionSignature, isDismissed, selectableActionIds]);

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
  const executionSummary = useMemo(
    () => summarizeCurrentPageActionResults(executionLog),
    [executionLog],
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
    if (!currentPageActionExecutor) {
      toast.error(
        `Applying ${resolveProjectCurrentPageActionScopeLabel(scope)} draft actions is not available on this page yet.`,
      );
      return;
    }

    const selectedActions = actions.filter(
      (action) => actionIds.includes(action.id) && action.selectable && action.candidate != null,
    );
    if (selectedActions.length === 0) {
      toast.error(
        `Select at least one ${resolveProjectCurrentPageActionScopeLabel(scope)} draft action to apply.`,
      );
      return;
    }

    const result = currentPageActionExecutor.executeDraftActions(
      selectedActions
        .map((action) => action.candidate)
        .filter((candidate): candidate is CurrentPageActionCandidate => candidate != null),
    );

    setExecutionLog((current) => [...result.results, ...current].slice(0, 40));

    if (result.appliedCount > 0) {
      toast.success(
        `${result.appliedCount} ${resolveProjectCurrentPageActionScopeLabel(scope)} draft action${result.appliedCount === 1 ? '' : 's'} applied. Save remains manual.`,
      );
    } else {
      toast.message(`No selected ${resolveProjectCurrentPageActionScopeLabel(scope)} draft actions were applied.`);
    }

    if (result.appliedCount > 0) {
      const appliedIds = new Set(
        result.results.filter((entry) => entry.status === 'applied').map((entry) => entry.id),
      );
      setSelectedActionIds((current) => {
        const next = new Set(current);
        appliedIds.forEach((id) => next.delete(id));
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
        {resolveProjectCurrentPageActionScopeTitle(scope)} draft actions dismissed for this
        response.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="project-detail-ai-draft-actions">
      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {resolveProjectCurrentPageActionScopeTitle(scope)} Draft Actions
            </div>
            <p className="text-sm text-muted-foreground">
              Review suggested changes first. Applying only updates the live{' '}
              {resolveProjectCurrentPageActionScopeLabel(scope)} draft on this page, and Save stays
              manual.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{applicableActionIds.length} applicable</Badge>
            <Badge variant="warning">{requiresManualSelectionCount} manual selection</Badge>
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
              setExecutionLog([]);
              setIsDismissed(true);
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Dismiss all
          </Button>
        </div>

        {executionLog.length > 0 ? (
          <div className="mt-4 rounded-xl border bg-muted/20 px-3 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium text-foreground">Current session action log</div>
              <div className="text-muted-foreground">
                {formatExecutionLogSummary(executionSummary)}
              </div>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">
                Show {executionLog.length} recent result{executionLog.length === 1 ? '' : 's'}
              </summary>
              <div className="mt-2 space-y-2">
                {executionLog.map((result) => (
                  <div
                    key={`${result.id}:${result.status}:${result.message}`}
                    className="rounded-lg border bg-background px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-foreground">
                        {result.label ?? result.fieldKey}
                      </div>
                      <Badge variant="outline">{formatExecutionResultStatus(result.status)}</Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">{result.message}</div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        ) : null}

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

                  <StatusIndicator status={action.status} message={action.message} scope={scope} />
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
  currentPageActionExecutor,
  scope = 'project-page',
}: {
  suggestions: AiAssistantSuggestedField[];
  draftActions?: AiAssistantDraftAction[];
  currentPageActionExecutor: CurrentPageActionExecutor | null;
  scope?: ProjectCurrentPageActionScope;
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
        currentPageActionExecutor,
        scope,
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
  currentPageActionExecutor: CurrentPageActionExecutor | null,
  scope: ProjectCurrentPageActionScope,
  draftAction: AiAssistantDraftAction | null,
): ProjectDetailDraftActionItem {
  const resolvedDraftAction = resolveDraftActionForSuggestion(scope, suggestion, draftAction);
  const candidate =
    resolvedDraftAction != null
      ? {
          id: suggestionKey(suggestion),
          label: resolvedDraftAction.label ?? suggestion.label,
          draftAction: resolvedDraftAction,
          overwriteMode: suggestion.applyMode,
        }
      : null;

  if (resolvedDraftAction == null || candidate == null) {
    return {
      id: suggestionKey(suggestion),
      fieldKey: suggestion.fieldPath,
      actionType: draftAction?.actionType ?? 'set_text',
      proposedValue: draftAction?.proposedValue ?? suggestion.suggestedValue,
      label: draftAction?.label ?? suggestion.label,
      currentValue: null,
      reason: draftAction?.reason ?? suggestion.rationale,
      status: 'skipped_unresolved',
      message: `This field is outside the current ${resolveProjectCurrentPageActionScopeLabel(scope)} allowlist.`,
      suggestion,
      candidate: null,
      selectable: false,
      selectedByDefault: false,
      confidence: suggestion.confidence,
      sourceSummary: suggestion.sourceSummary,
    };
  }

  if (!currentPageActionExecutor) {
    return {
      id: candidate.id,
      fieldKey: resolvedDraftAction.fieldKey,
      actionType: resolvedDraftAction.actionType,
      proposedValue: resolvedDraftAction.proposedValue,
      label: resolvedDraftAction.label ?? suggestion.label,
      currentValue: null,
      reason: resolvedDraftAction.reason ?? suggestion.rationale,
      status: 'skipped_unresolved',
      message: `${resolveProjectCurrentPageActionScopeTitle(scope)} apply is not available on this page right now.`,
      suggestion,
      candidate,
      selectable: false,
      selectedByDefault: false,
      confidence: suggestion.confidence,
      sourceSummary: suggestion.sourceSummary,
    };
  }

  const evaluation = currentPageActionExecutor.evaluateDraftAction(candidate);

  return {
    id: candidate.id,
    fieldKey: resolvedDraftAction.fieldKey,
    actionType: evaluation.actionType,
    proposedValue: evaluation.proposedValue ?? resolvedDraftAction.proposedValue,
    label: resolvedDraftAction.label ?? suggestion.label,
    currentValue: evaluation.currentValue,
    reason: resolvedDraftAction.reason ?? suggestion.rationale,
    status: evaluation.status,
    message: evaluation.message,
    suggestion,
    candidate,
    selectable: evaluation.selectable,
    selectedByDefault: evaluation.selectedByDefault,
    confidence: suggestion.confidence,
    sourceSummary: suggestion.sourceSummary,
  };
}

function resolveDraftActionForSuggestion(
  scope: ProjectCurrentPageActionScope,
  suggestion: AiAssistantSuggestedField,
  draftAction: AiAssistantDraftAction | null,
) {
  if (draftAction) {
    return draftAction;
  }

  const actionType = resolveProjectCurrentPageActionType(scope, suggestion.fieldPath);
  if (actionType == null) {
    return null;
  }

  return {
    fieldKey: suggestion.fieldPath,
    actionType,
    proposedValue: suggestion.suggestedValue,
    status: 'ready',
    label: suggestion.label,
    reason: suggestion.rationale,
  } satisfies AiAssistantDraftAction;
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

function formatExecutionResultStatus(status: CurrentPageActionExecutionResult['status']) {
  switch (status) {
    case 'applied':
      return 'Applied';
    case 'skipped_existing_value':
      return 'Skipped existing';
    case 'skipped_unresolved':
      return 'Skipped unresolved';
    case 'skipped_readonly':
      return 'Skipped read only';
    case 'rejected_not_allowlisted':
      return 'Rejected';
    case 'failed_apply':
      return 'Failed';
    default:
      return status;
  }
}

function formatExecutionLogSummary(
  summary: ReturnType<typeof summarizeCurrentPageActionResults>,
) {
  const parts = [
    summary.applied > 0 ? `${summary.applied} applied` : null,
    summary.skipped_existing_value > 0
      ? `${summary.skipped_existing_value} skipped existing value`
      : null,
    summary.skipped_unresolved > 0 ? `${summary.skipped_unresolved} skipped unresolved` : null,
    summary.skipped_readonly > 0 ? `${summary.skipped_readonly} skipped read only` : null,
    summary.rejected_not_allowlisted > 0
      ? `${summary.rejected_not_allowlisted} rejected not allowlisted`
      : null,
    summary.failed_apply > 0 ? `${summary.failed_apply} failed` : null,
  ].filter(Boolean);

  return parts.join(' · ');
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

function buildResponseSignature(
  suggestions: AiAssistantSuggestedField[],
  draftActions: AiAssistantDraftAction[],
  scope: ProjectCurrentPageActionScope,
) {
  return [
    scope,
    ...suggestions.map((suggestion) => suggestionKey(suggestion)),
    ...draftActions.map((draftAction) => draftActionKey(draftAction.fieldKey, draftAction.proposedValue)),
  ].join('\u001f');
}

function areStringSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
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
  scope,
}: {
  status: AiAssistantDraftActionStatus;
  message: string | null | undefined;
  scope: ProjectCurrentPageActionScope;
}) {
  const meta = statusMeta(status);
  const Icon = meta.icon;

  return (
    <div className={cn('rounded-lg px-3 py-2 text-xs', meta.containerClassName)}>
      <div className="flex items-center gap-2 font-medium">
        <Icon className={cn('h-4 w-4 shrink-0', meta.iconClassName)} />
        <span>{meta.label}</span>
      </div>
      <div className="mt-1 leading-relaxed">
        {message ?? statusMessageForStatus(status, scope)}
      </div>
    </div>
  );
}

function statusMessageForStatus(
  status: AiAssistantDraftActionStatus,
  scope: ProjectCurrentPageActionScope,
) {
  switch (status) {
    case 'ready':
      return `Ready to apply to the current ${resolveProjectCurrentPageActionScopeLabel(scope)} draft.`;
    case 'requires_manual_selection':
      return `This action needs explicit manual selection before it can overwrite a current ${resolveProjectCurrentPageActionScopeLabel(scope)} value.`;
    case 'skipped_unresolved':
      return `This action could not be resolved safely against the current ${resolveProjectCurrentPageActionScopeLabel(scope)} form state.`;
    case 'skipped_readonly':
      return 'This field is currently read only and cannot be changed from the assistant.';
    case 'skipped_existing_value':
      return 'Field already has a value, so overwrite is blocked by default.';
    default:
      return '';
  }
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
