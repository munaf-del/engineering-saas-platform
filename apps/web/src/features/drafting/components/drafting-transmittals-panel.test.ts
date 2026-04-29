import { describe, expect, it } from 'vitest';
import {
  formatDraftingEvidenceApiError,
  getTransmittalEvidenceProtectionMessage,
} from './drafting-transmittals-panel';

describe('DraftingTransmittalsPanel evidence errors', () => {
  it('surfaces backend evidence validation messages for failed upload or attach actions', () => {
    expect(
      formatDraftingEvidenceApiError(
        {
          body: {
            message: 'Transmittal evidence must be an application/pdf document',
          },
        },
        'Failed to attach PDF evidence',
      ),
    ).toBe('Transmittal evidence must be an application/pdf document');

    expect(
      formatDraftingEvidenceApiError(
        {
          body: {
            message: ['Drafting transmittal evidence uploads must use application/pdf'],
          },
        },
        'Failed to upload PDF evidence',
      ),
    ).toBe('Drafting transmittal evidence uploads must use application/pdf');
  });
});

describe('DraftingTransmittalsPanel evidence protection warnings', () => {
  it('warns that attached evidence documents are protected by current and historical references', () => {
    expect(
      getTransmittalEvidenceProtectionMessage({
        id: 'transmittal-1',
        transmittalNumber: 'TRN-001',
        title: 'Drawing issue package',
        purpose: 'For information',
        status: 'issued',
        issueDate: '2026-04-24T00:00:00.000Z',
        issuedBy: 'Avery Drafter',
        issuedTo: ['client@example.com'],
        cc: [],
        artifactDocumentId: 'document-1',
        artifactFileName: 'evidence.pdf',
        evidenceEvents: [
          {
            id: 'event-1',
            action: 'attached',
            at: '2026-04-24T01:00:00.000Z',
            artifactDocumentId: 'document-1',
            artifactFileName: 'evidence.pdf',
            artifactSource: 'manual_upload',
          },
        ],
        includedDrawingSheetIssueIds: ['issue-1'],
        includedSheets: [],
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      }),
    ).toBe(
      'Evidence document protected: this project PDF is referenced by current transmittal evidence and transmittal history.',
    );
  });
});
