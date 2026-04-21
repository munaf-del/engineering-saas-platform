import * as React from 'react';
import type { DraftingLeaderNoteObject } from '@eng/shared';
import { Textarea } from '@/components/ui/textarea';
import { Field, NumberField } from './common-object-properties';

export function LeaderNoteProperties({
  object,
  onUpdate,
}: {
  object: DraftingLeaderNoteObject;
  onUpdate: (nextObject: DraftingLeaderNoteObject) => void;
}) {
  const now = new Date().toISOString();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Anchor X (mm)"
          value={object.geometry.anchor.x}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                anchor: { ...object.geometry.anchor, x: value },
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Anchor Y (mm)"
          value={object.geometry.anchor.y}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                anchor: { ...object.geometry.anchor, y: value },
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Text X (mm)"
          value={object.geometry.textPoint.x}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                textPoint: { ...object.geometry.textPoint, x: value },
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Text Y (mm)"
          value={object.geometry.textPoint.y}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                textPoint: { ...object.geometry.textPoint, y: value },
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <Field label="Note Text">
        <Textarea
          rows={4}
          value={object.metadata.text}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                text: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>
    </div>
  );
}
