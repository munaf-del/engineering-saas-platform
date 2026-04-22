import * as React from 'react';
import type { DraftingAnchorTiebackObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { rebuildAnchorTiebackObject } from '../semantic-object-utils';
import { Field, NumberField, OptionalNumberField } from './common-object-properties';

export function AnchorTiebackProperties({
  object,
  onUpdate,
}: {
  object: DraftingAnchorTiebackObject;
  onUpdate: (nextObject: DraftingAnchorTiebackObject) => void;
}) {
  function updateObject(nextObject: DraftingAnchorTiebackObject) {
    onUpdate(
      rebuildAnchorTiebackObject({
        ...nextObject,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Head X (mm)"
          value={object.geometry.headPoint.x}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                headPoint: { ...object.geometry.headPoint, x: value },
              },
            })
          }
        />
        <NumberField
          label="Head Y (mm)"
          value={object.geometry.headPoint.y}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                headPoint: { ...object.geometry.headPoint, y: value },
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Anchor ID">
          <Input
            value={object.parameters.anchorId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  anchorId: event.target.value,
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
          label="Angle (deg)"
          value={object.parameters.angleDeg}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                angleDeg: value,
              },
            })
          }
        />
        <NumberField
          label="Plan Length (mm)"
          value={object.parameters.planLengthMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                planLengthMm: value,
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalNumberField
          label="Free Length (mm)"
          value={object.parameters.freeLengthMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                freeLengthMm: value,
              },
            })
          }
        />
        <OptionalNumberField
          label="Bond Length (mm)"
          value={object.parameters.bondLengthMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                bondLengthMm: value,
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalNumberField
          label="Design Load (kN)"
          value={object.parameters.designLoadKn}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                designLoadKn: value,
              },
            })
          }
        />
        <OptionalNumberField
          label="Lock-Off Load (kN)"
          value={object.parameters.lockOffLoadKn}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                lockOffLoadKn: value,
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Stage">
          <Input
            value={object.parameters.stage ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  stage: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Installation Stage">
          <Input
            value={object.metadata.installationStage ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  installationStage: event.target.value,
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
