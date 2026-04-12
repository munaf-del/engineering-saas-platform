import { describe, expect, it } from 'vitest';
import type { MultiPileProjectSpecifics, MultiPileState } from '@eng/shared';
import { buildPricingSummaryData } from './pricing-summary';

function projectSpecificsFixture(
  overrides: Partial<MultiPileProjectSpecifics> = {},
): MultiPileProjectSpecifics {
  return {
    identity: {
      projectNumber: '',
      projectName: '',
      client: 'Acme Foundations',
      status: 'Issued',
      address: '100 Example Street, Sydney NSW 2000',
      latitude: '',
      longitude: '',
      mapAddress: '',
      notes: '',
      archived: false,
      projectLogo: '',
      mapSource: 'auto',
      ...(overrides.identity ?? {}),
    },
    reportMeta: {
      reportTitle: 'Pricing Summary',
      reportRevision: 'Rev C',
      issueDate: '2026-04-06',
      preparedBy: '',
      checkedBy: '',
      purpose: '',
      ...(overrides.reportMeta ?? {}),
    },
    references: overrides.references ?? [],
    structuralDefaults: {
      concreteClasses: [{ id: 'conc_50' } as never],
      reinforcementGrades: [{ id: 'reo_d500n' } as never],
      tendonGrades: [{ id: 'tendon_strand_15_2' } as never],
      coverDurabilityClasses: [{ id: 'cover_mild_100y' } as never],
      ...(overrides.structuralDefaults ?? {}),
    },
    geotechnicalMaterials: {
      activeReferenceId: 'ref_geo',
      templateState: 'manual',
      materials: [
        {
          id: 'geo_rock',
          unitCode: 'RCK',
          displayName: 'Weathered Rock',
          sourceReferenceId: 'ref_geo',
          pile_fms_comp_kPa: 420,
          pile_fms_tension_kPa: 220,
          pile_fb_ult_kPa: 8000,
          includeInProject: true,
        } as never,
      ],
      ...(overrides.geotechnicalMaterials ?? {}),
    },
    geotechnicalBasis: {
      groundwaterDesignNotes: '',
      cfaUpliftMode: 'manual-entry',
      cfaUpliftFactor: 0.7,
      defaultSocketAssumptions: '',
      foundingNotes: '',
      commentary: '',
      arrAssessment: {
        irrValues: [1, 1, 1, 1, 1],
        testType: 'NONE',
        testPilePercentage: 0,
        weightTotal: 0,
        weightedScore: 0,
        arrValue: 0,
        arrBand: 'N/A',
        phiTf: null,
        testBenefitK: 1,
        phiGbLow: 0.5,
        phiGbHigh: 0.6,
        phiGLow: 0.5,
        phiGHigh: 0.6,
      },
      ...(overrides.geotechnicalBasis ?? {}),
    },
  } as MultiPileProjectSpecifics;
}

function stateFixture(overrides: Partial<MultiPileState> = {}): MultiPileState {
  return {
    pileTypes: [
      {
        id: 'BP1',
        displayName: 'Main Tower Pile',
        sizePreset: '900',
        useCustom: false,
        customMm: 900,
        Dmm: 900,
        nominalDiameterMm: 900,
        eoop: 0.075,
        eoopM: 0.075,
        active: true,
        order: 0,
      },
    ],
    joints: [
      {
        id: 'J1',
        displayName: 'Grid A1',
        jointDisplayName: 'Grid A1',
        x: 0,
        y: 0,
        z: 0,
        supportCount: 1,
        noOfSupports: 1,
        pileTypeId: 'BP1',
        active: true,
        order: 0,
      },
    ],
    generatedPiles: [
      {
        id: 'J1-P1',
        parentJointId: 'J1',
        supportIndex: 1,
        supportCount: 1,
        pileTypeId: 'BP1',
      },
    ],
    geoTypeSettings: {
      BP1: {
        typeId: 'BP1',
        linkedDmm: 900,
        foundingMaterialId: 'geo_rock',
        socketOverrideEnabled: true,
        LsManual: 3.6,
        LsAdopted: 3.6,
        LsSolved: 0,
        LsMode: 'manual',
      } as never,
    },
    geoResults: {},
    uiState: {},
    ...(overrides as Record<string, unknown>),
  } as unknown as MultiPileState;
}

describe('buildPricingSummaryData', () => {
  it('uses project fallback header values and aggregates truthful per-pile values', () => {
    const data = buildPricingSummaryData({
      draft: stateFixture({
        geoResults: {
          J1: {
            jointId: 'J1',
            pileId: 'J1-P1',
            typeId: 'BP1',
            status: 'pass',
            LsAdopted: 4.2,
            foundingMaterialLabel: 'RCK — Weathered Rock',
          } as never,
        },
        uiState: {
          multiPileStructDesigner: {
            typeSettingsByTypeId: {
              BP1: {
                typeId: 'BP1',
                linkedDmm: 900,
                concreteClassId: 'conc_50',
                reinforcementGradeId: 'reo_d500n',
                tendonGradeId: 'tendon_strand_15_2',
                coverDurabilityClassId: 'cover_mild_100y',
                axModel: 'partial',
                nBars: 12,
                barDia: 24,
                cover: 75,
                transverseSystem: 'spiral',
                spiralDia: 16,
                spiralPitch: 150,
                useCentralBar: true,
                centralBarCount: 2,
                centralBarDia: 24,
                reoCutDepth: 2.2,
                reoLd: 0.9,
                perimHeadDetail: '90out',
                centralHeadDetail: 'straight',
                perimProjectionAboveHead: 0.55,
                centralProjectionAboveHead: 0.35,
              },
            },
          },
        },
      }),
      projectSpecifics: projectSpecificsFixture(),
      projectCode: 'PRJ-001',
      projectName: 'Fallback Project Name',
    });

    expect(data.header.projectNumber).toBe('PRJ-001');
    expect(data.header.projectName).toBe('Fallback Project Name');
    expect(data.pileRows[0]?.concreteGrade).toContain('50 MPa');
    expect(data.pileRows[0]?.tendonSummary).toContain('15.2 mm');
    expect(data.pileRows[0]?.foundingSocketMaterial).toBe('RCK — Weathered Rock');
    expect(data.pileRows[0]?.adoptedSocketLength).toBe('4.2 m');
    expect(data.pileRows[0]?.cageLength).toContain('cut-off 2.2 + Ld 0.9');
    expect(data.pileRows[0]?.statusNotes).toBe('Ready');
    expect(data.typeSummaryRows[0]?.typicalSocketMaterial).toBe('RCK — Weathered Rock');
    expect(data.typeSummaryRows[0]?.typicalSocketLength).toBe('4.2 m');
    expect(data.sectionElevationRows[0]?.structuralSectionSummary).toBe(
      data.typeSummaryRows[0]?.structuralSectionSummary,
    );
  });

  it('does not fabricate struct defaults and keeps authored-but-unresolved geo material truthful', () => {
    const data = buildPricingSummaryData({
      draft: stateFixture({
        geoTypeSettings: {
          BP1: {
            typeId: 'BP1',
            linkedDmm: 900,
            foundingMaterialId: 'geo_missing',
            socketOverrideEnabled: false,
            LsManual: 0,
            LsAdopted: 0,
            LsSolved: 0,
            LsMode: 'pending',
          } as never,
        },
      }),
      projectSpecifics: projectSpecificsFixture(),
      projectCode: 'PRJ-LEAN-001',
      projectName: 'Lean Pricing Fixture',
    });

    expect(data.pileRows[0]?.foundingSocketMaterial).toBe('geo_missing');
    expect(data.pileRows[0]?.adoptedSocketLength).toBe('Pending');
    expect(data.pileRows[0]?.concreteGrade).toBe('Pending');
    expect(data.pileRows[0]?.coverDurability).toBe('Pending');
    expect(data.pileRows[0]?.reinforcementSummary).toBe('Pending');
    expect(data.pileRows[0]?.tendonSummary).toBe('Pending');
    expect(data.pileRows[0]?.cageLength).toBe('Pending');
    expect(data.pileRows[0]?.structuralSectionSummary).toBe('Pending');
    expect(data.pileRows[0]?.elevationSummary).toBe('Pending');
    expect(data.pileRows[0]?.statusNotes).toBe(
      'No stored GEO result · No project geo material · Socket pending · No stored struct selection',
    );
    expect(data.typeSummaryRows[0]?.typicalSocketMaterial).toBe('geo_missing');
    expect(data.typeSummaryRows[0]?.reinforcementSummary).toBe('Pending');
  });
});
