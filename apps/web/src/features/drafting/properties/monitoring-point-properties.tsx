import * as React from 'react';
import { DRAFTING_MONITORING_TYPES, type DraftingMonitoringPointObject } from '@eng/shared';
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

export function MonitoringPointProperties({
  object,
  onUpdate,
}: {
  object: DraftingMonitoringPointObject;
  onUpdate: (nextObject: DraftingMonitoringPointObject) => void;
}) {
  const now = new Date().toISOString();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Point X (mm)"
          value={object.geometry.point.x}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                point: { ...object.geometry.point, x: value },
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Point Y (mm)"
          value={object.geometry.point.y}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                point: { ...object.geometry.point, y: value },
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <Field label="Monitoring ID">
        <Input
          value={object.metadata.pointId}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                pointId: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>

      <Field label="Monitoring Type">
        <Select
          value={object.metadata.monitoringType}
          onValueChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                monitoringType: value as DraftingMonitoringPointObject['metadata']['monitoringType'],
              },
              updatedAt: now,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DRAFTING_MONITORING_TYPES.map((monitoringType) => (
              <SelectItem key={monitoringType} value={monitoringType}>
                {monitoringType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

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
