import {
  buildMultiPileEnvelopeInputSignature,
  MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
  type AiAssistantDraftAction,
  type MultiPileEnvelopeRunSummary,
  type MultiPilePileTypeDefinition,
  type MultiPileProjectReference,
  type MultiPileProjectSpecifics,
  type MultiPileState,
} from '@eng/shared';
import type { AssistantSuggestedField } from './assistant-response.schema';
import type { RespondAiAssistantDto } from './dto/respond-ai-assistant.dto';

type AssistantDocumentSuggestionSource = {
  id: string;
  filename: string;
  latestRunStatus: string | null;
  resultJson: unknown;
};

const MULTI_PILE_ASSISTANT_SUGGESTIONS_ENABLED = false;
const PROJECT_GEOTECHNICAL_MATERIAL_CANDIDATE_LIMIT = 8;
const PROJECT_DETAIL_DRAFT_ACTION_TYPE_BY_FIELD = {
  'identity.projectNumber': 'set_text',
  'identity.projectName': 'set_text',
  'identity.client': 'set_text',
  'identity.status': 'set_select',
  'identity.address': 'set_text',
  'identity.latitude': 'set_text',
  'identity.longitude': 'set_text',
  'identity.mapAddress': 'set_text',
  'identity.notes': 'set_textarea',
  'identity.archived': 'set_checkbox',
  'identity.mapSource': 'set_select',
  'reportMeta.reportTitle': 'set_text',
  'reportMeta.reportRevision': 'set_text',
  'reportMeta.issueDate': 'set_text',
  'reportMeta.preparedBy': 'set_text',
  'reportMeta.checkedBy': 'set_text',
  'reportMeta.purpose': 'set_text',
  'geotechnicalBasis.groundwaterDesignNotes': 'set_textarea',
  'geotechnicalBasis.cfaUpliftMode': 'set_select',
  'geotechnicalBasis.cfaUpliftFactor': 'set_text',
  'geotechnicalBasis.defaultSocketAssumptions': 'set_textarea',
  'geotechnicalBasis.foundingNotes': 'set_textarea',
  'geotechnicalBasis.commentary': 'set_textarea',
} as const;

export type AssistantFieldSuggestionBuildResult = {
  supported: boolean;
  suggestedFields: AssistantSuggestedField[];
  toolFindings: string[];
  limitationNote: string | null;
};

type ProjectGeotechnicalMaterialCandidate = {
  tableLabel: string;
  pageLabel: string;
  row: {
    rowLabel: string;
    unitCode: string;
    unitDescription: string;
    foundingStrata: string;
    unitWeightBulkKNm3: number | null;
    frictionAngleDeg: number | null;
    cohesionKPa: number | null;
    undrainedShearStrengthKPa: number | null;
    modulusMPa: number | null;
    poissonRatio: number | null;
    Ka: number | null;
    Ko: number | null;
    Kp: number | null;
    shaftAdhesionCompressionUltimateKPa: number | null;
    shaftAdhesionCompressionAllowableKPa: number | null;
    shaftAdhesionTensionUltimateKPa: number | null;
    endBearingUltimateKPa: number | null;
    endBearingAllowableKPa: number | null;
    notes: string;
  };
  score: number;
};

export function buildDeterministicFieldSuggestions({
  pageContext,
  projectSpecifics,
  recentDocuments,
  multiPileState,
  latestEnvelopeRun,
}: {
  pageContext: RespondAiAssistantDto['pageContext'];
  projectSpecifics: MultiPileProjectSpecifics | null;
  recentDocuments: AssistantDocumentSuggestionSource[];
  multiPileState: MultiPileState | null;
  latestEnvelopeRun: MultiPileEnvelopeRunSummary | null;
}): AssistantFieldSuggestionBuildResult {
  switch (pageContext.pageKind) {
    case 'project_detail':
      return filterProjectDetailSuggestionResultForRoute(
        buildProjectDetailSuggestions({
          projectSpecifics,
          recentDocuments,
        }),
        pageContext.route,
      );
    case 'multi_pile':
      return buildMultiPileSuggestions({
        pageContext,
        multiPileState,
        latestEnvelopeRun,
      });
    default:
      return {
        supported: false,
        suggestedFields: [],
        toolFindings: [],
        limitationNote:
          'Suggest + Apply is not supported on this page yet. I can still answer questions from the current page context.',
      };
  }
}

function buildProjectDetailSuggestions({
  projectSpecifics,
  recentDocuments,
}: {
  projectSpecifics: MultiPileProjectSpecifics | null;
  recentDocuments: AssistantDocumentSuggestionSource[];
}): AssistantFieldSuggestionBuildResult {
  if (!projectSpecifics) {
    return {
      supported: true,
      suggestedFields: [],
      toolFindings: [],
      limitationNote: 'Project-owned editable details were not available for grounded suggestions.',
    };
  }

  const suggestedFields: AssistantSuggestedField[] = [];
  const toolFindings = new Set<string>();
  const bestReportDocument = selectBestExtractedDocument(recentDocuments);
  const bestGeotechnicalDocument =
    selectBestGeotechnicalDocument(recentDocuments) ??
    (bestReportDocument && shouldUseCompletedReportAsGeotechnicalFallback(bestReportDocument)
      ? bestReportDocument
      : null);
  const projectSummaryCandidate = selectBestProjectSummaryCandidate([
    bestReportDocument,
    bestGeotechnicalDocument,
  ]);
  const bestReportResult = bestReportDocument ? objectValue(bestReportDocument.resultJson) : null;
  const extractedReportTitle = bestReportResult
    ? getNestedString(bestReportResult, ['reportTitle', 'value'])
    : null;
  const extractedReportRevision = bestReportResult
    ? getNestedString(bestReportResult, ['reportMetadata', 'revision', 'value'])
    : null;
  const extractedReportIssueDate = bestReportResult
    ? getNestedString(bestReportResult, ['reportMetadata', 'dateIssued', 'value'])
    : null;
  const extractedReportPreparedBy = bestReportResult
    ? getNestedString(bestReportResult, ['reportMetadata', 'preparedBy', 'value'])
    : null;
  const extractedReportCheckedBy = bestReportResult
    ? getNestedString(bestReportResult, ['reportMetadata', 'reviewedBy', 'value'])
    : null;
  const extractedReportPurpose = bestReportResult
    ? getNestedString(bestReportResult, ['investigationBasis', 'purposeScope', 'value'])
    : null;
  const extractedReportDocumentNumber = bestReportResult
    ? getNestedString(bestReportResult, ['reportMetadata', 'filename', 'value'])
    : null;
  const extractedReportDocumentType = bestReportResult
    ? mapDocumentFamilyToReferenceType(
        getNestedString(bestReportResult, ['documentFamily', 'value']),
      )
    : null;
  const siteAddressCandidate = selectBestSiteAddressCandidate([
    bestReportDocument,
    bestGeotechnicalDocument,
  ]);
  const reportMetaReference = selectBestReportMetadataReference(projectSpecifics);
  const reportPurposeReference = selectBestReportPurposeReference(projectSpecifics);
  const referenceTargetIndex = resolveReferenceTargetIndex(projectSpecifics);

  if (siteAddressCandidate && isBlank(projectSpecifics.identity.address)) {
    toolFindings.add(`Using extracted site address from ${siteAddressCandidate.filename}.`);
    pushSuggestion(suggestedFields, {
      fieldPath: 'identity.address',
      label: 'Project address',
      suggestedValue: siteAddressCandidate.value,
      sourceType: 'report_derived',
      sourceSummary: `${siteAddressCandidate.filename} · extracted site address`,
      rationale:
        'Copies the extracted site address into the editable Project Details address field.',
      confidence: 0.91,
      applyMode: 'fill-if-empty',
    });
  }

  if (projectSummaryCandidate && isBlank(projectSpecifics.identity.notes)) {
    toolFindings.add(
      `Using extracted project summary from ${projectSummaryCandidate.filename} for project notes.`,
    );
    pushSuggestion(suggestedFields, {
      fieldPath: 'identity.notes',
      label: 'Project notes',
      suggestedValue: projectSummaryCandidate.value,
      sourceType: 'report_derived',
      sourceSummary: `${projectSummaryCandidate.filename} · extracted project summary`,
      rationale:
        'Copies explicit project summary text extracted from the uploaded report into the editable project notes.',
      confidence: 0.84,
      applyMode: 'fill-if-empty',
    });
  }

  if (reportMetaReference) {
    const { index, reference } = reportMetaReference;
    const sourceSummary = `${formatProjectReferenceSource(reference, index)} · authored project reference`;

    if (
      reference.title.trim().length > 0 &&
      isBlankOrDefaultReportTitle(projectSpecifics.reportMeta.reportTitle) &&
      !extractedReportTitle &&
      !hasSuggestionForField(suggestedFields, 'reportMeta.reportTitle')
    ) {
      toolFindings.add(`Using authored project reference ${index + 1} title for report metadata.`);
      pushSuggestion(suggestedFields, {
        fieldPath: 'reportMeta.reportTitle',
        label: 'Report metadata title',
        suggestedValue: reference.title,
        sourceType: 'project_state',
        sourceSummary,
        rationale:
          'Copies the current project reference title into report metadata when the report title is still blank or left at the default placeholder.',
        confidence: 0.78,
        applyMode: 'fill-if-empty',
      });
    }

    if (
      isBlank(projectSpecifics.reportMeta.reportRevision) &&
      !extractedReportRevision &&
      !isBlank(reference.revision)
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: 'reportMeta.reportRevision',
        label: 'Report metadata revision',
        suggestedValue: reference.revision,
        sourceType: 'project_state',
        sourceSummary,
        rationale:
          'Copies the authored revision from the current project reference into report metadata.',
        confidence: 0.86,
        applyMode: 'fill-if-empty',
      });
    }

    if (
      isBlank(projectSpecifics.reportMeta.issueDate) &&
      !extractedReportIssueDate &&
      !isBlank(reference.issueDate)
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: 'reportMeta.issueDate',
        label: 'Report metadata issue date',
        suggestedValue: reference.issueDate,
        sourceType: 'project_state',
        sourceSummary,
        rationale:
          'Copies the authored issue date from the current project reference into report metadata.',
        confidence: 0.88,
        applyMode: 'fill-if-empty',
      });
    }
  }

  if (
    reportPurposeReference &&
    isBlank(projectSpecifics.reportMeta.purpose) &&
    !extractedReportPurpose &&
    !hasSuggestionForField(suggestedFields, 'reportMeta.purpose')
  ) {
    const { index, reference } = reportPurposeReference;
    pushSuggestion(suggestedFields, {
      fieldPath: 'reportMeta.purpose',
      label: 'Report metadata purpose',
      suggestedValue: reference.notes,
      sourceType: 'project_state',
      sourceSummary: `${formatProjectReferenceSource(reference, index)} · authored reference notes`,
      rationale:
        'Copies a short authored purpose-style note from the project reference into report metadata.',
      confidence: 0.74,
      applyMode: 'fill-if-empty',
    });
  }

  if (bestReportDocument) {
    if (extractedReportTitle) {
      toolFindings.add(`Using extracted report title from ${bestReportDocument.filename}.`);
      if (isBlankOrDefaultReportTitle(projectSpecifics.reportMeta.reportTitle)) {
        pushSuggestion(suggestedFields, {
          fieldPath: 'reportMeta.reportTitle',
          label: 'Report metadata title',
          suggestedValue: extractedReportTitle,
          sourceType: 'report_derived',
          sourceSummary: `${bestReportDocument.filename} · extracted report title`,
          rationale: 'Grounded in the latest extracted report title.',
          confidence: 0.95,
          applyMode: 'fill-if-empty',
        });
      }

      if (isBlank(referenceValue(projectSpecifics.references[referenceTargetIndex], 'title'))) {
        pushSuggestion(suggestedFields, {
          fieldPath: `references[${referenceTargetIndex}].title`,
          label: `Project reference ${referenceTargetIndex + 1} title`,
          suggestedValue: extractedReportTitle,
          sourceType: 'report_derived',
          sourceSummary: `${bestReportDocument.filename} · extracted report title`,
          rationale: 'Uses the extracted report title as the project reference title.',
          confidence: 0.93,
          applyMode: 'fill-if-empty',
        });
      }
    }

    if (
      extractedReportRevision &&
      isBlank(projectSpecifics.reportMeta.reportRevision) &&
      !hasSuggestionForField(suggestedFields, 'reportMeta.reportRevision')
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: 'reportMeta.reportRevision',
        label: 'Report metadata revision',
        suggestedValue: extractedReportRevision,
        sourceType: 'report_derived',
        sourceSummary: `${bestReportDocument.filename} · extracted report revision`,
        rationale: 'Copies the authored revision from the uploaded report front matter.',
        confidence: 0.94,
        applyMode: 'fill-if-empty',
      });
    }

    if (
      extractedReportIssueDate &&
      isBlank(projectSpecifics.reportMeta.issueDate) &&
      !hasSuggestionForField(suggestedFields, 'reportMeta.issueDate')
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: 'reportMeta.issueDate',
        label: 'Report metadata issue date',
        suggestedValue: extractedReportIssueDate,
        sourceType: 'report_derived',
        sourceSummary: `${bestReportDocument.filename} · extracted date issued`,
        rationale: 'Copies the issued date from the uploaded report front matter.',
        confidence: 0.92,
        applyMode: 'fill-if-empty',
      });
    }

    if (
      extractedReportPreparedBy &&
      isBlank(projectSpecifics.reportMeta.preparedBy) &&
      !hasSuggestionForField(suggestedFields, 'reportMeta.preparedBy')
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: 'reportMeta.preparedBy',
        label: 'Report metadata prepared by',
        suggestedValue: extractedReportPreparedBy,
        sourceType: 'report_derived',
        sourceSummary: `${bestReportDocument.filename} · extracted prepared by`,
        rationale: 'Copies the authored preparer from the uploaded report front matter.',
        confidence: 0.92,
        applyMode: 'fill-if-empty',
      });
    }

    if (
      extractedReportCheckedBy &&
      isBlank(projectSpecifics.reportMeta.checkedBy) &&
      !hasSuggestionForField(suggestedFields, 'reportMeta.checkedBy')
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: 'reportMeta.checkedBy',
        label: 'Report metadata checked by',
        suggestedValue: extractedReportCheckedBy,
        sourceType: 'report_derived',
        sourceSummary: `${bestReportDocument.filename} · extracted reviewed by`,
        rationale: 'Copies the authored checker or reviewer from the uploaded report front matter.',
        confidence: 0.92,
        applyMode: 'fill-if-empty',
      });
    }

    if (
      extractedReportPurpose &&
      isBlank(projectSpecifics.reportMeta.purpose) &&
      !hasSuggestionForField(suggestedFields, 'reportMeta.purpose')
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: 'reportMeta.purpose',
        label: 'Report metadata purpose',
        suggestedValue: extractedReportPurpose,
        sourceType: 'report_derived',
        sourceSummary: `${bestReportDocument.filename} · extracted investigation purpose`,
        rationale: 'Copies the stated investigation purpose or scope from the uploaded report.',
        confidence: 0.9,
        applyMode: 'fill-if-empty',
      });
    }

    if (
      isBlank(referenceValue(projectSpecifics.references[referenceTargetIndex], 'documentNumber'))
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: `references[${referenceTargetIndex}].documentNumber`,
        label: `Project reference ${referenceTargetIndex + 1} document number / filename`,
        suggestedValue: extractedReportDocumentNumber ?? bestReportDocument.filename,
        sourceType: 'report_derived',
        sourceSummary:
          extractedReportDocumentNumber != null
            ? `${bestReportDocument.filename} · extracted report document number`
            : `${bestReportDocument.filename} · uploaded AI report filename`,
        rationale:
          extractedReportDocumentNumber != null
            ? 'Uses the extracted report document number as a cleaner grounded reference identifier.'
            : 'Uses the uploaded report filename as a grounded reference identifier.',
        confidence: extractedReportDocumentNumber != null ? 0.92 : 0.89,
        applyMode: 'fill-if-empty',
      });
    }

    if (
      extractedReportDocumentType &&
      isUnsetReferenceDocumentType(
        referenceValue(projectSpecifics.references[referenceTargetIndex], 'documentType'),
      )
    ) {
      pushSuggestion(suggestedFields, {
        fieldPath: `references[${referenceTargetIndex}].documentType`,
        label: `Project reference ${referenceTargetIndex + 1} document type`,
        suggestedValue: extractedReportDocumentType,
        sourceType: 'report_derived',
        sourceSummary: `${bestReportDocument.filename} · extracted report family`,
        rationale: 'Maps the extracted report family to the project reference document type.',
        confidence: 0.88,
        applyMode: 'fill-if-empty',
      });
    }
  }

  if (
    projectSummaryCandidate &&
    isBlank(projectSpecifics.references[referenceTargetIndex]?.notes ?? '')
  ) {
    pushSuggestion(suggestedFields, {
      fieldPath: `references[${referenceTargetIndex}].notes`,
      label: `Project reference ${referenceTargetIndex + 1} notes`,
      suggestedValue: projectSummaryCandidate.value,
      sourceType: 'report_derived',
      sourceSummary: `${projectSummaryCandidate.filename} · extracted project summary`,
      rationale:
        'Copies the extracted report summary into the project reference notes for grounded provenance context.',
      confidence: 0.76,
      applyMode: 'fill-if-empty',
    });
  }

  if (!bestGeotechnicalDocument) {
    return {
      supported: true,
      suggestedFields,
      toolFindings: Array.from(toolFindings),
      limitationNote:
        suggestedFields.length > 0
          ? null
          : 'No extracted AI report with grounded geotechnical findings is available for this project yet.',
    };
  }

  const projectGeotechnicalSuggestions = buildProjectGeotechnicalSuggestions({
    projectSpecifics,
    bestGeotechnicalDocument,
  });
  projectGeotechnicalSuggestions.suggestedFields.forEach((suggestion) => {
    pushSuggestion(suggestedFields, suggestion);
  });
  projectGeotechnicalSuggestions.toolFindings.forEach((finding) => {
    toolFindings.add(finding);
  });

  return {
    supported: true,
    suggestedFields,
    toolFindings: Array.from(toolFindings).slice(0, 8),
    limitationNote:
      suggestedFields.length > 0
        ? null
        : 'I could not find any grounded project suggestions from current project state or extracted AI reports, so I am not inventing values.',
  };
}

export function buildAssistantDraftActionsForCurrentPage(
  pageContext: RespondAiAssistantDto['pageContext'],
  suggestedFields: AssistantSuggestedField[],
): AiAssistantDraftAction[] {
  const scope = resolveProjectDetailSuggestionScope(pageContext.route);
  if (scope !== 'project-page' && scope !== 'project-foundations') {
    return [];
  }

  return suggestedFields.flatMap((suggestion) => {
    if (!isProjectDetailSuggestionFieldInScope(suggestion.fieldPath, scope)) {
      return [];
    }

    const actionType = resolveProjectDetailDraftActionType(suggestion.fieldPath);
    if (!actionType) {
      return [];
    }

    return [
      {
        fieldKey: suggestion.fieldPath,
        actionType,
        proposedValue: suggestion.suggestedValue,
        label: suggestion.label,
        reason: suggestion.rationale,
        status: 'ready',
        message: null,
      } satisfies AiAssistantDraftAction,
    ];
  });
}

type ProjectDetailSuggestionScope = 'project-page' | 'project-geotechnical' | 'project-foundations';

function filterProjectDetailSuggestionResultForRoute(
  result: AssistantFieldSuggestionBuildResult,
  route: string,
): AssistantFieldSuggestionBuildResult {
  const scope = resolveProjectDetailSuggestionScope(route);
  if (!scope) {
    return {
      supported: false,
      suggestedFields: [],
      toolFindings: [],
      limitationNote:
        'Structured Suggest + Apply is not supported on this project page yet. I can still answer questions from the current page context.',
    };
  }

  const suggestedFields = result.suggestedFields.filter((suggestion) =>
    isProjectDetailSuggestionFieldInScope(suggestion.fieldPath, scope),
  );

  return {
    ...result,
    suggestedFields,
    limitationNote:
      suggestedFields.length > 0
        ? null
        : (result.limitationNote ?? resolveProjectDetailSuggestionScopeLimitation(scope)),
  };
}

function resolveProjectDetailSuggestionScope(route: string): ProjectDetailSuggestionScope | null {
  if (/^\/projects\/[^/]+$/.test(route)) {
    return 'project-page';
  }
  if (/^\/projects\/[^/]+\/project-geotechnical$/.test(route)) {
    return 'project-geotechnical';
  }
  if (/^\/projects\/[^/]+\/pile-groups$/.test(route)) {
    return 'project-foundations';
  }

  return null;
}

function isProjectDetailSuggestionFieldInScope(
  fieldPath: string,
  scope: ProjectDetailSuggestionScope,
) {
  switch (scope) {
    case 'project-page':
      return (
        /^identity\.(projectNumber|projectName|client|status|address|latitude|longitude|mapAddress|notes|archived|mapSource)$/.test(
          fieldPath,
        ) ||
        /^reportMeta\.(reportTitle|reportRevision|issueDate|preparedBy|checkedBy|purpose)$/.test(
          fieldPath,
        )
      );
    case 'project-geotechnical':
      return /^geotechnicalMaterials\.candidates\[\d+\]\./.test(fieldPath);
    case 'project-foundations':
      return /^geotechnicalBasis\.(groundwaterDesignNotes|cfaUpliftMode|cfaUpliftFactor|defaultSocketAssumptions|foundingNotes|commentary)$/.test(
        fieldPath,
      );
    default:
      return false;
  }
}

function resolveProjectDetailSuggestionScopeLimitation(scope: ProjectDetailSuggestionScope) {
  switch (scope) {
    case 'project-page':
      return 'No grounded Project Details or report metadata suggestions were available for this page.';
    case 'project-geotechnical':
      return 'No grounded project geotechnical material candidates were available for this page.';
    case 'project-foundations':
      return 'No grounded groundwater, CFA uplift, socket, founding, or global GEO-control suggestions were available for this page.';
    default:
      return 'No grounded suggestions were available for this page scope.';
  }
}

function buildMultiPileSuggestions({
  pageContext,
  multiPileState,
  latestEnvelopeRun,
}: {
  pageContext: RespondAiAssistantDto['pageContext'];
  multiPileState: MultiPileState | null;
  latestEnvelopeRun: MultiPileEnvelopeRunSummary | null;
}): AssistantFieldSuggestionBuildResult {
  if (!MULTI_PILE_ASSISTANT_SUGGESTIONS_ENABLED) {
    return {
      supported: false,
      suggestedFields: [],
      toolFindings: [],
      limitationNote:
        'Multi-Pile assistant draft apply is intentionally read-only for now. I can still give guidance from the current page context.',
    };
  }

  if (!multiPileState) {
    return {
      supported: true,
      suggestedFields: [],
      toolFindings: [],
      limitationNote: 'The current Multi-Pile draft was not available for grounded suggestions.',
    };
  }

  const activeTab = getNestedString(objectValue(pageContext.pageSpecificData), ['activeTab']);
  if (activeTab === 'basis') {
    return buildMultiPileBasisSuggestions(multiPileState);
  }
  if (activeTab === 'loads') {
    return buildMultiPileJointAssignmentSuggestions(multiPileState, latestEnvelopeRun);
  }

  return {
    supported: false,
    suggestedFields: [],
    toolFindings: [],
    limitationNote:
      'Phase 1 Suggest + Apply is currently supported on the Multi-Pile Pile Types and Joint Loads tabs only.',
  };
}

function buildProjectGeotechnicalSuggestions({
  projectSpecifics,
  bestGeotechnicalDocument,
}: {
  projectSpecifics: MultiPileProjectSpecifics;
  bestGeotechnicalDocument: AssistantDocumentSuggestionSource;
}) {
  const suggestedFields: AssistantSuggestedField[] = [];
  const toolFindings = new Set<string>();
  const geotechnicalResult = objectValue(bestGeotechnicalDocument.resultJson);
  const geotechnicalReportLabel =
    getNestedString(geotechnicalResult, ['reportTitle', 'value']) ||
    bestGeotechnicalDocument.filename;
  const siteAddress = getNestedString(geotechnicalResult, [
    'reportMetadata',
    'siteAddress',
    'value',
  ]);
  const materialSourceDocument =
    getNestedString(geotechnicalResult, ['reportMetadata', 'filename', 'value']) ||
    geotechnicalReportLabel;
  const materialSourceProject =
    getNestedString(geotechnicalResult, ['reportMetadata', 'documentTitle', 'value']) ||
    getNestedString(geotechnicalResult, ['reportTitle', 'value']) ||
    '';
  const foundingSuggestion = buildFoundingSuggestion(geotechnicalResult);
  const groundwaterSuggestion = buildGroundwaterDesignNoteSuggestion(geotechnicalResult);
  const commentarySuggestion = buildProjectGeotechnicalCommentarySuggestion(geotechnicalResult);
  const socketAssumptionsSuggestion = buildSocketAssumptionsSuggestion(geotechnicalResult);
  const upliftRatio = extractUpliftCompressionRatio([
    ...getFindingValues(geotechnicalResult, ['pileConstruction', 'upliftTensionNotes']),
    ...getFindingValues(geotechnicalResult, ['pileConstruction', 'designVerificationNotes']),
    ...getFindingValues(geotechnicalResult, ['geotechnicalBasis', 'pileRecommendations']),
    ...getFindingValues(geotechnicalResult, ['geotechnicalBasis', 'rockStrataDesignParameters']),
    ...getFindingValues(geotechnicalResult, ['geotechnicalBasis', 'foundingNotes']),
  ]);

  if (foundingSuggestion && isBlank(projectSpecifics.geotechnicalBasis.foundingNotes)) {
    toolFindings.add(`Using report-derived founding commentary from ${geotechnicalReportLabel}.`);
    pushSuggestion(suggestedFields, {
      fieldPath: 'geotechnicalBasis.foundingNotes',
      label: 'Project geotechnical founding notes',
      suggestedValue: foundingSuggestion,
      sourceType: 'report_derived',
      sourceSummary: `${geotechnicalReportLabel} · founding notes`,
      rationale: 'Copies explicit founding commentary extracted from the uploaded report.',
      confidence: 0.92,
      applyMode: 'fill-if-empty',
    });
  }

  if (groundwaterSuggestion && isBlank(projectSpecifics.geotechnicalBasis.groundwaterDesignNotes)) {
    toolFindings.add(
      `Using report-derived groundwater commentary from ${geotechnicalReportLabel}.`,
    );
    pushSuggestion(suggestedFields, {
      fieldPath: 'geotechnicalBasis.groundwaterDesignNotes',
      label: 'Project geotechnical groundwater design notes',
      suggestedValue: groundwaterSuggestion,
      sourceType: 'report_derived',
      sourceSummary: `${geotechnicalReportLabel} · groundwater observations and monitoring`,
      rationale:
        'Copies explicit groundwater observations, uncertainty, and construction implications from the uploaded report.',
      confidence: 0.92,
      applyMode: 'fill-if-empty',
    });
  }

  if (commentarySuggestion && isBlank(projectSpecifics.geotechnicalBasis.commentary)) {
    pushSuggestion(suggestedFields, {
      fieldPath: 'geotechnicalBasis.commentary',
      label: 'Project geotechnical commentary',
      suggestedValue: commentarySuggestion,
      sourceType: 'report_derived',
      sourceSummary: `${geotechnicalReportLabel} · extracted geotechnical commentary`,
      rationale:
        'Copies report-derived geotechnical interpretation, classification, working-platform, or limitations notes into the editable project commentary.',
      confidence: 0.86,
      applyMode: 'fill-if-empty',
    });
  }

  if (
    socketAssumptionsSuggestion &&
    isBlank(projectSpecifics.geotechnicalBasis.defaultSocketAssumptions)
  ) {
    toolFindings.add(
      `Using report-derived socket or embedment commentary from ${geotechnicalReportLabel}.`,
    );
    pushSuggestion(suggestedFields, {
      fieldPath: 'geotechnicalBasis.defaultSocketAssumptions',
      label: 'Project geotechnical default socket design assumptions',
      suggestedValue: socketAssumptionsSuggestion,
      sourceType: 'report_derived',
      sourceSummary: `${geotechnicalReportLabel} · socket or founding recommendations`,
      rationale:
        'Copies explicit socket, embedment, founding-in-rock, or verification notes extracted from the uploaded report.',
      confidence: 0.9,
      applyMode: 'fill-if-empty',
    });
  }

  if (
    upliftRatio != null &&
    shouldSuggestProjectCfaUplift(projectSpecifics) &&
    projectSpecifics.geotechnicalBasis.cfaUpliftMode !== 'ratio-to-compression'
  ) {
    toolFindings.add(
      `Using explicit uplift-to-compression ratio commentary from ${geotechnicalReportLabel}.`,
    );
    pushSuggestion(suggestedFields, {
      fieldPath: 'geotechnicalBasis.cfaUpliftMode',
      label: 'Project geotechnical default CFA uplift logic',
      suggestedValue: 'ratio-to-compression',
      sourceType: 'report_derived',
      sourceSummary: `${geotechnicalReportLabel} · uplift / tension note`,
      rationale:
        'Switches the default uplift logic to ratio-to-compression only when the current project GEO uplift settings are still at their untouched defaults and the report states an explicit uplift ratio.',
      confidence: 0.84,
      applyMode: 'replace',
    });
  }

  if (upliftRatio != null && shouldSuggestProjectCfaUplift(projectSpecifics)) {
    pushSuggestion(suggestedFields, {
      fieldPath: 'geotechnicalBasis.cfaUpliftFactor',
      label: 'Project geotechnical CFA tension ratio',
      suggestedValue: formatNumeric(upliftRatio),
      sourceType: 'report_derived',
      sourceSummary: `${geotechnicalReportLabel} · uplift / tension note`,
      rationale:
        'Copies the explicit uplift-to-compression ratio from the uploaded report only when the current project GEO uplift settings are still at their untouched defaults.',
      confidence: 0.86,
      applyMode: 'replace',
    });
  }

  const materialCandidates = selectParameterTableCandidates(
    geotechnicalResult,
    PROJECT_GEOTECHNICAL_MATERIAL_CANDIDATE_LIMIT,
  );
  if (materialCandidates.length > 0) {
    materialCandidates.forEach((materialCandidate, candidateIndex) => {
      const sourceSummary = [
        geotechnicalReportLabel,
        materialCandidate.tableLabel,
        materialCandidate.pageLabel,
      ]
        .filter((value) => value && value.trim().length > 0)
        .join(' · ');
      const rowLabel =
        materialCandidate.row.unitDescription ||
        materialCandidate.row.rowLabel ||
        materialCandidate.row.unitCode ||
        'Extracted material row';

      toolFindings.add(
        `Surfacing parameter table ${materialCandidate.tableLabel} row ${rowLabel} from ${geotechnicalReportLabel} as an adoptable project geotechnical material candidate.`,
      );

      pushSuggestion(suggestedFields, {
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'unitCode'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} unit code`,
        suggestedValue: cleanMaterialIdentityValue(materialCandidate.row.unitCode),
        sourceType: 'report_derived',
        sourceSummary,
        rationale:
          'Surfaces the extracted geological unit code on a candidate material without targeting any existing project material row.',
        confidence: 0.96,
        applyMode: 'replace',
      });
      pushSuggestion(suggestedFields, {
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'displayName',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} unit name`,
        suggestedValue: cleanMaterialIdentityValue(
          materialCandidate.row.unitDescription ||
            materialCandidate.row.rowLabel ||
            materialCandidate.row.foundingStrata,
        ),
        sourceType: 'report_derived',
        sourceSummary,
        rationale:
          'Surfaces the extracted material or unit name on a candidate material without targeting any existing project material row.',
        confidence: 0.95,
        applyMode: 'replace',
      });
      pushSuggestion(suggestedFields, {
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'sourceDocument',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} source document`,
        suggestedValue: materialSourceDocument,
        sourceType: 'report_derived',
        sourceSummary,
        rationale: 'Records the report that the extracted material row came from.',
        confidence: 0.98,
        applyMode: 'replace',
      });
      pushSuggestion(suggestedFields, {
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'sourceProject',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} source project`,
        suggestedValue: materialSourceProject,
        sourceType: 'report_derived',
        sourceSummary,
        rationale:
          'Records the report-derived project title or document title alongside the candidate material provenance.',
        confidence: 0.9,
        applyMode: 'replace',
      });
      pushSuggestion(suggestedFields, {
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'sourceSite'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} source site`,
        suggestedValue: siteAddress ?? '',
        sourceType: 'report_derived',
        sourceSummary,
        rationale: 'Copies the extracted site address into the material provenance fields.',
        confidence: 0.74,
        applyMode: 'replace',
      });
      pushSuggestion(suggestedFields, {
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'sourceSection',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} source section`,
        suggestedValue: materialCandidate.pageLabel,
        sourceType: 'report_derived',
        sourceSummary,
        rationale: 'Preserves the extracted page or section label for provenance.',
        confidence: 0.84,
        applyMode: 'replace',
      });
      pushSuggestion(suggestedFields, {
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'sourceTable',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} source table`,
        suggestedValue: materialCandidate.tableLabel,
        sourceType: 'report_derived',
        sourceSummary,
        rationale: 'Preserves the extracted source table for provenance.',
        confidence: 0.97,
        applyMode: 'replace',
      });
      pushSuggestion(suggestedFields, {
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'notes'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} notes`,
        suggestedValue: buildMaterialCandidateNotes(materialCandidate),
        sourceType: 'report_derived',
        sourceSummary,
        rationale:
          'Surfaces the report row notes on a candidate material without targeting any existing project material row.',
        confidence: 0.78,
        applyMode: 'replace',
      });

      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'gamma_b'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} gamma_b`,
        numericValue: materialCandidate.row.unitWeightBulkKNm3,
        sourceSummary,
        rationale:
          'Surfaces the extracted bulk unit weight on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'phi_prime'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} phi prime`,
        numericValue: materialCandidate.row.frictionAngleDeg,
        sourceSummary,
        rationale:
          'Surfaces the extracted effective friction angle on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'c_prime'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} c prime`,
        numericValue: materialCandidate.row.cohesionKPa,
        sourceSummary,
        rationale:
          'Surfaces the extracted effective cohesion on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'cu'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} c_u`,
        numericValue: materialCandidate.row.undrainedShearStrengthKPa,
        sourceSummary,
        rationale:
          'Surfaces the extracted undrained shear strength on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'E_MPa'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} E`,
        numericValue: materialCandidate.row.modulusMPa,
        sourceSummary,
        rationale:
          "Surfaces the extracted Young's modulus on a candidate material without targeting any existing project material row.",
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'nu'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} nu`,
        numericValue: materialCandidate.row.poissonRatio,
        sourceSummary,
        rationale:
          "Surfaces the extracted Poisson's ratio on a candidate material without targeting any existing project material row.",
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'Ka'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} K_a`,
        numericValue: materialCandidate.row.Ka,
        sourceSummary,
        rationale:
          'Surfaces the extracted active earth pressure coefficient on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'Ko'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} K_o`,
        numericValue: materialCandidate.row.Ko,
        sourceSummary,
        rationale:
          'Surfaces the extracted at-rest earth pressure coefficient on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(candidateIndex, 'Kp'),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} K_p`,
        numericValue: materialCandidate.row.Kp,
        sourceSummary,
        rationale:
          'Surfaces the extracted passive earth pressure coefficient on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'pile_fms_comp_kPa',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} f_m,s compression`,
        numericValue: materialCandidate.row.shaftAdhesionCompressionUltimateKPa,
        sourceSummary,
        rationale:
          'Surfaces the extracted compression shaft adhesion on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'pile_fms_allow_kPa',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} f_m,s allowable`,
        numericValue: materialCandidate.row.shaftAdhesionCompressionAllowableKPa,
        sourceSummary,
        rationale:
          'Surfaces the extracted allowable compression shaft adhesion on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'pile_fms_tension_kPa',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} f_m,s tension`,
        numericValue: materialCandidate.row.shaftAdhesionTensionUltimateKPa,
        sourceSummary,
        rationale:
          'Surfaces the extracted uplift shaft adhesion on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'pile_fb_ult_kPa',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} f_b ultimate`,
        numericValue: materialCandidate.row.endBearingUltimateKPa,
        sourceSummary,
        rationale:
          'Surfaces the extracted ultimate end-bearing value on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'pile_fb_allow_kPa',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} f_b allowable`,
        numericValue: materialCandidate.row.endBearingAllowableKPa,
        sourceSummary,
        rationale:
          'Surfaces the extracted allowable end-bearing value on a candidate material without targeting any existing project material row.',
      });
      addProjectGeotechnicalMaterialCandidateNumericSuggestion({
        suggestedFields,
        fieldPath: buildProjectGeotechnicalMaterialCandidateFieldPath(
          candidateIndex,
          'cfaUpliftTensionFactor',
        ),
        label: `Suggested geotechnical material candidate ${candidateIndex + 1} CFA uplift tension factor`,
        numericValue: hasPileDesignValue(materialCandidate.row) ? upliftRatio : null,
        sourceSummary: `${geotechnicalReportLabel} · uplift / tension note`,
        rationale:
          'Surfaces the explicit uplift-to-compression ratio on a candidate material only where the report states that ratio directly.',
      });
    });
  }

  return {
    suggestedFields,
    toolFindings: Array.from(toolFindings).slice(0, 8),
  };
}

function buildMultiPileBasisSuggestions(
  multiPileState: MultiPileState,
): AssistantFieldSuggestionBuildResult {
  const suggestedFields: AssistantSuggestedField[] = [];

  multiPileState.pileTypes.forEach((pileType, index) => {
    const currentLabel = pileType.displayName.trim();
    const suggestedLabel = buildPileTypeDisplayLabel(pileType);
    if (!suggestedLabel) {
      return;
    }
    if (currentLabel.length > 0 && currentLabel !== pileType.id) {
      return;
    }

    pushSuggestion(suggestedFields, {
      fieldPath: `pileTypes[${index}].displayName`,
      label: `Pile type ${pileType.id} display name`,
      suggestedValue: suggestedLabel,
      sourceType: 'page_context_inference',
      sourceSummary: `Authored pile type ID ${pileType.id} and diameter on the current Pile Types tab`,
      rationale:
        'Builds a clearer pile-type label from the currently authored ID and size without changing analysis values.',
      confidence: 0.62,
      applyMode: 'replace',
    });
  });

  return {
    supported: true,
    suggestedFields,
    toolFindings:
      suggestedFields.length > 0
        ? ['Built page-context label suggestions from authored pile type IDs and diameters.']
        : [],
    limitationNote:
      suggestedFields.length > 0
        ? null
        : 'No grounded Pile Types suggestions were available. Phase 1 does not autofill authored range fields from envelope results.',
  };
}

function buildMultiPileJointAssignmentSuggestions(
  multiPileState: MultiPileState,
  latestEnvelopeRun: MultiPileEnvelopeRunSummary | null,
): AssistantFieldSuggestionBuildResult {
  const envelopeState = deriveEnvelopeSnapshotState(multiPileState, latestEnvelopeRun);
  if (envelopeState !== 'ready' || !latestEnvelopeRun?.envelope) {
    return {
      supported: true,
      suggestedFields: [],
      toolFindings: [],
      limitationNote:
        envelopeState === 'stale'
          ? 'Joint assignment suggestions need a current completed envelope snapshot that matches the current saved Multi-Pile state.'
          : 'Joint assignment suggestions need a completed envelope snapshot before I can suggest safe type matches.',
    };
  }

  const suggestedFields: AssistantSuggestedField[] = [];
  const pileTypeById = new Map(
    multiPileState.pileTypes.map((pileType) => [pileType.id, pileType] as const),
  );

  multiPileState.joints.forEach((joint, index) => {
    if (!joint.active) {
      return;
    }

    const extremes = deriveJointEnvelopeExtremes(latestEnvelopeRun, joint.id);
    const suggestedPileType = findSuggestedPileTypeForEnvelopeExtremes(
      multiPileState.pileTypes,
      extremes,
    );
    if (!extremes || !suggestedPileType || suggestedPileType.id === joint.pileTypeId) {
      return;
    }

    const currentPileType = pileTypeById.get(joint.pileTypeId);
    pushSuggestion(suggestedFields, {
      fieldPath: `joints[${index}].pileTypeId`,
      label: `Joint ${joint.id} pile type`,
      suggestedValue: suggestedPileType.id,
      sourceType: 'internal_tool',
      sourceSummary: 'Current stored envelope snapshot + authored pile type range matching',
      rationale: [
        `Max compression ${formatNumeric(extremes.maxCompression)} kN`,
        `max uplift ${formatNumeric(extremes.maxTension)} kN`,
        `fit ${suggestedPileType.id}`,
        currentPileType ? `instead of ${currentPileType.id}` : null,
      ]
        .filter((value): value is string => value != null)
        .join(' · '),
      confidence: 0.9,
      applyMode: 'replace',
    });
  });

  return {
    supported: true,
    suggestedFields,
    toolFindings:
      suggestedFields.length > 0
        ? [
            'Used the current completed envelope snapshot and authored pile type ranges for joint matching.',
          ]
        : [
            'The current completed envelope snapshot did not expose any joint-to-type changes to suggest.',
          ],
    limitationNote:
      suggestedFields.length > 0
        ? null
        : 'No active joints currently need a different grounded type suggestion from the current envelope snapshot.',
  };
}

function selectBestExtractedDocument(documents: AssistantDocumentSuggestionSource[]) {
  const rankedDocuments = documents
    .map((document, index) => ({
      document,
      index,
      score: scoreCompletedExtractionDocument(document),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return rankedDocuments[0]?.document ?? null;
}

function selectBestGeotechnicalDocument(documents: AssistantDocumentSuggestionSource[]) {
  const rankedDocuments = documents
    .map((document, index) => ({
      document,
      index,
      score: scoreGeotechnicalExtractionDocument(document),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return rankedDocuments[0]?.document ?? null;
}

function scoreCompletedExtractionDocument(document: AssistantDocumentSuggestionSource) {
  if (document.latestRunStatus !== 'completed') {
    return -1;
  }
  const record = objectValue(document.resultJson);
  if (Object.keys(record).length === 0) {
    return -1;
  }

  return scoreExtractionRecord(record);
}

function scoreGeotechnicalExtractionDocument(document: AssistantDocumentSuggestionSource) {
  if (document.latestRunStatus !== 'completed') {
    return -1;
  }
  const record = objectValue(document.resultJson);
  const reportType = getNestedString(record, ['extractionProfile', 'reportType']);
  const family = getNestedString(record, ['documentFamily', 'value']);
  const parameterTableCount = arrayValue(record.geotechnicalParameterTables).length;
  if (reportType === 'dewatering_management_plan') {
    return -1;
  }
  if (reportType === 'geotechnical_comment' && parameterTableCount === 0) {
    return -1;
  }
  if (!isGeotechnicalDocumentFamily(family) && parameterTableCount === 0) {
    return -1;
  }

  return scoreExtractionRecord(record) + scoreGeotechnicalExtractionRecord(record);
}

function shouldUseCompletedReportAsGeotechnicalFallback(
  document: AssistantDocumentSuggestionSource,
) {
  if (document.latestRunStatus !== 'completed') {
    return false;
  }

  const record = objectValue(document.resultJson);
  const reportType = getNestedString(record, ['extractionProfile', 'reportType']);
  const parameterTableCount = arrayValue(record.geotechnicalParameterTables).length;
  if (reportType === 'dewatering_management_plan') {
    return false;
  }
  if (reportType === 'geotechnical_comment' && parameterTableCount === 0) {
    return false;
  }

  return true;
}

function isGeotechnicalDocumentFamily(value: string | null) {
  return (
    value === 'GEOTECHNICAL_REPORT' ||
    value === 'PRELIMINARY_GEOTECHNICAL_INVESTIGATION' ||
    value === 'GEOTECHNICAL_GROUNDWATER_REPORT' ||
    value === 'PRELIMINARY_GEOTECHNICAL_GROUNDWATER_REPORT'
  );
}

function mapDocumentFamilyToReferenceType(
  value: string | null,
): MultiPileProjectReference['documentType'] | null {
  return isGeotechnicalDocumentFamily(value) ? 'Geotechnical Report' : null;
}

function scoreExtractionRecord(record: Record<string, unknown>) {
  const reportMetadata = objectValue(record.reportMetadata);
  const investigationBasis = objectValue(record.investigationBasis);
  const groundwater = objectValue(record.groundwater);
  const groundModel = objectValue(record.groundModel);

  let score = 0;
  if (getNestedString(record, ['reportTitle', 'value'])) {
    score += 4;
  }
  if (getNestedString(record, ['projectSummary', 'value'])) {
    score += 2;
  }
  if (getNestedString(reportMetadata, ['filename', 'value'])) {
    score += 2;
  }
  if (getNestedString(reportMetadata, ['projectNumber', 'value'])) {
    score += 1;
  }
  if (getNestedString(reportMetadata, ['revision', 'value'])) {
    score += 2;
  }
  if (getNestedString(reportMetadata, ['dateIssued', 'value'])) {
    score += 2;
  }
  if (getNestedString(reportMetadata, ['preparedBy', 'value'])) {
    score += 2;
  }
  if (getNestedString(reportMetadata, ['reviewedBy', 'value'])) {
    score += 2;
  }
  if (getNestedString(investigationBasis, ['purposeScope', 'value'])) {
    score += 2;
  }

  score += Math.min(countNestedFindings(record, ['groundwater', 'observedConditions']), 2) * 3;
  score +=
    Math.min(countNestedFindings(record, ['groundwater', 'uncertaintyAndMonitoring']), 2) * 2;
  score +=
    Math.min(countNestedFindings(record, ['groundwater', 'constructionImplications']), 2) * 2;
  score += Math.min(arrayValue(groundModel.boreholes).length, 4);
  score += Math.min(arrayValue(record.geotechnicalParameterTables).length, 4) * 2;

  return score;
}

function scoreGeotechnicalExtractionRecord(record: Record<string, unknown>) {
  const reportSections = objectValue(record.reportSections);
  const pileConstruction = objectValue(record.pileConstruction);

  let score = 0;
  score += Math.min(countNestedFindings(record, ['reportSections', 'workingPlatform']), 2);
  score += Math.min(countNestedFindings(record, ['reportSections', 'limitations']), 2);
  score += Math.min(
    countNestedFindings(record, ['pileConstruction', 'designVerificationNotes']),
    3,
  );
  score += Math.min(countNestedFindings(record, ['pileConstruction', 'constructionControls']), 2);
  score += Math.min(countNestedFindings(record, ['pileConstruction', 'upliftTensionNotes']), 2);
  score += Math.min(countNestedFindings(record, ['reportSections', 'siteClassification']), 2);
  score += Math.min(arrayValue(reportSections.deepFoundations).length, 2);
  score += Math.min(arrayValue(pileConstruction.testingRecommendations).length, 1);

  return score;
}

function countNestedFindings(record: Record<string, unknown>, path: [string, string]) {
  return arrayValue(objectValue(record[path[0]])[path[1]]).length;
}

function resolveReferenceTargetIndex(projectSpecifics: MultiPileProjectSpecifics) {
  const references = projectSpecifics.references;
  const primaryGeotechnicalIndex = references.findIndex(
    (reference) => reference.primaryGeotechnical,
  );
  if (primaryGeotechnicalIndex >= 0) {
    return primaryGeotechnicalIndex;
  }

  const emptyGeotechnicalIndex = references.findIndex(
    (reference) =>
      reference.documentType === 'Geotechnical Report' &&
      isBlank(reference.title) &&
      isBlank(reference.documentNumber),
  );
  if (emptyGeotechnicalIndex >= 0) {
    return emptyGeotechnicalIndex;
  }

  const emptyAnyIndex = references.findIndex(
    (reference) => isBlank(reference.title) && isBlank(reference.documentNumber),
  );
  if (emptyAnyIndex >= 0) {
    return emptyAnyIndex;
  }

  return references.length;
}

function selectBestReportMetadataReference(projectSpecifics: MultiPileProjectSpecifics) {
  const activeReferences = projectSpecifics.references
    .map((reference, index) => ({ reference, index }))
    .filter(({ reference }) => reference.active);

  return (
    activeReferences.find(
      ({ reference }) =>
        reference.primaryGeotechnical && hasReportMetadataReferenceValue(reference),
    ) ??
    activeReferences.find(
      ({ reference }) =>
        reference.documentType === 'Geotechnical Report' &&
        hasReportMetadataReferenceValue(reference),
    ) ??
    activeReferences.find(({ reference }) => hasReportMetadataReferenceValue(reference)) ??
    null
  );
}

function selectBestReportPurposeReference(projectSpecifics: MultiPileProjectSpecifics) {
  const activeReferences = projectSpecifics.references
    .map((reference, index) => ({ reference, index }))
    .filter(({ reference }) => reference.active && looksLikePurposeStyleNote(reference.notes));

  return (
    activeReferences.find(({ reference }) => reference.primaryGeotechnical) ??
    activeReferences.find(({ reference }) => reference.primaryStructuralReference) ??
    activeReferences[0] ??
    null
  );
}

function hasReportMetadataReferenceValue(reference: MultiPileProjectReference) {
  return (
    !isBlank(reference.title) ||
    !isBlank(reference.revision) ||
    !isBlank(reference.issueDate) ||
    !isBlank(reference.documentNumber)
  );
}

function formatProjectReferenceSource(reference: MultiPileProjectReference, index: number) {
  const label =
    reference.title.trim() ||
    reference.documentNumber.trim() ||
    reference.referenceId.trim() ||
    reference.documentType;
  return `Project reference ${index + 1} · ${label}`;
}

function referenceValue(
  reference: MultiPileProjectReference | undefined,
  key: keyof Pick<MultiPileProjectReference, 'title' | 'documentNumber' | 'documentType'>,
) {
  return reference?.[key] ?? '';
}

function isUnsetReferenceDocumentType(value: string) {
  const normalized = value.trim();
  return normalized.length === 0 || normalized === 'Other';
}

function isBlankOrDefaultReportTitle(value: string) {
  const normalized = value.trim();
  return normalized.length === 0 || normalized === 'Project Design Justification';
}

function hasSuggestionForField(suggestions: AssistantSuggestedField[], fieldPath: string) {
  return suggestions.some((entry) => entry.fieldPath === fieldPath);
}

function selectBestProjectSummaryCandidate(
  documents: Array<AssistantDocumentSuggestionSource | null>,
) {
  for (const document of documents) {
    if (!document) {
      continue;
    }

    const value = getNestedString(objectValue(document.resultJson), ['projectSummary', 'value']);
    if (value) {
      return {
        filename: document.filename,
        value,
      };
    }
  }

  return null;
}

function selectBestSiteAddressCandidate(
  documents: Array<AssistantDocumentSuggestionSource | null>,
) {
  for (const document of documents) {
    if (!document) {
      continue;
    }

    const value = getNestedString(objectValue(document.resultJson), [
      'reportMetadata',
      'siteAddress',
      'value',
    ]);
    if (value) {
      return {
        filename: document.filename,
        value,
      };
    }
  }

  return null;
}

function resolveProjectDetailDraftActionType(fieldKey: string) {
  if (!Object.hasOwn(PROJECT_DETAIL_DRAFT_ACTION_TYPE_BY_FIELD, fieldKey)) {
    return null;
  }

  return PROJECT_DETAIL_DRAFT_ACTION_TYPE_BY_FIELD[
    fieldKey as keyof typeof PROJECT_DETAIL_DRAFT_ACTION_TYPE_BY_FIELD
  ];
}

function getFindingValues(record: Record<string, unknown>, path: [string, string]) {
  return arrayValue(objectValue(record[path[0]])[path[1]])
    .map((entry) => getNestedString(objectValue(entry), ['value']))
    .filter((value): value is string => Boolean(value));
}

function selectSocketAssumptionFindings(values: string[]) {
  return values.filter((value) => isSocketAssumptionFinding(value));
}

function isSocketAssumptionFinding(value: string) {
  const normalized = value.toLowerCase();
  return (
    containsAny(normalized, ['socket', 'embedment', 'embedded', 'embed']) ||
    (containsAny(normalized, ['rock']) &&
      containsAny(normalized, ['pile', 'founding', 'found', 'bored', 'cfa'])) ||
    (containsAny(normalized, ['shaft']) && containsAny(normalized, ['pile', 'rock']))
  );
}

function looksLikePurposeStyleNote(value: string) {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 180) {
    return false;
  }

  return containsAny(normalized, [
    'issue',
    'for review',
    'for tender',
    'for construction',
    'for pricing',
    'for approval',
    'for submission',
    'preliminary',
    'concept',
    'detailed design',
    'ifa',
    'ifc',
  ]);
}

function joinFindings(values: Array<string | null>, limit: number) {
  return uniqueNormalizedStrings(values).slice(0, limit).join('\n');
}

function buildFoundingSuggestion(record: Record<string, unknown>) {
  return joinFindings(
    selectFoundingFindings([
      ...getFindingValues(record, ['geotechnicalBasis', 'foundingNotes']),
      ...getFindingValues(record, ['geotechnicalBasis', 'footingRecommendations']),
      ...getFindingValues(record, ['reportSections', 'shallowFoundations']),
    ]),
    3,
  );
}

function buildGroundwaterDesignNoteSuggestion(record: Record<string, unknown>) {
  const constructionImplications = uniqueNormalizedStrings([
    ...getFindingValues(record, ['groundwater', 'constructionImplications']),
    ...selectGroundwaterConstructionFindings([
      ...getFindingValues(record, ['geotechnicalBasis', 'foundingNotes']),
      ...getFindingValues(record, ['geotechnicalBasis', 'groundwaterDesignAssumptions']),
      ...getFindingValues(record, ['reportSections', 'deepFoundations']),
      ...getFindingValues(record, ['reportSections', 'shallowFoundations']),
    ]),
  ]);
  const structuredGroundwater = joinSuggestionSections([
    formatSuggestionSection(
      'Observed groundwater',
      getFindingValues(record, ['groundwater', 'observedConditions']),
      2,
    ),
    formatSuggestionSection(
      'Groundwater uncertainty / monitoring',
      getFindingValues(record, ['groundwater', 'uncertaintyAndMonitoring']),
      2,
    ),
    formatSuggestionSection('Groundwater construction implications', constructionImplications, 2),
  ]);

  if (structuredGroundwater) {
    return structuredGroundwater;
  }

  return joinFindings(
    [
      ...getFindingValues(record, ['geotechnicalBasis', 'groundwaterDesignAssumptions']),
      ...getFindingValues(record, ['geotechnicalBasis', 'groundwaterNotes']),
    ],
    2,
  );
}

function buildProjectGeotechnicalCommentarySuggestion(record: Record<string, unknown>) {
  const structuredCommentary = joinSuggestionSections([
    formatSuggestionSection(
      'Site-wide interpretation',
      [getNestedString(record, ['groundModel', 'siteWideInterpretation', 'value'])],
      1,
    ),
    formatSuggestionSection(
      'Site classification',
      [
        buildSiteClassificationSummary(record),
        ...getFindingValues(record, ['reportSections', 'siteClassification']),
      ],
      1,
    ),
    formatSuggestionSection(
      'Working platform',
      getFindingValues(record, ['reportSections', 'workingPlatform']),
      1,
    ),
    formatSuggestionSection('Limitations', getLimitationValues(record), 2),
  ]);

  if (structuredCommentary) {
    return structuredCommentary;
  }

  return joinFindings(
    [
      ...getFindingValues(record, ['geotechnicalBasis', 'pileRecommendations']),
      ...getFindingValues(record, ['geotechnicalBasis', 'furtherInvestigationNotes']),
      getNestedString(record, ['projectSummary', 'value']),
    ],
    2,
  );
}

function buildSocketAssumptionsSuggestion(record: Record<string, unknown>) {
  return joinFindings(
    selectSocketAssumptionFindings([
      ...getFindingValues(record, ['pileConstruction', 'designVerificationNotes']),
      ...getFindingValues(record, ['pileConstruction', 'constructionControls']),
      ...getFindingValues(record, ['geotechnicalBasis', 'pileRecommendations']),
      ...getFindingValues(record, ['geotechnicalBasis', 'rockStrataDesignParameters']),
      ...getFindingValues(record, ['geotechnicalBasis', 'foundingNotes']),
    ]),
    3,
  );
}

function buildSiteClassificationSummary(record: Record<string, unknown>) {
  const classification = getNestedString(record, [
    'siteClassificationResult',
    'classification',
    'value',
  ]);
  const estimatedGroundMovement = getNestedString(record, [
    'siteClassificationResult',
    'estimatedGroundMovement',
    'value',
  ]);
  if (classification && estimatedGroundMovement) {
    return `${classification} with estimated ground movement ${estimatedGroundMovement}.`;
  }
  return classification || estimatedGroundMovement || null;
}

function getLimitationValues(record: Record<string, unknown>) {
  return uniqueNormalizedStrings([
    ...getFindingValues(record, ['reportSections', 'limitations']),
    ...getFindingValues(record, ['investigationBasis', 'confidenceLimitations']),
  ]);
}

function formatSuggestionSection(
  label: string,
  values: Array<string | null | undefined>,
  limit: number,
) {
  const lines = uniqueNormalizedStrings(values).slice(0, limit);
  if (lines.length === 0) {
    return null;
  }
  return `${label}:\n${lines.join('\n')}`;
}

function joinSuggestionSections(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value && value.trim())).join('\n\n');
}

function selectFoundingFindings(values: string[]) {
  return uniqueNormalizedStrings(
    values.filter((value) => {
      const normalized = value.toLowerCase();
      if (
        containsAny(normalized, [
          'groundwater',
          'perched water',
          'drilling fluids',
          'monitoring',
          'standpipes',
          'piezometers',
        ])
      ) {
        return false;
      }
      return containsAny(normalized, [
        'footing',
        'bearing',
        'founding',
        'found',
        'toe of any cutting',
        'cutting',
        'moisture condition',
        'ground movement',
      ]);
    }),
  );
}

function selectGroundwaterConstructionFindings(values: string[]) {
  return values.filter((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes('groundwater') &&
      containsAny(normalized, ['excavat', 'pile', 'footing', 'service', 'encounter'])
    );
  });
}

function shouldSuggestProjectCfaUplift(projectSpecifics: MultiPileProjectSpecifics) {
  return (
    projectSpecifics.geotechnicalBasis.cfaUpliftMode === 'manual-entry' &&
    Math.abs(projectSpecifics.geotechnicalBasis.cfaUpliftFactor - 0.7) < 0.0001
  );
}

function extractUpliftCompressionRatio(values: string[]) {
  for (const value of values) {
    const normalized = value.toLowerCase().replace(/(\d)\s+(\d)\s*%/g, '$1$2%');
    if (
      !containsAny(normalized, ['tension', 'uplift']) ||
      !containsAny(normalized, ['compression', 'friction'])
    ) {
      continue;
    }

    const decimalMatch =
      normalized.match(/(\d+(?:\.\d+)?)\s*(?:of|x|times)\s*(?:the\s+)?compression/) ??
      normalized.match(/(\d+(?:\.\d+)?)\s*(?:of|x|times)\s*(?:the\s+)?compression friction/) ??
      normalized.match(
        /(\d+(?:\.\d+)?)\s*(?:of|x|times)\s*(?:the\s+)?friction(?:al)? capacity[^.]*compression/,
      );
    if (decimalMatch) {
      const numeric = Number(decimalMatch[1]);
      if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1) {
        return numeric;
      }
    }

    const percentMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|for)?.*compression/);
    if (percentMatch) {
      const numeric = Number(percentMatch[1]);
      if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 100) {
        return numeric / 100;
      }
    }
  }

  return null;
}

function selectParameterTableCandidates(record: Record<string, unknown>, limit: number) {
  const tables = arrayValue(record.geotechnicalParameterTables).map(objectValue);
  const candidates: ProjectGeotechnicalMaterialCandidate[] = [];

  for (const table of tables) {
    const tableLabel = stringValue(table.tableLabel) || 'Extracted parameter table';
    const pageLabel = stringValue(table.pageLabel) || '';
    const tableType = stringValue(table.tableType);
    const rows = arrayValue(table.rows).map(objectValue);

    for (const row of rows) {
      const candidateRow = {
        rowLabel: stringValue(row.rowLabel),
        unitCode: stringValue(row.unitCode),
        unitDescription: stringValue(row.unitDescription),
        foundingStrata: stringValue(row.foundingStrata),
        unitWeightBulkKNm3: numberValue(row.unitWeightBulkKNm3),
        frictionAngleDeg: numberValue(row.frictionAngleDeg),
        cohesionKPa: numberValue(row.cohesionKPa),
        undrainedShearStrengthKPa: numberValue(row.undrainedShearStrengthKPa),
        modulusMPa: numberValue(row.modulusMPa),
        poissonRatio: numberValue(row.poissonRatio),
        Ka: numberValue(row.Ka),
        Ko: numberValue(row.Ko),
        Kp: numberValue(row.Kp),
        shaftAdhesionCompressionUltimateKPa: numberValue(row.shaftAdhesionCompressionUltimateKPa),
        shaftAdhesionCompressionAllowableKPa: numberValue(row.shaftAdhesionCompressionAllowableKPa),
        shaftAdhesionTensionUltimateKPa: numberValue(row.shaftAdhesionTensionUltimateKPa),
        endBearingUltimateKPa: numberValue(row.endBearingUltimateKPa),
        endBearingAllowableKPa: numberValue(row.endBearingAllowableKPa),
        notes: stringValue(row.notes),
      };
      if (!hasReportParameterValue(candidateRow) || !hasMeaningfulMaterialIdentity(candidateRow)) {
        continue;
      }

      const candidate: ProjectGeotechnicalMaterialCandidate = {
        tableLabel,
        pageLabel,
        row: candidateRow,
        score: scoreParameterTableRow(candidateRow, tableType, tableLabel),
      };

      if (candidate.score > 0) {
        candidates.push(candidate);
      }
    }
  }

  const seenKeys = new Set<string>();
  return candidates
    .sort((left, right) => right.score - left.score)
    .filter((candidate) => {
      const key = [
        candidate.row.unitCode,
        candidate.row.unitDescription,
        candidate.row.rowLabel,
        candidate.tableLabel,
      ]
        .map((value) => value.trim().toLowerCase())
        .join('::');
      if (seenKeys.has(key)) {
        return false;
      }
      seenKeys.add(key);
      return true;
    })
    .slice(0, limit);
}

function scoreParameterTableRow(
  row: ProjectGeotechnicalMaterialCandidate['row'],
  tableType: string,
  tableLabel: string,
) {
  const numericFields = [
    'unitWeightBulkKNm3',
    'frictionAngleDeg',
    'cohesionKPa',
    'undrainedShearStrengthKPa',
    'modulusMPa',
    'poissonRatio',
    'Ka',
    'Ko',
    'Kp',
    'shaftAdhesionCompressionUltimateKPa',
    'shaftAdhesionCompressionAllowableKPa',
    'shaftAdhesionTensionUltimateKPa',
    'endBearingUltimateKPa',
    'endBearingAllowableKPa',
  ] as const;

  const descriptorBoost =
    (cleanMaterialIdentityValue(row.unitCode).length > 0 ? 1 : 0) +
    (cleanMaterialIdentityValue(row.unitDescription).length > 0 ? 2 : 0) +
    (cleanMaterialIdentityValue(row.rowLabel).length > 0 ? 1 : 0);
  const tableTypeBoost =
    tableType === 'PILE_FOUNDING_PARAMETERS'
      ? 4
      : tableType === 'GEOLOGICAL_UNIT_PARAMETERS'
        ? 2
        : 0;
  const normalizedTableLabel = tableLabel.toLowerCase();
  const requestedTableBoost =
    normalizedTableLabel.includes('table 10') ||
    normalizedTableLabel.includes('foundation design') ||
    (normalizedTableLabel.includes('table 7') && normalizedTableLabel.includes('shoring'))
      ? 4
      : 0;
  return (
    numericFields.filter((field) => row[field] != null).length +
    descriptorBoost +
    tableTypeBoost +
    requestedTableBoost
  );
}

function hasPileDesignValue(row: ProjectGeotechnicalMaterialCandidate['row']) {
  return (
    row.shaftAdhesionCompressionUltimateKPa != null ||
    row.shaftAdhesionCompressionAllowableKPa != null ||
    row.shaftAdhesionTensionUltimateKPa != null ||
    row.endBearingUltimateKPa != null ||
    row.endBearingAllowableKPa != null
  );
}

function hasReportParameterValue(row: ProjectGeotechnicalMaterialCandidate['row']) {
  return (
    hasPileDesignValue(row) ||
    row.unitWeightBulkKNm3 != null ||
    row.frictionAngleDeg != null ||
    row.cohesionKPa != null ||
    row.undrainedShearStrengthKPa != null ||
    row.modulusMPa != null ||
    row.poissonRatio != null ||
    row.Ka != null ||
    row.Ko != null ||
    row.Kp != null
  );
}

function buildMaterialCandidateNotes(candidate: ProjectGeotechnicalMaterialCandidate) {
  return joinFindings(
    [
      candidate.row.notes,
      isCombinedClassCandidate(candidate)
        ? `Combined class row preserved from ${candidate.tableLabel}: ${resolveCandidateRowLabel(candidate)}. Review before applying these values to individual class rows.`
        : null,
    ],
    3,
  );
}

function isCombinedClassCandidate(candidate: ProjectGeotechnicalMaterialCandidate) {
  return /\bclass\s+[ivx]+-[ivx]+\b/i.test(resolveCandidateRowLabel(candidate));
}

function resolveCandidateRowLabel(candidate: ProjectGeotechnicalMaterialCandidate) {
  return (
    candidate.row.rowLabel ||
    candidate.row.unitDescription ||
    candidate.row.foundingStrata ||
    candidate.row.unitCode ||
    'extracted material row'
  );
}

function hasMeaningfulMaterialIdentity(row: ProjectGeotechnicalMaterialCandidate['row']) {
  return (
    cleanMaterialIdentityValue(row.unitCode).length > 0 ||
    cleanMaterialIdentityValue(row.unitDescription).length > 0 ||
    cleanMaterialIdentityValue(row.rowLabel).length > 0 ||
    cleanMaterialIdentityValue(row.foundingStrata).length > 0
  );
}

function cleanMaterialIdentityValue(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  if (!normalized || /^geo_[a-z0-9]+$/i.test(normalized)) {
    return '';
  }
  return normalized;
}

function buildProjectGeotechnicalMaterialCandidateFieldPath(
  candidateIndex: number,
  fieldName:
    | 'unitCode'
    | 'displayName'
    | 'sourceDocument'
    | 'sourceProject'
    | 'sourceSite'
    | 'sourceSection'
    | 'sourceTable'
    | 'notes'
    | 'gamma_b'
    | 'phi_prime'
    | 'c_prime'
    | 'cu'
    | 'E_MPa'
    | 'nu'
    | 'Ka'
    | 'Ko'
    | 'Kp'
    | 'pile_fms_comp_kPa'
    | 'pile_fms_allow_kPa'
    | 'pile_fms_tension_kPa'
    | 'pile_fb_ult_kPa'
    | 'pile_fb_allow_kPa'
    | 'cfaUpliftTensionFactor',
) {
  return `geotechnicalMaterials.candidates[${candidateIndex}].${fieldName}`;
}

function addProjectGeotechnicalMaterialCandidateNumericSuggestion({
  suggestedFields,
  fieldPath,
  label,
  numericValue,
  sourceSummary,
  rationale,
}: {
  suggestedFields: AssistantSuggestedField[];
  fieldPath: string;
  label: string;
  numericValue: number | null;
  sourceSummary: string;
  rationale: string;
}) {
  if (numericValue == null) {
    return;
  }

  pushSuggestion(suggestedFields, {
    fieldPath,
    label,
    suggestedValue: formatNumeric(numericValue),
    sourceType: 'report_derived',
    sourceSummary,
    rationale,
    confidence: 0.94,
    applyMode: 'replace',
  });
}

function pushSuggestionIfBlank(
  suggestions: AssistantSuggestedField[],
  currentValue: string | null | undefined,
  suggestion: AssistantSuggestedField & { suggestedValue: string | null },
) {
  if (!isBlank(currentValue)) {
    return;
  }
  pushSuggestion(suggestions, suggestion);
}

function pushSuggestion(
  suggestions: AssistantSuggestedField[],
  suggestion: AssistantSuggestedField & { suggestedValue: string | null },
) {
  const normalizedValue = suggestion.suggestedValue?.trim() ?? '';
  if (!normalizedValue) {
    return;
  }

  if (
    suggestions.some(
      (entry) =>
        entry.fieldPath === suggestion.fieldPath && entry.suggestedValue === normalizedValue,
    )
  ) {
    return;
  }

  suggestions.push({
    ...suggestion,
    suggestedValue: normalizedValue,
  });
}

function buildPileTypeDisplayLabel(pileType: MultiPilePileTypeDefinition) {
  const diameterMm = resolvePileTypeDiameterMm(pileType);
  if (!diameterMm) {
    return null;
  }
  return `${pileType.id} (${diameterMm} mm)`;
}

function resolvePileTypeDiameterMm(pileType: MultiPilePileTypeDefinition) {
  if (pileType.useCustom && pileType.customMm > 0) {
    return Math.round(pileType.customMm);
  }

  const preset = Number(pileType.sizePreset);
  if (Number.isFinite(preset) && preset > 0) {
    return Math.round(preset);
  }

  if (pileType.nominalDiameterMm > 0) {
    return Math.round(pileType.nominalDiameterMm);
  }

  return pileType.Dmm > 0 ? Math.round(pileType.Dmm) : null;
}

function deriveEnvelopeSnapshotState(
  multiPileState: Pick<
    MultiPileState,
    | 'combinationSettings'
    | 'pileTypes'
    | 'joints'
    | 'loadPatterns'
    | 'jointLoads'
    | 'combinationLibrary'
    | 'selectedCombinations'
    | 'uiState'
  >,
  latestEnvelopeRun: MultiPileEnvelopeRunSummary | null,
) {
  if (!latestEnvelopeRun) {
    return 'missing' as const;
  }
  if (latestEnvelopeRun.status !== 'completed' || !latestEnvelopeRun.envelope) {
    return 'failed' as const;
  }

  const currentInputSignature = buildMultiPileEnvelopeInputSignature(multiPileState);
  const lastRunInputSignature = getNestedString(objectValue(multiPileState.uiState), [
    'envelope',
    'lastRunInputSignature',
  ]);
  if (!lastRunInputSignature || lastRunInputSignature !== currentInputSignature) {
    return 'stale' as const;
  }

  return 'ready' as const;
}

function deriveJointEnvelopeExtremes(
  latestEnvelopeRun: MultiPileEnvelopeRunSummary | null,
  jointId: string,
) {
  const row =
    latestEnvelopeRun?.envelope?.jointResults.find((candidate) => candidate.jointId === jointId) ??
    null;
  if (!row) {
    return null;
  }

  return {
    maxCompression: Math.max(row.nMax.value, 0),
    maxTension: Math.abs(Math.min(row.nMin.value, 0)),
  };
}

function findSuggestedPileTypeForEnvelopeExtremes(
  pileTypes: readonly MultiPilePileTypeDefinition[],
  extremes: { maxCompression: number; maxTension: number } | null,
) {
  if (!extremes) {
    return null;
  }

  return (
    pileTypes
      .filter((pileType) => {
        if (!pileType.active || pileType.id === MULTI_PILE_UNASSIGNED_PILE_TYPE_ID) {
          return false;
        }

        const hasCompressionBounds =
          pileType.compressionUltimateMin != null || pileType.compressionUltimateMax != null;
        const hasTensionBounds =
          pileType.tensionUltimateMin != null || pileType.tensionUltimateMax != null;
        if (!hasCompressionBounds || !hasTensionBounds) {
          return false;
        }

        return (
          withinUltimateRange(
            extremes.maxCompression,
            pileType.compressionUltimateMin,
            pileType.compressionUltimateMax,
          ) &&
          withinUltimateRange(
            extremes.maxTension,
            pileType.tensionUltimateMin,
            pileType.tensionUltimateMax,
          )
        );
      })
      .slice()
      .sort((left, right) => {
        const sizeDelta = pileTypeSizeForOrdering(left) - pileTypeSizeForOrdering(right);
        if (Math.abs(sizeDelta) > 1e-9) {
          return sizeDelta;
        }

        return left.id.localeCompare(right.id);
      })[0] ?? null
  );
}

function withinUltimateRange(value: number, min: number | null, max: number | null) {
  if (min != null && value < min) {
    return false;
  }
  if (max != null && value > max) {
    return false;
  }
  return true;
}

function pileTypeSizeForOrdering(
  pileType: Pick<
    MultiPilePileTypeDefinition,
    'sizePreset' | 'useCustom' | 'customMm' | 'nominalDiameterMm'
  >,
) {
  if (pileType.useCustom && pileType.customMm > 0) {
    return pileType.customMm;
  }

  const presetSize = Number(pileType.sizePreset);
  if (Number.isFinite(presetSize) && presetSize > 0) {
    return presetSize;
  }

  return pileType.nominalDiameterMm > 0 ? pileType.nominalDiameterMm : 0;
}

function uniqueNormalizedStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim() ?? '').filter((value) => value.length > 0)),
  );
}

function formatNumeric(value: number) {
  const rounded = Number(value.toFixed(3));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function isBlank(value: string | null | undefined) {
  return (value?.trim() ?? '').length === 0;
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getNestedString(record: Record<string, unknown>, path: string[]) {
  let current: unknown = record;
  for (const key of path) {
    const nextRecord = objectValue(current);
    if (!(key in nextRecord)) {
      return null;
    }
    current = nextRecord[key];
  }

  const value = stringValue(current);
  return value.length > 0 ? value : null;
}
