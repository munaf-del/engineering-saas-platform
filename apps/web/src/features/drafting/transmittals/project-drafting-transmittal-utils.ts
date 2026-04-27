import type {
  DraftingProjectTransmittal,
  DraftingProjectTransmittalInput,
  DraftingProjectTransmittalItem,
  DraftingSheetProfileAuditProvenance,
} from '@eng/shared';

export type ProjectDraftingTransmittalManifest = {
  manifestSchemaVersion: 'drafting.project-transmittal.manifest.v1';
  transmittal: {
    id: string;
    transmittalNumber: string;
    title: string;
    purpose: string;
    status: DraftingProjectTransmittal['status'];
    issuedAt?: string;
    issuedBy?: string;
    issuedTo: string[];
    cc: string[];
    notes?: string;
  };
  includedItems: DraftingProjectTransmittalItem[];
  manifestSignature?: string;
  provenanceSummary: DraftingProjectTransmittal['payload']['provenanceSummary'];
  warningSummary: string[];
  binaryPolicy: string;
};

export function buildProjectDraftingTransmittalManifest(
  transmittal: DraftingProjectTransmittal,
): ProjectDraftingTransmittalManifest {
  return {
    binaryPolicy:
      'Metadata only. No PDF bytes, rendered images, storage paths, tokens, secrets, passwords, sessions, or unrelated document content.',
    includedItems: transmittal.payload.includedItems.map((item) => ({ ...item })),
    manifestSchemaVersion: 'drafting.project-transmittal.manifest.v1',
    manifestSignature: transmittal.payload.manifestSignature,
    provenanceSummary: transmittal.payload.provenanceSummary,
    transmittal: {
      cc: transmittal.payload.cc,
      id: transmittal.id,
      issuedAt: transmittal.payload.issuedAt,
      issuedBy: transmittal.payload.issuedBy,
      issuedTo: transmittal.payload.issuedTo,
      notes: transmittal.payload.notes,
      purpose: transmittal.payload.purpose,
      status: transmittal.status,
      title: transmittal.payload.title,
      transmittalNumber: transmittal.transmittalNumber,
    },
    warningSummary: transmittal.payload.warningSummary,
  };
}

export function serializeProjectDraftingTransmittalManifestJson(
  manifest: ProjectDraftingTransmittalManifest,
) {
  return JSON.stringify(sanitizeManifestValue(manifest), null, 2);
}

export function downloadProjectDraftingTransmittalManifestJson(
  transmittal: DraftingProjectTransmittal,
) {
  const filename = `project-drawing-transmittal-${sanitizeFilenameSegment(
    transmittal.transmittalNumber,
  )}-manifest.json`;
  const blob = new Blob(
    [
      serializeProjectDraftingTransmittalManifestJson(
        buildProjectDraftingTransmittalManifest(transmittal),
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function nextProjectTransmittalNumber(transmittals: DraftingProjectTransmittal[]) {
  const used = new Set(transmittals.map((item) => item.transmittalNumber.trim().toUpperCase()));
  let index = 1;
  while (used.has(`TRN-${String(index).padStart(3, '0')}`)) {
    index += 1;
  }
  return `TRN-${String(index).padStart(3, '0')}`;
}

export function toProjectTransmittalInput(
  transmittal: DraftingProjectTransmittal,
): DraftingProjectTransmittalInput {
  return {
    cc: transmittal.payload.cc,
    includedItems: transmittal.payload.includedItems.map((item) => ({
      drawingId: item.drawingId,
      drawingSheetIssueId: item.drawingSheetIssueId,
      sheetId: item.sheetId,
    })),
    issuedAt: transmittal.payload.issuedAt,
    issuedBy: transmittal.payload.issuedBy,
    issuedTo: transmittal.payload.issuedTo,
    notes: transmittal.payload.notes,
    purpose: transmittal.payload.purpose,
    status: transmittal.status,
    title: transmittal.payload.title,
    transmittalNumber: transmittal.transmittalNumber,
  };
}

export type ProjectTransmittalProfileAuditSummary = {
  fallbackResolved: number;
  frozen: number;
  missing: number;
};

export type ProjectTransmittalAuditCoverageFilter =
  | 'all'
  | 'needs_review'
  | 'frozen_only'
  | 'fallback_resolved'
  | 'missing_audit';

export type ProjectTransmittalSortMode = 'newest' | 'oldest' | 'audit_review';

export function countProjectTransmittalProfileAuditProvenance(
  items: DraftingProjectTransmittalItem[],
): ProjectTransmittalProfileAuditSummary {
  return items.reduce(
    (summary, item) => {
      const status = resolveProjectTransmittalProfileAuditStatus(item);
      if (status === 'frozen') {
        summary.frozen += 1;
      } else if (status === 'fallback_resolved') {
        summary.fallbackResolved += 1;
      } else {
        summary.missing += 1;
      }
      return summary;
    },
    {
      fallbackResolved: 0,
      frozen: 0,
      missing: 0,
    },
  );
}

export function resolveProjectTransmittalProfileAuditStatus(
  item: DraftingProjectTransmittalItem,
): DraftingSheetProfileAuditProvenance['status'] {
  if (item.profileAuditProvenance?.status) {
    return item.profileAuditProvenance.status;
  }
  if (item.profileAudit?.provenance?.status) {
    return item.profileAudit.provenance.status;
  }
  if (item.profileAudit) {
    return 'frozen';
  }
  return 'missing';
}

export function hasProjectTransmittalProfileAuditCoverageWarning(
  summary: ProjectTransmittalProfileAuditSummary,
) {
  return summary.fallbackResolved > 0 || summary.missing > 0;
}

export function matchesProjectTransmittalAuditCoverageFilter(
  transmittal: DraftingProjectTransmittal,
  filter: ProjectTransmittalAuditCoverageFilter,
) {
  const summary = countProjectTransmittalProfileAuditProvenance(transmittal.payload.includedItems);

  if (filter === 'all') {
    return true;
  }
  if (filter === 'needs_review') {
    return hasProjectTransmittalProfileAuditCoverageWarning(summary);
  }
  if (filter === 'frozen_only') {
    return summary.frozen > 0 && summary.fallbackResolved === 0 && summary.missing === 0;
  }
  if (filter === 'fallback_resolved') {
    return summary.fallbackResolved > 0;
  }
  return summary.missing > 0;
}

export function filterProjectTransmittalsByAuditCoverage(
  transmittals: DraftingProjectTransmittal[],
  filter: ProjectTransmittalAuditCoverageFilter,
) {
  return transmittals.filter((transmittal) =>
    matchesProjectTransmittalAuditCoverageFilter(transmittal, filter),
  );
}

export function sortProjectTransmittalsByAuditCoverage(
  transmittals: DraftingProjectTransmittal[],
  sortMode: ProjectTransmittalSortMode,
) {
  return [...transmittals].sort((left, right) => {
    if (sortMode === 'audit_review') {
      const leftSummary = countProjectTransmittalProfileAuditProvenance(left.payload.includedItems);
      const rightSummary = countProjectTransmittalProfileAuditProvenance(
        right.payload.includedItems,
      );
      const leftNeedsReview = hasProjectTransmittalProfileAuditCoverageWarning(leftSummary);
      const rightNeedsReview = hasProjectTransmittalProfileAuditCoverageWarning(rightSummary);

      if (leftNeedsReview !== rightNeedsReview) {
        return leftNeedsReview ? -1 : 1;
      }

      const reviewScore = auditReviewScore(rightSummary) - auditReviewScore(leftSummary);
      if (reviewScore !== 0) {
        return reviewScore;
      }
    }

    const newestFirst = sortMode !== 'oldest';
    const dateComparison = projectTransmittalTimestamp(right) - projectTransmittalTimestamp(left);
    if (dateComparison !== 0) {
      return newestFirst ? dateComparison : -dateComparison;
    }
    return left.transmittalNumber.localeCompare(right.transmittalNumber);
  });
}

function auditReviewScore(summary: ProjectTransmittalProfileAuditSummary) {
  return summary.missing * 2 + summary.fallbackResolved;
}

function projectTransmittalTimestamp(transmittal: DraftingProjectTransmittal) {
  const value = Date.parse(transmittal.updatedAt || transmittal.createdAt);
  return Number.isFinite(value) ? value : 0;
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
        return !/(token|password|secret|binary|image|thumbnail|session|storagePath|pdfBytes)/i.test(
          key,
        );
      })
      .map(([key, entryValue]) => [key, sanitizeManifestValue(entryValue)]),
  );
}

function sanitizeFilenameSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
