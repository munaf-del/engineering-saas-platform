import * as React from 'react';
import type { DraftingProjectGridBubblePlacement, DraftingProjectGridObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, NumberField, finiteNumberOrDefault } from './common-object-properties';
import { inferProjectGridSpacing, rebuildProjectGridObjectLines } from '../tools/project-grid-tool';

export function ProjectGridProperties({
  disabled = false,
  object,
  onUpdate,
}: {
  disabled?: boolean;
  object: DraftingProjectGridObject;
  onUpdate: (nextObject: DraftingProjectGridObject) => void;
}) {
  const xSpacing = inferProjectGridSpacing(object.geometry.xLines);
  const ySpacing = inferProjectGridSpacing(object.geometry.yLines);
  const xLabels = object.geometry.xLines.map((line) => line.label).join(', ');
  const yLabels = object.geometry.yLines.map((line) => line.label).join(', ');
  const majorEvery = object.metadata.majorEvery ?? 1;

  function updateObject(patch: Partial<DraftingProjectGridObject>) {
    onUpdate({
      ...object,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  function updateGeometry(patch: Partial<DraftingProjectGridObject['geometry']>) {
    updateObject({
      geometry: {
        ...object.geometry,
        ...patch,
      },
    });
  }

  function updateMetadata(patch: Partial<DraftingProjectGridObject['metadata']>) {
    updateObject({
      metadata: {
        ...object.metadata,
        ...patch,
      },
    });
  }

  function rebuildLines(args: Omit<Parameters<typeof rebuildProjectGridObjectLines>[0], 'object'>) {
    onUpdate(rebuildProjectGridObjectLines({ ...args, object }));
  }

  return (
    <div className="space-y-4">
      {disabled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Grid geometry and style edits are disabled while the object or layer is locked.
        </div>
      ) : null}

      <GridPropertyGroup title="Project Grid Reference">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Grid ID">
            <Input
              disabled={disabled}
              value={object.metadata.gridId}
              onChange={(event) => updateMetadata({ gridId: event.target.value || 'GRID' })}
            />
          </Field>
          <NumberField
            disabled={disabled}
            label="Origin X"
            value={object.geometry.origin.x}
            onChange={(value) =>
              updateGeometry({ origin: { ...object.geometry.origin, x: value } })
            }
          />
          <NumberField
            disabled={disabled}
            label="Origin Y"
            value={object.geometry.origin.y}
            onChange={(value) =>
              updateGeometry({ origin: { ...object.geometry.origin, y: value } })
            }
          />
          <NumberField
            disabled={disabled}
            label="Rotation deg"
            value={object.geometry.rotationDeg}
            onChange={(value) => updateGeometry({ rotationDeg: value })}
          />
          <NumberField
            disabled={disabled}
            label="Module size mm"
            value={object.metadata.moduleSizeMm}
            onChange={(value) =>
              rebuildLines({ moduleSizeMm: Math.max(1, finiteNumberOrDefault(value, 100)) })
            }
          />
          <Field label="Module notation">
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
        <p className="text-xs text-muted-foreground">
          Modular grid style references are drafting aids and require project verification before
          issue.
        </p>
      </GridPropertyGroup>

      <GridPropertyGroup title="Lines / Spacing">
        <div className="grid gap-4 lg:grid-cols-2">
          <GridAxisEditor
            disabled={disabled}
            labels={xLabels}
            lineCount={object.geometry.xLines.length}
            spacing={xSpacing}
            title="X direction labels"
            onLabelsChange={(labels) =>
              rebuildLines({ xLabels: labels, xLineCount: labels.length })
            }
            onLineCountChange={(count) => rebuildLines({ xLineCount: count })}
            onSpacingChange={(spacing) => rebuildLines({ xSpacingMm: spacing })}
          />
          <GridAxisEditor
            disabled={disabled}
            labels={yLabels}
            lineCount={object.geometry.yLines.length}
            spacing={ySpacing}
            title="Y direction labels"
            onLabelsChange={(labels) =>
              rebuildLines({ yLabels: labels, yLineCount: labels.length })
            }
            onLineCountChange={(count) => rebuildLines({ yLineCount: count })}
            onSpacingChange={(spacing) => rebuildLines({ ySpacingMm: spacing })}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField
            disabled={disabled}
            label="Major every N lines"
            value={majorEvery}
            onChange={(value) =>
              rebuildLines({ majorEvery: Math.max(1, finiteNumberOrDefault(value, 1)) })
            }
          />
          <NumberField
            disabled={disabled}
            label="Bubble radius mm"
            value={object.metadata.bubbleRadiusMm}
            onChange={(value) => updateMetadata({ bubbleRadiusMm: Math.max(1, value) })}
          />
          <Field label="Bubble placement">
            <Select
              disabled={disabled}
              value={object.metadata.bubblePlacement}
              onValueChange={(value) =>
                rebuildLines({ bubblePlacement: value as DraftingProjectGridBubblePlacement })
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
        </div>
      </GridPropertyGroup>

      <GridPropertyGroup title="Notes">
        <Field label="Project notes">
          <textarea
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={disabled}
            value={object.metadata.note ?? ''}
            onChange={(event) => updateMetadata({ note: event.target.value })}
          />
        </Field>
      </GridPropertyGroup>
    </div>
  );
}

function GridPropertyGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-3">
      <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h5>
      {children}
    </div>
  );
}

function GridAxisEditor({
  disabled,
  labels,
  lineCount,
  onLabelsChange,
  onLineCountChange,
  onSpacingChange,
  spacing,
  title,
}: {
  disabled?: boolean;
  labels: string;
  lineCount: number;
  onLabelsChange: (labels: string[]) => void;
  onLineCountChange: (count: number) => void;
  onSpacingChange: (spacing: number) => void;
  spacing: number;
  title: string;
}) {
  return (
    <div className="rounded-md border bg-muted/15 p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          disabled={disabled}
          label="Spacing mm"
          value={spacing}
          onChange={(value) => onSpacingChange(Math.max(1, value))}
        />
        <NumberField
          disabled={disabled}
          label="Line count"
          value={lineCount}
          onChange={(value) => onLineCountChange(Math.max(1, value))}
        />
      </div>
      <div className="mt-3 space-y-2">
        <Label>Labels</Label>
        <textarea
          className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
          disabled={disabled}
          value={labels}
          onChange={(event) => {
            const nextLabels = event.target.value
              .split(',')
              .map((label) => label.trim())
              .filter(Boolean);
            if (nextLabels.length > 0) {
              onLabelsChange(nextLabels);
            }
          }}
        />
      </div>
    </div>
  );
}
