import { describe, expect, it } from 'vitest';
import type { MultiPileProjectSpecifics } from '@eng/shared';
import {
  addProjectGeotechnicalMaterialCandidateToDraft,
  applyProjectGeotechnicalMaterialCandidateToExistingRow,
  collectProjectGeotechnicalMaterialCandidates,
  findStrongProjectGeotechnicalMaterialCandidateMatchIndex,
  type ProjectGeotechnicalMaterialCandidate,
} from './project-ai-geotechnical-material-candidates';

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
          unitCode: '',
          displayName: 'Very Low, Low or Low-Medium strength schist',
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

function buildCandidate(): ProjectGeotechnicalMaterialCandidate {
  return {
    id: '0',
    index: 0,
    unitCode: '',
    displayName: 'Predominantly dense silty sand (Colluvium) possibly extremely weathered schist',
    sourceDocument: '221715.00.R.007.Rev1.pdf',
    sourceProject: 'Clinical Services Building, Albury Hospital',
    sourceSite: 'Albury Hospital, 201 Borella Rd, Albury NSW',
    sourceSection: 'Page 16 of 27',
    sourceTable: 'Table 9',
    notes: 'Report-derived Table 9 row',
    gamma_b: null,
    phi_prime: null,
    c_prime: null,
    cu: null,
    E_MPa: null,
    nu: null,
    Ka: null,
    Ko: null,
    Kp: null,
    pile_fms_comp_kPa: 80,
    pile_fms_allow_kPa: null,
    pile_fms_tension_kPa: null,
    pile_fb_ult_kPa: null,
    pile_fb_allow_kPa: null,
    cfaUpliftTensionFactor: null,
    sourceSummary: 'Report on Geotechnical Investigation · Table 9 · Page 16 of 27',
    confidence: 0.95,
    suggestions: [],
  };
}

describe('project AI geotechnical material candidates', () => {
  it('does not treat an unrelated extracted row as a strong existing-row match', () => {
    const matchIndex = findStrongProjectGeotechnicalMaterialCandidateMatchIndex(
      buildProjectSpecifics(),
      buildCandidate(),
    );

    expect(matchIndex).toBeNull();
  });

  it('adds a new material option without overwriting the existing row', () => {
    const next = addProjectGeotechnicalMaterialCandidateToDraft(
      buildProjectSpecifics(),
      buildCandidate(),
      { includeInProject: false },
    );

    const originalRow = next.geotechnicalMaterials.materials[0]!;
    const addedRow = next.geotechnicalMaterials.materials[1]!;

    expect(next.geotechnicalMaterials.materials).toHaveLength(2);
    expect(originalRow.displayName).toBe('Very Low, Low or Low-Medium strength schist');
    expect(originalRow.pile_fms_comp_kPa).toBe(250);
    expect(addedRow.displayName).toBe(
      'Predominantly dense silty sand (Colluvium) possibly extremely weathered schist',
    );
    expect(addedRow.sourceProject).toBe('Clinical Services Building, Albury Hospital');
    expect(addedRow.pile_fms_comp_kPa).toBe(80);
    expect(addedRow.includeInProject).toBe(false);
  });

  it('can explicitly apply a candidate into a chosen existing row', () => {
    const next = applyProjectGeotechnicalMaterialCandidateToExistingRow(
      buildProjectSpecifics(),
      buildCandidate(),
      0,
    );

    const updatedRow = next.geotechnicalMaterials.materials[0]!;

    expect(next.geotechnicalMaterials.materials).toHaveLength(1);
    expect(updatedRow.displayName).toBe(
      'Predominantly dense silty sand (Colluvium) possibly extremely weathered schist',
    );
    expect(updatedRow.pile_fms_comp_kPa).toBe(80);
    expect(updatedRow.includeInProject).toBe(true);
  });

  it('keeps combined Table 7 shoring parameters reviewable and traceable', () => {
    const [candidate] = collectProjectGeotechnicalMaterialCandidates([
      buildSuggestedCandidateField('displayName', 'Class III-II Siltstone or better'),
      buildSuggestedCandidateField('sourceDocument', 'GE-DA-0002.pdf'),
      buildSuggestedCandidateField('sourceSection', 'Page 13'),
      buildSuggestedCandidateField(
        'sourceTable',
        'Table 7: Recommended Design Parameters for Shoring Systems',
      ),
      buildSuggestedCandidateField(
        'notes',
        'Combined class row preserved from Table 7: Class III-II Siltstone or better.',
      ),
      buildSuggestedCandidateField('gamma_b', '23'),
      buildSuggestedCandidateField('Ka', '0.2'),
      buildSuggestedCandidateField('Ko', '0.25'),
      buildSuggestedCandidateField('c_prime', '20'),
      buildSuggestedCandidateField('phi_prime', '30'),
      buildSuggestedCandidateField('E_MPa', '200'),
    ]);

    expect(candidate).toMatchObject({
      displayName: 'Class III-II Siltstone or better',
      gamma_b: 23,
      Ka: 0.2,
      Ko: 0.25,
      c_prime: 20,
      phi_prime: 30,
      E_MPa: 200,
    });

    const next = addProjectGeotechnicalMaterialCandidateToDraft(
      buildProjectSpecifics(),
      candidate!,
      {
        includeInProject: false,
      },
    );
    const addedRow = next.geotechnicalMaterials.materials[1]!;

    expect(addedRow.displayName).toBe('Class III-II Siltstone or better');
    expect(addedRow.gamma_b).toBe(23);
    expect(addedRow.Ka).toBe(0.2);
    expect(addedRow.Ko).toBe(0.25);
    expect(addedRow.c_prime).toBe(20);
    expect(addedRow.phi_prime).toBe(30);
    expect(addedRow.E_MPa).toBe(200);
    expect(addedRow.notes).toContain('Combined class row');
    expect(addedRow.includeInProject).toBe(false);
  });
});

function buildSuggestedCandidateField(fieldName: string, suggestedValue: string) {
  return {
    fieldPath: `geotechnicalMaterials.candidates[0].${fieldName}`,
    label: fieldName,
    suggestedValue,
    sourceType: 'report_derived' as const,
    sourceSummary: 'GE-DA-0002 · Table 7 · Page 13',
    rationale: 'test',
    confidence: 0.94,
    applyMode: 'replace' as const,
  };
}
