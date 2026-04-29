import * as React from 'react';
import type { DraftingSoldierPileWallObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { rebuildSoldierPileWallObject } from '../semantic-object-utils';
import { Field, NumberField, OptionalNumberField } from './common-object-properties';

export function SoldierPileWallProperties({
  object,
  onUpdate,
}: {
  object: DraftingSoldierPileWallObject;
  onUpdate: (nextObject: DraftingSoldierPileWallObject) => void;
}) {
  function updateObject(nextObject: DraftingSoldierPileWallObject) {
    onUpdate(
      rebuildSoldierPileWallObject({
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
        <OptionalNumberField
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
        <Field label="Section Label">
          <Input
            value={object.parameters.sectionLabel ?? ''}
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
        <Field label="Lagging Type">
          <Input
            value={object.parameters.laggingType ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  laggingType: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

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

      <Field label="Embedment Note">
        <Textarea
          rows={3}
          value={object.parameters.embedmentNote ?? ''}
          onChange={(event) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                embedmentNote: event.target.value,
              },
            })
          }
        />
      </Field>
    </div>
  );
}
