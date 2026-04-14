import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CurrentPageActionExecutionResult } from '@/features/ai/current-page-action-executor';
import {
  ProjectDetailAiDraftActions,
  ProjectDetailDraftActionHistoryPanel,
  createProjectDetailDraftActionDismissOperation,
  type ProjectDetailDraftActionController,
} from './project-detail-ai-draft-actions';

describe('Project detail AI draft action UI', () => {
  it('renders latest operation summaries and reason messages from executor results', () => {
    const results: CurrentPageActionExecutionResult[] = [
      {
        id: 'address',
        label: 'Project address',
        fieldKey: 'identity.address',
        actionType: 'set_text',
        currentValue: '',
        proposedValue: '75-85 Mary Street, St Peters NSW 2044',
        status: 'applied',
        message: 'Applied to the current Project Details draft. Save remains manual.',
      },
      {
        id: 'latitude',
        label: 'Project latitude',
        fieldKey: 'identity.latitude',
        actionType: 'set_text',
        currentValue: '-33.90',
        proposedValue: '-33.91',
        status: 'skipped_existing_value',
        message: 'This field already has a value, so overwrite is blocked by default.',
      },
      {
        id: 'founding',
        label: 'Founding notes',
        fieldKey: 'geotechnicalBasis.foundingNotes',
        actionType: 'set_textarea',
        currentValue: '',
        proposedValue: 'Out-of-scope',
        status: 'rejected_not_allowlisted',
        message: 'This field/action pair is outside the current Project Details allowlist.',
      },
      {
        id: 'factor',
        label: 'CFA uplift factor',
        fieldKey: 'geotechnicalBasis.cfaUpliftFactor',
        actionType: 'set_text',
        currentValue: '1',
        proposedValue: '0.75',
        status: 'failed_apply',
        message: 'The Project Details action failed while updating the current form state.',
      },
    ];

    const markup = renderToStaticMarkup(
      <ProjectDetailDraftActionHistoryPanel
        operationHistory={[
          {
            id: 'op-1',
            kind: 'apply_selected',
            occurredAt: 1_700_000_000_000,
            summary: {
              applied: 1,
              skipped_existing_value: 1,
              skipped_unresolved: 0,
              skipped_readonly: 0,
              rejected_not_allowlisted: 1,
              failed_apply: 1,
            },
            results,
          },
        ]}
      />,
    );

    expect(markup).toContain('Latest Operation');
    expect(markup).toContain('Applied: 1');
    expect(markup).toContain('Skipped: 1');
    expect(markup).toContain('Rejected: 1');
    expect(markup).toContain('Failed: 1');
    expect(markup).toContain('Dismissed: no');
    expect(markup).toContain('Project latitude');
    expect(markup).toContain('This field already has a value, so overwrite is blocked by default.');
    expect(markup).toContain('Founding notes');
    expect(markup).toContain(
      'This field/action pair is outside the current Project Details allowlist.',
    );
    expect(markup).toContain('CFA uplift factor');
    expect(markup).toContain(
      'The Project Details action failed while updating the current form state.',
    );
  });

  it('renders a visible dismiss history entry in the dismissed draft-action surface', () => {
    const dismissOperation = createProjectDetailDraftActionDismissOperation(1_700_000_000_000);
    const controller: ProjectDetailDraftActionController = {
      scope: 'project-page',
      actions: [
        {
          id: 'identity.address::75-85 Mary Street, St Peters NSW 2044::Grounded report',
          fieldKey: 'identity.address',
          actionType: 'set_text',
          proposedValue: '75-85 Mary Street, St Peters NSW 2044',
          label: 'Project address',
          currentValue: '',
          reason: 'Grounded in the current page context.',
          status: 'ready',
          message: 'Ready to apply to the current Project Details draft.',
          suggestion: {
            fieldPath: 'identity.address',
            label: 'Project address',
            suggestedValue: '75-85 Mary Street, St Peters NSW 2044',
            sourceType: 'report_derived',
            sourceSummary: 'Grounded report',
            rationale: 'Grounded in the current page context.',
            confidence: 0.9,
            applyMode: 'fill-if-empty',
          },
          candidate: null,
          unsupported: false,
          selectable: false,
          selectedByDefault: false,
          confidence: 0.9,
          sourceSummary: 'Grounded report',
        },
      ],
      applicableActionIds: [],
      selectableActionIds: [],
      selectedActionIds: new Set(),
      selectedSelectableCount: 0,
      requiresManualSelectionCount: 0,
      skippedCount: 0,
      unsupportedCount: 0,
      operationHistory: [dismissOperation],
      latestOperation: dismissOperation,
      isDismissed: true,
      toggleAction: () => undefined,
      selectAllApplicable: () => undefined,
      clearSelection: () => undefined,
      applySelected: () => undefined,
      applyAllApplicable: () => undefined,
      dismissAll: () => undefined,
    };

    const markup = renderToStaticMarkup(
      <ProjectDetailAiDraftActions controller={controller} showExecutionLog />,
    );

    expect(markup).toContain('Project Details draft actions dismissed for this response.');
    expect(markup).toContain('Dismissed: yes');
    expect(markup).toContain(
      'Dismissed the current draft action set for this response. No field changes were applied.',
    );
  });

  it('renders settings-scope dismiss history through the same audit surface', () => {
    const dismissOperation = createProjectDetailDraftActionDismissOperation(1_700_000_000_000);
    const controller: ProjectDetailDraftActionController = {
      scope: 'project-settings',
      actions: [
        {
          id: 'projectSettings.description::New healthcare building delivery project.::Grounded report',
          fieldKey: 'projectSettings.description',
          actionType: 'set_textarea',
          proposedValue: 'New healthcare building delivery project.',
          label: 'Project description',
          currentValue: '',
          reason: 'Grounded in the current page context.',
          status: 'ready',
          message: 'Ready to apply to the current project settings draft.',
          suggestion: {
            fieldPath: 'projectSettings.description',
            label: 'Project description',
            suggestedValue: 'New healthcare building delivery project.',
            sourceType: 'report_derived',
            sourceSummary: 'Grounded report',
            rationale: 'Grounded in the current page context.',
            confidence: 0.9,
            applyMode: 'fill-if-empty',
          },
          candidate: null,
          unsupported: false,
          selectable: false,
          selectedByDefault: false,
          confidence: 0.9,
          sourceSummary: 'Grounded report',
        },
      ],
      applicableActionIds: [],
      selectableActionIds: [],
      selectedActionIds: new Set(),
      selectedSelectableCount: 0,
      requiresManualSelectionCount: 0,
      skippedCount: 0,
      unsupportedCount: 0,
      operationHistory: [dismissOperation],
      latestOperation: dismissOperation,
      isDismissed: true,
      toggleAction: () => undefined,
      selectAllApplicable: () => undefined,
      clearSelection: () => undefined,
      applySelected: () => undefined,
      applyAllApplicable: () => undefined,
      dismissAll: () => undefined,
    };

    const markup = renderToStaticMarkup(
      <ProjectDetailAiDraftActions controller={controller} showExecutionLog />,
    );

    expect(markup).toContain('Project Settings draft actions dismissed for this response.');
    expect(markup).toContain('Dismissed: yes');
  });

  it('renders unsupported draft-action rows as visible but non-actionable', () => {
    const controller: ProjectDetailDraftActionController = {
      scope: 'project-page',
      actions: [
        {
          id: 'geotechnicalBasis.foundingNotes::Found within weathered schist.::Grounded report',
          fieldKey: 'geotechnicalBasis.foundingNotes',
          actionType: 'set_textarea',
          proposedValue: 'Found within weathered schist.',
          label: 'Founding notes',
          currentValue: null,
          reason: 'Grounded in the current page context.',
          status: 'skipped_unresolved',
          message: 'This field is not supported for guided draft apply on this page.',
          suggestion: {
            fieldPath: 'geotechnicalBasis.foundingNotes',
            label: 'Founding notes',
            suggestedValue: 'Found within weathered schist.',
            sourceType: 'report_derived',
            sourceSummary: 'Grounded report',
            rationale: 'Grounded in the current page context.',
            confidence: 0.9,
            applyMode: 'fill-if-empty',
          },
          candidate: null,
          unsupported: true,
          selectable: false,
          selectedByDefault: false,
          confidence: 0.9,
          sourceSummary: 'Grounded report',
        },
      ],
      applicableActionIds: [],
      selectableActionIds: [],
      selectedActionIds: new Set(),
      selectedSelectableCount: 0,
      requiresManualSelectionCount: 0,
      skippedCount: 1,
      unsupportedCount: 1,
      operationHistory: [],
      latestOperation: null,
      isDismissed: false,
      toggleAction: () => undefined,
      selectAllApplicable: () => undefined,
      clearSelection: () => undefined,
      applySelected: () => undefined,
      applyAllApplicable: () => undefined,
      dismissAll: () => undefined,
    };

    const markup = renderToStaticMarkup(<ProjectDetailAiDraftActions controller={controller} />);

    expect(markup).toContain('Unsupported');
    expect(markup).toContain('Unsupported on this page');
    expect(markup).toContain('This field is not supported for guided draft apply on this page.');
    expect(markup).toContain(
      '1 unsupported item is visible for review only because guided draft apply is not supported for that field on this page.',
    );
    expect(markup).not.toContain('type="checkbox"');
  });

  it('renders archived project preview copy with draft-only and current-page-only wording', () => {
    const controller: ProjectDetailDraftActionController = {
      scope: 'project-page',
      actions: [
        {
          id: 'identity.archived::Yes::Current page request',
          fieldKey: 'identity.archived',
          actionType: 'set_checkbox',
          proposedValue: true,
          label: 'Archived project',
          currentValue: false,
          reason: 'The user explicitly asked to archive only the current page draft.',
          status: 'requires_manual_selection',
          message:
            'This would change only the Archived project checkbox in the current Project Details draft. Select it manually to confirm this sensitive draft-only change. Save remains manual.',
          suggestion: {
            fieldPath: 'identity.archived',
            label: 'Archived project',
            suggestedValue: 'Yes',
            sourceType: 'page_context_inference',
            sourceSummary: 'Current page request',
            rationale: 'The user explicitly asked to archive only the current page draft.',
            confidence: 0.94,
            applyMode: 'fill-if-empty',
          },
          candidate: null,
          unsupported: false,
          selectable: true,
          selectedByDefault: false,
          confidence: 0.94,
          sourceSummary: 'Current page request',
        },
      ],
      applicableActionIds: [],
      selectableActionIds: ['identity.archived::Yes::Current page request'],
      selectedActionIds: new Set(),
      selectedSelectableCount: 0,
      requiresManualSelectionCount: 1,
      skippedCount: 0,
      unsupportedCount: 0,
      operationHistory: [],
      latestOperation: null,
      isDismissed: false,
      toggleAction: () => undefined,
      selectAllApplicable: () => undefined,
      clearSelection: () => undefined,
      applySelected: () => undefined,
      applyAllApplicable: () => undefined,
      dismissAll: () => undefined,
    };

    const markup = renderToStaticMarkup(<ProjectDetailAiDraftActions controller={controller} />);

    expect(markup).toContain('Archived toggle');
    expect(markup).toContain('Archived');
    expect(markup).toContain('Not archived');
    expect(markup).toContain(
      'Archived project is sensitive. Applying it only toggles the Archived project checkbox in this page draft, does not save automatically, and does not affect other pages.',
    );
    expect(markup).toContain(
      'This would change only the Archived project checkbox in the current Project Details draft. Select it manually to confirm this sensitive draft-only change. Save remains manual.',
    );
  });

  it('renders archived toggle apply results in the same history panel', () => {
    const markup = renderToStaticMarkup(
      <ProjectDetailDraftActionHistoryPanel
        operationHistory={[
          {
            id: 'op-archived',
            kind: 'apply_selected',
            occurredAt: 1_700_000_000_000,
            summary: {
              applied: 1,
              skipped_existing_value: 0,
              skipped_unresolved: 0,
              skipped_readonly: 0,
              rejected_not_allowlisted: 0,
              failed_apply: 0,
            },
            results: [
              {
                id: 'archived',
                label: 'Archived project',
                fieldKey: 'identity.archived',
                actionType: 'set_checkbox',
                currentValue: false,
                proposedValue: true,
                status: 'applied',
                message:
                  'Applied only to the Archived project checkbox in the current Project Details draft. Save remains manual.',
              },
            ],
          },
        ]}
      />,
    );

    expect(markup).toContain('Archived project');
    expect(markup).toContain('Applied: 1');
    expect(markup).toContain(
      'Applied only to the Archived project checkbox in the current Project Details draft. Save remains manual.',
    );
  });
});
