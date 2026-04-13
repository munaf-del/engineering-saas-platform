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
});

function requireAppliedDraft(
  value: MultiPileProjectSpecifics | null,
): MultiPileProjectSpecifics {
  if (!value) {
    throw new Error('Expected applied draft');
  }

  return value;
}
