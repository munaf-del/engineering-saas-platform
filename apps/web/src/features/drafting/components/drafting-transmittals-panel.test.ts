import { describe, expect, it } from 'vitest';
import { formatDraftingEvidenceApiError } from './drafting-transmittals-panel';

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
