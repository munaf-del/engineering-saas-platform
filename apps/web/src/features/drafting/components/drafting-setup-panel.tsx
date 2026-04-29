import * as React from 'react';
import type {
  DraftingDisciplineProfileId,
  DraftingDisplayUnits,
  DraftingDrawingSetup,
  DraftingModel,
  DraftingSheetSizePreset,
  DraftingStandardProfileId,
} from '@eng/shared';
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
import {
  DRAFTING_SCALE_PRESETS,
  DRAFTING_SHEET_PRESETS,
  DRAFTING_STANDARD_PROFILES,
  getDraftingStandardProfile,
} from '../standards/drafting-standard-profiles';

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
  const activeProfile = getDraftingStandardProfile(setup.activeStandardProfileId);

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
          <div className="text-sm font-medium">Profile-driven drafting defaults</div>
          <div className="text-xs text-muted-foreground">
            Canvas zoom is separate from plotted sheet scale. Line weights are rendered from profile
            roles.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="drafting-standard-profile">Drafting standard profile</Label>
            <Select
              value={setup.activeStandardProfileId}
              onValueChange={(value) => {
                const profile = getDraftingStandardProfile(value);
                patchSetup((current) => ({
                  ...current,
                  activeStandardProfileId: profile.id as DraftingStandardProfileId,
                  disciplineProfileId: profile.disciplineProfileId,
                  profileVersion: profile.version,
                  lineWeightTableId: profile.lineWeightTableId,
                  lineStyleTableId: profile.lineStyleTableId,
                  scale: {
                    ...current.scale,
                    allowedScales: profile.scalePresets,
                  },
                }));
              }}
            >
              <SelectTrigger id="drafting-standard-profile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRAFTING_STANDARD_PROFILES.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="drafting-discipline-profile">Discipline profile</Label>
            <Select
              value={setup.disciplineProfileId}
              onValueChange={(value) =>
                patchSetup((current) => ({
                  ...current,
                  disciplineProfileId: value as DraftingDisciplineProfileId,
                }))
              }
            >
              <SelectTrigger id="drafting-discipline-profile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="survey-control">Survey / Control</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="drafting-default-sheet-size">Default sheet size</Label>
            <Select
              value={setup.defaultSheetSize}
              onValueChange={(value) =>
                patchSetup((current) => ({
                  ...current,
                  defaultSheetSize: value as DraftingSheetSizePreset,
                }))
              }
            >
              <SelectTrigger id="drafting-default-sheet-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRAFTING_SHEET_PRESETS.map((sheet) => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    {sheet.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="drafting-profile-scale">Default plotted scale</Label>
            <Select
              value={setup.scale.defaultSheetScale}
              onValueChange={(value) =>
                patchSetup((current) => ({
                  ...current,
                  scale: { ...current.scale, defaultSheetScale: value },
                }))
              }
            >
              <SelectTrigger id="drafting-profile-scale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRAFTING_SCALE_PRESETS.map((scale) => (
                  <SelectItem key={scale} value={scale}>
                    {scale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <NumberInput
            id="drafting-title-text-height"
            label="Title text mm"
            step="0.1"
            value={setup.titleTextHeightMm}
            onChange={(value) =>
              patchSetup((current) => ({ ...current, titleTextHeightMm: value ?? 5 }))
            }
          />
          <NumberInput
            id="drafting-dimension-text-height"
            label="Dimension text mm"
            step="0.1"
            value={setup.dimensionTextHeightMm}
            onChange={(value) =>
              patchSetup((current) => ({ ...current, dimensionTextHeightMm: value ?? 2.5 }))
            }
          />
          <NumberInput
            id="drafting-note-text-height"
            label="Note text mm"
            step="0.1"
            value={setup.noteTextHeightMm}
            onChange={(value) =>
              patchSetup((current) => ({ ...current, noteTextHeightMm: value ?? 2.5 }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            id="drafting-output-line-weight-scale"
            label="Line-weight scale"
            step="0.05"
            value={setup.outputLineWeightScale}
            onChange={(value) =>
              patchSetup((current) => ({
                ...current,
                outputLineWeightScale: Math.max(0.1, value ?? 1),
              }))
            }
          />
          <LabeledInput
            id="drafting-north-arrow-style"
            label="North-arrow style"
            value={setup.northArrowStyle}
            onChange={(value) =>
              patchSetup((current) => ({ ...current, northArrowStyle: value || 'as1100-plain' }))
            }
          />
        </div>

        <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {activeProfile.sourceBasis.join(' + ')}. Exact AS defaults should be verified against the
          licensed standard before project certification.
        </div>
      </section>

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
