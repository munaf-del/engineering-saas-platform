import * as React from 'react';
import type { DraftingExcavationLineObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, NumberField } from './common-object-properties';

export function ExcavationLineProperties({
  object,
  onUpdate,
}: {
  object: DraftingExcavationLineObject;
  onUpdate: (nextObject: DraftingExcavationLineObject) => void;
}) {
  const now = new Date().toISOString();

  return (
    <div className="space-y-4">
      <Field label="Excavation ID">
        <Input
          value={object.metadata.excavationId ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                excavationId: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>

      <Field label="Stage">
        <Input
          value={object.metadata.stage ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                stage: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>

      <div className="space-y-3">
        <Field label="Polyline Points (mm)">
          <div className="space-y-3">
            {object.geometry.points.map((point, index) => (
              <div key={`${object.id}-point-${index}`} className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label={`Point ${index + 1} X`}
                  value={point.x}
                  onChange={(value) =>
                    onUpdate({
                      ...object,
                      geometry: {
                        ...object.geometry,
                        points: object.geometry.points.map((existingPoint, pointIndex) =>
                          pointIndex === index ? { ...existingPoint, x: value } : existingPoint,
                        ),
                      },
                      updatedAt: now,
                    })
                  }
                />
                <NumberField
                  label={`Point ${index + 1} Y`}
                  value={point.y}
                  onChange={(value) =>
                    onUpdate({
                      ...object,
                      geometry: {
                        ...object.geometry,
                        points: object.geometry.points.map((existingPoint, pointIndex) =>
                          pointIndex === index ? { ...existingPoint, y: value } : existingPoint,
                        ),
                      },
                      updatedAt: now,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </Field>
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
