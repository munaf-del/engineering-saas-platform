import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingObject } from '@eng/shared';
import { createDraftingDrawingSheetIssueSnapshot } from '../sheets/drafting-drawing-sheet-issue-utils';
import { createDraftingDrawingSheetDefinition } from '../sheets/drafting-drawing-sheet-utils';
import {
  addDrawingTransmittal,
  attachDraftingTransmittalPdfEvidence,
  buildDraftingTransmittalManifest,
  buildDraftingTransmittalWarnings,
  createDraftingTransmittal,
  duplicateDraftingTransmittalToDraft,
  findDuplicateActiveTransmittalNumbers,
  getDrawingTransmittals,
  getIssueCompletenessWarnings,
  issueDraftingTransmittal,
  removeDraftingTransmittalPdfEvidence,
  serializeDraftingTransmittalManifestJson,
  suggestNextTransmittalNumber,
  supersedeDraftingTransmittal,
  updateDraftingTransmittal,
  voidDraftingTransmittal,
} from './drafting-transmittal-utils';

const now = '2026-04-24T00:00:00.000Z';

describe('drafting transmittal helpers', () => {
  it('creates a transmittal from frozen drawing sheet issue snapshots', () => {
    const model = createModelWithIssue();
    const transmittal = createDraftingTransmittal(model, {
      cc: ['cc@example.com'],
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      issuedBy: 'Avery Drafter',
      issuedTo: ['client@example.com'],
      purpose: 'For construction',
      title: 'Drawing package 1',
      transmittalNumber: 'TRN-001',
    });

    expect(transmittal.status).toBe('draft');
    expect(transmittal.includedDrawingSheetIssueIds).toEqual(['issue-1']);
    expect(transmittal.includedSheets).toEqual([
      expect.objectContaining({
        drawingSheetIssueId: 'issue-1',
        issueNumber: 'ISS-001',
        revision: 'B',
        sheetId: 'sheet-1',
        sheetName: 'Geometry Sheet 1',
        sheetNumber: 'S-101',
        snapshotLabel: 'ISS-001 Rev B - S-101 Geometry Sheet 1',
      }),
    ]);
  });

  it('suggests the next unused transmittal number and prevents duplicate active numbers', () => {
    const model = createModelWithIssue();
    model.drawingTransmittals.push(
      createDraftingTransmittal(model, {
        id: 'transmittal-1',
        includedDrawingSheetIssueIds: ['issue-1'],
        issueDate: now,
        purpose: 'For review',
        title: 'Draft package',
        transmittalNumber: 'TRN-001',
      }),
    );

    expect(suggestNextTransmittalNumber(model)).toBe('TRN-002');
    expect(() =>
      createDraftingTransmittal(model, {
        id: 'transmittal-2',
        includedDrawingSheetIssueIds: ['issue-1'],
        issueDate: now,
        purpose: 'For review',
        title: 'Duplicate package',
        transmittalNumber: 'trn-001',
      }),
    ).toThrow('Active transmittal numbers must be unique within this drawing.');
  });

  it('allows legacy duplicates to be detected without blocking hydration-style reads', () => {
    const model = createModelWithIssue();
    const first = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For review',
      title: 'Draft package',
      transmittalNumber: 'TRN-001',
    });
    model.drawingTransmittals.push(first, {
      ...first,
      id: 'legacy-duplicate',
      title: 'Legacy duplicate',
    });

    expect(findDuplicateActiveTransmittalNumbers(model)).toEqual(['TRN-001']);
  });

  it('rejects transmittals without frozen drawing sheet issue snapshots', () => {
    expect(() =>
      createDraftingTransmittal(createEmptyDraftingModel('drawing-empty'), {
        id: 'transmittal-1',
        includedDrawingSheetIssueIds: [],
        issueDate: now,
        purpose: 'For review',
        title: 'Empty package',
        transmittalNumber: 'TRN-001',
      }),
    ).toThrow('A transmittal requires at least one frozen drawing sheet issue snapshot.');
  });

  it('adds and updates transmittal metadata without mutating issue snapshots', () => {
    const model = createModelWithIssue();
    const transmittal = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For review',
      title: 'Draft package',
      transmittalNumber: 'TRN-001',
    });
    const withTransmittal = addDrawingTransmittal(model, transmittal);
    const updated = updateDraftingTransmittal(withTransmittal, 'transmittal-1', {
      cc: ['design@example.com'],
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      issuedBy: 'Casey Checker',
      issuedTo: ['client@example.com'],
      notes: 'Reissued with distribution notes.',
      purpose: 'For information',
      title: 'Updated package',
      transmittalNumber: 'TRN-001',
    });

    expect(getDrawingTransmittals(updated)[0]).toMatchObject({
      issuedBy: 'Casey Checker',
      issuedTo: ['client@example.com'],
      purpose: 'For information',
      status: 'draft',
      title: 'Updated package',
    });
    expect(updated.drawingSheetIssues[0]).toEqual(model.drawingSheetIssues[0]);
  });

  it('issues a draft transmittal with immutable finalisation metadata and a deterministic signature', () => {
    const model = createModelWithIssue();
    const transmittal = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      issuedBy: 'Avery Drafter',
      purpose: 'For review',
      title: 'Draft package',
      transmittalNumber: 'TRN-001',
    });
    const withTransmittal = addDrawingTransmittal(model, transmittal);
    const issuedModel = issueDraftingTransmittal({
      issuedAt: '2026-04-24T01:00:00.000Z',
      issuedBy: 'Avery Drafter',
      model: withTransmittal,
      transmittalId: 'transmittal-1',
    });
    const issued = getDrawingTransmittals(issuedModel)[0]!;

    expect(issued).toMatchObject({
      includedDrawingSheetIssueIds: ['issue-1'],
      includedSheets: transmittal.includedSheets,
      issueActionId: 'issue-transmittal-1-20260424T010000000Z',
      issuedAt: '2026-04-24T01:00:00.000Z',
      manifestSignature: expect.stringMatching(/^sig-[0-9a-f]{8}$/),
      status: 'issued',
    });
    expect(() =>
      updateDraftingTransmittal(issuedModel, 'transmittal-1', {
        includedDrawingSheetIssueIds: ['issue-1'],
        issueDate: now,
        purpose: 'For review',
        title: 'Should not edit',
        transmittalNumber: 'TRN-001',
      }),
    ).toThrow('Issued, superseded, void, and archived transmittals are locked.');
  });

  it('attaches PDF evidence metadata to an issued transmittal without unlocking content', () => {
    const issuedModel = createIssuedModel();
    const issuedBefore = getDrawingTransmittals(issuedModel)[0]!;
    const withEvidence = attachDraftingTransmittalPdfEvidence({
      attachedAt: '2026-04-24T04:00:00.000Z',
      attachedBy: 'Avery Drafter',
      evidence: createEvidenceInput(),
      model: issuedModel,
      transmittalId: 'transmittal-1',
    });
    const issuedAfter = getDrawingTransmittals(withEvidence)[0]!;

    expect(issuedAfter.includedDrawingSheetIssueIds).toEqual(
      issuedBefore.includedDrawingSheetIssueIds,
    );
    expect(issuedAfter.includedSheets).toEqual(issuedBefore.includedSheets);
    expect(issuedAfter.manifestSignature).toBe(issuedBefore.manifestSignature);
    expect(issuedAfter.status).toBe('issued');
    expect(issuedAfter).toMatchObject({
      artifactDocumentId: 'document-1',
      artifactFileName: 'TRN-001.pdf',
      artifactMimeType: 'application/pdf',
      artifactSizeBytes: 12345,
      artifactStatus: 'attached',
      artifactVersion: 1,
      evidenceSignature: expect.stringMatching(/^ev-[0-9a-f]{8}$/),
    });
    expect(issuedAfter.evidenceEvents).toHaveLength(1);
    expect(issuedAfter.evidenceEvents?.[0]).toMatchObject({
      action: 'attached',
      artifactDocumentId: 'document-1',
    });
  });

  it('rejects attaching PDF evidence to a draft transmittal', () => {
    const model = createModelWithIssue();
    const draft = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For review',
      title: 'Draft package',
      transmittalNumber: 'TRN-001',
    });

    expect(() =>
      attachDraftingTransmittalPdfEvidence({
        evidence: createEvidenceInput(),
        model: addDrawingTransmittal(model, draft),
        transmittalId: 'transmittal-1',
      }),
    ).toThrow('Issue or finalise the transmittal before attaching PDF evidence.');
  });

  it('replaces and removes PDF evidence metadata with event state', () => {
    const attached = attachDraftingTransmittalPdfEvidence({
      attachedAt: '2026-04-24T04:00:00.000Z',
      attachedBy: 'Avery Drafter',
      evidence: createEvidenceInput(),
      model: createIssuedModel(),
      transmittalId: 'transmittal-1',
    });
    const replaced = attachDraftingTransmittalPdfEvidence({
      attachedAt: '2026-04-24T05:00:00.000Z',
      attachedBy: 'Casey Checker',
      evidence: {
        ...createEvidenceInput(),
        artifactDocumentId: 'document-2',
        artifactFileName: 'TRN-001-reprint.pdf',
        artifactSizeBytes: 23456,
      },
      model: attached,
      transmittalId: 'transmittal-1',
    });
    const replacedTransmittal = getDrawingTransmittals(replaced)[0]!;
    expect(replacedTransmittal).toMatchObject({
      artifactDocumentId: 'document-2',
      artifactFileName: 'TRN-001-reprint.pdf',
      artifactStatus: 'replaced',
      artifactVersion: 2,
    });
    expect(replacedTransmittal.evidenceEvents?.map((event) => event.action)).toEqual([
      'attached',
      'replaced',
    ]);

    const removed = removeDraftingTransmittalPdfEvidence({
      model: replaced,
      notes: 'Superseded by revised saved PDF.',
      removedAt: '2026-04-24T06:00:00.000Z',
      removedBy: 'Casey Checker',
      transmittalId: 'transmittal-1',
    });
    const removedTransmittal = getDrawingTransmittals(removed)[0]!;
    expect(removedTransmittal).toMatchObject({
      artifactDocumentId: undefined,
      artifactFileName: undefined,
      artifactStatus: 'removed',
      artifactVersion: 3,
    });
    expect(removedTransmittal.evidenceEvents?.map((event) => event.action)).toEqual([
      'attached',
      'replaced',
      'removed',
    ]);
  });

  it('duplicates an issued transmittal into an editable draft', () => {
    const model = createIssuedModel();
    const duplicated = duplicateDraftingTransmittalToDraft({
      id: 'transmittal-2',
      model,
      sourceTransmittalId: 'transmittal-1',
      transmittalNumber: 'TRN-002',
    });
    const duplicate = getDrawingTransmittals(duplicated)[1]!;

    expect(duplicate).toMatchObject({
      status: 'draft',
      title: 'Draft package Copy',
      transmittalNumber: 'TRN-002',
    });
    expect(duplicate).not.toHaveProperty('issueActionId');
    expect(duplicate).not.toHaveProperty('manifestSignature');
  });

  it('supersedes and voids issued transmittals without unlocking them', () => {
    const superseded = supersedeDraftingTransmittal({
      by: 'Avery Drafter',
      model: createIssuedModel(),
      supersededAt: '2026-04-24T02:00:00.000Z',
      transmittalId: 'transmittal-1',
    });
    expect(getDrawingTransmittals(superseded)[0]).toMatchObject({
      status: 'superseded',
      supersededAt: '2026-04-24T02:00:00.000Z',
    });
    expect(() =>
      updateDraftingTransmittal(superseded, 'transmittal-1', {
        includedDrawingSheetIssueIds: ['issue-1'],
        issueDate: now,
        purpose: 'For review',
        title: 'Should not edit',
        transmittalNumber: 'TRN-001',
      }),
    ).toThrow('Issued, superseded, void, and archived transmittals are locked.');

    const voided = voidDraftingTransmittal({
      by: 'Casey Checker',
      model: createIssuedModel(),
      reason: 'Issued to wrong distribution group.',
      transmittalId: 'transmittal-1',
      voidedAt: '2026-04-24T03:00:00.000Z',
    });
    expect(getDrawingTransmittals(voided)[0]).toMatchObject({
      status: 'void',
      voidReason: 'Issued to wrong distribution group.',
      voidedAt: '2026-04-24T03:00:00.000Z',
    });
  });

  it('builds a manifest with snapshot references, title metadata, and provenance summaries', () => {
    const model = createModelWithIssue();
    const transmittal = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For review',
      title: 'Manifest package',
      transmittalNumber: 'TRN-001',
    });
    const manifest = buildDraftingTransmittalManifest({ model, transmittal });

    expect(manifest.manifestSchemaVersion).toBe('drafting.transmittal.manifest.v1');
    expect(manifest.manifestSignature).toMatch(/^sig-[0-9a-f]{8}$/);
    expect(manifest.transmittal).toMatchObject({
      id: 'transmittal-1',
      transmittalNumber: 'TRN-001',
    });
    expect(manifest.includedSheets[0]).toMatchObject({
      drawingSheetIssueId: 'issue-1',
      sheetNumber: 'S-101',
    });
    expect(manifest.issueManifests[0]?.titleRevision.lockedTitleBlock).toMatchObject({
      drawingTitle: 'Retention Plan',
      projectName: 'NORTH SYDNEY',
    });
    expect(manifest.issueManifests[0]?.lockedProfileAudits[0]).toMatchObject({
      sheetId: 'sheet-1',
      profileAudit: {
        activeProfileId: 'as1100-general',
        schemaVersion: 'drafting.profile-audit.v1',
      },
    });
    expect(manifest.issueManifests[0]?.objectProvenanceSummary[0]).toMatchObject({
      objectId: 'pile-1',
      provenance: {
        createdBy: 'Avery Drafter',
      },
    });
  });

  it('includes PDF evidence metadata in the manifest separately from the issue package signature', () => {
    const attached = attachDraftingTransmittalPdfEvidence({
      attachedAt: '2026-04-24T04:00:00.000Z',
      attachedBy: 'Avery Drafter',
      evidence: createEvidenceInput(),
      model: createIssuedModel(),
      transmittalId: 'transmittal-1',
    });
    const transmittal = getDrawingTransmittals(attached)[0]!;
    const manifest = buildDraftingTransmittalManifest({ model: attached, transmittal });

    expect(manifest.manifestSignature).toBe(transmittal.manifestSignature);
    expect(manifest.pdfEvidence).toMatchObject({
      artifactDocumentId: 'document-1',
      artifactFileName: 'TRN-001.pdf',
      artifactMimeType: 'application/pdf',
      status: 'attached',
    });
    expect(manifest.evidenceEvents).toHaveLength(1);
    expect(manifest.pdfEvidence.evidenceSignature).toBe(transmittal.evidenceSignature);
  });

  it('serializes a manifest without raw token, binary, or image fields', () => {
    const model = createModelWithIssue();
    model.drawingSheetIssues[0]!.lockedObjects[0]!.provenance = {
      apiToken: 'raw-token',
      binaryPayload: 'not-for-manifest',
      createdBy: 'Avery Drafter',
      renderedImage: 'base64-image',
    } as Record<string, unknown>;
    const transmittal = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For review',
      title: 'Manifest package',
      transmittalNumber: 'TRN-001',
    });

    const json = serializeDraftingTransmittalManifestJson(
      buildDraftingTransmittalManifest({ model, transmittal }),
    );

    expect(json).toContain('Avery Drafter');
    expect(json).not.toContain('raw-token');
    expect(json).not.toContain('not-for-manifest');
    expect(json).not.toContain('base64-image');
  });

  it('serializes PDF evidence metadata without PDF binary, images, tokens, or secrets', () => {
    const attached = attachDraftingTransmittalPdfEvidence({
      attachedAt: '2026-04-24T04:00:00.000Z',
      attachedBy: 'Avery Drafter',
      evidence: {
        ...createEvidenceInput(),
        artifactNotes:
          'Saved PDF evidence. Do not include binary payloads, rendered images, or tokens here.',
      },
      model: createIssuedModel(),
      transmittalId: 'transmittal-1',
    });
    const transmittal = getDrawingTransmittals(attached)[0]!;
    const transmittalWithUnsafeFields = {
      ...transmittal,
      pdfBinaryPayload: 'JVBERi0xLjQK',
      renderedImage: 'base64-image',
      omnidotsToken: 'secret-token',
      browserSessionSecret: 'session-secret',
    } as typeof transmittal & Record<string, unknown>;
    const json = serializeDraftingTransmittalManifestJson(
      buildDraftingTransmittalManifest({
        model: attached,
        transmittal: transmittalWithUnsafeFields,
      }),
    );

    expect(json).toContain('TRN-001.pdf');
    expect(json).not.toContain('JVBERi0xLjQK');
    expect(json).not.toContain('base64-image');
    expect(json).not.toContain('secret-token');
    expect(json).not.toContain('session-secret');
  });

  it('warns for legacy or incomplete issue snapshots and live-vs-issued drift', () => {
    const model = createModelWithIssue();
    const legacyIssue = {
      ...model.drawingSheetIssues[0]!,
      id: 'legacy-issue',
      lockedDrawingSheets: model.drawingSheetIssues[0]!.lockedDrawingSheets.map((sheet) => {
        const legacySheet = { ...sheet };
        delete legacySheet.templateSnapshot;
        return legacySheet;
      }),
      lockedObjects: model.drawingSheetIssues[0]!.lockedObjects.map((object) => ({
        ...object,
        renderedState: undefined,
      })),
    };
    const driftedModel = {
      ...model,
      drawingSheetIssues: [legacyIssue],
      titleBlock: {
        ...model.titleBlock,
        drawingTitle: 'Changed live title',
      },
    };
    const transmittal = createDraftingTransmittal(driftedModel, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['legacy-issue'],
      issueDate: now,
      purpose: 'For review',
      title: 'Legacy package',
      transmittalNumber: 'TRN-001',
    });

    expect(getIssueCompletenessWarnings(legacyIssue)).toEqual([
      'Snapshot has legacy object records without rendered state.',
      'Snapshot has legacy sheet records without template metadata.',
    ]);
    expect(
      buildDraftingTransmittalWarnings({
        model: driftedModel,
        transmittal,
      })[0]?.messages,
    ).toContain('Current live drawing has drift since this issued snapshot.');
  });
});

function createModelWithIssue() {
  const model = createEmptyDraftingModel('drawing-transmittal');
  model.titleBlock = {
    drawingNumber: 'S-1001',
    drawingTitle: 'Retention Plan',
    projectName: 'NORTH SYDNEY',
  };
  model.revisionBlock = {
    currentRevision: 'B',
    revisions: [
      {
        approvedBy: 'APR',
        checkedBy: 'CHK',
        date: '2026-04-24',
        description: 'Issued for review',
        drawnBy: 'DRN',
        id: 'revision-b',
        issuedFor: 'Review',
        revision: 'B',
        status: 'for_review',
      },
    ],
  };
  model.drawingSheets.push(
    createDraftingDrawingSheetDefinition({
      id: 'sheet-1',
      name: 'Geometry Sheet 1',
      now,
      sheetNumber: 'S-101',
      title: 'Retention Plan',
    }),
  );
  model.objects.push(createPile());
  model.drawingSheetIssues.push(
    createDraftingDrawingSheetIssueSnapshot(model, {
      id: 'issue-1',
      issueDate: now,
      issueNumber: 'ISS-001',
      issuedBy: 'Avery Drafter',
      purpose: 'For review',
      revision: 'B',
      sheetIds: ['sheet-1'],
      status: 'issued',
    }),
  );
  return model;
}

function createIssuedModel() {
  const model = createModelWithIssue();
  const transmittal = createDraftingTransmittal(model, {
    id: 'transmittal-1',
    includedDrawingSheetIssueIds: ['issue-1'],
    issueDate: now,
    issuedBy: 'Avery Drafter',
    purpose: 'For review',
    title: 'Draft package',
    transmittalNumber: 'TRN-001',
  });
  return issueDraftingTransmittal({
    issuedAt: '2026-04-24T01:00:00.000Z',
    issuedBy: 'Avery Drafter',
    model: addDrawingTransmittal(model, transmittal),
    transmittalId: 'transmittal-1',
  });
}

function createEvidenceInput() {
  return {
    artifactDocumentId: 'document-1',
    artifactFileName: 'TRN-001.pdf',
    artifactMimeType: 'application/pdf',
    artifactNotes: 'Saved from browser print.',
    artifactSizeBytes: 12345,
    artifactSource: 'browser_print_pdf' as const,
    artifactUploadedAt: '2026-04-24T03:30:00.000Z',
    artifactUploadedBy: 'user-1',
  };
}

function createPile(): DraftingObject {
  return {
    id: 'pile-1',
    type: 'pile',
    layerId: 'piles',
    geometry: {
      centre: { x: 1000, y: 1000 },
      diameterMm: 600,
    },
    metadata: {
      pileId: 'P1',
    },
    provenance: {
      createdAt: now,
      createdBy: 'Avery Drafter',
      lastAction: 'created',
    },
    createdAt: now,
    updatedAt: now,
  };
}
