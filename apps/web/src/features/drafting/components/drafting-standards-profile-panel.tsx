import * as React from 'react';
import type {
  DraftingDrawingSetup,
  DraftingModel,
  DraftingSheetSizePreset,
  DraftingStandardProfileId,
  DraftingTextScaleMode,
} from '@eng/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateDraftingDrawingSetup } from '../model-utils';
import {
  DRAFTING_SCALE_PRESETS,
  DRAFTING_SHEET_PRESETS,
  DRAFTING_STANDARD_LINE_ROLE_ALIASES,
  DRAFTING_STANDARD_LINE_ROLES,
  DRAFTING_STANDARD_PROFILES,
  DRAFTING_STANDARD_TEXT_PRESETS,
  getDraftingStandardProfile,
  type DraftingStandardLineRole,
  type DraftingStandardTextPreset,
} from '../standards/drafting-standard-profiles';
import {
  resolveDraftingDimensionStyle,
  resolveDraftingLeaderStyle,
  resolveDraftingLineStyle,
  resolveDraftingPaperLineStyle,
  resolveDraftingTextStyle,
} from '../standards/drafting-style-resolver';
import { DRAFTING_PROFILE_AUDIT_WARNING } from '../standards/drafting-profile-audit';

export function DraftingStandardsProfilePanel({
  model,
  onModelChange,
}: {
  model: DraftingModel;
  onModelChange: (model: DraftingModel) => void;
}) {
  const setup = model.drawingSetup!;
  const profile = getDraftingStandardProfile(setup.activeStandardProfileId);
  const dimensionStyle = resolveDraftingDimensionStyle({ setup });
  const sheetDimensionStyle = resolveDraftingDimensionStyle({ setup, surface: 'sheet' });
  const leaderStyle = resolveDraftingLeaderStyle({ setup });

  function patchSetup(updater: (setup: DraftingDrawingSetup) => DraftingDrawingSetup) {
    onModelChange(updateDraftingDrawingSetup(model, updater));
  }

  return (
    <div className="space-y-4" data-testid="drafting-standards-profile-panel">
      <section className="space-y-3 rounded-md border p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Standards Profile</div>
            <div className="text-xs text-muted-foreground">
              Inspect the centralized defaults used by editor canvas rendering and plotted sheet
              preview output.
            </div>
          </div>
          <Button
            className="h-8"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onModelChange(resetDraftingProfileOverrides(model))}
          >
            Reset profile defaults
          </Button>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {DRAFTING_PROFILE_AUDIT_WARNING}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ReadonlyMetric label="Active profile id" value={profile.id} />
          <ReadonlyMetric label="Discipline" value={profile.disciplineProfileId} />
          <ReadonlyMetric label="Profile name" value={profile.label} />
          <ReadonlyMetric label="Version" value={profile.version} />
        </div>

        <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Editor mode uses non-scaling screen strokes for readable model-space editing. Sheet mode
          resolves the same roles to plotted paper millimetre weights for preview and print output.
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <ControlledSelect
            id="drafting-profile-panel-active-profile"
            label="Active standard profile"
            value={setup.activeStandardProfileId}
            onValueChange={(value) => {
              const nextProfile = getDraftingStandardProfile(value);
              patchSetup((current) => ({
                ...current,
                activeStandardProfileId: nextProfile.id as DraftingStandardProfileId,
                disciplineProfileId: nextProfile.disciplineProfileId,
                profileVersion: nextProfile.version,
                lineWeightTableId: nextProfile.lineWeightTableId,
                lineStyleTableId: nextProfile.lineStyleTableId,
                scale: {
                  ...current.scale,
                  allowedScales: nextProfile.scalePresets,
                },
              }));
            }}
            options={DRAFTING_STANDARD_PROFILES.map((candidate) => ({
              label: candidate.label,
              value: candidate.id,
            }))}
          />
          <ControlledSelect
            id="drafting-profile-panel-sheet-size"
            label="Default sheet size"
            value={setup.defaultSheetSize}
            onValueChange={(value) =>
              patchSetup((current) => ({
                ...current,
                defaultSheetSize: value as DraftingSheetSizePreset,
              }))
            }
            options={DRAFTING_SHEET_PRESETS.map((sheet) => ({
              label: sheet.label,
              value: sheet.id,
            }))}
          />
          <ControlledSelect
            id="drafting-profile-panel-scale"
            label="Default plotted scale"
            value={setup.scale.defaultSheetScale}
            onValueChange={(value) =>
              patchSetup((current) => ({
                ...current,
                scale: { ...current.scale, defaultSheetScale: value },
              }))
            }
            options={DRAFTING_SCALE_PRESETS.map((scale) => ({ label: scale, value: scale }))}
          />
          <ControlledSelect
            id="drafting-profile-panel-text-scale-mode"
            label="Default text scale mode"
            value={setup.graphics.textScaleMode}
            onValueChange={(value) =>
              patchSetup((current) => ({
                ...current,
                graphics: { ...current.graphics, textScaleMode: value as DraftingTextScaleMode },
              }))
            }
            options={[
              { label: 'Model', value: 'model' },
              { label: 'Screen constant', value: 'screen_constant' },
            ]}
          />
        </div>

        <label className="block space-y-1" htmlFor="drafting-profile-panel-line-weight-scale">
          <span className="text-sm font-medium">Default line weight scale</span>
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            id="drafting-profile-panel-line-weight-scale"
            inputMode="decimal"
            min={0.1}
            step={0.05}
            type="number"
            value={setup.outputLineWeightScale}
            onChange={(event) => {
              const value = Number(event.target.value);
              patchSetup((current) => ({
                ...current,
                outputLineWeightScale: Number.isFinite(value) ? Math.max(0.1, value) : 1,
              }));
            }}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-md border p-3">
        <SectionHeading
          title="Line Role Table"
          description="Resolved editor stroke and sheet line weights by canonical role."
        />
        <div className="overflow-x-auto">
          <div className="min-w-[760px] rounded-md border">
            <div className="grid grid-cols-[1.25fr_0.85fr_1fr_1fr_1.1fr] border-b bg-muted/60 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              <div>Role</div>
              <div>Line type</div>
              <div>Editor stroke</div>
              <div>Sheet weight</div>
              <div>Example</div>
            </div>
            {DRAFTING_STANDARD_LINE_ROLES.map((role) => (
              <LineRoleRow key={role} role={role} setup={setup} />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-md border p-3">
        <SectionHeading
          title="Text Preset Table"
          description="Paper text height and editor display behaviour by preset."
        />
        <div className="overflow-x-auto">
          <div className="min-w-[680px] rounded-md border">
            <div className="grid grid-cols-[1fr_1fr_1.3fr_1.3fr] border-b bg-muted/60 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              <div>Preset</div>
              <div>Paper height</div>
              <div>Editor/display behaviour</div>
              <div>Example</div>
            </div>
            {DRAFTING_STANDARD_TEXT_PRESETS.map((preset) => (
              <TextPresetRow key={preset} preset={preset} setup={setup} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <SummaryCard
          title="Dimension Style"
          rows={[
            ['Line role', dimensionStyle.lineRole],
            ['Extension role', dimensionStyle.extensionRole],
            ['Editor stroke', `${dimensionStyle.lineStyle.editorStrokeWidth.toFixed(2)} px`],
            ['Sheet weight', `${sheetDimensionStyle.lineStyle.lineWeightMm.toFixed(2)} mm`],
            ['Text preset', dimensionStyle.textPreset],
            ['Tick length', `${dimensionStyle.tickLengthModelUnits} model units`],
            ['Label gap', `${dimensionStyle.labelGapModelUnits} model units`],
          ]}
        />
        <SummaryCard
          title="Leader Style"
          rows={[
            ['Line role', leaderStyle.lineRole],
            ['Colour role', leaderStyle.colorRole],
            ['Editor stroke', `${leaderStyle.lineStyle.editorStrokeWidth.toFixed(2)} px`],
            ['Text preset', leaderStyle.textPreset],
            ['Max opacity', leaderStyle.maxLeaderOpacity.toFixed(2)],
          ]}
        />
      </section>
    </div>
  );
}

export function resetDraftingProfileOverrides(model: DraftingModel): DraftingModel {
  const currentSetup = model.drawingSetup!;
  const defaultProfile = getDraftingStandardProfile();

  return updateDraftingDrawingSetup(model, (setup) => ({
    ...setup,
    activeStandardProfileId: defaultProfile.id,
    defaultSheetSize: 'A1',
    disciplineProfileId: defaultProfile.disciplineProfileId,
    graphics: {
      ...setup.graphics,
      textScaleMode: 'model',
    },
    lineStyleTableId: defaultProfile.lineStyleTableId,
    lineWeightTableId: defaultProfile.lineWeightTableId,
    outputLineWeightScale: 1,
    profileVersion: defaultProfile.version,
    scale: {
      ...setup.scale,
      allowedScales: defaultProfile.scalePresets,
      defaultSheetScale: '1:100',
    },
    standardsNote:
      currentSetup.standardsNote ??
      'AS 1100-style drafting defaults. Exact AS defaults should be verified against the licensed standard before project certification.',
  }));
}

function LineRoleRow({
  role,
  setup,
}: {
  role: DraftingStandardLineRole;
  setup: DraftingDrawingSetup;
}) {
  const resolvedRole = DRAFTING_STANDARD_LINE_ROLE_ALIASES[role];
  const editorStyle = resolveDraftingLineStyle({ role, setup });
  const sheetStyle = resolveDraftingPaperLineStyle({ role, setup });
  const profile = getDraftingStandardProfile(setup.activeStandardProfileId);
  const profileStyle = profile.lineStyles[resolvedRole];

  return (
    <div className="grid grid-cols-[1.25fr_0.85fr_1fr_1fr_1.1fr] items-center border-b px-3 py-2 text-sm last:border-b-0">
      <div className="font-medium">{role}</div>
      <div className="capitalize text-muted-foreground">{profileStyle.lineType}</div>
      <div>{editorStyle.editorStrokeWidth.toFixed(2)} px non-scaling</div>
      <div>{sheetStyle.lineWeightMm.toFixed(2)} mm paper</div>
      <svg aria-hidden="true" className="h-6 w-32" viewBox="0 0 128 24">
        <line
          stroke={editorStyle.color}
          strokeDasharray={profileStyle.dashArray}
          strokeLinecap="square"
          strokeWidth={Math.max(1, editorStyle.editorStrokeWidth)}
          x1={8}
          x2={120}
          y1={12}
          y2={12}
        />
      </svg>
    </div>
  );
}

function TextPresetRow({
  preset,
  setup,
}: {
  preset: DraftingStandardTextPreset;
  setup: DraftingDrawingSetup;
}) {
  const editorStyle = resolveDraftingTextStyle({ role: preset, setup });
  const sheetStyle = resolveDraftingTextStyle({ role: preset, setup, surface: 'sheet' });

  return (
    <div className="grid grid-cols-[1fr_1fr_1.3fr_1.3fr] items-center border-b px-3 py-2 text-sm last:border-b-0">
      <div className="font-medium">{preset}</div>
      <div>{sheetStyle.textHeightMm.toFixed(1)} mm paper</div>
      <div>{editorStyle.fontSize.toFixed(0)} model display units</div>
      <div
        className="truncate"
        style={{
          color: editorStyle.fill,
          fontSize: `${Math.min(18, Math.max(11, sheetStyle.textHeightMm * 3.2))}px`,
          fontWeight: editorStyle.fontWeight,
        }}
      >
        {preset} sample
      </div>
    </div>
  );
}

function ControlledSelect({
  id,
  label,
  onValueChange,
  options,
  value,
}: {
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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

function SectionHeading({ description, title }: { description: string; title: string }) {
  return (
    <div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

function SummaryCard({ rows, title }: { rows: Array<[string, string]>; title: string }) {
  return (
    <section className="space-y-2 rounded-md border p-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid gap-1 text-sm">
        {rows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3" key={label}>
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
