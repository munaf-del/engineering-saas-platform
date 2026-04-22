import * as React from 'react';
import {
  DRAFTING_CALLOUT_ARROW_STYLES,
  DRAFTING_CALLOUT_LEADER_STYLES,
  type DraftingCalloutObject,
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
import { Field, NumberField } from './common-object-properties';

export function CalloutProperties({
  object,
  onUpdate,
}: {
  object: DraftingCalloutObject;
  onUpdate: (nextObject: DraftingCalloutObject) => void;
}) {
  function updateObject(nextObject: DraftingCalloutObject) {
    onUpdate({
      ...nextObject,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Anchor X (mm)"
          value={object.geometry.anchorPoint.x}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                anchorPoint: { ...object.geometry.anchorPoint, x: value },
              },
            })
          }
        />
        <NumberField
          label="Anchor Y (mm)"
          value={object.geometry.anchorPoint.y}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                anchorPoint: { ...object.geometry.anchorPoint, y: value },
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Label X (mm)"
          value={object.geometry.labelPoint.x}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                labelPoint: { ...object.geometry.labelPoint, x: value },
              },
            })
          }
        />
        <NumberField
          label="Label Y (mm)"
          value={object.geometry.labelPoint.y}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                labelPoint: { ...object.geometry.labelPoint, y: value },
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Callout ID">
          <Input
            value={object.parameters.calloutId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  calloutId: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Associated Object">
          <Input
            value={object.metadata.associatedObjectId ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  associatedObjectId: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

      <Field label="Title">
        <Input
          value={object.parameters.title}
          onChange={(event) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                title: event.target.value,
              },
            })
          }
        />
      </Field>

      <Field label="Body">
        <Textarea
          rows={4}
          value={object.parameters.body}
          onChange={(event) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                body: event.target.value,
              },
            })
          }
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Leader Style">
          <Select
            value={object.parameters.leaderStyle}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  leaderStyle: value as DraftingCalloutObject['parameters']['leaderStyle'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_CALLOUT_LEADER_STYLES.map((leaderStyle) => (
                <SelectItem key={leaderStyle} value={leaderStyle}>
                  {leaderStyle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Arrow Style">
          <Select
            value={object.parameters.arrowStyle}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  arrowStyle: value as DraftingCalloutObject['parameters']['arrowStyle'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_CALLOUT_ARROW_STYLES.map((arrowStyle) => (
                <SelectItem key={arrowStyle} value={arrowStyle}>
                  {arrowStyle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
