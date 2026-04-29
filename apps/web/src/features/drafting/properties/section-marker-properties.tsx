import * as React from 'react';
import { DRAFTING_SECTION_ARROW_DIRECTIONS, type DraftingSectionMarkerObject } from '@eng/shared';
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

export function SectionMarkerProperties({
  object,
  onUpdate,
}: {
  object: DraftingSectionMarkerObject;
  onUpdate: (nextObject: DraftingSectionMarkerObject) => void;
}) {
  function updateObject(nextObject: DraftingSectionMarkerObject) {
    onUpdate({
      ...nextObject,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Start X (mm)"
          value={object.geometry.startPoint.x}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                startPoint: { ...object.geometry.startPoint, x: value },
              },
            })
          }
        />
        <NumberField
          label="Start Y (mm)"
          value={object.geometry.startPoint.y}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                startPoint: { ...object.geometry.startPoint, y: value },
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="End X (mm)"
          value={object.geometry.endPoint.x}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                endPoint: { ...object.geometry.endPoint, x: value },
              },
            })
          }
        />
        <NumberField
          label="End Y (mm)"
          value={object.geometry.endPoint.y}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                ...object.geometry,
                endPoint: { ...object.geometry.endPoint, y: value },
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Section ID">
          <Input
            value={object.parameters.sectionId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  sectionId: event.target.value,
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
        <Field label="Sheet Reference">
          <Input
            value={object.parameters.sheetReference ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  sheetReference: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Arrow Direction">
          <Select
            value={object.parameters.arrowDirection}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  arrowDirection:
                    value as DraftingSectionMarkerObject['parameters']['arrowDirection'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_SECTION_ARROW_DIRECTIONS.map((direction) => (
                <SelectItem key={direction} value={direction}>
                  {direction}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Linked Drawing">
        <Input
          value={object.metadata.linkedDrawingId ?? ''}
          onChange={(event) =>
            updateObject({
              ...object,
              metadata: {
                ...object.metadata,
                linkedDrawingId: event.target.value,
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
