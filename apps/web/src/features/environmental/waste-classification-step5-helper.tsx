'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { ProjectWasteClassificationReference } from './waste-classification-types';

const STEP_5_HELPER_ITEMS = [
  {
    title: 'Chemical assessment where applicable',
    summary:
      'Use Step 5 where the NSW EPA guideline flow requires chemical assessment and record the contaminant selection, sampling rationale, and analytical basis clearly.',
    referenceTitles: ['NSW EPA Waste Classification Guidelines – Part 1: Classifying waste'],
  },
  {
    title: 'No Step 5 assessment means hazardous',
    summary:
      'If Step 5 is required but chemical assessment is not undertaken, the authored report should treat the waste as hazardous.',
    referenceTitles: [
      'NSW EPA Waste Classification Guidelines – Part 1: Classifying waste',
      'Addendum to Part 1: Classifying waste',
    ],
  },
  {
    title: 'SCC / TCLP threshold reminder',
    summary:
      'Record the SCC and TCLP results you relied on, plus the threshold / rationale note that explains how the cited reference informed the adopted waste class.',
    referenceTitles: [
      'NSW EPA Waste Classification Guidelines – Part 1: Classifying waste',
      'NSW EPA Waste classification guidelines landing page',
    ],
  },
  {
    title: 'ASS still loops back to Step 5',
    summary:
      'If Acid Sulfate Soils are relevant or treated, keep the ASS pathway note aligned with the Step 5 chemical assessment reasoning rather than treating it as a substitute classification step.',
    referenceTitles: [
      'NSW EPA Waste Classification Guidelines – Part 4: Acid sulfate soils',
      'NSW Planning Portal Environmental Planning Instrument - Acid Sulfate Soils dataset',
    ],
  },
  {
    title: 'Immobilisation is separate',
    summary:
      'Immobilisation is a separate pathway. It does not remove the need to classify the waste correctly in the first place.',
    referenceTitles: ['NSW EPA Waste Classification Guidelines – Part 2: Immobilising waste'],
  },
] as const;

export function WasteClassificationStep5Helper({
  references,
  compact = false,
}: {
  references: ProjectWasteClassificationReference[];
  compact?: boolean;
}) {
  return (
    <div
      data-testid="waste-classification-step5-helper"
      className={compact ? 'space-y-3' : 'space-y-4 rounded-xl border bg-muted/20 p-4'}
    >
      <div>
        <div className="text-sm font-medium">Step 5 helper / reference notes</div>
        <p className="text-sm text-muted-foreground">
          Guidance-only reminders for authored Step 5 reasoning. This panel does not automate the
          waste classification outcome.
        </p>
      </div>

      <div className="space-y-3">
        {STEP_5_HELPER_ITEMS.map((item) => {
          const linkedReferences = references.filter((reference) =>
            (item.referenceTitles as readonly string[]).includes(reference.title),
          );

          return (
            <div key={item.title} className="rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{item.title}</div>
                {linkedReferences.length > 0 ? (
                  <Badge variant="outline">Linked sources</Badge>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
              {linkedReferences.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {linkedReferences.map((reference) =>
                    reference.sourceUrl ? (
                      <a
                        key={reference.id}
                        href={reference.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full border px-3 py-1 text-xs hover:bg-accent"
                      >
                        {reference.title}
                      </a>
                    ) : (
                      <span
                        key={reference.id}
                        className="inline-flex rounded-full border px-3 py-1 text-xs"
                      >
                        {reference.title}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
