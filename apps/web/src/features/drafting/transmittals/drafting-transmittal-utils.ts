import type {
  DraftingDrawingSheetIssue,
  DraftingDrawingTransmittal,
  DraftingDrawingTransmittalStatus,
  DraftingModel,
  DraftingTransmittalEvidenceSource,
} from '@eng/shared';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import {
  buildDraftingDrawingSheetIssueManifest,
  compareDraftingDrawingSheetIssue,
} from '../sheets/drafting-drawing-sheet-issue-utils';

export type DraftingTransmittalInput = {
  allowExistingDuplicateNumber?: boolean;
  cc?: string[];
  id: string;
  includedDrawingSheetIssueIds: string[];
  issueDate?: string;
  issuedBy?: string;
  issuedTo?: string[];
  notes?: string;
  purpose: string;
  status?: DraftingDrawingTransmittalStatus;
  title: string;
  transmittalNumber: string;
};

export type DraftingTransmittalEvidenceInput = {
  artifactAttachedAt?: string;
  artifactAttachedBy?: string;
  artifactDocumentId: string;
  artifactFileName: string;
  artifactMimeType: string;
  artifactNotes?: string;
  artifactSizeBytes: number;
  artifactSource?: DraftingTransmittalEvidenceSource;
  artifactUploadedAt?: string;
  artifactUploadedBy?: string;
};

export type DraftingTransmittalManifest = {
  pdfEvidence: {
    artifactAttachedAt?: string;
    artifactAttachedBy?: string;
    artifactDocumentId?: string;
    artifactFileName?: string;
    artifactMimeType?: string;
    artifactNotes?: string;
    artifactSizeBytes?: number;
    artifactSource?: DraftingTransmittalEvidenceSource;
    artifactStatus?: DraftingDrawingTransmittal['artifactStatus'];
    artifactUploadedAt?: string;
    artifactUploadedBy?: string;
    artifactVersion?: number;
    evidenceSignature?: string;
    status: 'attached' | 'missing' | 'removed';
  };
  evidenceEvents: NonNullable<DraftingDrawingTransmittal['evidenceEvents']>;
  comparisonSummary: {
    hasDrift: boolean;
    issueWarnings: Array<{
      drawingSheetIssueId: string;
      messages: string[];
    }>;
  };
  createdAt: string;
  finalisation: {
    issueActionId?: string;
    issuedAt?: string;
    issuedBy: string;
    lastExportedAt?: string;
    lastExportedBy?: string;
    lockState: 'editable' | 'locked';
    manifestSignature?: string;
  };
  includedDrawingSheetIssueIds: string[];
  includedSheets: DraftingDrawingTransmittal['includedSheets'];
  issueManifests: Array<{
    comparison: ReturnType<typeof compareDraftingDrawingSheetIssue>;
    drawingSheetIssueId: string;
    issue: ReturnType<typeof buildDraftingDrawingSheetIssueManifest>['issue'];
    lockedTemplateMetadata: ReturnType<
      typeof buildDraftingDrawingSheetIssueManifest
    >['lockedTemplateMetadata'];
    lockedUnderlays: ReturnType<typeof buildDraftingDrawingSheetIssueManifest>['lockedUnderlays'];
    objectProvenanceSummary: Array<{
      label?: string;
      objectId: string;
      objectType: string;
      provenance?: Record<string, unknown>;
      scheduleKey?: string;
    }>;
    titleRevision: {
      lockedRevisionBlock: ReturnType<
        typeof buildDraftingDrawingSheetIssueManifest
      >['lockedRevisionBlock'];
      lockedTitleBlock: ReturnType<
        typeof buildDraftingDrawingSheetIssueManifest
      >['lockedTitleBlock'];
    };
  }>;
  manifestSignature?: string;
  manifestSchemaVersion: 'drafting.transmittal.manifest.v1';
  status: DraftingDrawingTransmittalStatus;
  transmittal: Omit<DraftingDrawingTransmittal, 'includedSheets'>;
  updatedAt: string;
};

export function getDrawingTransmittals(model: DraftingModel) {
  return model.drawingTransmittals ?? [];
}

export function getFrozenDrawingSheetIssues(model: DraftingModel) {
  return (model.drawingSheetIssues ?? []).filter(isFrozenDrawingSheetIssue);
}

export function createDraftingTransmittal(
  model: DraftingModel,
  input: DraftingTransmittalInput,
): DraftingDrawingTransmittal {
  if (input.status && input.status !== 'draft') {
    throw new Error('Create draft transmittals first, then use issue/finalise to lock them.');
  }
  if (!input.allowExistingDuplicateNumber) {
    assertTransmittalNumberAvailable(model, input.transmittalNumber, input.id);
  }
  const issueMap = new Map(getFrozenDrawingSheetIssues(model).map((issue) => [issue.id, issue]));
  const selectedIssues = unique(input.includedDrawingSheetIssueIds)
    .map((id) => issueMap.get(id))
    .filter((issue): issue is DraftingDrawingSheetIssue => Boolean(issue));

  if (selectedIssues.length === 0) {
    throw new Error('A transmittal requires at least one frozen drawing sheet issue snapshot.');
  }

  const now = input.issueDate ?? new Date().toISOString();
  return {
    id: input.id,
    transmittalNumber: input.transmittalNumber.trim(),
    title: input.title.trim(),
    purpose: input.purpose.trim(),
    status: input.status ?? 'draft',
    issueDate: now,
    issuedBy: input.issuedBy?.trim() ?? '',
    issuedTo: normalizePartyList(input.issuedTo),
    cc: normalizePartyList(input.cc),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    evidenceEvents: [],
    includedDrawingSheetIssueIds: selectedIssues.map((issue) => issue.id),
    includedSheets: selectedIssues.flatMap((issue) => mapIssueToTransmittalSheets(issue)),
    createdAt: now,
    updatedAt: now,
  };
}

export function addDrawingTransmittal(
  model: DraftingModel,
  transmittal: DraftingDrawingTransmittal,
): DraftingModel {
  return {
    ...model,
    drawingTransmittals: [...getDrawingTransmittals(model), transmittal],
  };
}

export function updateDraftingTransmittal(
  model: DraftingModel,
  transmittalId: string,
  input: Omit<DraftingTransmittalInput, 'id'>,
): DraftingModel {
  const existing = getDrawingTransmittals(model).find(
    (candidate) => candidate.id === transmittalId,
  );
  if (!existing) {
    return model;
  }
  if (!isDraftingTransmittalEditable(existing)) {
    throw new Error('Issued, superseded, void, and archived transmittals are locked.');
  }

  const updated = createDraftingTransmittal(model, {
    ...input,
    allowExistingDuplicateNumber:
      normalizeTransmittalNumber(existing.transmittalNumber) ===
      normalizeTransmittalNumber(input.transmittalNumber),
    id: existing.id,
    issueDate: input.issueDate ?? existing.issueDate,
  });

  return {
    ...model,
    drawingTransmittals: getDrawingTransmittals(model).map((candidate) =>
      candidate.id === transmittalId
        ? {
            ...updated,
            createdAt: existing.createdAt,
            issueActionId: existing.issueActionId,
            issuedAt: existing.issuedAt,
            lastExportedAt: existing.lastExportedAt,
            lastExportedBy: existing.lastExportedBy,
            manifestSignature: existing.manifestSignature,
            evidenceEvents: existing.evidenceEvents ?? [],
            updatedAt: new Date().toISOString(),
          }
        : candidate,
    ),
  };
}

export function issueDraftingTransmittal(args: {
  issuedAt?: string;
  issuedBy: string;
  model: DraftingModel;
  rootTemplatesById?: ReadonlyMap<string, RootSheetTemplate>;
  transmittalId: string;
}): DraftingModel {
  const transmittal = getDrawingTransmittals(args.model).find(
    (candidate) => candidate.id === args.transmittalId,
  );
  if (!transmittal) {
    return args.model;
  }
  if (!isDraftingTransmittalEditable(transmittal)) {
    throw new Error('Only draft transmittals can be issued.');
  }

  const issuedAt = args.issuedAt ?? new Date().toISOString();
  const issuedBy = args.issuedBy.trim() || transmittal.issuedBy;
  const issueActionId = `issue-${transmittal.id}-${compactTimestamp(issuedAt)}`;
  const baseIssuedTransmittal: DraftingDrawingTransmittal = {
    ...transmittal,
    issueActionId,
    issueDate: transmittal.issueDate,
    issuedAt,
    issuedBy,
    status: 'issued',
    updatedAt: issuedAt,
  };
  const manifest = buildDraftingTransmittalManifest({
    model: args.model,
    rootTemplatesById: args.rootTemplatesById,
    transmittal: baseIssuedTransmittal,
  });
  const issuedTransmittal = {
    ...baseIssuedTransmittal,
    manifestSignature: manifest.manifestSignature,
  };

  return replaceDrawingTransmittal(args.model, issuedTransmittal);
}

export function attachDraftingTransmittalPdfEvidence(args: {
  attachedAt?: string;
  attachedBy?: string;
  evidence: DraftingTransmittalEvidenceInput;
  model: DraftingModel;
  transmittalId: string;
}): DraftingModel {
  const transmittal = getDrawingTransmittals(args.model).find(
    (candidate) => candidate.id === args.transmittalId,
  );
  if (!transmittal) {
    return args.model;
  }
  assertCanAttachPdfEvidence(transmittal);

  const attachedAt =
    args.attachedAt ?? args.evidence.artifactAttachedAt ?? new Date().toISOString();
  const attachedBy = args.attachedBy ?? args.evidence.artifactAttachedBy;
  const previousEvents = transmittal.evidenceEvents ?? [];
  const previousVersion = transmittal.artifactVersion ?? 0;
  const action = transmittal.artifactDocumentId ? 'replaced' : 'attached';
  const nextVersion = previousVersion + 1;
  const evidenceSource = args.evidence.artifactSource ?? 'browser_print_pdf';
  const event = {
    id: `evidence-${transmittal.id}-${compactTimestamp(attachedAt)}-${nextVersion}`,
    action,
    at: attachedAt,
    by: attachedBy?.trim() || undefined,
    artifactDocumentId: args.evidence.artifactDocumentId,
    artifactFileName: args.evidence.artifactFileName.trim(),
    artifactNotes: args.evidence.artifactNotes?.trim() || undefined,
    artifactSource: evidenceSource,
  } satisfies NonNullable<DraftingDrawingTransmittal['evidenceEvents']>[number];

  const nextTransmittal: DraftingDrawingTransmittal = {
    ...transmittal,
    artifactAttachedAt: attachedAt,
    artifactAttachedBy: attachedBy?.trim() || undefined,
    artifactAddedAt: attachedAt,
    artifactAddedBy: attachedBy?.trim() || undefined,
    artifactDocumentId: args.evidence.artifactDocumentId,
    artifactFileName: args.evidence.artifactFileName.trim(),
    artifactMimeType: args.evidence.artifactMimeType,
    artifactNotes: args.evidence.artifactNotes?.trim() || undefined,
    artifactSizeBytes: args.evidence.artifactSizeBytes,
    artifactSource: evidenceSource,
    artifactStatus: action,
    artifactUploadedAt: args.evidence.artifactUploadedAt,
    artifactUploadedBy: args.evidence.artifactUploadedBy,
    artifactVersion: nextVersion,
    evidenceEvents: [...previousEvents, event],
    updatedAt: attachedAt,
  };

  return replaceDrawingTransmittal(args.model, {
    ...nextTransmittal,
    evidenceSignature: buildEvidenceSignature(nextTransmittal),
  });
}

export function removeDraftingTransmittalPdfEvidence(args: {
  removedAt?: string;
  removedBy?: string;
  notes?: string;
  model: DraftingModel;
  transmittalId: string;
}): DraftingModel {
  const transmittal = getDrawingTransmittals(args.model).find(
    (candidate) => candidate.id === args.transmittalId,
  );
  if (!transmittal) {
    return args.model;
  }
  assertCanAttachPdfEvidence(transmittal);
  if (!transmittal.artifactDocumentId && !transmittal.artifactFileName) {
    return args.model;
  }

  const removedAt = args.removedAt ?? new Date().toISOString();
  const nextVersion = (transmittal.artifactVersion ?? 0) + 1;
  const event = {
    id: `evidence-${transmittal.id}-${compactTimestamp(removedAt)}-${nextVersion}`,
    action: 'removed',
    at: removedAt,
    by: args.removedBy?.trim() || undefined,
    artifactDocumentId: transmittal.artifactDocumentId,
    artifactFileName: transmittal.artifactFileName,
    artifactNotes: args.notes?.trim() || transmittal.artifactNotes,
    artifactSource: transmittal.artifactSource ?? 'browser_print_pdf',
  } satisfies NonNullable<DraftingDrawingTransmittal['evidenceEvents']>[number];

  const nextTransmittal: DraftingDrawingTransmittal = {
    ...transmittal,
    artifactAttachedAt: undefined,
    artifactAttachedBy: undefined,
    artifactAddedAt: undefined,
    artifactAddedBy: undefined,
    artifactDocumentId: undefined,
    artifactFileName: undefined,
    artifactMimeType: undefined,
    artifactNotes: args.notes?.trim() || transmittal.artifactNotes,
    artifactSizeBytes: undefined,
    artifactSource: transmittal.artifactSource ?? 'browser_print_pdf',
    artifactStatus: 'removed',
    artifactUploadedAt: undefined,
    artifactUploadedBy: undefined,
    artifactVersion: nextVersion,
    evidenceEvents: [...(transmittal.evidenceEvents ?? []), event],
    updatedAt: removedAt,
  };

  return replaceDrawingTransmittal(args.model, {
    ...nextTransmittal,
    evidenceSignature: buildEvidenceSignature(nextTransmittal),
  });
}

export function duplicateDraftingTransmittalToDraft(args: {
  id: string;
  model: DraftingModel;
  sourceTransmittalId: string;
  transmittalNumber?: string;
}): DraftingModel {
  const source = getDrawingTransmittals(args.model).find(
    (candidate) => candidate.id === args.sourceTransmittalId,
  );
  if (!source) {
    return args.model;
  }

  const duplicate = createDraftingTransmittal(args.model, {
    cc: source.cc,
    id: args.id,
    includedDrawingSheetIssueIds: source.includedDrawingSheetIssueIds,
    issuedBy: source.issuedBy,
    issuedTo: source.issuedTo,
    notes: source.notes,
    purpose: source.purpose,
    status: 'draft',
    title: `${source.title} Copy`,
    transmittalNumber: args.transmittalNumber ?? suggestNextTransmittalNumber(args.model),
  });

  return addDrawingTransmittal(args.model, duplicate);
}

export function supersedeDraftingTransmittal(args: {
  by?: string;
  model: DraftingModel;
  supersededAt?: string;
  supersededByTransmittalId?: string;
  transmittalId: string;
}): DraftingModel {
  const transmittal = getDrawingTransmittals(args.model).find(
    (candidate) => candidate.id === args.transmittalId,
  );
  if (!transmittal) {
    return args.model;
  }
  if (transmittal.status !== 'issued') {
    throw new Error('Only issued transmittals can be superseded.');
  }
  const supersededAt = args.supersededAt ?? new Date().toISOString();
  return replaceDrawingTransmittal(args.model, {
    ...transmittal,
    status: 'superseded',
    supersededAt,
    supersededBy: args.by?.trim() || undefined,
    supersededByTransmittalId: args.supersededByTransmittalId,
    updatedAt: supersededAt,
  });
}

export function voidDraftingTransmittal(args: {
  by?: string;
  model: DraftingModel;
  reason?: string;
  transmittalId: string;
  voidedAt?: string;
}): DraftingModel {
  const transmittal = getDrawingTransmittals(args.model).find(
    (candidate) => candidate.id === args.transmittalId,
  );
  if (!transmittal) {
    return args.model;
  }
  if (transmittal.status !== 'issued') {
    throw new Error('Only issued transmittals can be voided.');
  }
  const voidedAt = args.voidedAt ?? new Date().toISOString();
  return replaceDrawingTransmittal(args.model, {
    ...transmittal,
    status: 'void',
    updatedAt: voidedAt,
    voidReason: args.reason?.trim() || 'Voided without reason recorded.',
    voidedAt,
    voidedBy: args.by?.trim() || undefined,
  });
}

export function recordDraftingTransmittalManifestExport(args: {
  exportedAt?: string;
  exportedBy?: string;
  model: DraftingModel;
  transmittalId: string;
}): DraftingModel {
  const transmittal = getDrawingTransmittals(args.model).find(
    (candidate) => candidate.id === args.transmittalId,
  );
  if (!transmittal) {
    return args.model;
  }
  const exportedAt = args.exportedAt ?? new Date().toISOString();
  return replaceDrawingTransmittal(args.model, {
    ...transmittal,
    lastExportedAt: exportedAt,
    lastExportedBy: args.exportedBy?.trim() || undefined,
    updatedAt: exportedAt,
  });
}

export function isDraftingTransmittalEditable(transmittal: DraftingDrawingTransmittal) {
  return transmittal.status === 'draft';
}

export function isDraftingTransmittalNumberActive(transmittal: DraftingDrawingTransmittal) {
  return !['void', 'archived'].includes(transmittal.status);
}

export function findDuplicateActiveTransmittalNumbers(model: DraftingModel) {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  getDrawingTransmittals(model)
    .filter(isDraftingTransmittalNumberActive)
    .forEach((transmittal) => {
      const number = normalizeTransmittalNumber(transmittal.transmittalNumber);
      const previous = seen.get(number);
      if (previous && previous !== transmittal.id) {
        duplicates.add(transmittal.transmittalNumber);
      }
      seen.set(number, transmittal.id);
    });
  return Array.from(duplicates);
}

export function suggestNextTransmittalNumber(model: DraftingModel) {
  const used = new Set(
    getDrawingTransmittals(model).map((transmittal) =>
      normalizeTransmittalNumber(transmittal.transmittalNumber),
    ),
  );
  let index = 1;
  while (used.has(normalizeTransmittalNumber(nextTransmittalNumber(index - 1)))) {
    index += 1;
  }
  return nextTransmittalNumber(index - 1);
}

export function assertTransmittalNumberAvailable(
  model: DraftingModel,
  transmittalNumber: string,
  transmittalId?: string,
) {
  const normalizedNumber = normalizeTransmittalNumber(transmittalNumber);
  const duplicate = getDrawingTransmittals(model).find(
    (candidate) =>
      candidate.id !== transmittalId &&
      isDraftingTransmittalNumberActive(candidate) &&
      normalizeTransmittalNumber(candidate.transmittalNumber) === normalizedNumber,
  );
  if (duplicate) {
    throw new Error('Active transmittal numbers must be unique within this drawing.');
  }
}

export function buildDraftingTransmittalManifest(args: {
  model: DraftingModel;
  rootTemplatesById?: ReadonlyMap<string, RootSheetTemplate>;
  transmittal: DraftingDrawingTransmittal;
}): DraftingTransmittalManifest {
  const issueMap = new Map((args.model.drawingSheetIssues ?? []).map((issue) => [issue.id, issue]));
  const issueManifests = args.transmittal.includedDrawingSheetIssueIds
    .map((issueId) => issueMap.get(issueId))
    .filter((issue): issue is DraftingDrawingSheetIssue => Boolean(issue))
    .map((issue) => {
      const manifest = buildDraftingDrawingSheetIssueManifest({
        issue,
        model: args.model,
        rootTemplatesById: args.rootTemplatesById,
      });

      return {
        comparison: manifest.comparison,
        drawingSheetIssueId: issue.id,
        issue: manifest.issue,
        lockedTemplateMetadata: manifest.lockedTemplateMetadata,
        lockedUnderlays: manifest.lockedUnderlays,
        objectProvenanceSummary: manifest.lockedObjects.map((object) => ({
          label: object.label,
          objectId: object.objectId,
          objectType: object.objectType,
          provenance: sanitizeManifestValue(object.provenance) as
            | Record<string, unknown>
            | undefined,
          scheduleKey: object.scheduleKey,
        })),
        titleRevision: {
          lockedRevisionBlock: manifest.lockedRevisionBlock,
          lockedTitleBlock: manifest.lockedTitleBlock,
        },
      };
    });

  const issueWarnings = buildDraftingTransmittalWarnings({
    model: args.model,
    rootTemplatesById: args.rootTemplatesById,
    transmittal: args.transmittal,
  }).filter((warning) => warning.messages.length > 0);

  const pdfEvidence = buildPdfEvidence(args.transmittal);
  const manifestWithoutSignature: DraftingTransmittalManifest = {
    comparisonSummary: {
      hasDrift: issueManifests.some((issue) => issue.comparison.hasDrift),
      issueWarnings,
    },
    createdAt: args.transmittal.createdAt,
    evidenceEvents: args.transmittal.evidenceEvents ?? [],
    finalisation: {
      issueActionId: args.transmittal.issueActionId,
      issuedAt: args.transmittal.issuedAt,
      issuedBy: args.transmittal.issuedBy,
      lastExportedAt: args.transmittal.lastExportedAt,
      lastExportedBy: args.transmittal.lastExportedBy,
      lockState: isDraftingTransmittalEditable(args.transmittal) ? 'editable' : 'locked',
      manifestSignature: args.transmittal.manifestSignature,
    },
    includedDrawingSheetIssueIds: args.transmittal.includedDrawingSheetIssueIds,
    includedSheets: args.transmittal.includedSheets,
    issueManifests,
    manifestSchemaVersion: 'drafting.transmittal.manifest.v1',
    pdfEvidence,
    status: args.transmittal.status,
    transmittal: {
      artifactAttachedAt: args.transmittal.artifactAttachedAt,
      artifactAttachedBy: args.transmittal.artifactAttachedBy,
      artifactDocumentId: args.transmittal.artifactDocumentId,
      artifactFileName: args.transmittal.artifactFileName,
      artifactMimeType: args.transmittal.artifactMimeType,
      artifactNotes: args.transmittal.artifactNotes,
      artifactSizeBytes: args.transmittal.artifactSizeBytes,
      artifactSource: args.transmittal.artifactSource,
      artifactStatus: args.transmittal.artifactStatus,
      artifactUploadedAt: args.transmittal.artifactUploadedAt,
      artifactUploadedBy: args.transmittal.artifactUploadedBy,
      artifactVersion: args.transmittal.artifactVersion,
      cc: args.transmittal.cc,
      createdAt: args.transmittal.createdAt,
      evidenceEvents: args.transmittal.evidenceEvents ?? [],
      evidenceSignature: args.transmittal.evidenceSignature,
      id: args.transmittal.id,
      includedDrawingSheetIssueIds: args.transmittal.includedDrawingSheetIssueIds,
      issueDate: args.transmittal.issueDate,
      issueActionId: args.transmittal.issueActionId,
      issuedAt: args.transmittal.issuedAt,
      issuedBy: args.transmittal.issuedBy,
      issuedTo: args.transmittal.issuedTo,
      lastExportedAt: args.transmittal.lastExportedAt,
      lastExportedBy: args.transmittal.lastExportedBy,
      manifestSignature: args.transmittal.manifestSignature,
      notes: args.transmittal.notes,
      purpose: args.transmittal.purpose,
      status: args.transmittal.status,
      supersededAt: args.transmittal.supersededAt,
      supersededBy: args.transmittal.supersededBy,
      supersededByTransmittalId: args.transmittal.supersededByTransmittalId,
      title: args.transmittal.title,
      transmittalNumber: args.transmittal.transmittalNumber,
      updatedAt: args.transmittal.updatedAt,
      voidReason: args.transmittal.voidReason,
      voidedAt: args.transmittal.voidedAt,
      voidedBy: args.transmittal.voidedBy,
    },
    updatedAt: args.transmittal.updatedAt,
  };
  const manifestSignature =
    args.transmittal.manifestSignature ??
    buildManifestSignature({
      ...manifestWithoutSignature,
      finalisation: {
        ...manifestWithoutSignature.finalisation,
        manifestSignature: undefined,
      },
      manifestSignature: undefined,
      transmittal: {
        ...manifestWithoutSignature.transmittal,
        manifestSignature: undefined,
      },
    });

  return {
    ...manifestWithoutSignature,
    finalisation: {
      ...manifestWithoutSignature.finalisation,
      manifestSignature,
    },
    manifestSignature,
    transmittal: {
      ...manifestWithoutSignature.transmittal,
      manifestSignature,
    },
  };
}

export function serializeDraftingTransmittalManifestJson(manifest: DraftingTransmittalManifest) {
  return JSON.stringify(sanitizeManifestValue(manifest), null, 2);
}

export function buildDraftingTransmittalWarnings(args: {
  model: DraftingModel;
  rootTemplatesById?: ReadonlyMap<string, RootSheetTemplate>;
  transmittal: DraftingDrawingTransmittal;
}): Array<{ drawingSheetIssueId: string; messages: string[] }> {
  const issueMap = new Map((args.model.drawingSheetIssues ?? []).map((issue) => [issue.id, issue]));
  return args.transmittal.includedDrawingSheetIssueIds.map((issueId) => {
    const issue = issueMap.get(issueId);
    if (!issue) {
      return {
        drawingSheetIssueId: issueId,
        messages: ['Referenced drawing sheet issue snapshot is missing.'],
      };
    }

    const messages = getIssueCompletenessWarnings(issue);
    const comparison = compareDraftingDrawingSheetIssue(
      args.model,
      issue,
      args.rootTemplatesById ?? new Map(),
    );
    if (comparison.hasDrift) {
      messages.push('Current live drawing has drift since this issued snapshot.');
    }

    return {
      drawingSheetIssueId: issueId,
      messages,
    };
  });
}

export function getIssueCompletenessWarnings(issue: DraftingDrawingSheetIssue) {
  const messages: string[] = [];
  if (issue.lockedDrawingSheets.length === 0) {
    messages.push('Snapshot has no locked drawing sheets.');
  }
  if (!issue.lockedTitleBlock || !issue.lockedRevisionBlock) {
    messages.push('Snapshot is missing title or revision metadata.');
  }
  if (issue.lockedObjects.some((object) => !object.renderedState)) {
    messages.push('Snapshot has legacy object records without rendered state.');
  }
  if (issue.lockedDrawingSheets.some((sheet) => !sheet.templateSnapshot)) {
    messages.push('Snapshot has legacy sheet records without template metadata.');
  }
  return messages;
}

export function nextTransmittalNumber(transmittalCount: number) {
  return `TRN-${String(transmittalCount + 1).padStart(3, '0')}`;
}

function replaceDrawingTransmittal(
  model: DraftingModel,
  transmittal: DraftingDrawingTransmittal,
): DraftingModel {
  return {
    ...model,
    drawingTransmittals: getDrawingTransmittals(model).map((candidate) =>
      candidate.id === transmittal.id ? transmittal : candidate,
    ),
  };
}

function assertCanAttachPdfEvidence(transmittal: DraftingDrawingTransmittal) {
  if (transmittal.status === 'draft' || transmittal.status === 'archived') {
    throw new Error('Issue or finalise the transmittal before attaching PDF evidence.');
  }
}

function buildPdfEvidence(transmittal: DraftingDrawingTransmittal) {
  const hasEvidence = Boolean(transmittal.artifactFileName || transmittal.artifactDocumentId);
  const status: DraftingTransmittalManifest['pdfEvidence']['status'] = hasEvidence
    ? 'attached'
    : transmittal.artifactStatus === 'removed'
      ? 'removed'
      : 'missing';
  return {
    artifactAttachedAt: transmittal.artifactAttachedAt ?? transmittal.artifactAddedAt,
    artifactAttachedBy: transmittal.artifactAttachedBy ?? transmittal.artifactAddedBy,
    artifactDocumentId: transmittal.artifactDocumentId,
    artifactFileName: transmittal.artifactFileName,
    artifactMimeType: transmittal.artifactMimeType,
    artifactNotes: transmittal.artifactNotes,
    artifactSizeBytes: transmittal.artifactSizeBytes,
    artifactSource: transmittal.artifactSource,
    artifactStatus: transmittal.artifactStatus,
    artifactUploadedAt: transmittal.artifactUploadedAt,
    artifactUploadedBy: transmittal.artifactUploadedBy,
    artifactVersion: transmittal.artifactVersion,
    evidenceSignature: transmittal.evidenceSignature,
    status,
  };
}

function buildManifestSignature(manifest: DraftingTransmittalManifest) {
  return `sig-${fnv1a32(stableStringify(sanitizeManifestValue(manifest)))
    .toString(16)
    .padStart(8, '0')}`;
}

function buildEvidenceSignature(transmittal: DraftingDrawingTransmittal) {
  return `ev-${fnv1a32(
    stableStringify(
      sanitizeManifestValue({
        artifactAttachedAt: transmittal.artifactAttachedAt,
        artifactDocumentId: transmittal.artifactDocumentId,
        artifactFileName: transmittal.artifactFileName,
        artifactMimeType: transmittal.artifactMimeType,
        artifactSizeBytes: transmittal.artifactSizeBytes,
        artifactStatus: transmittal.artifactStatus,
        artifactVersion: transmittal.artifactVersion,
        evidenceEvents: transmittal.evidenceEvents ?? [],
      }),
    ),
  )
    .toString(16)
    .padStart(8, '0')}`;
}

function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(',')}}`;
}

function sanitizeManifestValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeManifestValue);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entryValue]) => {
        if (entryValue === undefined) {
          return false;
        }
        return !/(token|password|secret|binary|image|thumbnail|session)/i.test(key);
      })
      .map(([key, entryValue]) => [key, sanitizeManifestValue(entryValue)]),
  );
}

function normalizeTransmittalNumber(value: string) {
  return value.trim().toUpperCase();
}

function compactTimestamp(value: string) {
  return value.replace(/[^0-9A-Z]/gi, '');
}

function isFrozenDrawingSheetIssue(issue: DraftingDrawingSheetIssue) {
  return (
    issue.lockedDrawingSheets.length > 0 &&
    issue.sheetIds.length > 0 &&
    issue.createdAt.length > 0 &&
    issue.updatedAt.length > 0
  );
}

function mapIssueToTransmittalSheets(issue: DraftingDrawingSheetIssue) {
  return issue.lockedDrawingSheets.map((sheet) => ({
    drawingSheetIssueId: issue.id,
    sheetId: sheet.id,
    sheetNumber: sheet.sheetNumber,
    sheetName: sheet.name,
    revision: issue.revision,
    status: issue.status,
    issueNumber: issue.issueNumber,
    snapshotLabel: `${issue.issueNumber} Rev ${issue.revision} - ${sheet.sheetNumber} ${sheet.name}`,
  }));
}

function normalizePartyList(values: string[] | undefined) {
  return unique(
    (values ?? [])
      .flatMap((value) => value.split(/[,\n]/g))
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
