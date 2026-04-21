import { describe, expect, it } from 'vitest';
import {
  formatGenericRootSheetTemplateLabel,
  formatOperatorFacingSheetLabel,
} from './sheet-display-labels';

describe('sheet display labels', () => {
  it('keeps general operator-facing cleanup without changing arbitrary labels', () => {
    expect(formatOperatorFacingSheetLabel('Custom Sheet 1776453717838')).toBe('Custom Sheet');
  });

  it('does not rewrite older labels into starter aliases anymore', () => {
    expect(formatGenericRootSheetTemplateLabel('A3 Monitoring Location Plan')).toBe(
      'A3 Monitoring Location Plan',
    );
  });

  it('preserves custom user-authored labels that are not starter aliases', () => {
    expect(formatGenericRootSheetTemplateLabel('North Facade Monitoring Sheet')).toBe(
      'North Facade Monitoring Sheet',
    );
  });
});
