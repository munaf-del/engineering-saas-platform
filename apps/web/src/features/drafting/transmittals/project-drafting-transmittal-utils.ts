import type {
  DraftingProjectTransmittal,
  DraftingProjectTransmittalInput,
  DraftingProjectTransmittalItem,
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
