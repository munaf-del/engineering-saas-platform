import * as React from 'react';
import type { DraftingPileObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, NumberField } from './common-object-properties';

export function PileProperties({
  object,
  onUpdate,
}: {
  object: DraftingPileObject;
  onUpdate: (nextObject: DraftingPileObject) => void;
}) {
  const now = new Date().toISOString();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Centre X (mm)"
          value={object.geometry.centre.x}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                centre: { ...object.geometry.centre, x: value },
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Centre Y (mm)"
          value={object.geometry.centre.y}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                centre: { ...object.geometry.centre, y: value },
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pile ID">
          <Input
            value={object.metadata.pileId}
            onChange={(event) =>
              onUpdate({
                ...object,
                metadata: {
                  ...object.metadata,
                  pileId: event.target.value,
                },
                updatedAt: now,
              })
            }
          />
        </Field>
        <NumberField
          label="Diameter (mm)"
          value={object.geometry.diameterMm}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                diameterMm: value,
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Cut-off Level"
          value={object.metadata.cutOffLevel ?? ''}
          onChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                cutOffLevel: value,
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Toe Level"
          value={object.metadata.toeLevel ?? ''}
          onChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                toeLevel: value,
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <Field label="Notes">
        <Textarea
          rows={3}
          value={object.metadata.notes ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                notes: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>
    </div>
  );
}
