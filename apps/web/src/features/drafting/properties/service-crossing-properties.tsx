import * as React from 'react';
import {
  DRAFTING_SERVICE_CONFLICT_TYPES,
  DRAFTING_SERVICE_RISK_STATUSES,
  DRAFTING_SERVICE_TYPES,
  type DraftingServiceCrossingObject,
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

export function ServiceCrossingProperties({
  object,
  onUpdate,
}: {
  object: DraftingServiceCrossingObject;
  onUpdate: (nextObject: DraftingServiceCrossingObject) => void;
}) {
  function updateObject(nextObject: DraftingServiceCrossingObject) {
    onUpdate({
      ...nextObject,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Crossing X (mm)"
          value={object.geometry.crossingPoint.x}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                crossingPoint: { ...object.geometry.crossingPoint, x: value },
              },
            })
          }
        />
        <NumberField
          label="Crossing Y (mm)"
          value={object.geometry.crossingPoint.y}
          onChange={(value) =>
            updateObject({
              ...object,
              geometry: {
                crossingPoint: { ...object.geometry.crossingPoint, y: value },
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Crossing ID">
          <Input
            value={object.parameters.crossingId}
            onChange={(event) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  crossingId: event.target.value,
                },
              })
            }
          />
        </Field>
        <OptionalNumberField
          label="Clearance (mm)"
          value={object.parameters.clearanceMm}
          onChange={(value) =>
            updateObject({
              ...object,
              parameters: {
                ...object.parameters,
                clearanceMm: value,
              },
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Service Type">
          <Select
            value={object.parameters.serviceType}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  serviceType: value as DraftingServiceCrossingObject['parameters']['serviceType'],
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
        <Field label="Conflict Type">
          <Select
            value={object.parameters.conflictType}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  conflictType:
                    value as DraftingServiceCrossingObject['parameters']['conflictType'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_SERVICE_CONFLICT_TYPES.map((conflictType) => (
                <SelectItem key={conflictType} value={conflictType}>
                  {conflictType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Risk Status">
          <Select
            value={object.parameters.riskStatus}
            onValueChange={(value) =>
              updateObject({
                ...object,
                parameters: {
                  ...object.parameters,
                  riskStatus: value as DraftingServiceCrossingObject['parameters']['riskStatus'],
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_SERVICE_RISK_STATUSES.map((riskStatus) => (
                <SelectItem key={riskStatus} value={riskStatus}>
                  {riskStatus}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Linked Service Run">
          <Input
            value={object.metadata.linkedServiceRunId ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  linkedServiceRunId: event.target.value,
                },
              })
            }
          />
        </Field>
        <Field label="Linked Object">
          <Input
            value={object.metadata.linkedObjectId ?? ''}
            onChange={(event) =>
              updateObject({
                ...object,
                metadata: {
                  ...object.metadata,
                  linkedObjectId: event.target.value,
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
