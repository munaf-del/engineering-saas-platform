import * as React from 'react';
import type { DraftingLayer, DraftingObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DraftingCommonObjectProperties({
  layers,
  object,
  onUpdate,
}: {
  layers: DraftingLayer[];
  object: DraftingObject;
  onUpdate: (nextObject: DraftingObject) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input
            value={object.name ?? ''}
            onChange={(event) =>
              onUpdate({
                ...object,
                name: event.target.value,
                updatedAt: new Date().toISOString(),
              })
            }
          />
        </Field>

        <Field label="Layer">
          <Select
            value={object.layerId}
            onValueChange={(value) =>
              onUpdate({
                ...object,
                layerId: value as DraftingObject['layerId'],
                updatedAt: new Date().toISOString(),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layers.map((layer) => (
                <SelectItem key={layer.id} value={layer.id}>
                  {layer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Stroke">
          <Input
            type="color"
            value={normalizeColorInput(object.style?.stroke, '#334155')}
            onChange={(event) =>
              onUpdate({
                ...object,
                style: {
                  ...object.style,
                  stroke: event.target.value,
                },
                updatedAt: new Date().toISOString(),
              })
            }
          />
        </Field>

        <Field label="Fill">
          <Input
            type="color"
            value={normalizeColorInput(object.style?.fill, '#ffffff')}
            onChange={(event) =>
              onUpdate({
                ...object,
                style: {
                  ...object.style,
                  fill: event.target.value,
                },
                updatedAt: new Date().toISOString(),
              })
            }
          />
        </Field>
      </div>
    </>
  );
}

export function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function NumberField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: number) => void;
  value: number | string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isFinite(nextValue)) {
            onChange(nextValue);
          }
        }}
      />
    </Field>
  );
}

export function OptionalNumberField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: number | undefined) => void;
  value: number | string | undefined;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value === '') {
            onChange(undefined);
            return;
          }

          const nextValue = Number(event.target.value);
          if (Number.isFinite(nextValue)) {
            onChange(nextValue);
          }
        }}
      />
    </Field>
  );
}

export function normalizeColorInput(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
    return value;
  }

  return fallback;
}
