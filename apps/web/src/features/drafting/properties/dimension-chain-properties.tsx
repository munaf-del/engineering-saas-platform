import * as React from 'react';
import { DRAFTING_DIMENSION_UNITS, type DraftingDimensionChainObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, NumberField } from './common-object-properties';

export function DimensionChainProperties({
  object,
  onUpdate,
}: {
  object: DraftingDimensionChainObject;
  onUpdate: (nextObject: DraftingDimensionChainObject) => void;
}) {
  const witnessAnchorCount = object.metadata.witnessAnchorRefs?.length ?? 0;

  function updateObject(nextObject: DraftingDimensionChainObject) {
    onUpdate({
      ...nextObject,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dimension ID">
          <Input
            value={object.parameters.dimensionId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  dimensionId: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Display Unit">
          <Select
            value={object.parameters.unit}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  unit: value as DraftingDimensionChainObject['parameters']['unit'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_DIMENSION_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Precision"
          value={object.parameters.precision}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                precision: Math.max(0, Math.round(value)),
              },
            })
          }
        />
        <NumberField
          label="Offset Distance (mm)"
          value={object.geometry.offsetDistanceMm ?? 0}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                offsetDistanceMm: value,
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Show Segment Labels">
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              checked={object.parameters.showSegments}
              type="checkbox"
              onChange={(event) =>
                updateObject({
                  ...object,
                  parameters: {
                    ...object.parameters,
                    showSegments: event.target.checked,
                  },
                })
              }
            />
            Segment labels
          </label>
        </Field>
        <Field label="Show Total Label">
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              checked={object.parameters.showTotal}
              type="checkbox"
              onChange={(event) =>
                updateObject({
                  ...object,
                  parameters: {
                    ...object.parameters,
                    showTotal: event.target.checked,
                  },
                })
              }
            />
            Total label
          </label>
        </Field>
      </div>

      <Field label="Associativity">
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {witnessAnchorCount > 0
            ? `${witnessAnchorCount} snapped witness anchor(s). Fallback coordinates are retained if an anchor cannot be resolved.`
            : 'Manual dimension. Witness points are fixed coordinates until snapped to object geometry.'}
        </div>
      </Field>

      <Field label="Dimension Points (mm)">
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

      <Field label="Total Label Override">
        <Input
          value={object.parameters.textOverride ?? ''}
          onChange={(event) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                textOverride: event.target.value,
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
