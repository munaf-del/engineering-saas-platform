import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WasteClassificationStep5Helper } from './waste-classification-step5-helper';

describe('WasteClassificationStep5Helper', () => {
  it('renders the Step 5 helper guidance and linked references', () => {
    const markup = renderToStaticMarkup(
      <WasteClassificationStep5Helper
        references={[
          {
            id: 'ref-1',
            reportId: 'report-1',
            referenceType: 'epa_guideline',
            title: 'NSW EPA Waste Classification Guidelines – Part 1: Classifying waste',
            sourceUrl: 'https://www.epa.nsw.gov.au/example-part-1',
            projectReferenceId: null,
            aiDocumentId: null,
            note: null,
            isPrefilled: true,
            isIncluded: true,
            sortOrder: 0,
            aiDocument: null,
          },
        ]}
      />,
    );

    expect(markup).toContain('Step 5 helper / reference notes');
    expect(markup).toContain('No Step 5 assessment means hazardous');
    expect(markup).toContain('NSW EPA Waste Classification Guidelines');
  });
});
