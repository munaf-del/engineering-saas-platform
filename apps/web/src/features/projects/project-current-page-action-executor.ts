import {
  AI_ASSISTANT_DRAFT_ACTION_TYPES,
  MULTI_PILE_PROJECT_GEO_UPLIFT_MODES,
  MULTI_PILE_PROJECT_MAP_SOURCES,
  MULTI_PILE_PROJECT_STATUSES,
  type AiAssistantDraftActionType,
  type AiAssistantDraftActionValue,
  type MultiPileProjectSpecifics,
} from '@eng/shared';
import type {
  CurrentPageActionCandidate,
  CurrentPageActionEvaluation,
  CurrentPageActionExecutionBatchResult,
  CurrentPageActionExecutionResult,
  CurrentPageActionExecutionResultStatus,
  CurrentPageActionExecutor,
} from '@/features/ai/current-page-action-executor';
import { summarizeCurrentPageActionResults } from '@/features/ai/current-page-action-executor';

export type ProjectCurrentPageActionScope = 'project-page' | 'project-foundations';

type ProjectCurrentPageActionFieldConfig = {
  actionTypes: readonly AiAssistantDraftActionType[];
  getValue: (projectSpecifics: MultiPileProjectSpecifics) => AiAssistantDraftActionValue | null;
  normalizeProposedValue: (
    value: AiAssistantDraftActionValue,
  ) => AiAssistantDraftActionValue | null;
  applyValue: (
    projectSpecifics: MultiPileProjectSpecifics,
    value: AiAssistantDraftActionValue,
  ) => boolean;
  isReadonly?: (projectSpecifics: MultiPileProjectSpecifics) => boolean;
};

type ProjectCurrentPageActionAllowlist = Record<string, ProjectCurrentPageActionFieldConfig>;

export const PROJECT_PAGE_CURRENT_PAGE_ACTION_ALLOWLIST: ProjectCurrentPageActionAllowlist = {
  'identity.projectNumber': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.identity.projectNumber,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.projectNumber = value;
    },
  }),
  'identity.projectName': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.identity.projectName,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.projectName = value;
    },
  }),
  'identity.client': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.identity.client,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.client = value;
    },
  }),
  'identity.status': createSelectFieldConfig({
    allowedValues: MULTI_PILE_PROJECT_STATUSES,
    getValue: (projectSpecifics) => projectSpecifics.identity.status,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.status = value as MultiPileProjectSpecifics['identity']['status'];
    },
  }),
  'identity.address': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.identity.address,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.address = value;
    },
  }),
  'identity.latitude': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.identity.latitude,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.latitude = value;
    },
  }),
  'identity.longitude': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.identity.longitude,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.longitude = value;
    },
  }),
  'identity.mapAddress': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.identity.mapAddress,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.mapAddress = value;
    },
  }),
  'identity.notes': createTextFieldConfig({
    actionType: 'set_textarea',
    getValue: (projectSpecifics) => projectSpecifics.identity.notes,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.notes = value;
    },
  }),
  'identity.archived': createCheckboxFieldConfig({
    getValue: (projectSpecifics) => projectSpecifics.identity.archived,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.archived = value;
    },
  }),
  'identity.mapSource': createSelectFieldConfig({
    allowedValues: MULTI_PILE_PROJECT_MAP_SOURCES,
    getValue: (projectSpecifics) => projectSpecifics.identity.mapSource,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.identity.mapSource =
        value as MultiPileProjectSpecifics['identity']['mapSource'];
    },
  }),
  'reportMeta.reportTitle': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.reportMeta.reportTitle,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.reportMeta.reportTitle = value;
    },
  }),
  'reportMeta.reportRevision': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.reportMeta.reportRevision,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.reportMeta.reportRevision = value;
    },
  }),
  'reportMeta.issueDate': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.reportMeta.issueDate,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.reportMeta.issueDate = value;
    },
  }),
  'reportMeta.preparedBy': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.reportMeta.preparedBy,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.reportMeta.preparedBy = value;
    },
  }),
  'reportMeta.checkedBy': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.reportMeta.checkedBy,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.reportMeta.checkedBy = value;
    },
  }),
  'reportMeta.purpose': createTextFieldConfig({
    actionType: 'set_text',
    getValue: (projectSpecifics) => projectSpecifics.reportMeta.purpose,
    applyValue: (projectSpecifics, value) => {
      projectSpecifics.reportMeta.purpose = value;
    },
  }),
};

export const PROJECT_FOUNDATIONS_CURRENT_PAGE_ACTION_ALLOWLIST: ProjectCurrentPageActionAllowlist =
  {
    'geotechnicalBasis.groundwaterDesignNotes': createTextFieldConfig({
      actionType: 'set_textarea',
      getValue: (projectSpecifics) => projectSpecifics.geotechnicalBasis.groundwaterDesignNotes,
      applyValue: (projectSpecifics, value) => {
        projectSpecifics.geotechnicalBasis.groundwaterDesignNotes = value;
      },
    }),
    'geotechnicalBasis.cfaUpliftMode': createSelectFieldConfig({
      allowedValues: MULTI_PILE_PROJECT_GEO_UPLIFT_MODES,
      getValue: (projectSpecifics) => projectSpecifics.geotechnicalBasis.cfaUpliftMode,
      applyValue: (projectSpecifics, value) => {
        projectSpecifics.geotechnicalBasis.cfaUpliftMode =
          value as MultiPileProjectSpecifics['geotechnicalBasis']['cfaUpliftMode'];
      },
    }),
    'geotechnicalBasis.cfaUpliftFactor': createNumericTextFieldConfig({
      getValue: (projectSpecifics) => projectSpecifics.geotechnicalBasis.cfaUpliftFactor,
      applyValue: (projectSpecifics, value) => {
        projectSpecifics.geotechnicalBasis.cfaUpliftFactor = value;
      },
    }),
    'geotechnicalBasis.defaultSocketAssumptions': createTextFieldConfig({
      actionType: 'set_textarea',
      getValue: (projectSpecifics) => projectSpecifics.geotechnicalBasis.defaultSocketAssumptions,
      applyValue: (projectSpecifics, value) => {
        projectSpecifics.geotechnicalBasis.defaultSocketAssumptions = value;
      },
    }),
    'geotechnicalBasis.foundingNotes': createTextFieldConfig({
      actionType: 'set_textarea',
      getValue: (projectSpecifics) => projectSpecifics.geotechnicalBasis.foundingNotes,
      applyValue: (projectSpecifics, value) => {
        projectSpecifics.geotechnicalBasis.foundingNotes = value;
      },
    }),
    'geotechnicalBasis.commentary': createTextFieldConfig({
      actionType: 'set_textarea',
      getValue: (projectSpecifics) => projectSpecifics.geotechnicalBasis.commentary,
      applyValue: (projectSpecifics, value) => {
        projectSpecifics.geotechnicalBasis.commentary = value;
      },
    }),
  };

export function createProjectCurrentPageActionExecutor({
  projectSpecifics,
  scope,
  onApply,
}: {
  projectSpecifics: MultiPileProjectSpecifics;
  scope: ProjectCurrentPageActionScope;
  onApply: (value: MultiPileProjectSpecifics) => void;
}): CurrentPageActionExecutor {
  return {
    getCurrentValue: (fieldKey) => {
      const fieldConfig = resolveProjectCurrentPageActionFieldConfig(scope, fieldKey);
      return fieldConfig ? fieldConfig.getValue(projectSpecifics) : null;
    },
    evaluateDraftAction: (candidate) =>
      evaluateProjectCurrentPageActionCandidate(projectSpecifics, scope, candidate),
    executeDraftActions: (candidates) => {
      const nextDraft = structuredClone(projectSpecifics);
      const results: CurrentPageActionExecutionResult[] = [];

      candidates.forEach((candidate) => {
        const evaluation = evaluateProjectCurrentPageActionCandidate(nextDraft, scope, candidate);
        if (evaluation.executionStatus !== 'ready') {
          results.push(
            createExecutionResult(
              candidate,
              evaluation,
              evaluation.executionStatus,
              evaluation.message,
            ),
          );
          return;
        }

        const fieldConfig = resolveProjectCurrentPageActionFieldConfig(
          scope,
          candidate.draftAction.fieldKey,
        );

        if (!fieldConfig || evaluation.proposedValue == null) {
          results.push(
            createExecutionResult(
              candidate,
              evaluation,
              'failed_apply',
              `The ${resolveProjectCurrentPageActionScopeLabel(scope)} action could not be applied because the target resolver is unavailable.`,
            ),
          );
          return;
        }

        try {
          const didApply = fieldConfig.applyValue(nextDraft, evaluation.proposedValue);
          results.push(
            createExecutionResult(
              candidate,
              evaluation,
              didApply ? 'applied' : 'failed_apply',
              didApply
                ? `Applied to the current ${resolveProjectCurrentPageActionScopeLabel(scope)} draft. Save remains manual.`
                : `The ${resolveProjectCurrentPageActionScopeLabel(scope)} action could not be applied through the current form state.`,
            ),
          );
        } catch {
          results.push(
            createExecutionResult(
              candidate,
              evaluation,
              'failed_apply',
              `The ${resolveProjectCurrentPageActionScopeLabel(scope)} action failed while updating the current form state.`,
            ),
          );
        }
      });

      const summary = summarizeCurrentPageActionResults(results);
      if (summary.applied > 0) {
        onApply(nextDraft);
      }

      return {
        results,
        summary,
        appliedCount: summary.applied,
      } satisfies CurrentPageActionExecutionBatchResult;
    },
  };
}

export function resolveProjectCurrentPageActionType(
  scope: ProjectCurrentPageActionScope,
  fieldKey: string,
) {
  const fieldConfig = resolveProjectCurrentPageActionFieldConfig(scope, fieldKey);
  return fieldConfig?.actionTypes[0] ?? null;
}

export function resolveProjectCurrentPageActionScopeTitle(scope: ProjectCurrentPageActionScope) {
  if (scope === 'project-foundations') {
    return 'Foundation / Global GEO Controls';
  }

  return 'Project Details';
}

export function resolveProjectCurrentPageActionScopeLabel(scope: ProjectCurrentPageActionScope) {
  if (scope === 'project-foundations') {
    return 'foundation / global GEO controls';
  }

  return 'Project Details';
}

function resolveProjectCurrentPageActionAllowlist(
  scope: ProjectCurrentPageActionScope,
): ProjectCurrentPageActionAllowlist {
  if (scope === 'project-foundations') {
    return PROJECT_FOUNDATIONS_CURRENT_PAGE_ACTION_ALLOWLIST;
  }

  return PROJECT_PAGE_CURRENT_PAGE_ACTION_ALLOWLIST;
}

function resolveProjectCurrentPageActionFieldConfig(
  scope: ProjectCurrentPageActionScope,
  fieldKey: string,
) {
  const allowlist = resolveProjectCurrentPageActionAllowlist(scope);
  return Object.hasOwn(allowlist, fieldKey) ? allowlist[fieldKey] : null;
}

function evaluateProjectCurrentPageActionCandidate(
  projectSpecifics: MultiPileProjectSpecifics,
  scope: ProjectCurrentPageActionScope,
  candidate: CurrentPageActionCandidate,
): CurrentPageActionEvaluation {
  const { draftAction, overwriteMode } = candidate;
  const fieldConfig = resolveProjectCurrentPageActionFieldConfig(scope, draftAction.fieldKey);
  const currentValue = fieldConfig?.getValue(projectSpecifics) ?? null;
  const actionType = draftAction.actionType;

  if (!AI_ASSISTANT_DRAFT_ACTION_TYPES.includes(actionType)) {
    return blockedEvaluation({
      fieldKey: draftAction.fieldKey,
      actionType,
      currentValue,
      proposedValue: null,
      executionStatus: 'rejected_not_allowlisted',
      message: 'This draft action type is not supported in the current governed apply phase.',
    });
  }

  if (!fieldConfig || !fieldConfig.actionTypes.includes(actionType)) {
    return blockedEvaluation({
      fieldKey: draftAction.fieldKey,
      actionType,
      currentValue,
      proposedValue: null,
      executionStatus: 'rejected_not_allowlisted',
      message: `This field/action pair is outside the current ${resolveProjectCurrentPageActionScopeLabel(scope)} allowlist.`,
    });
  }

  if (fieldConfig.isReadonly?.(projectSpecifics) ?? false) {
    return blockedEvaluation({
      fieldKey: draftAction.fieldKey,
      actionType,
      currentValue,
      proposedValue: null,
      executionStatus: 'skipped_readonly',
      message: 'This field is currently read only and cannot be changed from the assistant.',
    });
  }

  const proposedValue = fieldConfig.normalizeProposedValue(draftAction.proposedValue);
  if (proposedValue == null) {
    return blockedEvaluation({
      fieldKey: draftAction.fieldKey,
      actionType,
      currentValue,
      proposedValue: null,
      executionStatus: 'skipped_unresolved',
      message: `The proposed value could not be safely mapped into the current ${resolveProjectCurrentPageActionScopeLabel(scope)} form state.`,
    });
  }

  if (areDraftActionValuesEqual(actionType, currentValue, proposedValue)) {
    return blockedEvaluation({
      fieldKey: draftAction.fieldKey,
      actionType,
      currentValue,
      proposedValue,
      executionStatus: 'skipped_existing_value',
      message: `The current ${resolveProjectCurrentPageActionScopeLabel(scope)} draft already matches this value.`,
    });
  }

  if (hasExistingDraftActionValue(actionType, currentValue)) {
    if (overwriteMode === 'replace') {
      return {
        fieldKey: draftAction.fieldKey,
        actionType,
        currentValue,
        proposedValue,
        status: 'requires_manual_selection',
        message: `This would overwrite an existing ${resolveProjectCurrentPageActionScopeLabel(scope)} value. Select it manually if you want to apply it.`,
        selectable: true,
        selectedByDefault: false,
        executionStatus: 'ready',
      };
    }

    return blockedEvaluation({
      fieldKey: draftAction.fieldKey,
      actionType,
      currentValue,
      proposedValue,
      executionStatus: 'skipped_existing_value',
      message: 'This field already has a value, so overwrite is blocked by default.',
    });
  }

  return {
    fieldKey: draftAction.fieldKey,
    actionType,
    currentValue,
    proposedValue,
    status: 'ready',
    message: `Ready to apply to the current ${resolveProjectCurrentPageActionScopeLabel(scope)} draft.`,
    selectable: true,
    selectedByDefault: true,
    executionStatus: 'ready',
  };
}

function blockedEvaluation({
  fieldKey,
  actionType,
  currentValue,
  proposedValue,
  executionStatus,
  message,
}: {
  fieldKey: string;
  actionType: AiAssistantDraftActionType;
  currentValue: AiAssistantDraftActionValue | null;
  proposedValue: AiAssistantDraftActionValue | null;
  executionStatus: CurrentPageActionExecutionResultStatus;
  message: string;
}): CurrentPageActionEvaluation {
  const status =
    executionStatus === 'skipped_readonly'
      ? 'skipped_readonly'
      : executionStatus === 'skipped_existing_value'
        ? 'skipped_existing_value'
        : 'skipped_unresolved';

  return {
    fieldKey,
    actionType,
    currentValue,
    proposedValue,
    status,
    message,
    selectable: false,
    selectedByDefault: false,
    executionStatus,
  };
}

function createExecutionResult(
  candidate: CurrentPageActionCandidate,
  evaluation: CurrentPageActionEvaluation,
  status: CurrentPageActionExecutionResultStatus,
  message: string | null,
): CurrentPageActionExecutionResult {
  return {
    id: candidate.id,
    label: candidate.label,
    fieldKey: candidate.draftAction.fieldKey,
    actionType: candidate.draftAction.actionType,
    currentValue: evaluation.currentValue,
    proposedValue: evaluation.proposedValue,
    status,
    message: message ?? 'No result message was recorded.',
  };
}

function createTextFieldConfig({
  actionType,
  getValue,
  applyValue,
}: {
  actionType: Extract<AiAssistantDraftActionType, 'set_text' | 'set_textarea'>;
  getValue: (projectSpecifics: MultiPileProjectSpecifics) => string | null | undefined;
  applyValue: (projectSpecifics: MultiPileProjectSpecifics, value: string) => void;
}): ProjectCurrentPageActionFieldConfig {
  return {
    actionTypes: [actionType],
    getValue: (projectSpecifics) => normalizeStringValue(getValue(projectSpecifics)),
    normalizeProposedValue: (value) => normalizeStringValue(value),
    applyValue: (projectSpecifics, value) => {
      if (typeof value !== 'string') {
        return false;
      }
      applyValue(projectSpecifics, value);
      return true;
    },
  };
}

function createSelectFieldConfig({
  allowedValues,
  getValue,
  applyValue,
}: {
  allowedValues: readonly string[];
  getValue: (projectSpecifics: MultiPileProjectSpecifics) => string | null | undefined;
  applyValue: (projectSpecifics: MultiPileProjectSpecifics, value: string) => void;
}): ProjectCurrentPageActionFieldConfig {
  return {
    actionTypes: ['set_select'],
    getValue: (projectSpecifics) => normalizeStringValue(getValue(projectSpecifics)),
    normalizeProposedValue: (value) => {
      const normalized = normalizeStringValue(value);
      return normalized && allowedValues.includes(normalized) ? normalized : null;
    },
    applyValue: (projectSpecifics, value) => {
      if (typeof value !== 'string') {
        return false;
      }
      applyValue(projectSpecifics, value);
      return true;
    },
  };
}

function createCheckboxFieldConfig({
  getValue,
  applyValue,
}: {
  getValue: (projectSpecifics: MultiPileProjectSpecifics) => boolean | null | undefined;
  applyValue: (projectSpecifics: MultiPileProjectSpecifics, value: boolean) => void;
}): ProjectCurrentPageActionFieldConfig {
  return {
    actionTypes: ['set_checkbox'],
    getValue: (projectSpecifics) => {
      const currentValue = getValue(projectSpecifics);
      return typeof currentValue === 'boolean' ? currentValue : null;
    },
    normalizeProposedValue: (value) => parseCheckboxValue(value),
    applyValue: (projectSpecifics, value) => {
      if (typeof value !== 'boolean') {
        return false;
      }
      applyValue(projectSpecifics, value);
      return true;
    },
  };
}

function createNumericTextFieldConfig({
  getValue,
  applyValue,
}: {
  getValue: (projectSpecifics: MultiPileProjectSpecifics) => number | null | undefined;
  applyValue: (projectSpecifics: MultiPileProjectSpecifics, value: number) => void;
}): ProjectCurrentPageActionFieldConfig {
  return {
    actionTypes: ['set_text'],
    getValue: (projectSpecifics) => normalizeNumberValue(getValue(projectSpecifics)),
    normalizeProposedValue: (value) => normalizeStringValue(value),
    applyValue: (projectSpecifics, value) => {
      if (typeof value !== 'string') {
        return false;
      }

      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return false;
      }

      applyValue(projectSpecifics, numericValue);
      return true;
    },
  };
}

function normalizeStringValue(value: AiAssistantDraftActionValue | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumberValue(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
}

function parseCheckboxValue(value: AiAssistantDraftActionValue | null | undefined) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = value?.toString().trim().toLowerCase() ?? '';
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
  value: AiAssistantDraftActionValue | null | undefined,
) {
  if (actionType === 'set_checkbox') {
    return value !== null && value !== undefined;
  }

  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0;
}

function areDraftActionValuesEqual(
  actionType: AiAssistantDraftActionType,
  currentValue: AiAssistantDraftActionValue | null | undefined,
  proposedValue: AiAssistantDraftActionValue | null | undefined,
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
