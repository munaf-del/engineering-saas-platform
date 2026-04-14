'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, CircleSlash, Lock, TriangleAlert, X } from 'lucide-react';
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
  CurrentPageActionExecutionDisplaySummary,
  CurrentPageActionExecutionResult,
  CurrentPageActionExecutionSummary,
  CurrentPageActionExecutor,
} from '@/features/ai/current-page-action-executor';
import {
  createEmptyCurrentPageActionExecutionSummary,
  summarizeCurrentPageActionExecutionSummary,
} from '@/features/ai/current-page-action-executor';
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

const PROJECT_DETAIL_DRAFT_ACTION_HISTORY_LIMIT = 5;
const PROJECT_ARCHIVED_FIELD_KEY = 'identity.archived';

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
  unsupported: boolean;
  selectable: boolean;
  selectedByDefault: boolean;
  confidence: number | null;
  sourceSummary: string;
};

export type ProjectDetailDraftActionOperationKind =
  | 'apply_selected'
  | 'apply_all_applicable'
  | 'dismiss';

export type ProjectDetailDraftActionOperation = {
  id: string;
  kind: ProjectDetailDraftActionOperationKind;
  occurredAt: number;
  summary: CurrentPageActionExecutionSummary;
  results: CurrentPageActionExecutionResult[];
};

export type ProjectDetailDraftActionOperationDisplaySummary =
  CurrentPageActionExecutionDisplaySummary & {
    dismissed: boolean;
  };

export type ProjectDetailDraftActionController = {
  scope: ProjectCurrentPageActionScope;
  actions: ProjectDetailDraftActionItem[];
  applicableActionIds: string[];
  selectableActionIds: string[];
  selectedActionIds: Set<string>;
  selectedSelectableCount: number;
  requiresManualSelectionCount: number;
  skippedCount: number;
  unsupportedCount: number;
  operationHistory: ProjectDetailDraftActionOperation[];
  latestOperation: ProjectDetailDraftActionOperation | null;
  isDismissed: boolean;
  toggleAction: (actionId: string, checked: boolean) => void;
  selectAllApplicable: () => void;
  clearSelection: () => void;
  applySelected: () => void;
  applyAllApplicable: () => void;
  dismissAll: () => void;
};

export function useProjectDetailDraftActionController({
  suggestions,
  draftActions,
  currentPageActionExecutor,
  scope = 'project-page',
}: {
  suggestions: AiAssistantSuggestedField[];
  draftActions?: AiAssistantDraftAction[];
  currentPageActionExecutor: CurrentPageActionExecutor | null;
  scope?: ProjectCurrentPageActionScope;
}): ProjectDetailDraftActionController {
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
        .map((action) =>
          [action.id, action.status, action.currentValue, action.proposedValue].join('::'),
        )
        .join('\u001f'),
    [actions],
  );
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(
    () => new Set(applicableActionIds),
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const [operationHistory, setOperationHistory] = useState<ProjectDetailDraftActionOperation[]>([]);

  useEffect(() => {
    setSelectedActionIds(new Set(applicableActionIds));
    setIsDismissed(false);
    setOperationHistory([]);
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
  const unsupportedCount = useMemo(
    () => actions.filter((action) => action.unsupported).length,
    [actions],
  );
  const latestOperation = operationHistory[0] ?? null;

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

  function recordOperation(operation: ProjectDetailDraftActionOperation) {
    setOperationHistory((current) => appendProjectDetailDraftActionOperation(current, operation));
  }

  function applyActionIds(
    actionIds: string[],
    operationKind: Extract<
      ProjectDetailDraftActionOperationKind,
      'apply_selected' | 'apply_all_applicable'
    >,
  ) {
    if (!currentPageActionExecutor) {
      toast.error(
        `Applying ${resolveProjectCurrentPageActionScopeLabel(scope)} draft actions is not available on this page yet.`,
      );
      return;
    }

    const selectedCandidates = resolveProjectDetailDraftActionCandidates(actions, actionIds);
    if (selectedCandidates.length === 0) {
      toast.error(
        `Select at least one ${resolveProjectCurrentPageActionScopeLabel(scope)} draft action to apply.`,
      );
      return;
    }

    const result = currentPageActionExecutor.executeDraftActions(selectedCandidates);

    recordOperation(
      createProjectDetailDraftActionOperation({
        kind: operationKind,
        summary: result.summary,
        results: result.results,
      }),
    );

    if (result.appliedCount > 0) {
      toast.success(
        `${result.appliedCount} ${resolveProjectCurrentPageActionScopeLabel(scope)} draft action${result.appliedCount === 1 ? '' : 's'} applied. Save remains manual.`,
      );
    } else {
      toast.message(
        `No selected ${resolveProjectCurrentPageActionScopeLabel(scope)} draft actions were applied.`,
      );
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

  return {
    scope,
    actions,
    applicableActionIds,
    selectableActionIds,
    selectedActionIds,
    selectedSelectableCount,
    requiresManualSelectionCount,
    skippedCount,
    unsupportedCount,
    operationHistory,
    latestOperation,
    isDismissed,
    toggleAction: handleToggleAction,
    selectAllApplicable: () => setSelectedActionIds(new Set(applicableActionIds)),
    clearSelection: () => setSelectedActionIds(new Set()),
    applySelected: () => applyActionIds(Array.from(selectedActionIds), 'apply_selected'),
    applyAllApplicable: () => applyActionIds(applicableActionIds, 'apply_all_applicable'),
    dismissAll: () => {
      setSelectedActionIds(new Set());
      setIsDismissed(true);
      recordOperation(createProjectDetailDraftActionDismissOperation());
    },
  };
}

export function resolveProjectDetailDraftActionCandidates(
  actions: ProjectDetailDraftActionItem[],
  actionIds: Iterable<string>,
): CurrentPageActionCandidate[] {
  const actionIdSet = actionIds instanceof Set ? actionIds : new Set(actionIds);

  return actions.flatMap((action) =>
    actionIdSet.has(action.id) && action.selectable && action.candidate != null
      ? [action.candidate]
      : [],
  );
}

export function createProjectDetailDraftActionOperation({
  kind,
  summary,
  results,
  occurredAt = Date.now(),
}: {
  kind: Extract<ProjectDetailDraftActionOperationKind, 'apply_selected' | 'apply_all_applicable'>;
  summary: CurrentPageActionExecutionSummary;
  results: CurrentPageActionExecutionResult[];
  occurredAt?: number;
}): ProjectDetailDraftActionOperation {
  return {
    id: createProjectDetailDraftActionOperationId(),
    kind,
    occurredAt,
    summary,
    results,
  };
}

export function createProjectDetailDraftActionDismissOperation(
  occurredAt = Date.now(),
): ProjectDetailDraftActionOperation {
  return {
    id: createProjectDetailDraftActionOperationId(),
    kind: 'dismiss',
    occurredAt,
    summary: createEmptyCurrentPageActionExecutionSummary(),
    results: [],
  };
}

export function appendProjectDetailDraftActionOperation(
  history: ProjectDetailDraftActionOperation[],
  operation: ProjectDetailDraftActionOperation,
) {
  return [operation, ...history].slice(0, PROJECT_DETAIL_DRAFT_ACTION_HISTORY_LIMIT);
}

export function ProjectDetailAiDraftActions({
  controller,
  showActionBar = true,
  showExecutionLog = true,
}: {
  controller: ProjectDetailDraftActionController;
  showActionBar?: boolean;
  showExecutionLog?: boolean;
}) {
  if (controller.actions.length === 0) {
    return null;
  }

  const hasArchivedProjectAction = controller.actions.some((action) =>
    isArchivedProjectDraftAction(action.fieldKey),
  );

  if (controller.isDismissed) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground"
          data-testid="project-detail-ai-draft-actions-dismissed"
        >
          {resolveProjectCurrentPageActionScopeTitle(controller.scope)} draft actions dismissed for
          this response.
        </div>
        {showExecutionLog && controller.latestOperation ? (
          <ProjectDetailDraftActionHistoryPanel operationHistory={controller.operationHistory} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="project-detail-ai-draft-actions">
      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {resolveProjectCurrentPageActionScopeTitle(controller.scope)} Draft Actions
            </div>
            <p className="text-sm text-muted-foreground">
              Review suggested changes first. Applying only updates the current{' '}
              {resolveProjectCurrentPageActionScopeLabel(controller.scope)} draft on this page, and
              Save stays manual.
            </p>
            {hasArchivedProjectAction ? (
              <p className="text-xs text-muted-foreground">
                Archived project is sensitive. Applying it only toggles the Archived project
                checkbox in this page draft, does not save automatically, and does not affect other
                pages.
              </p>
            ) : null}
            {controller.unsupportedCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {controller.unsupportedCount} unsupported item
                {controller.unsupportedCount === 1 ? '' : 's'}{' '}
                {controller.unsupportedCount === 1 ? 'is' : 'are'} visible for review only because
                guided draft apply is not supported for{' '}
                {controller.unsupportedCount === 1 ? 'that field' : 'those fields'} on this page.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{controller.applicableActionIds.length} applicable</Badge>
            <Badge variant="warning">
              {controller.requiresManualSelectionCount} manual selection
            </Badge>
            <Badge variant="outline">{controller.skippedCount} skipped</Badge>
          </div>
        </div>

        {showActionBar ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={controller.applicableActionIds.length === 0}
              onClick={controller.selectAllApplicable}
            >
              Select all applicable
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={controller.selectedSelectableCount === 0}
              onClick={controller.clearSelection}
            >
              Clear selection
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={controller.selectedSelectableCount === 0}
              onClick={controller.applySelected}
            >
              Apply selected
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={controller.applicableActionIds.length === 0}
              onClick={controller.applyAllApplicable}
            >
              Apply all applicable
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="project-detail-ai-draft-actions-dismiss"
              onClick={controller.dismissAll}
            >
              <X className="mr-2 h-4 w-4" />
              Dismiss draft actions
            </Button>
          </div>
        ) : null}

        {showExecutionLog && controller.latestOperation ? (
          <div className="mt-4">
            <ProjectDetailDraftActionHistoryPanel operationHistory={controller.operationHistory} />
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {controller.actions.map((action) => (
            <div
              key={action.id}
              className={cn(
                'rounded-xl border px-3 py-3',
                action.selectable ? 'bg-background' : 'bg-muted/10',
                cardClassesForStatus(action.status, action.unsupported),
              )}
              data-testid={`project-detail-ai-draft-action-${sanitizeTestId(action.fieldKey)}`}
            >
              <div className="flex items-start gap-3">
                {action.selectable ? (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-input"
                    checked={controller.selectedActionIds.has(action.id)}
                    onChange={(event) => controller.toggleAction(action.id, event.target.checked)}
                  />
                ) : action.unsupported ? (
                  <CircleSlash className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
                ) : (
                  <div className="mt-1 h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                )}
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{action.label ?? action.fieldKey}</div>
                    <Badge variant={variantForStatus(action.status, action.unsupported)}>
                      {labelForStatus(action.status, action.unsupported)}
                    </Badge>
                    <Badge variant="secondary">
                      {labelForActionType(action.actionType, action.fieldKey)}
                    </Badge>
                    {action.confidence != null ? (
                      <Badge variant="outline">
                        {Math.round(action.confidence * 100)}% confidence
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr),minmax(0,0.9fr),minmax(0,1.2fr)]">
                    <ReviewCell title="Current value">
                      {formatDraftActionValue(action.currentValue, action.fieldKey)}
                    </ReviewCell>
                    <ReviewCell title="Proposed value">
                      {formatDraftActionValue(action.proposedValue, action.fieldKey)}
                    </ReviewCell>
                    <ReviewCell title="Grounding / rationale">
                      {[action.sourceSummary, action.reason].filter(Boolean).join('\n\n')}
                    </ReviewCell>
                  </div>

                  <StatusIndicator
                    status={action.status}
                    message={action.message}
                    scope={controller.scope}
                    unsupported={action.unsupported}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailDraftActionHistoryPanel({
  operationHistory,
  className,
}: {
  operationHistory: ProjectDetailDraftActionOperation[];
  className?: string;
}) {
  const latestOperation = operationHistory[0] ?? null;
  const previousOperations = operationHistory.slice(1);

  if (!latestOperation) {
    return null;
  }

  const latestSummary = summarizeProjectDetailDraftActionOperation(latestOperation);

  return (
    <div
      className={cn('rounded-xl border bg-muted/20 p-3', className)}
      data-testid="project-detail-draft-action-history"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Latest Operation
          </div>
          <div className="text-sm font-medium">
            {labelForProjectDetailDraftActionOperationKind(latestOperation.kind)}
          </div>
          <p className="text-xs text-muted-foreground">
            Last action on this page:{' '}
            {formatProjectDetailDraftActionOperationTimestamp(latestOperation.occurredAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Applied: {latestSummary.applied}</Badge>
          <Badge variant={latestSummary.skipped > 0 ? 'warning' : 'outline'}>
            Skipped: {latestSummary.skipped}
          </Badge>
          <Badge variant={latestSummary.rejected > 0 ? 'secondary' : 'outline'}>
            Rejected: {latestSummary.rejected}
          </Badge>
          <Badge variant={latestSummary.failed > 0 ? 'destructive' : 'outline'}>
            Failed: {latestSummary.failed}
          </Badge>
          <Badge variant={latestSummary.dismissed ? 'secondary' : 'outline'}>
            Dismissed: {latestSummary.dismissed ? 'yes' : 'no'}
          </Badge>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {formatProjectDetailDraftActionOperationSummary(latestOperation)}
      </p>

      <details
        className="mt-3 rounded-lg border bg-background px-3 py-2"
        data-testid="project-detail-draft-action-history-details"
      >
        <summary className="cursor-pointer text-sm font-medium">Latest result details</summary>
        <div className="mt-3 space-y-2">
          {latestOperation.kind === 'dismiss' ? (
            <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Dismissed the current draft action set for this response. No field changes were
              applied.
            </div>
          ) : latestOperation.results.length > 0 ? (
            latestOperation.results.map((result) => (
              <div key={result.id} className="rounded-lg border bg-muted/10 px-3 py-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{result.label ?? result.fieldKey}</div>
                    <div className="text-[11px] text-muted-foreground">{result.fieldKey}</div>
                    {result.message ? (
                      <div className="mt-1 text-xs text-muted-foreground">{result.message}</div>
                    ) : null}
                  </div>
                  <Badge variant={variantForExecutionResultStatus(result.status)}>
                    {formatExecutionResultStatus(result.status)}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              No per-field execution results were recorded for this operation.
            </div>
          )}
        </div>
      </details>

      {previousOperations.length > 0 ? (
        <details className="mt-3 rounded-lg border bg-background px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Recent operations ({previousOperations.length})
          </summary>
          <div className="mt-3 space-y-2">
            {previousOperations.map((operation) => (
              <div key={operation.id} className="rounded-lg border bg-muted/10 px-3 py-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      {labelForProjectDetailDraftActionOperationKind(operation.kind)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatProjectDetailDraftActionOperationTimestamp(operation.occurredAt)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatProjectDetailDraftActionOperationSummary(operation)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
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
          overwriteMode: resolveDraftActionOverwriteMode(
            resolvedDraftAction.fieldKey,
            suggestion.applyMode,
          ),
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
      message: unsupportedDraftActionMessage(),
      suggestion,
      candidate: null,
      unsupported: true,
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
      unsupported: false,
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
    message:
      evaluation.executionStatus === 'rejected_not_allowlisted'
        ? unsupportedDraftActionMessage()
        : evaluation.message,
    suggestion,
    candidate,
    unsupported: evaluation.executionStatus === 'rejected_not_allowlisted',
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

function resolveDraftActionOverwriteMode(
  fieldKey: string,
  applyMode: AiAssistantSuggestedField['applyMode'],
) {
  return isArchivedProjectDraftAction(fieldKey) ? 'replace' : applyMode;
}

function variantForStatus(status: AiAssistantDraftActionStatus, unsupported = false) {
  if (unsupported) {
    return 'warning' as const;
  }

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

function cardClassesForStatus(status: AiAssistantDraftActionStatus, unsupported = false) {
  if (unsupported) {
    return 'border-amber-300/80';
  }

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

function labelForStatus(status: AiAssistantDraftActionStatus, unsupported = false) {
  if (unsupported) {
    return 'Unsupported';
  }

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

function labelForActionType(actionType: AiAssistantDraftActionType, fieldKey: string) {
  switch (actionType) {
    case 'set_text':
      return 'Text';
    case 'set_textarea':
      return 'Textarea';
    case 'set_select':
      return 'Select';
    case 'set_checkbox':
      return isArchivedProjectDraftAction(fieldKey) ? 'Archived toggle' : 'Checkbox';
    default:
      return actionType;
  }
}

function formatDraftActionValue(
  value: string | boolean | null | undefined,
  fieldKey: string,
) {
  if (isArchivedProjectDraftAction(fieldKey)) {
    return formatArchivedProjectValue(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'Blank';
}

function formatArchivedProjectValue(value: string | boolean | null | undefined) {
  if (typeof value === 'boolean') {
    return value ? 'Archived' : 'Not archived';
  }

  const normalized = value?.trim().toLowerCase() ?? '';
  if (normalized === 'true' || normalized === 'yes' || normalized === 'archived') {
    return 'Archived';
  }
  if (
    normalized === 'false' ||
    normalized === 'no' ||
    normalized === 'not archived' ||
    normalized === 'active'
  ) {
    return 'Not archived';
  }

  return normalized.length > 0 ? value ?? 'Blank' : 'Blank';
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

function variantForExecutionResultStatus(status: CurrentPageActionExecutionResult['status']) {
  switch (status) {
    case 'applied':
      return 'success' as const;
    case 'skipped_existing_value':
      return 'outline' as const;
    case 'skipped_unresolved':
      return 'secondary' as const;
    case 'skipped_readonly':
      return 'secondary' as const;
    case 'rejected_not_allowlisted':
      return 'warning' as const;
    case 'failed_apply':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

export const summarizeProjectDetailDraftActionSummary = summarizeCurrentPageActionExecutionSummary;

export function summarizeProjectDetailDraftActionOperation(
  operation: ProjectDetailDraftActionOperation,
): ProjectDetailDraftActionOperationDisplaySummary {
  return {
    ...summarizeProjectDetailDraftActionSummary(operation.summary),
    dismissed: operation.kind === 'dismiss',
  };
}

export function formatProjectDetailDraftActionSummary(summary: CurrentPageActionExecutionSummary) {
  const displaySummary = summarizeProjectDetailDraftActionSummary(summary);

  return [
    `Applied: ${displaySummary.applied}`,
    `Skipped: ${displaySummary.skipped}`,
    `Rejected: ${displaySummary.rejected}`,
    `Failed: ${displaySummary.failed}`,
  ].join(' · ');
}

export function formatProjectDetailDraftActionOperationSummary(
  operation: ProjectDetailDraftActionOperation,
) {
  const displaySummary = summarizeProjectDetailDraftActionOperation(operation);

  return [
    `Applied: ${displaySummary.applied}`,
    `Skipped: ${displaySummary.skipped}`,
    `Rejected: ${displaySummary.rejected}`,
    `Failed: ${displaySummary.failed}`,
    `Dismissed: ${displaySummary.dismissed ? 'yes' : 'no'}`,
  ].join(' · ');
}

function labelForProjectDetailDraftActionOperationKind(
  kind: ProjectDetailDraftActionOperationKind,
) {
  switch (kind) {
    case 'apply_selected':
      return 'Applied selected draft actions';
    case 'apply_all_applicable':
      return 'Applied all applicable draft actions';
    case 'dismiss':
      return 'Dismissed draft actions';
    default:
      return kind;
  }
}

function formatProjectDetailDraftActionOperationTimestamp(occurredAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(occurredAt));
}

function createProjectDetailDraftActionOperationId() {
  return `draft-action-operation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    ...draftActions.map((draftAction) =>
      draftActionKey(draftAction.fieldKey, draftAction.proposedValue),
    ),
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

function isArchivedProjectDraftAction(fieldKey: string) {
  return fieldKey === PROJECT_ARCHIVED_FIELD_KEY;
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
  unsupported,
}: {
  status: AiAssistantDraftActionStatus;
  message: string | null | undefined;
  scope: ProjectCurrentPageActionScope;
  unsupported: boolean;
}) {
  const meta = statusMeta(status, unsupported);
  const Icon = meta.icon;

  return (
    <div className={cn('rounded-lg px-3 py-2 text-xs', meta.containerClassName)}>
      <div className="flex items-center gap-2 font-medium">
        <Icon className={cn('h-4 w-4 shrink-0', meta.iconClassName)} />
        <span>{meta.label}</span>
      </div>
      <div className="mt-1 leading-relaxed">
        {message ?? statusMessageForStatus(status, scope, unsupported)}
      </div>
    </div>
  );
}

function statusMessageForStatus(
  status: AiAssistantDraftActionStatus,
  scope: ProjectCurrentPageActionScope,
  unsupported: boolean,
) {
  if (unsupported) {
    return unsupportedDraftActionMessage();
  }

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

function statusMeta(
  status: AiAssistantDraftActionStatus,
  unsupported = false,
): {
  label: string;
  icon: LucideIcon;
  containerClassName: string;
  iconClassName: string;
} {
  if (unsupported) {
    return {
      label: 'Unsupported on this page',
      icon: CircleSlash,
      containerClassName: 'bg-amber-50 text-amber-950',
      iconClassName: 'text-amber-700',
    };
  }

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

function unsupportedDraftActionMessage() {
  return 'This field is not supported for guided draft apply on this page.';
}
