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
        <Field label="Pile type / code">
          <Input
            value={object.metadata.pileTypeCode ?? object.metadata.pileType ?? ''}
            onChange={(event) =>
              onUpdate({
                ...object,
                metadata: {
                  ...object.metadata,
                  pileTypeCode: event.target.value,
                },
                updatedAt: now,
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="Concrete grade">
          <Input
            value={object.metadata.concreteGrade ?? ''}
            onChange={(event) =>
              onUpdate({
                ...object,
                metadata: {
                  ...object.metadata,
                  concreteGrade: event.target.value,
                },
                updatedAt: now,
              })
            }
          />
        </Field>
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
        <NumberField
          label="Socket length (m)"
          value={object.metadata.socketLengthM ?? ''}
          onChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                socketLengthM: value,
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Design compression (kN)"
          value={object.metadata.designCompressionKn ?? ''}
          onChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                designCompressionKn: value,
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Design tension (kN)"
          value={object.metadata.designTensionKn ?? ''}
          onChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                designTensionKn: value,
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Design lateral (kN)"
          value={object.metadata.designLateralKn ?? ''}
          onChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                designLateralKn: value,
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <Field label="Founding stratum / note">
        <Input
          value={object.metadata.foundingStratum ?? object.metadata.foundingNote ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                foundingStratum: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>

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
