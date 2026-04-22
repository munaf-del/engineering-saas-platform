import * as React from 'react';
import type { DraftingWalerObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, NumberField, OptionalNumberField } from './common-object-properties';

export function WalerProperties({
  object,
  onUpdate,
}: {
  object: DraftingWalerObject;
  onUpdate: (nextObject: DraftingWalerObject) => void;
}) {
  function updateObject(nextObject: DraftingWalerObject) {
    onUpdate({
      ...nextObject,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Waler ID">
          <Input
            value={object.parameters.walerId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  walerId: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Section Label">
          <Input
            value={object.parameters.sectionLabel}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  sectionLabel: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalNumberField
          label="Level RL"
          value={object.parameters.levelRl}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                levelRl: value,
              },
            })
          }
        />
        <Field label="Associated Wall">
          <Input
            value={object.metadata.associatedWallId ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  associatedWallId: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

      <Field label="Polyline Points (mm)">
        <div className="space-y-3">
          {object.geometry.points.map((point, index) => (
            <div key={`${object.id}-point-${index}`} className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label={`Point ${index + 1} X`}
                value={point.x}
                onChange={(value) =>
                  updateObject({
                    ...object,
                    geometry: {
                      ...object.geometry,
                      points: object.geometry.points.map((existingPoint, pointIndex) =>
                        pointIndex === index ? { ...existingPoint, x: value } : existingPoint,
                      ),
                    },
                  })
                }
              />
              <NumberField
                label={`Point ${index + 1} Y`}
                value={point.y}
                onChange={(value) =>
                  updateObject({
                    ...object,
                    geometry: {
                      ...object.geometry,
                      points: object.geometry.points.map((existingPoint, pointIndex) =>
                        pointIndex === index ? { ...existingPoint, y: value } : existingPoint,
                      ),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </Field>

      <Field label="Connection Notes">
        <Textarea
          rows={3}
          value={object.parameters.connectionNotes ?? ''}
          onChange={(event) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                connectionNotes: event.target.value,
              },
            })
          }
        />
      </Field>

      <Field label="Notes">
        <Textarea
          rows={3}
          value={object.metadata.notes ?? ''}
          onChange={(event) =>
            updateObject({
              ...object,
              metadata: {
                ...object.metadata,
                notes: event.target.value,
              },
            })
          }
        />
      </Field>
    </div>
  );
}
