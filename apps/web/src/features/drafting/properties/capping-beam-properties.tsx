import * as React from 'react';
import type { DraftingCappingBeamObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, NumberField, OptionalNumberField } from './common-object-properties';

export function CappingBeamProperties({
  object,
  onUpdate,
}: {
  object: DraftingCappingBeamObject;
  onUpdate: (nextObject: DraftingCappingBeamObject) => void;
}) {
  function updateObject(nextObject: DraftingCappingBeamObject) {
    onUpdate({
      ...nextObject,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Beam ID">
          <Input
            value={object.parameters.beamId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  beamId: event.target.value,
                },
              })
            }
          />
        </Field>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Width (mm)"
          value={object.parameters.widthMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                widthMm: value,
              },
            })
          }
        />
        <OptionalNumberField
          label="Depth (mm)"
          value={object.parameters.depthMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                depthMm: value,
              },
            })
          }
        />
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
        <Field label="Concrete Grade">
          <Input
            value={object.parameters.concreteGrade ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  concreteGrade: event.target.value,
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
