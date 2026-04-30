import * as React from 'react';
import type {
  DraftingFontStyle,
  DraftingFontWeight,
  DraftingLayer,
  DraftingObject,
  DraftingTextAlignment,
  DraftingTextCase,
} from '@eng/shared';
import {
  DRAFTING_FONT_STYLES,
  DRAFTING_FONT_WEIGHTS,
  DRAFTING_TEXT_ALIGNMENTS,
  DRAFTING_TEXT_CASES,
} from '@eng/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_DRAFTING_TEXT_FONT_FAMILY,
  DEFAULT_DRAFTING_TEXT_HEIGHT_MM,
  DRAFTING_EXTENDED_TEXT_HEIGHT_PRESETS_MM,
  DRAFTING_TEXT_FONT_FAMILIES,
} from '../standards/drafting-text-style-presets';

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
    <div className="space-y-4">
      <PropertySection title="Identification">
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
      </PropertySection>

      <PropertySection title="Appearance / Layer">
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
      </PropertySection>

      {isDraftingTextStyleTarget(object) ? (
        <PropertySection title="Text style" testId="drafting-text-style-section">
          <p className="text-xs text-muted-foreground">
            Project text style. Presets are AS1100-informed and require project verification.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Font family">
              <Select
                value={object.style?.fontFamily ?? DEFAULT_DRAFTING_TEXT_FONT_FAMILY}
                onValueChange={(value) =>
                  onUpdate({
                    ...object,
                    style: {
                      ...object.style,
                      fontFamily: value,
                    },
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                <SelectTrigger data-testid="drafting-text-font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFTING_TEXT_FONT_FAMILIES.map((fontFamily) => (
                    <SelectItem key={fontFamily} value={fontFamily}>
                      {fontFamily}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Text height">
              <Select
                value={String(object.style?.textHeightMm ?? DEFAULT_DRAFTING_TEXT_HEIGHT_MM)}
                onValueChange={(value) => {
                  const textHeightMm = Number(value);
                  if (!Number.isFinite(textHeightMm) || textHeightMm <= 0) {
                    return;
                  }
                  onUpdate({
                    ...object,
                    style: {
                      ...object.style,
                      textHeightMm,
                      textSize: textHeightMm * 70,
                    },
                    updatedAt: new Date().toISOString(),
                  });
                }}
              >
                <SelectTrigger data-testid="drafting-text-height">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFTING_EXTENDED_TEXT_HEIGHT_PRESETS_MM.map((height) => (
                    <SelectItem key={height} value={String(height)}>
                      {height} mm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <NumberField
              label="Custom height (mm)"
              inputTestId="drafting-text-height-custom"
              value={object.style?.textHeightMm ?? DEFAULT_DRAFTING_TEXT_HEIGHT_MM}
              onChange={(value) => {
                const textHeightMm = Math.max(0.1, value);
                onUpdate({
                  ...object,
                  style: {
                    ...object.style,
                    textHeightMm,
                    textSize: textHeightMm * 70,
                  },
                  updatedAt: new Date().toISOString(),
                });
              }}
            />

            <Field label="Weight">
              <Select
                value={object.style?.fontWeight ?? 'regular'}
                onValueChange={(value) =>
                  onUpdate({
                    ...object,
                    style: {
                      ...object.style,
                      fontWeight: value as DraftingFontWeight,
                    },
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFTING_FONT_WEIGHTS.map((weight) => (
                    <SelectItem key={weight} value={weight}>
                      {weight.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Style">
              <Select
                value={object.style?.fontStyle ?? 'normal'}
                onValueChange={(value) =>
                  onUpdate({
                    ...object,
                    style: {
                      ...object.style,
                      fontStyle: value as DraftingFontStyle,
                    },
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFTING_FONT_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Case">
              <Select
                value={object.style?.textCase ?? 'as_entered'}
                onValueChange={(value) =>
                  onUpdate({
                    ...object,
                    style: {
                      ...object.style,
                      textCase: value as DraftingTextCase,
                    },
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFTING_TEXT_CASES.map((textCase) => (
                    <SelectItem key={textCase} value={textCase}>
                      {textCase === 'as_entered' ? 'As entered' : 'Uppercase'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Alignment">
              <Select
                value={object.style?.textAlign ?? 'left'}
                onValueChange={(value) =>
                  onUpdate({
                    ...object,
                    style: {
                      ...object.style,
                      textAlign: value as DraftingTextAlignment,
                    },
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFTING_TEXT_ALIGNMENTS.map((alignment) => (
                    <SelectItem key={alignment} value={alignment}>
                      {alignment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </PropertySection>
      ) : null}
    </div>
  );
}

function isDraftingTextStyleTarget(object: DraftingObject) {
  return [
    'leader_note',
    'callout',
    'section_marker',
    'dimension_chain',
    'project_grid',
    'project_grid_line',
    'shaft',
    'pile',
    'secant_pile_wall',
    'soldier_pile_wall',
    'anchor_tieback',
    'capping_beam',
    'waler',
    'excavation_line',
    'monitoring_point',
    'borehole',
    'service_run',
    'service_crossing',
    'structural_joint',
  ].includes(object.type);
}

export function PropertySection({
  children,
  testId,
  title,
}: {
  children: React.ReactNode;
  testId?: string;
  title: string;
}) {
  return (
    <section className="space-y-3 rounded-md border bg-background p-3" data-testid={testId}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
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
  inputTestId,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  inputTestId?: string;
  label: string;
  onChange: (value: number) => void;
  value: number | string;
}) {
  return (
    <Field label={label}>
      <Input
        data-testid={inputTestId}
        type="number"
        value={formatNumberInputValue(value)}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value === '') {
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
        value={formatNumberInputValue(value)}
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

export function formatNumberInputValue(value: number | string | undefined) {
  if (value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? value : '';
}

export function finiteNumberOrDefault(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
