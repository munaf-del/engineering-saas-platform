import { describe, expect, it } from 'vitest';
import type {
  MultiPileEnvelopeRunSummary,
  MultiPileProjectSpecifics,
  MultiPileState,
  Project,
} from '@eng/shared';
import {
  buildMultiPileReportSummaryData,
  buildMultiPileReportSummaryPrintPath,
} from './report-summary';

function projectSpecificsFixture(
  overrides: Partial<MultiPileProjectSpecifics> = {},
): MultiPileProjectSpecifics {
  return {
    identity: {
      projectNumber: 'RPT-001',
      projectName: 'Report Summary Fixture',
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
      reportTitle: 'Report Summary',
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
      defaultSocketAssumptions: 'Manual socket lengths.',
      foundingNotes: '',
      commentary: 'Compact report verification fixture.',
      arrAssessment: {
        irrValues: [1, 1, 1, 1, 1],
        testType: 'NONE',
        testPilePercentage: 0,
        weightTotal: 0,
        weightedScore: 0,
        arrValue: 1.2,
        arrBand: '1.0 - 1.5',
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

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Report Summary Fixture',
    code: 'RPT-001',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-06T00:00:00.000Z',
    metadata: {
      projectSpecifics: projectSpecificsFixture(),
      projectLoadDefinition: {
        version: 1,
        standardSet: 'eng-default-v1',
        combinationSettings: {
          alpha: 0.015,
          psiC: 0.4,
          psiE: 0.3,
          psiL: 0.4,
          groundwaterFactor: 1.5,
          minPermanentFactor: 0.7,
          reduceMinimumPermanentWithPointNine: false,
        },
        loadCases: [
          { id: 'G', name: 'G', type: 'Permanent', reversible: false, enabled: true, order: 0 },
          { id: 'Q', name: 'Q', type: 'Imposed', reversible: false, enabled: true, order: 1 },
        ],
        loadCombinations: [
          {
            id: 'ULS1',
            name: 'ULS 1',
            expression: '1.2G + 1.5Q',
            enabled: true,
            includeInEnvelope: true,
            order: 0,
          } as never,
        ],
        metadata: {},
      },
    },
    ...(overrides as Record<string, unknown>),
  } as unknown as Project;
}

function stateFixture({
  jointCount = 1,
  missingGeoJointIds = [],
}: {
  jointCount?: number;
  missingGeoJointIds?: string[];
} = {}): MultiPileState {
  const joints = Array.from({ length: jointCount }, (_, index) => {
    const jointId = `J${index + 1}`;
    return {
      id: jointId,
      displayName: `Grid ${index + 1}`,
      jointDisplayName: `Grid ${index + 1}`,
      x: index * 3,
      y: 0,
      z: 0,
      supportCount: 1,
      noOfSupports: 1,
      pileTypeId: 'BP1',
      active: true,
      order: index,
    };
  });

  const geoResults = Object.fromEntries(
    joints
      .filter((joint) => !missingGeoJointIds.includes(joint.id))
      .map((joint) => [
        joint.id,
        {
          jointId: joint.id,
          jointDisplayName: joint.jointDisplayName,
          pileId: `${joint.id}-P1`,
          typeId: 'BP1',
          status: 'resolved',
          pendingReason: '',
          ok: true,
          LsAdopted: 3.6,
          foundingMaterialLabel: 'RCK — Weathered Rock',
          foundingLabel: 'RCK — Weathered Rock',
          activeReferenceLabel: 'Site Geotechnical Investigation',
          foundingResolutionMode: 'project-library',
          socketAdoptionNote: 'Manual socket adoption',
          inputWarnings: [],
          utilComp: 38,
          utilTen: 12,
        } as never,
      ]),
  );

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
    joints,
    generatedPiles: [],
    geoTypeSettings: {
      BP1: {
        typeId: 'BP1',
        linkedDmm: 900,
        redundancy: 'LOW',
        foundingMaterialId: 'geo_rock',
        socketOverrideEnabled: true,
        LsManual: 3.6,
        LsAdopted: 3.6,
        LsSolved: 0,
        LsMode: 'manual',
      } as never,
    },
    geoResults,
    uiState: {},
    combinationLibrary: [
      {
        id: 'ULS1',
        displayName: 'ULS 1',
        enabled: true,
        includeInEnvelope: true,
        order: 0,
      } as never,
    ],
    selectedCombinations: ['ULS1'],
  } as unknown as MultiPileState;
}

function latestRunFixture(jointCount = 1): MultiPileEnvelopeRunSummary {
  const jointResults = Array.from({ length: jointCount }, (_, index) => {
    const jointId = `J${index + 1}`;
    const valueSeed = index + 1;
    const envelopeValue = (value: number) => ({
      value,
      combinationId: 'ULS1',
      combinationName: 'ULS 1',
      source: 'Envelope',
      expressionSummary: '1.2G + 1.5Q',
    });

    return {
      jointId,
      jointDisplayName: `Grid ${index + 1}`,
      pileTypeId: 'BP1',
      representativePileId: `${jointId}-P1`,
      activePatternIds: ['G', 'Q'],
      nMax: envelopeValue(2400 + valueSeed),
      nMin: envelopeValue(-220 - valueSeed),
      vx: envelopeValue(55 + valueSeed),
      vy: envelopeValue(44 + valueSeed),
      mx: envelopeValue(120 + valueSeed),
      my: envelopeValue(95 + valueSeed),
    };
  });

  return {
    runId: 'run-1',
    status: 'completed',
    createdAt: '2026-04-06T00:00:00.000Z',
    durationMs: 420,
    envelope: {
      version: 1,
      generatedAt: '2026-04-06T00:00:00.000Z',
      pileGroupId: 'group-1',
      jointResults,
      projectSummary: {
        jointCount,
        evaluatedCombinationCount: 1,
        governingCombinationCount: 1,
        activePatternCount: 2,
      },
      structResults: {
        BP1: {
          pileTypeId: 'BP1',
          linkedJointIds: jointResults.map((row) => row.jointId),
          representativePileId: 'J1-P1',
          worstJointId: jointResults.at(-1)?.jointId ?? 'J1',
          updatedAt: '2026-04-06T00:00:00.000Z',
          status: 'pass',
          overallOk: true,
          inputWarnings: [],
          axial: {
            compressionUtilisation: 0.62,
            tensionUtilisation: 0.18,
          },
          utilisation: {
            axial: 0.62,
            moment: 0.58,
            shear: 0.41,
          },
          checks: {
            struct: true,
          },
          reinforcementCompliance: {
            summaryText: 'Provided reinforcement satisfies stored checks.',
          },
        },
      },
    },
    warnings: [],
    errors: [],
  } as unknown as MultiPileEnvelopeRunSummary;
}

function populatedSupportSplitStateFixture(): MultiPileState {
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
      {
        id: 'BP2',
        displayName: 'Edge Pile',
        sizePreset: '600',
        useCustom: false,
        customMm: 600,
        Dmm: 600,
        nominalDiameterMm: 600,
        eoop: 0.075,
        eoopM: 0.075,
        active: true,
        order: 1,
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
        supportCount: 2,
        noOfSupports: 2,
        pileTypeId: 'BP1',
        active: true,
        order: 0,
      },
      {
        id: 'J2',
        displayName: 'Grid B1',
        jointDisplayName: 'Grid B1',
        x: 7.5,
        y: 0,
        z: 0,
        supportCount: 1,
        noOfSupports: 1,
        pileTypeId: 'BP2',
        active: true,
        order: 1,
      },
    ],
    generatedPiles: [],
    geoTypeSettings: {
      BP1: {
        typeId: 'BP1',
        linkedDmm: 900,
        redundancy: 'LOW',
        foundingMaterialId: 'geo_rock',
        socketOverrideEnabled: true,
        LsManual: 3.6,
        LsAdopted: 3.6,
        LsSolved: 0,
        LsMode: 'manual',
      } as never,
      BP2: {
        typeId: 'BP2',
        linkedDmm: 600,
        redundancy: 'LOW',
        foundingMaterialId: 'geo_rock',
        socketOverrideEnabled: true,
        LsManual: 1.8,
        LsAdopted: 1.8,
        LsSolved: 0,
        LsMode: 'manual',
      } as never,
    },
    geoResults: {
      J1: {
        jointId: 'J1',
        jointDisplayName: 'Grid A1',
        pileId: 'J1-P1',
        typeId: 'BP1',
        status: 'resolved',
        pendingReason: '',
        ok: true,
        LsAdopted: 3.6,
        foundingMaterialLabel: 'RCK — Weathered Rock',
        foundingLabel: 'RCK — Weathered Rock',
        activeReferenceLabel: 'Site Geotechnical Investigation',
        foundingResolutionMode: 'project-library',
        socketAdoptionNote: 'Manual socket adoption',
        inputWarnings: [],
        utilComp: 38,
        utilTen: 12,
      } as never,
      J2: {
        jointId: 'J2',
        jointDisplayName: 'Grid B1',
        pileId: 'J2-P1',
        typeId: 'BP2',
        status: 'resolved',
        pendingReason: '',
        ok: false,
        LsAdopted: 1.8,
        foundingMaterialLabel: 'RCK — Weathered Rock',
        foundingLabel: 'RCK — Weathered Rock',
        activeReferenceLabel: 'Site Geotechnical Investigation',
        foundingResolutionMode: 'project-library',
        socketAdoptionNote: 'Manual socket adoption',
        inputWarnings: [],
        utilComp: 112,
        utilTen: 18,
      } as never,
    },
    uiState: {},
    combinationLibrary: [
      {
        id: 'ULS1',
        displayName: 'ULS 1',
        enabled: true,
        includeInEnvelope: true,
        order: 0,
      } as never,
    ],
    selectedCombinations: ['ULS1'],
  } as unknown as MultiPileState;
}

function populatedSupportSplitLatestRunFixture(): MultiPileEnvelopeRunSummary {
  const envelopeValue = (value: number) => ({
    value,
    combinationId: 'ULS1',
    combinationName: 'ULS 1',
    source: 'Envelope',
    expressionSummary: '1.2G + 1.5Q',
  });

  return {
    runId: 'run-populated',
    status: 'completed',
    createdAt: '2026-04-06T00:00:00.000Z',
    durationMs: 420,
    envelope: {
      version: 1,
      generatedAt: '2026-04-06T00:00:00.000Z',
      pileGroupId: 'group-1',
      jointResults: [
        {
          jointId: 'J1',
          jointDisplayName: 'Grid A1',
          pileTypeId: 'BP1',
          representativePileId: 'J1-P1',
          activePatternIds: ['G', 'Q'],
          nMax: envelopeValue(2401),
          nMin: envelopeValue(-221),
          vx: envelopeValue(56),
          vy: envelopeValue(45),
          mx: envelopeValue(121),
          my: envelopeValue(96),
        },
        {
          jointId: 'J2',
          jointDisplayName: 'Grid B1',
          pileTypeId: 'BP2',
          representativePileId: 'J2-P1',
          activePatternIds: ['G', 'Q'],
          nMax: envelopeValue(1900),
          nMin: envelopeValue(-250),
          vx: envelopeValue(65),
          vy: envelopeValue(48),
          mx: envelopeValue(130),
          my: envelopeValue(99),
        },
      ],
      projectSummary: {
        jointCount: 2,
        evaluatedCombinationCount: 1,
        governingCombinationCount: 1,
        activePatternCount: 2,
      },
      structResults: {
        BP1: {
          pileTypeId: 'BP1',
          linkedJointIds: ['J1'],
          representativePileId: 'J1-P1',
          worstJointId: 'J1',
          updatedAt: '2026-04-06T00:00:00.000Z',
          status: 'pass',
          overallOk: true,
          inputWarnings: [],
          axial: {
            compressionUtilisation: 0.62,
            tensionUtilisation: 0.18,
          },
          utilisation: {
            axial: 0.62,
            moment: 0.58,
            shear: 0.41,
          },
          checks: {
            struct: true,
          },
          reinforcementCompliance: {
            summaryText: 'Provided reinforcement satisfies stored checks.',
          },
        },
        BP2: {
          pileTypeId: 'BP2',
          linkedJointIds: ['J2'],
          representativePileId: 'J2-P1',
          worstJointId: 'J2',
          updatedAt: '2026-04-06T00:00:00.000Z',
          status: 'fail',
          overallOk: false,
          inputWarnings: [],
          axial: {
            compressionUtilisation: 1.12,
            tensionUtilisation: 0.32,
          },
          utilisation: {
            axial: 1.12,
            moment: 0.87,
            shear: 0.66,
          },
          checks: {
            struct: false,
          },
          reinforcementCompliance: {
            summaryText: 'Stored checks currently fail.',
          },
        },
      },
    },
    warnings: [],
    errors: [],
  } as unknown as MultiPileEnvelopeRunSummary;
}

describe('buildMultiPileReportSummaryData', () => {
  it('keeps the default route compact and omits the pricing appendix', () => {
    const data = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: stateFixture(),
      latestRun: latestRunFixture(),
    });

    expect(
      buildMultiPileReportSummaryPrintPath({ projectId: 'project-1', groupId: 'group-1' }),
    ).toBe('/projects/project-1/pile-groups/group-1/multi-pile/report-summary/print');
    expect(data.mode).toBe('compact');
    expect(data.pricingAppendix).toBeNull();
    expect(data.pileVerificationSummary.mode).toBe('summary-only');
    expect(data.pileVerificationSummary.rows).toHaveLength(0);
    expect(data.geoSummary.typeRows).toHaveLength(1);
    expect(data.geoSummary.typeRows[0]).toMatchObject({
      pileType: 'BP1 — Main Tower Pile',
      pileCount: 1,
      geoStatus: 'Pass (1/1)',
      foundingSocketMaterial: 'RCK — Weathered Rock',
      adoptedSocketLength: '3.6 m',
    });
    expect(data.geoSummary.typeRows[0]?.representativeBasis).toContain('Project library');
  });

  it('includes the pricing appendix only when explicitly requested', () => {
    const data = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: stateFixture(),
      latestRun: latestRunFixture(),
      appendix: 'pricing',
    });

    expect(
      buildMultiPileReportSummaryPrintPath({
        projectId: 'project-1',
        groupId: 'group-1',
        appendix: 'pricing',
      }),
    ).toBe(
      '/projects/project-1/pile-groups/group-1/multi-pile/report-summary/print?appendix=pricing',
    );
    expect(data.mode).toBe('appendix');
    expect(data.pileVerificationSummary.rows).toHaveLength(0);
    expect(data.pricingAppendix?.pileRows).toHaveLength(1);
    expect(data.pricingAppendix?.typeSummaryRows).toHaveLength(1);
  });

  it('adds a separate justification appendix mode without pricing rows', () => {
    const data = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: stateFixture(),
      latestRun: latestRunFixture(),
      appendix: 'justification',
    });

    expect(
      buildMultiPileReportSummaryPrintPath({
        projectId: 'project-1',
        groupId: 'group-1',
        appendix: 'justification',
      }),
    ).toBe(
      '/projects/project-1/pile-groups/group-1/multi-pile/report-summary/print?appendix=justification',
    );
    expect(data.mode).toBe('appendix');
    expect(data.appendixMode).toBe('justification');
    expect(data.justificationAppendix).not.toBeNull();
    expect(data.justificationAppendix?.referenceSummaryCards).toHaveLength(4);
    expect(data.justificationAppendix?.selectedCombinationRows).toHaveLength(1);
    expect(data.justificationAppendix?.geoTypeRows).toHaveLength(1);
    expect(data.justificationAppendix?.fullVerificationSchedule).toBeNull();
    expect(data.pricingAppendix).toBeNull();
  });

  it('supports full mode with both appendices appended', () => {
    const data = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: stateFixture(),
      latestRun: latestRunFixture(),
      appendix: 'full',
    });

    expect(
      buildMultiPileReportSummaryPrintPath({
        projectId: 'project-1',
        groupId: 'group-1',
        appendix: 'full',
      }),
    ).toBe('/projects/project-1/pile-groups/group-1/multi-pile/report-summary/print?appendix=full');
    expect(data.appendixMode).toBe('full');
    expect(data.justificationAppendix).not.toBeNull();
    expect(data.pileVerificationSummary.mode).toBe('summary-only');
    expect(data.pileVerificationSummary.rows).toHaveLength(0);
    expect(data.justificationAppendix?.fullVerificationSchedule?.summary.mode).toBe('full');
    expect(data.justificationAppendix?.fullVerificationSchedule?.groups).toHaveLength(1);
    expect(data.justificationAppendix?.fullVerificationSchedule?.groups[0]?.rows).toHaveLength(1);
    expect(data.pricingAppendix?.pileRows).toHaveLength(1);
  });

  it('shows only flagged rows in compact mode even for small jobs', () => {
    const data = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: stateFixture({ jointCount: 2, missingGeoJointIds: ['J2'] }),
      latestRun: latestRunFixture(2),
    });

    expect(data.pileVerificationSummary.mode).toBe('flagged');
    expect(data.pileVerificationSummary.totalDerivedPiles).toBe(2);
    expect(data.pileVerificationSummary.passCount).toBe(1);
    expect(data.pileVerificationSummary.unresolvedCount).toBe(1);
    expect(data.pileVerificationSummary.rows).toHaveLength(1);
    expect(data.pileVerificationSummary.rows[0]?.pileId).toBe('J2-P1');
  });

  it('keeps support-split pass piles out of compact and justification rows while full mode keeps the full schedule', () => {
    const compactData = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: populatedSupportSplitStateFixture(),
      latestRun: populatedSupportSplitLatestRunFixture(),
    });
    const justificationData = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: populatedSupportSplitStateFixture(),
      latestRun: populatedSupportSplitLatestRunFixture(),
      appendix: 'justification',
    });
    const fullData = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: populatedSupportSplitStateFixture(),
      latestRun: populatedSupportSplitLatestRunFixture(),
      appendix: 'full',
    });

    expect(compactData.pileVerificationSummary.totalDerivedPiles).toBe(3);
    expect(compactData.pileVerificationSummary.passCount).toBe(2);
    expect(compactData.pileVerificationSummary.failCount).toBe(1);
    expect(compactData.pileVerificationSummary.rows.map((row) => row.pileId)).toEqual(['J2-P1']);
    expect(compactData.pileVerificationSummary.rows.some((row) => row.pileId === 'J1-P1')).toBe(
      false,
    );
    expect(compactData.pileVerificationSummary.rows.some((row) => row.pileId === 'J1-P2')).toBe(
      false,
    );

    expect(
      justificationData.justificationAppendix?.pileVerificationFocus.groups.flatMap((group) =>
        group.rows.map((row) => row.pileId),
      ),
    ).toEqual(['J2-P1']);
    expect(justificationData.justificationAppendix?.fullVerificationSchedule).toBeNull();

    expect(fullData.pileVerificationSummary.rows.map((row) => row.pileId)).toEqual(['J2-P1']);
    expect(
      fullData.justificationAppendix?.fullVerificationSchedule?.groups.flatMap((group) =>
        group.rows.map((row) => row.pileId),
      ),
    ).toEqual(['J2-P1', 'J1-P1', 'J1-P2']);
  });

  it('shows flagged rows only for large jobs and keeps GEO grouped by representative basis', () => {
    const data = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: stateFixture({ jointCount: 61, missingGeoJointIds: ['J61'] }),
      latestRun: latestRunFixture(61),
    });

    expect(data.pileVerificationSummary.mode).toBe('flagged');
    expect(data.pileVerificationSummary.totalDerivedPiles).toBe(61);
    expect(data.pileVerificationSummary.passCount).toBe(60);
    expect(data.pileVerificationSummary.unresolvedCount).toBe(1);
    expect(data.pileVerificationSummary.rows).toHaveLength(1);
    expect(data.pileVerificationSummary.rows[0]?.pileId).toBe('J61-P1');
    expect(
      data.geoSummary.typeRows.map((row) => ({ status: row.geoStatus, count: row.pileCount })),
    ).toEqual([
      { status: '0 pass · 1 unresolved', count: 1 },
      { status: 'Pass (60/60)', count: 60 },
    ]);
  });

  it('drops the full verification table for large all-pass jobs', () => {
    const data = buildMultiPileReportSummaryData({
      project: projectFixture(),
      groupName: 'Tower Group',
      draft: stateFixture({ jointCount: 61 }),
      latestRun: latestRunFixture(61),
    });

    expect(data.pileVerificationSummary.mode).toBe('summary-only');
    expect(data.pileVerificationSummary.passCount).toBe(61);
    expect(data.pileVerificationSummary.rows).toHaveLength(0);
    expect(data.geoSummary.typeRows).toHaveLength(1);
    expect(data.geoSummary.typeRows[0]?.pileCount).toBe(61);
  });
});
