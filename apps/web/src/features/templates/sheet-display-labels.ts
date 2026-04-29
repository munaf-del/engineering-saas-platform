export function formatOperatorFacingSheetLabel(
  value: string | null | undefined,
  fallback = 'Untitled',
) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return fallback;
  }

  return normalized
    .replace(/(?:\s+|[-_])\d{12,}$/, '')
    .replace(/\s+\(Imported(?: \d+)?\)$/i, '')
    .trim();
}

export function formatGenericRootSheetTemplateLabel(
  value: string | null | undefined,
  fallback = 'Untitled',
) {
  return formatOperatorFacingSheetLabel(value, fallback);
}

function normalizeWhitespace(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}
