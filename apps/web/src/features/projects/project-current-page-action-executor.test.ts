import { describe, expect, it } from 'vitest';
import type { MultiPileProjectSpecifics } from '@eng/shared';
import { createProjectCurrentPageActionExecutor } from './project-current-page-action-executor';

function buildProjectSpecifics(): MultiPileProjectSpecifics {
  return {
    identity: {
      projectNumber: '221715.00',
      projectName: 'Clinical Services Building, Albury Hospital',
      client: 'Health Infrastructure',
      status: 'In Progress',
      address: '',
      latitude: '',
      longitude: '',
      mapAddress: '',
      notes: '',
      archived: false,
      projectLogo: '',
      mapSource: 'auto',
    },
    reportMeta: {
      reportTitle: '',
      reportRevision: '',
      issueDate: '',
      preparedBy: '',
      checkedBy: '',
      purpose: '',
    },
    references: [],
    structuralDefaults: {
      concreteClasses: [],
      reinforcementGrades: [],
      tendonGrades: [],
      coverDurabilityClasses: [],
    },
    geotechnicalMaterials: {
      activeReferenceId: 'geo-ref-1',
      templateState: 'manual',
      materials: [],
    },
    geotechnicalBasis: {
      groundwaterDesignNotes: '',
      cfaUpliftMode: 'manual-entry',
      cfaUpliftFactor: 1,
      defaultSocketAssumptions: '',
      foundingNotes: '',
      commentary: '',
      arrAssessment: {
        irrValues: [],
        testType: 'NONE',
        testPilePercentage: 0,
        weightTotal: 0,
        weightedScore: 0,
        arrValue: 0,
        arrBand: 'Not assessed',
        phiTf: null,
        testBenefitK: 1,
        phiGbLow: 0,
        phiGbHigh: 0,
        phiGLow: 0,
        phiGHigh: 0,
      },
    },
  };
}

describe('project current-page action executor', () => {
  it('applies allowlisted project page actions through the shared executor', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics: buildProjectSpecifics(),
      scope: 'project-page',
      onApply: (value) => {
        appliedDraft = value;
      },
    });

    const result = executor.executeDraftActions([
      {
        id: 'address',
        label: 'Project address',
        overwriteMode: 'fill-if-empty',
        draftAction: {
          fieldKey: 'identity.address',
          actionType: 'set_text',
          proposedValue: '75-85 Mary Street, St Peters NSW 2044',
          status: 'ready',
        },
      },
      {
        id: 'status',
        label: 'Project status',
        overwriteMode: 'replace',
        draftAction: {
          fieldKey: 'identity.status',
          actionType: 'set_select',
          proposedValue: 'For Review',
          status: 'ready',
        },
      },
    ]);

    expect(result.summary.applied).toBe(2);
    const nextDraft = requireAppliedDraft(appliedDraft);
    expect(nextDraft.identity.address).toBe('75-85 Mary Street, St Peters NSW 2044');
    expect(nextDraft.identity.status).toBe('For Review');
  });

  it('applies the archived project toggle through the same governed draft-only executor path', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics: buildProjectSpecifics(),
      scope: 'project-page',
      onApply: (value) => {
        appliedDraft = value;
      },
    });

    const result = executor.executeDraftActions([
      {
        id: 'archived',
        label: 'Archived project',
        overwriteMode: 'replace',
        draftAction: {
          fieldKey: 'identity.archived',
          actionType: 'set_checkbox',
          proposedValue: 'archived',
          status: 'ready',
        },
      },
    ]);

    expect(result.summary.applied).toBe(1);
    expect(result.results[0]).toMatchObject({
      fieldKey: 'identity.archived',
      status: 'applied',
      message:
        'Applied only to the Archived project checkbox in the current Project Details draft. Save remains manual.',
    });
    const nextDraft = requireAppliedDraft(appliedDraft);
    expect(nextDraft.identity.archived).toBe(true);
  });

  it('rejects unsupported fields that are outside the page allowlist', () => {
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics: buildProjectSpecifics(),
      scope: 'project-page',
      onApply: () => undefined,
    });

    const result = executor.executeDraftActions([
      {
        id: 'notes',
        label: 'Founding notes',
        overwriteMode: 'fill-if-empty',
        draftAction: {
          fieldKey: 'geotechnicalBasis.foundingNotes',
          actionType: 'set_textarea',
          proposedValue: 'Out-of-scope',
          status: 'ready',
        },
      },
    ]);

    expect(result.results[0]).toMatchObject({
      fieldKey: 'geotechnicalBasis.foundingNotes',
      status: 'rejected_not_allowlisted',
    });
  });

  it('skips existing values unless overwrite was explicitly selected', () => {
    const projectSpecifics = buildProjectSpecifics();
    projectSpecifics.identity.address = 'Existing project address';

    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics,
      scope: 'project-page',
      onApply: () => undefined,
    });

    const result = executor.executeDraftActions([
      {
        id: 'address',
        label: 'Project address',
        overwriteMode: 'fill-if-empty',
        draftAction: {
          fieldKey: 'identity.address',
          actionType: 'set_text',
          proposedValue: 'Replacement address',
          status: 'ready',
        },
      },
    ]);

    expect(result.results[0]?.status).toBe('skipped_existing_value');
  });

  it('skips unresolved values when select options cannot be mapped safely', () => {
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics: buildProjectSpecifics(),
      scope: 'project-foundations',
      onApply: () => undefined,
    });

    const result = executor.executeDraftActions([
      {
        id: 'uplift',
        label: 'CFA uplift mode',
        overwriteMode: 'replace',
        draftAction: {
          fieldKey: 'geotechnicalBasis.cfaUpliftMode',
          actionType: 'set_select',
          proposedValue: 'unsupported-mode',
          status: 'ready',
        },
      },
    ]);

    expect(result.results[0]?.status).toBe('skipped_unresolved');
  });

  it('applies approved foundations scalar fields through the shared executor', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics: buildProjectSpecifics(),
      scope: 'project-foundations',
      onApply: (value) => {
        appliedDraft = value;
      },
    });

    const result = executor.executeDraftActions([
      {
        id: 'factor',
        label: 'CFA uplift factor',
        overwriteMode: 'replace',
        draftAction: {
          fieldKey: 'geotechnicalBasis.cfaUpliftFactor',
          actionType: 'set_text',
          proposedValue: '0.75',
          status: 'ready',
        },
      },
    ]);

    expect(result.results[0]?.status).toBe('applied');
    const nextDraft = requireAppliedDraft(appliedDraft);
    expect(nextDraft.geotechnicalBasis.cfaUpliftFactor).toBe(0.75);
  });

  it('rejects mismatched field/action pairs even when the field is allowlisted', () => {
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics: buildProjectSpecifics(),
      scope: 'project-page',
      onApply: () => undefined,
    });

    const result = executor.executeDraftActions([
      {
        id: 'status',
        label: 'Project status',
        overwriteMode: 'replace',
        draftAction: {
          fieldKey: 'identity.status',
          actionType: 'set_text',
          proposedValue: 'For Review',
          status: 'ready',
        },
      },
    ]);

    expect(result.results[0]).toMatchObject({
      fieldKey: 'identity.status',
      status: 'rejected_not_allowlisted',
    });
    expect(result.results[0]?.message).toContain('field/action pair is outside the current');
  });

  it('enforces current-page-only scope and does not apply project-detail fields on foundations pages', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics: buildProjectSpecifics(),
      scope: 'project-foundations',
      onApply: (value) => {
        appliedDraft = value;
      },
    });

    const result = executor.executeDraftActions([
      {
        id: 'address',
        label: 'Project address',
        overwriteMode: 'replace',
        draftAction: {
          fieldKey: 'identity.address',
          actionType: 'set_text',
          proposedValue: '75-85 Mary Street, St Peters NSW 2044',
          status: 'ready',
        },
      },
    ]);

    expect(result.results[0]).toMatchObject({
      fieldKey: 'identity.address',
      status: 'rejected_not_allowlisted',
    });
    expect(result.summary.applied).toBe(0);
    expect(appliedDraft).toBeNull();
  });

  it('keeps the archived project toggle current-page-only by rejecting it on foundations pages', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics: buildProjectSpecifics(),
      scope: 'project-foundations',
      onApply: (value) => {
        appliedDraft = value;
      },
    });

    const result = executor.executeDraftActions([
      {
        id: 'archived',
        label: 'Archived project',
        overwriteMode: 'replace',
        draftAction: {
          fieldKey: 'identity.archived',
          actionType: 'set_checkbox',
          proposedValue: true,
          status: 'ready',
        },
      },
    ]);

    expect(result.results[0]).toMatchObject({
      fieldKey: 'identity.archived',
      status: 'rejected_not_allowlisted',
    });
    expect(result.summary.applied).toBe(0);
    expect(appliedDraft).toBeNull();
  });

  it('does not call onApply or mutate the source draft when nothing in the batch applies', () => {
    const projectSpecifics = buildProjectSpecifics();
    projectSpecifics.identity.address = 'Existing project address';
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const executor = createProjectCurrentPageActionExecutor({
      projectSpecifics,
      scope: 'project-page',
      onApply: (value) => {
        appliedDraft = value;
      },
    });

    const result = executor.executeDraftActions([
      {
        id: 'address',
        label: 'Project address',
        overwriteMode: 'fill-if-empty',
        draftAction: {
          fieldKey: 'identity.address',
          actionType: 'set_text',
          proposedValue: 'Replacement address',
          status: 'ready',
        },
      },
      {
        id: 'founding',
        label: 'Founding notes',
        overwriteMode: 'replace',
        draftAction: {
          fieldKey: 'geotechnicalBasis.foundingNotes',
          actionType: 'set_textarea',
          proposedValue: 'Out-of-scope',
          status: 'ready',
        },
      },
    ]);

    expect(result.summary).toMatchObject({
      applied: 0,
      skipped_existing_value: 1,
      rejected_not_allowlisted: 1,
    });
    expect(appliedDraft).toBeNull();
    expect(projectSpecifics.identity.address).toBe('Existing project address');
    expect(projectSpecifics.geotechnicalBasis.foundingNotes).toBe('');
  });
});

function requireAppliedDraft(value: MultiPileProjectSpecifics | null): MultiPileProjectSpecifics {
  if (!value) {
    throw new Error('Expected applied draft');
  }

  return value;
}
