import * as React from 'react';
import {
  DRAFTING_SECANT_PRIMARY_SECONDARY_PATTERNS,
  DRAFTING_SECANT_TYPES,
  type DraftingSecantPileWallObject,
} from '@eng/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { rebuildSecantPileWallObject } from '../semantic-object-utils';
import { Field, NumberField, OptionalNumberField } from './common-object-properties';

export function SecantPileWallProperties({
  object,
  onUpdate,
}: {
  object: DraftingSecantPileWallObject;
  onUpdate: (nextObject: DraftingSecantPileWallObject) => void;
}) {
  function updateObject(nextObject: DraftingSecantPileWallObject) {
    onUpdate(
      rebuildSecantPileWallObject({
        ...nextObject,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Wall ID">
          <Input
            value={object.metadata.wallId}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  wallId: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Construction Method">
          <Input
            value={object.metadata.constructionMethod}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  constructionMethod: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Pile Diameter (mm)"
          value={object.parameters.pileDiameterMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                pileDiameterMm: value,
              },
            })
          }
        />
        <NumberField
          label="Spacing (mm)"
          value={object.parameters.spacingMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                spacingMm: value,
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalNumberField
          label="Overlap (mm)"
          value={object.parameters.overlapMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                overlapMm: value,
              },
            })
          }
        />
        <Field label="Secant Type">
          <Select
            value={object.parameters.secantType ?? 'overlapping'}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  secantType: value as DraftingSecantPileWallObject['parameters']['secantType'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_SECANT_TYPES.map((secantType) => (
                <SelectItem key={secantType} value={secantType}>
                  {secantType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Primary / Secondary Pattern">
        <Select
          value={object.parameters.primarySecondaryPattern}
          onValueChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                primarySecondaryPattern:
                  value as DraftingSecantPileWallObject['parameters']['primarySecondaryPattern'],
              },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DRAFTING_SECANT_PRIMARY_SECONDARY_PATTERNS.map((pattern) => (
              <SelectItem key={pattern} value={pattern}>
                {pattern}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
        Generated pile count: {object.metadata.pileCount}
      </div>

      <Field label="Baseline Points (mm)">
        <div className="space-y-3">
          {object.geometry.baselinePoints.map((point, index) => (
            <div key={`${object.id}-baseline-${index}`} className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label={`Point ${index + 1} X`}
                value={point.x}
                onChange={(value) =>
                  updateObject({
                    ...object,
                    geometry: {
                      ...object.geometry,
                      baselinePoints: object.geometry.baselinePoints.map(
                        (existingPoint, pointIndex) =>
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
                      baselinePoints: object.geometry.baselinePoints.map(
                        (existingPoint, pointIndex) =>
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

      <Field label="Design Notes">
        <Textarea
          rows={3}
          value={object.metadata.designNotes ?? ''}
          onChange={(event) =>
            updateObject({
              ...object,
              metadata: {
                ...object.metadata,
                designNotes: event.target.value,
              },
            })
          }
        />
      </Field>
    </div>
  );
}
