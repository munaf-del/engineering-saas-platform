import { describe, expect, it } from 'vitest';
import { formatNumberInputValue } from './common-object-properties';

describe('drafting common object property controls', () => {
  it('formats valid numeric input values including zero without blanking them', () => {
    expect(formatNumberInputValue(0)).toBe('0');
    expect(formatNumberInputValue(1250)).toBe('1250');
    expect(formatNumberInputValue('0')).toBe('0');
    expect(formatNumberInputValue('600')).toBe('600');
  });

  it('only blanks genuinely empty or non-finite numeric input values', () => {
    expect(formatNumberInputValue('')).toBe('');
    expect(formatNumberInputValue(undefined)).toBe('');
    expect(formatNumberInputValue(Number.NaN)).toBe('');
    expect(formatNumberInputValue(Number.POSITIVE_INFINITY)).toBe('');
    expect(formatNumberInputValue('not-a-number')).toBe('');
  });
});
