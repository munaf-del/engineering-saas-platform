import type { MultiPileProjectReference } from '@eng/shared';
import type { AiDocument } from '@/features/ai/types';
import { normalizeAiEngineeringReportExtraction } from '@/features/ai/types';
import type {
  ProjectWasteClassificationAssAutofillResult,
  ProjectWasteClassificationDraftSuggestion,
  ProjectWasteClassificationDraftSuggestionField,
  ProjectWasteClassificationMaterialPathway,
  ProjectWasteClassificationReport,
  ProjectWasteClassificationReportRootInput,
} from './waste-classification-types';

type DraftSuggestionContext = {
  report: ProjectWasteClassificationReport;
  projectReferences: MultiPileProjectReference[];
  aiDocuments: AiDocument[];
};

const ROOT_FIELD_LABELS: Record<ProjectWasteClassificationDraftSuggestionField, string> = {
  wasteStreamName: 'Waste stream name',
  wasteSourceOrigin: 'Waste source / origin',
  wasteDescription: 'Waste description',
  samplingDate: 'Sampling date',
  executiveSummary: 'Executive summary',
  finalClassificationReasoning: 'Final classification reasoning',
  managementRecommendation: 'Management recommendation',
};

export function buildWasteClassificationDraftSuggestions({
  report,
  projectReferences,
  aiDocuments,
}: DraftSuggestionContext): ProjectWasteClassificationDraftSuggestion[] {
  const suggestions: ProjectWasteClassificationDraftSuggestion[] = [];
  const seen = new Set<string>();
  const linkedProjectReferences = report.references
    .filter((reference) => reference.projectReferenceId)
    .map((reference) => {
      const projectReference = projectReferences.find(
        (entry) => entry.id === reference.projectReferenceId,
      );
      return projectReference
        ? {
            reportReferenceTitle: reference.title,
            projectReference,
          }
        : null;
    })
    .filter(Boolean) as Array<{
    reportReferenceTitle: string;
    projectReference: MultiPileProjectReference;
  }>;

  for (const linkedReference of linkedProjectReferences) {
    const value = normalizeWhitespace(
      linkedReference.projectReference.notes ||
        linkedReference.projectReference.title ||
        linkedReference.projectReference.documentNumber,
    );
    if (!value) {
      continue;
    }

    pushSuggestion(suggestions, seen, {
      field: 'wasteSourceOrigin',
      label: ROOT_FIELD_LABELS.wasteSourceOrigin,
      suggestedValue: value,
      sourceType: 'project_reference',
      sourceLabel: linkedReference.reportReferenceTitle,
      rationale: 'Derived from the linked project reference note or title.',
    });
  }

  const linkedAiDocuments = report.references
    .filter((reference) => reference.aiDocumentId)
    .map((reference) => {
      const aiDocument = aiDocuments.find((entry) => entry.id === reference.aiDocumentId);
      return aiDocument
        ? {
            reportReferenceTitle: reference.title,
            aiDocument,
          }
        : null;
    })
    .filter(Boolean) as Array<{
    reportReferenceTitle: string;
    aiDocument: AiDocument;
  }>;

  for (const linkedDocument of linkedAiDocuments) {
    const extraction = normalizeAiEngineeringReportExtraction(
      linkedDocument.aiDocument.extractionRuns[0]?.resultJson,
    );
    if (!extraction) {
      continue;
    }

    const firstMaterialMention =
      extraction.reportSections.fillMaterials[0]?.value ||
      extraction.geotechnicalBasis.materialMentions[0]?.value ||
      extraction.projectSummary.value ||
      null;

    if (firstMaterialMention) {
      pushSuggestion(suggestions, seen, {
        field: 'wasteDescription',
        label: ROOT_FIELD_LABELS.wasteDescription,
        suggestedValue: normalizeWhitespace(firstMaterialMention),
        sourceType: 'ai_document',
        sourceLabel: linkedDocument.reportReferenceTitle,
        rationale: 'Derived from linked AI report extraction for material or fill descriptions.',
      });
    }

    if (extraction.projectSummary.value) {
      pushSuggestion(suggestions, seen, {
        field: 'executiveSummary',
        label: ROOT_FIELD_LABELS.executiveSummary,
        suggestedValue: normalizeWhitespace(extraction.projectSummary.value),
        sourceType: 'ai_document',
        sourceLabel: linkedDocument.reportReferenceTitle,
        rationale: 'Derived from the linked AI report project / site context summary.',
      });
    }

    const streamName =
      extraction.reportTitle.value ||
      extraction.reportMetadata.documentTitle.value ||
      linkedDocument.aiDocument.filename;
    if (streamName) {
      pushSuggestion(suggestions, seen, {
        field: 'wasteStreamName',
        label: ROOT_FIELD_LABELS.wasteStreamName,
        suggestedValue: normalizeWhitespace(streamName),
        sourceType: 'ai_document',
        sourceLabel: linkedDocument.reportReferenceTitle,
        rationale: 'Derived from the linked AI report title or filename.',
      });
    }

    const samplingDate =
      normalizeDateValue(extraction.investigationBasis.fieldworkDates.value) ||
      normalizeDateValue(extraction.reportMetadata.dateIssued.value);
    if (samplingDate) {
      pushSuggestion(suggestions, seen, {
        field: 'samplingDate',
        label: ROOT_FIELD_LABELS.samplingDate,
        suggestedValue: samplingDate,
        sourceType: 'ai_document',
        sourceLabel: linkedDocument.reportReferenceTitle,
        rationale: 'Derived from the linked AI report fieldwork or issue date extraction.',
      });
    }
  }

  if (report.labResults.length > 0) {
    const contaminantList = report.labResults
      .map((row) => row.contaminant.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join(', ');
    const helperText = [
      `Step 5 evidence currently includes ${report.labResults.length} lab result row${report.labResults.length === 1 ? '' : 's'}`,
      contaminantList ? `for ${contaminantList}` : null,
      '. Record how the SCC / TCLP results compare with the cited NSW EPA threshold references and how that supports the adopted waste class.',
    ]
      .filter(Boolean)
      .join('');

    pushSuggestion(suggestions, seen, {
      field: 'finalClassificationReasoning',
      label: ROOT_FIELD_LABELS.finalClassificationReasoning,
      suggestedValue: helperText,
      sourceType: 'lab_result',
      sourceLabel: 'Lab / chemical assessment table',
      rationale:
        'Derived from the current lab result rows and Step 5 evidence already linked to the report.',
    });
  }

  return suggestions.slice(0, 8);
}

export function applyWasteClassificationDraftSuggestion(
  draft: ProjectWasteClassificationReportRootInput,
  suggestion: ProjectWasteClassificationDraftSuggestion,
): ProjectWasteClassificationReportRootInput {
  const currentValue = draft[suggestion.field];

  if (suggestion.field === 'samplingDate') {
    return {
      ...draft,
      samplingDate: suggestion.suggestedValue,
    };
  }

  const nextValue =
    typeof currentValue === 'string' && currentValue.trim().length > 0
      ? appendIfMissing(currentValue, suggestion.suggestedValue)
      : suggestion.suggestedValue;

  return {
    ...draft,
    [suggestion.field]: nextValue,
  };
}

export function applyAssAutofillResultToPathway(
  pathway: ProjectWasteClassificationMaterialPathway,
  result: ProjectWasteClassificationAssAutofillResult,
): ProjectWasteClassificationMaterialPathway {
  return {
    ...pathway,
    assClass: result.assClass,
    assClassSource: result.assClassSource,
    projectLocationNote: result.projectLocationNote
      ? pathway.projectLocationNote?.trim()
        ? appendIfMissing(
            pathway.projectLocationNote,
            `Autofill note: ${result.projectLocationNote}`,
          )
        : result.projectLocationNote
      : pathway.projectLocationNote,
  };
}

function pushSuggestion(
  collection: ProjectWasteClassificationDraftSuggestion[],
  seen: Set<string>,
  suggestion: Omit<ProjectWasteClassificationDraftSuggestion, 'id'>,
) {
  const normalizedValue = normalizeWhitespace(suggestion.suggestedValue);
  if (!normalizedValue) {
    return;
  }

  const key = `${suggestion.field}:${normalizedValue}:${suggestion.sourceLabel}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  collection.push({
    ...suggestion,
    id: `draft-suggestion-${seen.size}`,
    suggestedValue: normalizedValue,
  });
}

function normalizeWhitespace(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function normalizeDateValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function appendIfMissing(currentValue: string, nextValue: string) {
  if (currentValue.includes(nextValue)) {
    return currentValue;
  }
  return `${currentValue.trim()}\n\n${nextValue}`.trim();
}
