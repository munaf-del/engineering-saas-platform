import {
  AI_ASSISTANT_DRAFT_ACTION_TYPES,
  MULTI_PILE_PROJECT_GEO_UPLIFT_MODES,
  MULTI_PILE_PROJECT_MAP_SOURCES,
  MULTI_PILE_PROJECT_STATUSES,
  resolveProjectAssistantPageCapabilityByScope,
  type AiAssistantDraftActionType,
  type AiAssistantDraftActionValue,
  type MultiPileProjectSpecifics,
  type SupportedProjectCurrentPageActionScope,
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

export type ProjectCurrentPageActionScope = SupportedProjectCurrentPageActionScope;

type ProjectSpecificsCurrentPageActionScope = Exclude<
  SupportedProjectCurrentPageActionScope,
  'project-settings'
>;

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

const PROJECT_ARCHIVED_FIELD_KEY = 'identity.archived';

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

export const PROJECT_SETTINGS_CURRENT_PAGE_ACTION_TYPE_ALLOWLIST: Record<
  string,
  readonly AiAssistantDraftActionType[]
> = {
  'projectSettings.name': ['set_text'],
  'projectSettings.description': ['set_textarea'],
  'projectSettings.status': ['set_select'],
};

const PROJECT_CURRENT_PAGE_ACTION_ALLOWLISTS: Record<
  ProjectSpecificsCurrentPageActionScope,
  ProjectCurrentPageActionAllowlist
> = {
  'project-page': PROJECT_PAGE_CURRENT_PAGE_ACTION_ALLOWLIST,
  'project-foundations': PROJECT_FOUNDATIONS_CURRENT_PAGE_ACTION_ALLOWLIST,
};

const PROJECT_CURRENT_PAGE_ACTION_TYPE_ALLOWLISTS: Record<
  ProjectCurrentPageActionScope,
  Record<string, readonly AiAssistantDraftActionType[]>
> = {
  'project-page': mapProjectCurrentPageActionTypeAllowlist(
    PROJECT_PAGE_CURRENT_PAGE_ACTION_ALLOWLIST,
  ),
  'project-foundations': mapProjectCurrentPageActionTypeAllowlist(
    PROJECT_FOUNDATIONS_CURRENT_PAGE_ACTION_ALLOWLIST,
  ),
  'project-settings': PROJECT_SETTINGS_CURRENT_PAGE_ACTION_TYPE_ALLOWLIST,
};

export function createProjectCurrentPageActionExecutor({
  projectSpecifics,
  scope,
  onApply,
}: {
  projectSpecifics: MultiPileProjectSpecifics;
  scope: ProjectSpecificsCurrentPageActionScope;
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
                ? resolveProjectCurrentPageAppliedMessage(scope, candidate.draftAction.fieldKey)
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
  const actionTypeAllowlist = PROJECT_CURRENT_PAGE_ACTION_TYPE_ALLOWLISTS[scope];
  const actionTypes = actionTypeAllowlist ? actionTypeAllowlist[fieldKey] : null;
  return actionTypes?.[0] ?? null;
}

export function resolveProjectCurrentPageActionScopeTitle(scope: ProjectCurrentPageActionScope) {
  return resolveProjectAssistantPageCapabilityByScope(scope).capabilityCopy.draftScopeTitle;
}

export function resolveProjectCurrentPageActionScopeLabel(scope: ProjectCurrentPageActionScope) {
  return resolveProjectAssistantPageCapabilityByScope(scope).capabilityCopy.draftScopeLabel;
}

export function resolveProjectCurrentPageActionAllowlist(
  scope: ProjectSpecificsCurrentPageActionScope,
): ProjectCurrentPageActionAllowlist {
  const allowlist = PROJECT_CURRENT_PAGE_ACTION_ALLOWLISTS[scope];
  if (!allowlist) {
    throw new Error(`Missing current-page allowlist for scope "${scope}".`);
  }

  return allowlist;
}

function resolveProjectCurrentPageActionFieldConfig(
  scope: ProjectSpecificsCurrentPageActionScope,
  fieldKey: string,
) {
  const allowlist = resolveProjectCurrentPageActionAllowlist(scope);
  return Object.hasOwn(allowlist, fieldKey) ? allowlist[fieldKey] : null;
}

function evaluateProjectCurrentPageActionCandidate(
  projectSpecifics: MultiPileProjectSpecifics,
  scope: ProjectSpecificsCurrentPageActionScope,
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
      message: resolveProjectCurrentPageUnresolvedMessage(scope, draftAction.fieldKey),
    });
  }

  if (areDraftActionValuesEqual(actionType, currentValue, proposedValue)) {
    return blockedEvaluation({
      fieldKey: draftAction.fieldKey,
      actionType,
      currentValue,
      proposedValue,
      executionStatus: 'skipped_existing_value',
      message: resolveProjectCurrentPageAlreadyMatchesMessage(scope, draftAction.fieldKey),
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
        message: resolveProjectCurrentPageOverwriteMessage(scope, draftAction.fieldKey),
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
    message: resolveProjectCurrentPageReadyMessage(scope, draftAction.fieldKey),
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

function mapProjectCurrentPageActionTypeAllowlist(
  allowlist: ProjectCurrentPageActionAllowlist,
): Record<string, readonly AiAssistantDraftActionType[]> {
  return Object.fromEntries(
    Object.entries(allowlist).map(([fieldKey, fieldConfig]) => [fieldKey, fieldConfig.actionTypes]),
  );
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

function isProjectArchivedFieldKey(fieldKey: string) {
  return fieldKey === PROJECT_ARCHIVED_FIELD_KEY;
}

function resolveProjectCurrentPageReadyMessage(
  scope: ProjectCurrentPageActionScope,
  fieldKey: string,
) {
  if (isProjectArchivedFieldKey(fieldKey)) {
    return `Ready to update only the Archived project checkbox in the current ${resolveProjectCurrentPageActionScopeTitle(scope)} draft. This does not save the project or change any other page.`;
  }

  return `Ready to apply to the current ${resolveProjectCurrentPageActionScopeLabel(scope)} draft.`;
}

function resolveProjectCurrentPageOverwriteMessage(
  scope: ProjectCurrentPageActionScope,
  fieldKey: string,
) {
  if (isProjectArchivedFieldKey(fieldKey)) {
    return `This would change only the Archived project checkbox in the current ${resolveProjectCurrentPageActionScopeTitle(scope)} draft. Select it manually to confirm this sensitive draft-only change. Save remains manual.`;
  }

  return `This would overwrite an existing ${resolveProjectCurrentPageActionScopeLabel(scope)} value. Select it manually if you want to apply it.`;
}

function resolveProjectCurrentPageUnresolvedMessage(
  scope: ProjectCurrentPageActionScope,
  fieldKey: string,
) {
  if (isProjectArchivedFieldKey(fieldKey)) {
    return `The proposed Archived project checkbox value could not be safely mapped into the current ${resolveProjectCurrentPageActionScopeTitle(scope)} draft.`;
  }

  return `The proposed value could not be safely mapped into the current ${resolveProjectCurrentPageActionScopeLabel(scope)} form state.`;
}

function resolveProjectCurrentPageAlreadyMatchesMessage(
  scope: ProjectCurrentPageActionScope,
  fieldKey: string,
) {
  if (isProjectArchivedFieldKey(fieldKey)) {
    return `The current ${resolveProjectCurrentPageActionScopeTitle(scope)} draft already matches the Archived project checkbox value.`;
  }

  return `The current ${resolveProjectCurrentPageActionScopeLabel(scope)} draft already matches this value.`;
}

function resolveProjectCurrentPageAppliedMessage(
  scope: ProjectCurrentPageActionScope,
  fieldKey: string,
) {
  if (isProjectArchivedFieldKey(fieldKey)) {
    return `Applied only to the Archived project checkbox in the current ${resolveProjectCurrentPageActionScopeTitle(scope)} draft. Save remains manual.`;
  }

  return `Applied to the current ${resolveProjectCurrentPageActionScopeLabel(scope)} draft. Save remains manual.`;
}
