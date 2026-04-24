import * as React from 'react';
import type { DraftingDisplayUnits, DraftingDrawingSetup, DraftingModel } from '@eng/shared';
import { Crosshair, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { updateDraftingDrawingSetup } from '../model-utils';

export function DraftingSetupPanel({
  model,
  onCenterViewOnReference,
  onModelChange,
  onSetReferenceToViewCentre,
}: {
  model: DraftingModel;
  onCenterViewOnReference: () => void;
  onModelChange: (model: DraftingModel) => void;
  onSetReferenceToViewCentre: () => void;
}) {
  const setup = model.drawingSetup!;
  const reference = setup.referencePoint;

  function patchSetup(updater: (setup: DraftingDrawingSetup) => DraftingDrawingSetup) {
    onModelChange(updateDraftingDrawingSetup(model, updater));
  }

  function patchReference(patch: Partial<DraftingDrawingSetup['referencePoint']>) {
    patchSetup((current) => ({
      ...current,
      referencePoint: {
        ...current.referencePoint,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function patchSitePoint(patch: Partial<NonNullable<typeof reference.sitePoint>>) {
    patchReference({
      sitePoint: {
        ...(reference.sitePoint ?? {}),
        ...patch,
      },
    });
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-md border p-3">
        <div>
          <div className="text-sm font-medium">Reference Point / Survey Mark</div>
          <div className="text-xs text-muted-foreground">
            Changing site coordinates updates the coordinate mapping only. Drawing objects are not
            moved.
          </div>
        </div>

        <LabeledInput
          id="drafting-reference-label"
          label="Label"
          value={reference.label}
          onChange={(value) => patchReference({ label: value || 'Model origin / survey mark' })}
        />

        <div className="grid grid-cols-3 gap-2">
          <ReadonlyMetric label="X" value={`${reference.modelPoint.x.toFixed(0)} mm`} />
          <ReadonlyMetric label="Y" value={`${reference.modelPoint.y.toFixed(0)} mm`} />
          <ReadonlyMetric label="Z" value={`${reference.modelPoint.z.toFixed(0)} mm`} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <NumberInput
            id="drafting-reference-easting"
            label="Easting"
            value={reference.sitePoint?.easting}
            onChange={(value) => patchSitePoint({ easting: value })}
          />
          <NumberInput
            id="drafting-reference-northing"
            label="Northing"
            value={reference.sitePoint?.northing}
            onChange={(value) => patchSitePoint({ northing: value })}
          />
          <NumberInput
            id="drafting-reference-elevation"
            label="RL"
            value={reference.sitePoint?.elevation}
            onChange={(value) => patchSitePoint({ elevation: value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <LabeledInput
            id="drafting-reference-datum"
            label="Datum"
            value={reference.datum ?? ''}
            onChange={(value) => patchReference({ datum: value })}
          />
          <LabeledInput
            id="drafting-reference-coordinate-system"
            label="Coordinate system"
            value={reference.coordinateSystem ?? ''}
            onChange={(value) => patchReference({ coordinateSystem: value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="drafting-reference-description">Description</Label>
          <Textarea
            id="drafting-reference-description"
            value={reference.description ?? ''}
            onChange={(event) => patchReference({ description: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" type="button" variant="outline" onClick={onCenterViewOnReference}>
            <LocateFixed className="mr-2 h-4 w-4" />
            Centre view on reference
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={onSetReferenceToViewCentre}>
            <Crosshair className="mr-2 h-4 w-4" />
            Set reference to current view centre
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-md border p-3">
        <div>
          <div className="text-sm font-medium">North</div>
          <div className="text-xs text-muted-foreground">
            Model +Y is project north at 0 deg. Positive angles rotate clockwise.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            id="drafting-project-north"
            label="Project north"
            value={setup.north.projectNorthAngleDeg}
            onChange={(value) =>
              patchSetup((current) => ({
                ...current,
                north: { ...current.north, projectNorthAngleDeg: value ?? 0 },
              }))
            }
          />
          <NumberInput
            id="drafting-true-north"
            label="True north"
            value={setup.north.trueNorthAngleDeg}
            onChange={(value) =>
              patchSetup((current) => ({
                ...current,
                north: { ...current.north, trueNorthAngleDeg: value ?? 0 },
              }))
            }
          />
        </div>
        <CheckboxRow
          checked={setup.north.showProjectNorth}
          id="drafting-show-project-north"
          label="Show project north"
          onChange={(checked) =>
            patchSetup((current) => ({
              ...current,
              north: { ...current.north, showProjectNorth: checked },
            }))
          }
        />
        <CheckboxRow
          checked={setup.north.showTrueNorth}
          id="drafting-show-true-north"
          label="Show true north"
          onChange={(checked) =>
            patchSetup((current) => ({
              ...current,
              north: { ...current.north, showTrueNorth: checked },
            }))
          }
        />
      </section>

      <section className="space-y-3 rounded-md border p-3">
        <div className="text-sm font-medium">Units, Scale, Graphics</div>
        <div className="grid grid-cols-2 gap-2">
          <ReadonlyMetric label="Model units" value={setup.modelUnits} />
          <div className="space-y-1">
            <Label htmlFor="drafting-display-units">Display units</Label>
            <Select
              value={setup.displayUnits}
              onValueChange={(value) =>
                patchSetup((current) => ({
                  ...current,
                  displayUnits: value as DraftingDisplayUnits,
                }))
              }
            >
              <SelectTrigger id="drafting-display-units">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m">m</SelectItem>
                <SelectItem value="mm">mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput
            id="drafting-default-sheet-scale"
            label="Default sheet scale"
            value={setup.scale.defaultSheetScale}
            onChange={(value) =>
              patchSetup((current) => ({
                ...current,
                scale: { ...current.scale, defaultSheetScale: value || '1:100' },
              }))
            }
          />
          <NumberInput
            id="drafting-default-line-weight"
            label="Line weight mm"
            step="0.05"
            value={setup.graphics.defaultLineWeightMm}
            onChange={(value) =>
              patchSetup((current) => ({
                ...current,
                graphics: {
                  ...current.graphics,
                  defaultLineWeightMm: Math.max(0.05, value ?? 0.25),
                },
              }))
            }
          />
        </div>
        <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {setup.standardsNote}
        </div>
      </section>
    </div>
  );
}

function LabeledInput({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function NumberInput({
  id,
  label,
  onChange,
  step = '0.001',
  value,
}: {
  id: string;
  label: string;
  onChange: (value: number | undefined) => void;
  step?: string;
  value?: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        step={step}
        type="number"
        value={value ?? ''}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
      />
    </div>
  );
}

function ReadonlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-2 py-1">
      <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className="truncate text-sm">{value}</div>
    </div>
  );
}

function CheckboxRow({
  checked,
  id,
  label,
  onChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm" htmlFor={id}>
      <input
        checked={checked}
        className="h-4 w-4 rounded border-border"
        id={id}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
