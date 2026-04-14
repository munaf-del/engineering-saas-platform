import {
  buildAssistantDraftActionsForCurrentPage,
  buildDeterministicFieldSuggestions,
} from './assistant-field-suggestions';

jest.mock('@eng/shared', () => {
  const projectCapabilities = {
    'project-page': {
      scope: 'project-page',
      routePattern: '/projects/[id]',
      supported: true,
      allowedActionTypes: ['set_text', 'set_textarea', 'set_select', 'set_checkbox'],
      allowlistRef: 'PROJECT_PAGE_CURRENT_PAGE_ACTION_ALLOWLIST',
      assistantTriggeredApplyEnabled: true,
      auditHistoryEnabled: true,
      capabilityCopy: {
        assistantHeader:
          'Guided current-page draft actions on supported pages. You review and apply changes manually, and Save stays manual.',
      },
    },
    'project-geotechnical': {
      scope: 'project-geotechnical',
      routePattern: '/projects/[id]/project-geotechnical',
      supported: false,
      allowedActionTypes: [],
      allowlistRef: null,
      assistantTriggeredApplyEnabled: false,
      auditHistoryEnabled: false,
      capabilityCopy: {
        assistantHeader:
          'Draft actions are not available on this page. I can still surface candidate project geotechnical materials for manual review from the current page context.',
      },
    },
    'project-foundations': {
      scope: 'project-foundations',
      routePattern: '/projects/[id]/pile-groups',
      supported: true,
      allowedActionTypes: ['set_text', 'set_textarea', 'set_select'],
      allowlistRef: 'PROJECT_FOUNDATIONS_CURRENT_PAGE_ACTION_ALLOWLIST',
      assistantTriggeredApplyEnabled: true,
      auditHistoryEnabled: true,
      capabilityCopy: {
        assistantHeader:
          'Guided current-page draft actions on supported pages. You review and apply changes manually, and Save stays manual.',
      },
    },
    'project-settings': {
      scope: 'project-settings',
      routePattern: '/projects/[id]/settings',
      supported: true,
      allowedActionTypes: ['set_text', 'set_textarea', 'set_select'],
      allowlistRef: 'PROJECT_SETTINGS_CURRENT_PAGE_ACTION_ALLOWLIST',
      assistantTriggeredApplyEnabled: true,
      auditHistoryEnabled: true,
      capabilityCopy: {
        assistantHeader:
          'Guided current-page draft actions on supported pages. You review and apply changes manually, and Save stays manual.',
      },
    },
  } as const;

  function matchesRoute(pathname: string, routePattern: string) {
    const pathnameSegments = pathname.split('/').filter(Boolean);
    const routeSegments = routePattern.split('/').filter(Boolean);
    if (pathnameSegments.length !== routeSegments.length) {
      return false;
    }

    return routeSegments.every((segment, index) => {
      const pathnameSegment = pathnameSegments[index] ?? '';
      return /^\[[^\]]+\]$/.test(segment)
        ? pathnameSegment.length > 0
        : pathnameSegment === segment;
    });
  }

  const resolveProjectAssistantPageCapabilityByRoute = (pathname: string) =>
    Object.values(projectCapabilities).find((entry) =>
      matchesRoute(pathname, entry.routePattern),
    ) ?? null;

  return {
    buildMultiPileEnvelopeInputSignature: jest.fn(() => ''),
    MULTI_PILE_UNASSIGNED_PILE_TYPE_ID: 'UNASSIGNED',
    resolveProjectAssistantPageCapabilityByRoute,
    resolveProjectAssistantPageCapabilityStateByRoute: (pathname: string) =>
      resolveProjectAssistantPageCapabilityByRoute(pathname) ?? {
        scope: null,
        routePattern: null,
        supported: false,
        allowedActionTypes: [],
        allowlistRef: null,
        assistantTriggeredApplyEnabled: false,
        auditHistoryEnabled: false,
        capabilityCopy: {
          assistantHeader:
            'Draft actions are not available on this page. I can still answer questions from the current page context.',
        },
      },
  };
});

describe('assistant project geotechnical material suggestions', () => {
  it('surfaces an extracted site address on the Project Details page and keeps references out of scope', () => {
    const result = buildDeterministicFieldSuggestions({
      pageContext: {
        route: '/projects/project-1',
        pageTitle: 'Project Details',
        pageKind: 'project_detail',
      },
      projectSpecifics: buildProjectSpecifics({ address: '' }),
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

    expect(
      result.suggestedFields.some(
        (suggestion) =>
          suggestion.fieldPath === 'identity.address' &&
          suggestion.suggestedValue === '75-85 Mary Street, St Peters',
      ),
    ).toBe(true);
    expect(
      result.suggestedFields.some((suggestion) => suggestion.fieldPath.startsWith('references[')),
    ).toBe(false);
  });

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

  it('builds draft actions only for approved Foundations scalar fields on /pile-groups', () => {
    const draftActions = buildAssistantDraftActionsForCurrentPage(
      {
        route: '/projects/project-1/pile-groups',
        pageTitle: 'Foundations',
        pageKind: 'project_detail',
      },
      [
        {
          fieldPath: 'geotechnicalBasis.foundingNotes',
          label: 'Project geotechnical founding notes',
          suggestedValue: 'Found piles within weathered schist.',
          sourceType: 'report_derived',
          sourceSummary: 'Grounded report',
          rationale: 'Grounded in the extracted report.',
          confidence: 0.9,
          applyMode: 'fill-if-empty',
        },
        {
          fieldPath: 'geotechnicalMaterials.candidates[0].displayName',
          label: 'Candidate material',
          suggestedValue: 'Dense silty sand',
          sourceType: 'report_derived',
          sourceSummary: 'Grounded report',
          rationale: 'Out of scope.',
          confidence: 0.9,
          applyMode: 'replace',
        },
      ],
    );

    expect(draftActions).toEqual([
      expect.objectContaining({
        fieldKey: 'geotechnicalBasis.foundingNotes',
        actionType: 'set_textarea',
        proposedValue: 'Found piles within weathered schist.',
        status: 'ready',
      }),
    ]);
  });

  it('builds an archived project checkbox draft action only on /projects/[id]', () => {
    const draftActions = buildAssistantDraftActionsForCurrentPage(
      {
        route: '/projects/project-1',
        pageTitle: 'Project Details',
        pageKind: 'project_detail',
      },
      [
        {
          fieldPath: 'identity.archived',
          label: 'Archived project',
          suggestedValue: 'Yes',
          sourceType: 'page_context_inference',
          sourceSummary: 'Current page request',
          rationale: 'The user explicitly asked to archive the current project draft.',
          confidence: 0.94,
          applyMode: 'fill-if-empty',
        },
        {
          fieldPath: 'geotechnicalBasis.foundingNotes',
          label: 'Founding notes',
          suggestedValue: 'Out of scope',
          sourceType: 'report_derived',
          sourceSummary: 'Grounded report',
          rationale: 'This should stay out of the project page scope.',
          confidence: 0.9,
          applyMode: 'replace',
        },
      ],
    );

    expect(draftActions).toEqual([
      expect.objectContaining({
        fieldKey: 'identity.archived',
        actionType: 'set_checkbox',
        proposedValue: 'Yes',
        status: 'ready',
      }),
    ]);
  });

  it('surfaces project settings suggestions only on the settings page scope', () => {
    const result = buildDeterministicFieldSuggestions({
      pageContext: {
        route: '/projects/project-1/settings',
        pageTitle: 'Project Settings',
        pageKind: 'project_detail',
        pageSpecificData: {
          projectSettings: {
            name: '',
            description: 'Existing authored description',
            status: 'active',
          },
        },
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

    expect(
      result.suggestedFields.some(
        (suggestion) =>
          suggestion.fieldPath === 'projectSettings.name' && suggestion.suggestedValue.length > 0,
      ),
    ).toBe(true);
    expect(
      result.suggestedFields.some((suggestion) => suggestion.fieldPath === 'identity.address'),
    ).toBe(false);
  });

  it('builds draft actions only for approved Project Settings scalar fields on /settings', () => {
    const draftActions = buildAssistantDraftActionsForCurrentPage(
      {
        route: '/projects/project-1/settings',
        pageTitle: 'Project Settings',
        pageKind: 'project_detail',
      },
      [
        {
          fieldPath: 'projectSettings.description',
          label: 'Project description',
          suggestedValue: 'New healthcare building delivery project.',
          sourceType: 'report_derived',
          sourceSummary: 'Grounded report',
          rationale: 'Grounded in the extracted report.',
          confidence: 0.9,
          applyMode: 'fill-if-empty',
        },
        {
          fieldPath: 'projectSettings.standardsProfileId',
          label: 'Standards profile',
          suggestedValue: 'profile-1',
          sourceType: 'project_state',
          sourceSummary: 'Current project state',
          rationale: 'Out of scope.',
          confidence: 0.9,
          applyMode: 'replace',
        },
      ],
    );

    expect(draftActions).toEqual([
      expect.objectContaining({
        fieldKey: 'projectSettings.description',
        actionType: 'set_textarea',
        proposedValue: 'New healthcare building delivery project.',
        status: 'ready',
      }),
    ]);
  });
});

function buildProjectSpecifics(identityOverrides: Partial<any> = {}): any {
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
      ...identityOverrides,
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
