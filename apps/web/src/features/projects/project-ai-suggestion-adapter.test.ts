import { describe, expect, it } from 'vitest';
import type { MultiPileProjectSpecifics } from '@eng/shared';
import type { AiAssistantSuggestedField } from '@/features/ai/assistant-page-context';
import {
  createProjectSuggestionApplyAdapter,
  isProjectFoundationsSuggestionFieldPath,
  isProjectPageSuggestionFieldPath,
} from './project-ai-suggestion-adapter';
import { filterSuggestionsForScope } from './project-ai-suggestions-content';

function buildProjectSpecifics(): MultiPileProjectSpecifics {
  return {
    identity: {
      projectNumber: '221715.00',
      projectName: 'Clinical Services Building, Albury Hospital',
      client: 'Health Infrastructure',
      status: 'In Progress',
      address: 'Albury Hospital, 201 Borella Rd, Albury NSW',
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
      materials: [
        {
          id: 'geo_1',
          unitCode: 'SCHIST',
          displayName: 'Low strength schist',
          sourceReferenceId: 'geo-ref-1',
          sourceDocument: 'Existing report',
          sourceProject: '',
          sourceSite: '',
          sourceSection: '',
          sourceTable: '',
          notes: '',
          gamma_b: null,
          phi_prime: null,
          c_prime: null,
          cu: null,
          E_MPa: null,
          nu: null,
          Ka: null,
          Ko: null,
          Kp: null,
          wallInterfaceActive: null,
          wallInterfacePassive: null,
          pile_fms_comp_kPa: 250,
          pile_fms_tension_kPa: null,
          pile_fb_ult_kPa: null,
          pile_fms_allow_kPa: null,
          pile_fb_allow_kPa: null,
          cfaUpliftTensionFactor: null,
          includeInProject: true,
        },
      ],
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

function buildSuggestion(
  overrides: Partial<AiAssistantSuggestedField> & Pick<AiAssistantSuggestedField, 'fieldPath' | 'label' | 'suggestedValue'>,
): AiAssistantSuggestedField {
  return {
    fieldPath: overrides.fieldPath,
    label: overrides.label,
    suggestedValue: overrides.suggestedValue,
    sourceType: overrides.sourceType ?? 'report_derived',
    sourceSummary: overrides.sourceSummary ?? 'Test report',
    rationale: overrides.rationale ?? 'Grounded in the extracted report.',
    confidence: overrides.confidence ?? 0.9,
    applyMode: overrides.applyMode ?? 'fill-if-empty',
  };
}

describe('project AI suggestion adapter', () => {
  it('applies a report metadata suggestion into the project draft', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const projectSpecifics = buildProjectSpecifics();
    const adapter = createProjectSuggestionApplyAdapter({
      projectSpecifics,
      onApply: (nextValue) => {
        appliedDraft = nextValue;
      },
    });

    const result = adapter.applySuggestions([
      buildSuggestion({
        fieldPath: 'reportMeta.reportTitle',
        label: 'Report metadata title',
        suggestedValue: 'Geotechnical Investigation Report',
      }),
    ]);

    expect(result).toEqual({ appliedCount: 1, skippedCount: 0 });
    expect(appliedDraft).not.toBeNull();
    if (!appliedDraft) {
      throw new Error('Expected project draft to be applied');
    }
    const nextDraft = appliedDraft as MultiPileProjectSpecifics;
    expect(nextDraft.reportMeta.reportTitle).toBe('Geotechnical Investigation Report');
  });

  it('applies Project Details text and select suggestions into the project draft', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const projectSpecifics = buildProjectSpecifics();
    const adapter = createProjectSuggestionApplyAdapter({
      projectSpecifics,
      onApply: (nextValue) => {
        appliedDraft = nextValue;
      },
    });

    const result = adapter.applySuggestions([
      buildSuggestion({
        fieldPath: 'identity.address',
        label: 'Project address',
        suggestedValue: '75-85 Mary Street, St Peters NSW 2044',
        applyMode: 'replace',
      }),
      buildSuggestion({
        fieldPath: 'identity.status',
        label: 'Project status',
        suggestedValue: 'For Review',
        applyMode: 'replace',
      }),
    ]);

    expect(result).toEqual({ appliedCount: 2, skippedCount: 0 });
    expect(appliedDraft).not.toBeNull();
    if (!appliedDraft) {
      throw new Error('Expected project draft to be applied');
    }
    const nextDraft = appliedDraft as MultiPileProjectSpecifics;
    expect(nextDraft.identity.address).toBe('75-85 Mary Street, St Peters NSW 2044');
    expect(nextDraft.identity.status).toBe('For Review');
  });

  it('does not overwrite an already-filled Project Details field by default', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const adapter = createProjectSuggestionApplyAdapter({
      projectSpecifics: buildProjectSpecifics(),
      onApply: (nextValue) => {
        appliedDraft = nextValue;
      },
    });

    const result = adapter.applySuggestions([
      buildSuggestion({
        fieldPath: 'identity.address',
        label: 'Project address',
        suggestedValue: 'Replacement address that should be skipped',
        applyMode: 'fill-if-empty',
      }),
    ]);

    expect(result).toEqual({ appliedCount: 0, skippedCount: 1 });
    expect(appliedDraft).toBeNull();
  });

  it('does not overwrite an already-filled Foundations field by default', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const projectSpecifics = buildProjectSpecifics();
    projectSpecifics.geotechnicalBasis.foundingNotes = 'Existing founding note';
    const adapter = createProjectSuggestionApplyAdapter({
      projectSpecifics,
      canApplyField: isProjectFoundationsSuggestionFieldPath,
      onApply: (nextValue) => {
        appliedDraft = nextValue;
      },
    });

    const result = adapter.applySuggestions([
      buildSuggestion({
        fieldPath: 'geotechnicalBasis.foundingNotes',
        label: 'Project geotechnical founding notes',
        suggestedValue: 'Replacement founding note that should be skipped',
        applyMode: 'fill-if-empty',
      }),
    ]);

    expect(result).toEqual({ appliedCount: 0, skippedCount: 1 });
    expect(appliedDraft).toBeNull();
  });

  it('can scope direct field apply to main Project-owned suggestions only', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const adapter = createProjectSuggestionApplyAdapter({
      projectSpecifics: buildProjectSpecifics(),
      canApplyField: isProjectPageSuggestionFieldPath,
      onApply: (nextValue) => {
        appliedDraft = nextValue;
      },
    });

    const result = adapter.applySuggestions([
      buildSuggestion({
        fieldPath: 'reportMeta.reportTitle',
        label: 'Report metadata title',
        suggestedValue: 'Geotechnical Investigation Report',
      }),
      buildSuggestion({
        fieldPath: 'geotechnicalBasis.foundingNotes',
        label: 'Project geotechnical founding notes',
        suggestedValue: 'Found piles within weathered schist.',
      }),
      buildSuggestion({
        fieldPath: 'references[0].title',
        label: 'Reference title',
        suggestedValue: 'Cross-page reference value',
      }),
    ]);

    expect(result).toEqual({ appliedCount: 1, skippedCount: 2 });
    expect(appliedDraft).not.toBeNull();
    if (!appliedDraft) {
      throw new Error('Expected scoped project draft to be applied');
    }
    const nextDraft = appliedDraft as MultiPileProjectSpecifics;
    expect(nextDraft.reportMeta.reportTitle).toBe('Geotechnical Investigation Report');
    expect(nextDraft.geotechnicalBasis.foundingNotes).toBe('');
  });

  it('can scope direct field apply to Foundations-owned scalar suggestions only', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const adapter = createProjectSuggestionApplyAdapter({
      projectSpecifics: buildProjectSpecifics(),
      canApplyField: isProjectFoundationsSuggestionFieldPath,
      onApply: (nextValue) => {
        appliedDraft = nextValue;
      },
    });

    const result = adapter.applySuggestions([
      buildSuggestion({
        fieldPath: 'geotechnicalBasis.foundingNotes',
        label: 'Project geotechnical founding notes',
        suggestedValue: 'Found piles within weathered schist.',
      }),
      buildSuggestion({
        fieldPath: 'reportMeta.reportTitle',
        label: 'Report metadata title',
        suggestedValue: 'Out-of-scope report title',
      }),
      buildSuggestion({
        fieldPath: 'geotechnicalMaterials.candidates[0].displayName',
        label: 'Candidate material',
        suggestedValue: 'Out-of-scope material candidate',
        applyMode: 'replace',
      }),
    ]);

    expect(result).toEqual({ appliedCount: 1, skippedCount: 2 });
    expect(appliedDraft).not.toBeNull();
    if (!appliedDraft) {
      throw new Error('Expected scoped foundations draft to be applied');
    }
    const nextDraft = appliedDraft as MultiPileProjectSpecifics;
    expect(nextDraft.geotechnicalBasis.foundingNotes).toBe(
      'Found piles within weathered schist.',
    );
    expect(nextDraft.reportMeta.reportTitle).toBe('');
  });

  it('keeps project geotechnical scope draft-safe by showing only material candidates', () => {
    const suggestions = [
      buildSuggestion({
        fieldPath: 'geotechnicalBasis.foundingNotes',
        label: 'Founding notes',
        suggestedValue: 'Found in weathered schist.',
      }),
      buildSuggestion({
        fieldPath: 'geotechnicalMaterials.candidates[0].displayName',
        label: 'Candidate 1 unit name',
        suggestedValue: 'Dense silty sand',
        applyMode: 'replace',
      }),
      buildSuggestion({
        fieldPath: 'geotechnicalMaterials.materials[0].displayName',
        label: 'Legacy row-targeted material name',
        suggestedValue: 'Unsafe direct row overwrite',
        applyMode: 'replace',
      }),
      buildSuggestion({
        fieldPath: 'references[0].title',
        label: 'Reference title',
        suggestedValue: 'Report title',
      }),
    ];
    const projectGeotechnicalFiltered = filterSuggestionsForScope(
      suggestions,
      'project-geotechnical',
    ).map((suggestion) => suggestion.fieldPath);
    const foundationsFiltered = filterSuggestionsForScope(suggestions, 'project-foundations').map(
      (suggestion) => suggestion.fieldPath,
    );

    expect(projectGeotechnicalFiltered).not.toContain('geotechnicalBasis.foundingNotes');
    expect(projectGeotechnicalFiltered).toContain(
      'geotechnicalMaterials.candidates[0].displayName',
    );
    expect(projectGeotechnicalFiltered).not.toContain(
      'geotechnicalMaterials.materials[0].displayName',
    );
    expect(projectGeotechnicalFiltered).not.toContain('references[0].title');

    expect(foundationsFiltered).toContain('geotechnicalBasis.foundingNotes');
    expect(foundationsFiltered).not.toContain(
      'geotechnicalMaterials.candidates[0].displayName',
    );
    expect(foundationsFiltered).not.toContain('references[0].title');
  });

  it('keeps project page scope limited to Project Details and report metadata fields', () => {
    const filtered = filterSuggestionsForScope(
      [
        buildSuggestion({
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: '75-85 Mary Street, St Peters',
        }),
        buildSuggestion({
          fieldPath: 'geotechnicalBasis.foundingNotes',
          label: 'Founding notes',
          suggestedValue: 'Found in weathered schist.',
        }),
        buildSuggestion({
          fieldPath: 'geotechnicalMaterials.candidates[0].displayName',
          label: 'Candidate 1 unit name',
          suggestedValue: 'Dense silty sand',
          applyMode: 'replace',
        }),
        buildSuggestion({
          fieldPath: 'geotechnicalMaterials.materials[0].displayName',
          label: 'Legacy row-targeted material name',
          suggestedValue: 'Unsafe direct row overwrite',
          applyMode: 'replace',
        }),
        buildSuggestion({
          fieldPath: 'references[0].title',
          label: 'Reference title',
          suggestedValue: 'Report title',
        }),
      ],
      'project-page',
    ).map((suggestion) => suggestion.fieldPath);

    expect(filtered).not.toContain('geotechnicalBasis.foundingNotes');
    expect(filtered).not.toContain('geotechnicalMaterials.candidates[0].displayName');
    expect(filtered).not.toContain('geotechnicalMaterials.materials[0].displayName');
    expect(filtered).toContain('identity.address');
    expect(filtered).not.toContain('references[0].title');
  });

  it('applies a geotechnical note suggestion into the current draft without saving', () => {
    let appliedDraft: MultiPileProjectSpecifics | null = null;
    const adapter = createProjectSuggestionApplyAdapter({
      projectSpecifics: buildProjectSpecifics(),
      onApply: (nextValue) => {
        appliedDraft = nextValue;
      },
    });

    const result = adapter.applySuggestions([
      buildSuggestion({
        fieldPath: 'geotechnicalBasis.foundingNotes',
        label: 'Project geotechnical founding notes',
        suggestedValue: 'Found piles within weathered schist and verify founding at refusal.',
      }),
    ]);

    expect(result).toEqual({ appliedCount: 1, skippedCount: 0 });
    expect(appliedDraft).not.toBeNull();
    if (!appliedDraft) {
      throw new Error('Expected geotechnical draft note to be applied');
    }
    const nextDraft = appliedDraft as MultiPileProjectSpecifics;
    expect(nextDraft.geotechnicalBasis.foundingNotes).toBe(
      'Found piles within weathered schist and verify founding at refusal.',
    );
  });
});
