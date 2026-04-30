import * as React from 'react';
import type {
  DraftingProjectGridBubblePlacement,
  DraftingProjectGridLineAxis,
  DraftingProjectGridLineObject,
  DraftingProjectGridLineRole,
} from '@eng/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, NumberField, finiteNumberOrDefault } from './common-object-properties';

export function ProjectGridLineProperties({
  disabled = false,
  object,
  onUpdate,
}: {
  disabled?: boolean;
  object: DraftingProjectGridLineObject;
  onUpdate: (nextObject: DraftingProjectGridLineObject) => void;
}) {
  function updateObject(patch: Partial<DraftingProjectGridLineObject>) {
    onUpdate({
      ...object,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  function updateGeometry(patch: Partial<DraftingProjectGridLineObject['geometry']>) {
    updateObject({
      geometry: {
        ...object.geometry,
        ...patch,
      },
    });
  }

  function updateMetadata(patch: Partial<DraftingProjectGridLineObject['metadata']>) {
    updateObject({
      metadata: {
        ...object.metadata,
        ...patch,
      },
    });
  }

  function setOptionalMetadata<K extends keyof DraftingProjectGridLineObject['metadata']>(
    key: K,
    value: DraftingProjectGridLineObject['metadata'][K] | undefined,
  ) {
    const nextMetadata = { ...object.metadata };
    if (value === undefined || value === '') {
      delete nextMetadata[key];
    } else {
      nextMetadata[key] = value;
    }
    updateObject({ metadata: nextMetadata });
  }

  return (
    <div className="space-y-4">
      {disabled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Grid line geometry and style edits are disabled while the object or layer is locked.
        </div>
      ) : null}

      <GridLinePropertyGroup title="Project Grid Line">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Grid line ID">
            <Input
              disabled={disabled}
              value={object.metadata.gridLineId}
              onChange={(event) =>
                updateMetadata({ gridLineId: event.target.value || 'GRID-LINE' })
              }
            />
          </Field>
          <Field label="Label">
            <Input
              disabled={disabled}
              value={object.metadata.label}
              onChange={(event) => updateMetadata({ label: event.target.value || 'A' })}
            />
          </Field>
          <Field label="Axis">
            <Select
              disabled={disabled}
              value={object.metadata.axis}
              onValueChange={(value) =>
                updateMetadata({ axis: value as DraftingProjectGridLineAxis })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x">X / vertical reference</SelectItem>
                <SelectItem value="y">Y / horizontal reference</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </GridLinePropertyGroup>

      <GridLinePropertyGroup title="Geometry">
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField
            disabled={disabled}
            label="Start X"
            value={object.geometry.start.x}
            onChange={(value) => updateGeometry({ start: { ...object.geometry.start, x: value } })}
          />
          <NumberField
            disabled={disabled}
            label="Start Y"
            value={object.geometry.start.y}
            onChange={(value) => updateGeometry({ start: { ...object.geometry.start, y: value } })}
          />
          <NumberField
            disabled={disabled}
            label="End X"
            value={object.geometry.end.x}
            onChange={(value) => updateGeometry({ end: { ...object.geometry.end, x: value } })}
          />
          <NumberField
            disabled={disabled}
            label="End Y"
            value={object.geometry.end.y}
            onChange={(value) => updateGeometry({ end: { ...object.geometry.end, y: value } })}
          />
        </div>
      </GridLinePropertyGroup>

      <GridLinePropertyGroup title="Reference Style">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Line role">
            <Select
              disabled={disabled}
              value={object.metadata.lineRole}
              onValueChange={(value) =>
                updateMetadata({ lineRole: value as DraftingProjectGridLineRole })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="axis">Axis</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Bubble placement">
            <Select
              disabled={disabled}
              value={object.metadata.bubblePlacement}
              onValueChange={(value) =>
                updateMetadata({ bubblePlacement: value as DraftingProjectGridBubblePlacement })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both ends</SelectItem>
                <SelectItem value="start">Start only</SelectItem>
                <SelectItem value="end">End only</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <NumberField
            disabled={disabled}
            label="Bubble radius mm"
            value={object.metadata.bubbleRadiusMm}
            onChange={(value) => updateMetadata({ bubbleRadiusMm: Math.max(1, value) })}
          />
          <NumberField
            disabled={disabled}
            label="Module size mm"
            value={object.metadata.moduleSizeMm}
            onChange={(value) =>
              updateMetadata({ moduleSizeMm: Math.max(1, finiteNumberOrDefault(value, 100)) })
            }
          />
          <Field label="Module notation">
            <Input
              disabled={disabled}
              value={object.metadata.moduleNotation ?? ''}
              onChange={(event) =>
                setOptionalMetadata('moduleNotation', event.target.value || undefined)
              }
            />
          </Field>
          <Field label="Show notation">
            <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
              <input
                checked={object.metadata.showModuleNotation ?? false}
                disabled={disabled}
                type="checkbox"
                onChange={(event) => updateMetadata({ showModuleNotation: event.target.checked })}
              />
              Show M notation
            </label>
          </Field>
        </div>
      </GridLinePropertyGroup>

      <GridLinePropertyGroup title="Grid Set Metadata">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Grid set name">
            <Input
              disabled={disabled}
              value={object.metadata.gridSetName ?? ''}
              onChange={(event) =>
                setOptionalMetadata('gridSetName', event.target.value || undefined)
              }
            />
          </Field>
          <Field label="Grid set ID">
            <Input disabled value={object.metadata.gridSetId ?? 'Independent line'} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Grid set metadata records how the line was first estimated. Each grid line remains an
          independent editable object.
        </p>
      </GridLinePropertyGroup>

      <GridLinePropertyGroup title="Notes">
        <Field label="Project notes">
          <textarea
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={disabled}
            value={object.metadata.notes ?? ''}
            onChange={(event) => updateMetadata({ notes: event.target.value })}
          />
        </Field>
      </GridLinePropertyGroup>
    </div>
  );
}

function GridLinePropertyGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-3">
      <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h5>
      {children}
    </div>
  );
}
