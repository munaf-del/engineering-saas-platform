import * as React from 'react';
import {
  DRAFTING_SERVICE_STATUSES,
  DRAFTING_SERVICE_TYPES,
  type DraftingServiceRunObject,
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
import { Field, NumberField, OptionalNumberField } from './common-object-properties';

export function ServiceRunProperties({
  object,
  onUpdate,
}: {
  object: DraftingServiceRunObject;
  onUpdate: (nextObject: DraftingServiceRunObject) => void;
}) {
  function updateObject(nextObject: DraftingServiceRunObject) {
    onUpdate({
      ...nextObject,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service ID">
          <Input
            value={object.parameters.serviceId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  serviceId: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Authority">
          <Input
            value={object.parameters.authority ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  authority: event.target.value,
                },
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service Type">
          <Select
            value={object.parameters.serviceType}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  serviceType: value as DraftingServiceRunObject['parameters']['serviceType'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_SERVICE_TYPES.map((serviceType) => (
                <SelectItem key={serviceType} value={serviceType}>
                  {serviceType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={object.parameters.status}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  status: value as DraftingServiceRunObject['parameters']['status'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_SERVICE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <OptionalNumberField
          label="Diameter (mm)"
          value={object.parameters.diameterMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                diameterMm: value,
              },
            })
          }
        />
        <OptionalNumberField
          label="Depth (m)"
          value={object.parameters.depthM}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                depthM: value,
              },
            })
          }
        />
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
      </div>

      <Field label="Path Points (mm)">
        <div className="space-y-3">
          {object.geometry.path.map((point, index) => (
            <div key={`${object.id}-path-${index}`} className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label={`Point ${index + 1} X`}
                value={point.x}
                onChange={(value) =>
                  updateObject({
                    ...object,
                    geometry: {
                      ...object.geometry,
                      path: object.geometry.path.map((existingPoint, pointIndex) =>
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
                      path: object.geometry.path.map((existingPoint, pointIndex) =>
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

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="Survey Confidence">
          <Input
            value={object.metadata.surveyConfidence ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  surveyConfidence: event.target.value,
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
