import * as React from 'react';
import type { DraftingBoreholeObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, NumberField, OptionalNumberField } from './common-object-properties';

export function BoreholeProperties({
  object,
  onUpdate,
}: {
  object: DraftingBoreholeObject;
  onUpdate: (nextObject: DraftingBoreholeObject) => void;
}) {
  function updateObject(nextObject: DraftingBoreholeObject) {
    onUpdate({
      ...nextObject,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Point X (mm)"
          value={object.geometry.point.x}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                point: { ...object.geometry.point, x: value },
              },
            })
          }
        />
        <NumberField
          label="Point Y (mm)"
          value={object.geometry.point.y}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                point: { ...object.geometry.point, y: value },
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Borehole ID">
          <Input
            value={object.parameters.boreholeId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  boreholeId: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Label">
          <Input
            value={object.parameters.label}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  label: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalNumberField
          label="Ground Level RL"
          value={object.parameters.groundLevelRl}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                groundLevelRl: value,
              },
            })
          }
        />
        <OptionalNumberField
          label="Termination Depth (m)"
          value={object.parameters.terminationDepthM}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                terminationDepthM: value,
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalNumberField
          label="Termination Level RL"
          value={object.parameters.terminationLevelRl}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                terminationLevelRl: value,
              },
            })
          }
        />
        <Field label="Borehole Type">
          <Input
            value={object.parameters.boreholeType ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  boreholeType: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Linked Geotech Entity">
          <Input
            value={object.metadata.linkedGeotechEntityId ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  linkedGeotechEntityId: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Source Reference">
          <Input
            value={object.metadata.sourceReference ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  sourceReference: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

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
