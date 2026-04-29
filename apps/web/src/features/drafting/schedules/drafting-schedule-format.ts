import type { DraftingModel, DraftingObject } from '@eng/shared';

export function getDraftingScheduleObjects(model: DraftingModel): DraftingObject[] {
  const objects = (model as { objects?: unknown }).objects;

  return Array.isArray(objects) ? (objects as DraftingObject[]) : [];
}

export function formatOptionalText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? trimNumber(value) : '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value).trim();
}

export function formatScheduleNotes(values: unknown[]): string {
  return values.map(formatOptionalText).filter(Boolean).join('; ');
}

export function formatMm(value: unknown): string {
  const text = formatOptionalText(value);
  return text ? `${text} mm` : '';
}

export function formatMetres(value: unknown): string {
  const text = formatOptionalText(value);
  return text ? `${text} m` : '';
}

export function formatKn(value: unknown): string {
  const text = formatOptionalText(value);
  return text ? `${text} kN` : '';
}

export function formatDegrees(value: unknown): string {
  const text = formatOptionalText(value);
  return text ? `${text} deg` : '';
}

export function formatRl(value: unknown, prefix = 'RL'): string {
  const text = formatOptionalText(value);
  return text ? `${prefix} ${text}` : '';
}

export function formatLinkedRefs(values: unknown[]): string {
  return values.map(formatOptionalText).filter(Boolean).join(', ');
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}
