import type { Prisma } from '@prisma/client';

export type DraftingTransmittalEvidenceReferenceType =
  | 'current_evidence'
  | 'evidence_event'
  | 'legacy_unknown';

export type DraftingTransmittalEvidenceReference = {
  documentId: string;
  projectId: string;
  drawingId: string;
  drawingName: string;
  transmittalId?: string;
  transmittalNumber?: string;
  transmittalStatus?: string;
  referenceType: DraftingTransmittalEvidenceReferenceType;
};

export type DraftingTransmittalEvidenceReferenceSource = {
  id: string;
  projectId: string;
  title: string;
  modelJson: Prisma.JsonValue;
};

export function findDraftingTransmittalEvidenceReferences(
  projectId: string,
  documentId: string,
  drawings: DraftingTransmittalEvidenceReferenceSource[],
): DraftingTransmittalEvidenceReference[] {
  const references: DraftingTransmittalEvidenceReference[] = [];

  for (const drawing of drawings) {
    const transmittals = readDrawingTransmittals(drawing.modelJson);

    if (!transmittals) {
      if (jsonMayContainDocumentId(drawing.modelJson, documentId)) {
        references.push({
          documentId,
          projectId,
          drawingId: drawing.id,
          drawingName: drawing.title,
          referenceType: 'legacy_unknown',
        });
      }
      continue;
    }

    for (const transmittal of transmittals) {
      if (transmittal.artifactDocumentId === documentId) {
        references.push({
          documentId,
          projectId,
          drawingId: drawing.id,
          drawingName: drawing.title,
          transmittalId: transmittal.id,
          transmittalNumber: transmittal.transmittalNumber,
          transmittalStatus: transmittal.status,
          referenceType: 'current_evidence',
        });
      }

      for (const event of transmittal.evidenceEvents) {
        if (event.artifactDocumentId === documentId) {
          references.push({
            documentId,
            projectId,
            drawingId: drawing.id,
            drawingName: drawing.title,
            transmittalId: transmittal.id,
            transmittalNumber: transmittal.transmittalNumber,
            transmittalStatus: transmittal.status,
            referenceType: 'evidence_event',
          });
        }
      }
    }
  }

  return references;
}

type StoredTransmittalEvidenceEvent = {
  artifactDocumentId?: string;
};

type StoredTransmittal = {
  artifactDocumentId?: string;
  evidenceEvents: StoredTransmittalEvidenceEvent[];
  id?: string;
  status?: string;
  transmittalNumber?: string;
};

function readDrawingTransmittals(value: Prisma.JsonValue): StoredTransmittal[] | null {
  if (!isRecord(value)) {
    return null;
  }
  const drawingTransmittals = value.drawingTransmittals;
  if (!Array.isArray(drawingTransmittals)) {
    return null;
  }

  const transmittals: StoredTransmittal[] = [];
  for (const candidate of drawingTransmittals) {
    if (!isRecord(candidate)) {
      continue;
    }
    const evidenceEvents: StoredTransmittalEvidenceEvent[] = [];
    if (Array.isArray(candidate.evidenceEvents)) {
      for (const event of candidate.evidenceEvents) {
        if (!isRecord(event)) {
          continue;
        }
        evidenceEvents.push({
          artifactDocumentId: readString(event.artifactDocumentId),
        });
      }
    }

    transmittals.push({
      artifactDocumentId: readString(candidate.artifactDocumentId),
      evidenceEvents,
      id: readString(candidate.id),
      status: readString(candidate.status),
      transmittalNumber: readString(candidate.transmittalNumber),
    });
  }

  return transmittals;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function jsonMayContainDocumentId(value: Prisma.JsonValue, documentId: string) {
  return JSON.stringify(value).includes(documentId);
}
