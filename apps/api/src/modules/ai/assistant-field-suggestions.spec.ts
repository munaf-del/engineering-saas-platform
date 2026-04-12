import { buildDeterministicFieldSuggestions } from './assistant-field-suggestions';

jest.mock('@eng/shared', () => ({
  buildMultiPileEnvelopeInputSignature: jest.fn(() => ''),
  MULTI_PILE_UNASSIGNED_PILE_TYPE_ID: 'UNASSIGNED',
}));

describe('assistant project geotechnical material suggestions', () => {
  it('surfaces all St Peters foundation rows and combined shoring parameter rows', () => {
    const result = buildDeterministicFieldSuggestions({
      pageContext: {
        route: '/projects/project-1/project-geotechnical',
        pageTitle: 'Project Geotechnical',
        pageKind: 'project_detail',
      },
      projectSpecifics: buildProjectSpecifics(),
      recentDocuments: [
        {
          id: 'doc-1',
          filename: 'GE-DA-0002.pdf',
          latestRunStatus: 'completed',
          resultJson: buildStPetersExtractionResult(),
        },
      ],
      multiPileState: null,
      latestEnvelopeRun: null,
    });

    const candidateNames = collectCandidateValues(result.suggestedFields, 'displayName');
    expect(candidateNames).toContain('Class V-IV Shale/Siltstone');
    expect(candidateNames).toContain('Class III-II Siltstone or better');
    expect(candidateNames).toContain('Class V Shale/Siltstone');
    expect(candidateNames).toContain('Class IV Shale/Siltstone');
    expect(candidateNames).toContain('Class III Siltstone');
    expect(candidateNames).toContain('Class II Siltstone or better');

    const classIIIndex = findCandidateIndexByName(
      result.suggestedFields,
      'Class II Siltstone or better',
    );
    expect(candidateValue(result.suggestedFields, classIIIndex, 'pile_fb_allow_kPa')).toBe('6000');
    expect(candidateValue(result.suggestedFields, classIIIndex, 'pile_fms_allow_kPa')).toBe('500');
    expect(candidateValue(result.suggestedFields, classIIIndex, 'pile_fb_ult_kPa')).toBe('30000');
    expect(candidateValue(result.suggestedFields, classIIIndex, 'pile_fms_comp_kPa')).toBe('1000');

    const combinedIndex = findCandidateIndexByName(
      result.suggestedFields,
      'Class III-II Siltstone or better',
    );
    expect(candidateValue(result.suggestedFields, combinedIndex, 'gamma_b')).toBe('23');
    expect(candidateValue(result.suggestedFields, combinedIndex, 'Ka')).toBe('0.2');
    expect(candidateValue(result.suggestedFields, combinedIndex, 'Ko')).toBe('0.25');
    expect(candidateValue(result.suggestedFields, combinedIndex, 'c_prime')).toBe('20');
    expect(candidateValue(result.suggestedFields, combinedIndex, 'phi_prime')).toBe('30');
    expect(candidateValue(result.suggestedFields, combinedIndex, 'E_MPa')).toBe('200');
    expect(candidateValue(result.suggestedFields, combinedIndex, 'notes')).toContain(
      'Combined class row preserved from Table 7',
    );
  });

  it('does not surface dewatering reports as project geotechnical material candidates', () => {
    const result = buildDeterministicFieldSuggestions({
      pageContext: {
        route: '/projects/project-1/project-geotechnical',
        pageTitle: 'Project Geotechnical',
        pageKind: 'project_detail',
      },
      projectSpecifics: buildProjectSpecifics(),
      recentDocuments: [
        {
          id: 'doc-1',
          filename: 'Dewatering Management Plan.pdf',
          latestRunStatus: 'completed',
          resultJson: {
            ...buildStPetersExtractionResult(),
            extractionProfile: {
              documentFamily: 'hydrogeology_dewatering',
              reportType: 'dewatering_management_plan',
              ownerWorkspace: 'environmental',
            },
          },
        },
      ],
      multiPileState: null,
      latestEnvelopeRun: null,
    });

    expect(collectCandidateValues(result.suggestedFields, 'displayName')).toEqual([]);
  });

  it('does not surface geotechnical comments as material candidates without explicit tables', () => {
    const result = buildDeterministicFieldSuggestions({
      pageContext: {
        route: '/projects/project-1/project-geotechnical',
        pageTitle: 'Project Geotechnical',
        pageKind: 'project_detail',
      },
      projectSpecifics: buildProjectSpecifics(),
      recentDocuments: [
        {
          id: 'doc-1',
          filename: 'Geotechnical Comment Letter.pdf',
          latestRunStatus: 'completed',
          resultJson: {
            documentFamily: { value: 'GEOTECHNICAL_REPORT' },
            reportTitle: { value: 'Geotechnical Comment Letter' },
            extractionProfile: {
              documentFamily: 'geotechnical',
              reportType: 'geotechnical_comment',
              ownerWorkspace: 'project_geotechnical',
            },
            geotechnicalCommentProfile: {
              changedItems: [{ value: 'Basement retention advice revised for Drawing A-102.' }],
              unchangedItems: [],
              revisedRecommendations: [],
              affectedDrawingsRevisionsDates: [],
              explicitNewDesignTablesOrParameters: [],
            },
            geotechnicalParameterTables: [],
          },
        },
      ],
      multiPileState: null,
      latestEnvelopeRun: null,
    });

    expect(collectCandidateValues(result.suggestedFields, 'displayName')).toEqual([]);
  });
});

function buildProjectSpecifics(): any {
  return {
    identity: {
      projectNumber: '221715.00',
      projectName: '75-85 Mary Street, St Peters',
      client: '',
      status: 'In Progress',
      address: '75-85 Mary Street, St Peters',
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
      cfaUpliftFactor: 0.7,
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

function buildStPetersExtractionResult() {
  return {
    documentFamily: { value: 'GEOTECHNICAL_GROUNDWATER_REPORT' },
    reportTitle: { value: 'Geotechnical and Groundwater Report' },
    reportMetadata: {
      filename: { value: 'GE-DA-0002 - Geotechnical and Groundwater Report.pdf' },
      documentTitle: { value: '75-85 Mary Street, St Peters' },
      siteAddress: { value: '75-85 Mary Street, St Peters' },
    },
    geotechnicalBasis: {
      foundingNotes: [
        {
          value:
            'For bored piles, shaft adhesion values for uplift may be taken as equal to 70% of shaft adhesion values for compression in Table 10.',
        },
      ],
      pileRecommendations: [],
      rockStrataDesignParameters: [],
    },
    pileConstruction: {
      upliftTensionNotes: [],
      designVerificationNotes: [],
    },
    geotechnicalParameterTables: [
      {
        tableLabel: 'Table 7: Recommended Design Parameters for Shoring Systems',
        pageLabel: 'Page 13',
        tableType: 'GEOLOGICAL_UNIT_PARAMETERS',
        rows: [
          shoringRow('Class V-IV Shale/Siltstone', 22, 0.25, 0.3, 10, 28, 70),
          shoringRow('Class III-II Siltstone or better', 23, 0.2, 0.25, 20, 30, 200),
        ],
      },
      {
        tableLabel: 'Table 10: Design Parameters for Foundation Design',
        pageLabel: 'Page 15',
        tableType: 'PILE_FOUNDING_PARAMETERS',
        rows: [
          foundationRow('Class V Shale/Siltstone', 700, 75, 3000, 100),
          foundationRow('Class IV Shale/Siltstone', 1000, 120, 5000, 150),
          foundationRow('Class III Siltstone', 3500, 350, 15000, 600),
          foundationRow('Class II Siltstone or better', 6000, 500, 30000, 1000),
        ],
      },
    ],
  };
}

function shoringRow(
  unitDescription: string,
  unitWeightBulkKNm3: number,
  Ka: number,
  Ko: number,
  cohesionKPa: number,
  frictionAngleDeg: number,
  modulusMPa: number,
) {
  return {
    rowLabel: unitDescription,
    unitCode: null,
    unitDescription,
    foundingStrata: null,
    unitWeightBulkKNm3,
    Ka,
    Ko,
    cohesionKPa,
    frictionAngleDeg,
    modulusMPa,
  };
}

function foundationRow(
  unitDescription: string,
  endBearingAllowableKPa: number,
  shaftAdhesionCompressionAllowableKPa: number,
  endBearingUltimateKPa: number,
  shaftAdhesionCompressionUltimateKPa: number,
) {
  return {
    rowLabel: unitDescription,
    unitCode: null,
    unitDescription,
    foundingStrata: null,
    endBearingAllowableKPa,
    shaftAdhesionCompressionAllowableKPa,
    endBearingUltimateKPa,
    shaftAdhesionCompressionUltimateKPa,
  };
}

function collectCandidateValues(
  fields: Array<{ fieldPath: string; suggestedValue: string }>,
  fieldName: string,
) {
  return fields
    .filter((field) => field.fieldPath.endsWith(`.${fieldName}`))
    .map((field) => field.suggestedValue);
}

function findCandidateIndexByName(
  fields: Array<{ fieldPath: string; suggestedValue: string }>,
  displayName: string,
) {
  const field = fields.find(
    (entry) => entry.fieldPath.endsWith('.displayName') && entry.suggestedValue === displayName,
  );
  expect(field).toBeDefined();
  return Number(field!.fieldPath.match(/candidates\[(\d+)\]/)?.[1] ?? -1);
}

function candidateValue(
  fields: Array<{ fieldPath: string; suggestedValue: string }>,
  candidateIndex: number,
  fieldName: string,
) {
  return fields.find(
    (field) =>
      field.fieldPath === `geotechnicalMaterials.candidates[${candidateIndex}].${fieldName}`,
  )?.suggestedValue;
}
