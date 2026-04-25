import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createEmptyDraftingModel } from '@eng/shared';
import { createSecantPileWallObject } from '../tools/secant-pile-wall-tool';
import { createSoldierPileWallObject } from '../tools/soldier-pile-wall-tool';
import { formatNumberInputValue } from './common-object-properties';
import { SecantPileWallProperties } from './secant-pile-wall-properties';
import { SoldierPileWallProperties } from './soldier-pile-wall-properties';

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

  it('renders secant pile wall numeric defaults instead of blank inputs', () => {
    const model = createEmptyDraftingModel('drawing-secant-properties');
    const object = createSecantPileWallObject({ x: 0, y: 0 }, model);
    const markup = renderToStaticMarkup(
      React.createElement(SecantPileWallProperties, {
        object,
        onUpdate: () => undefined,
      }),
    );

    expect(markup).toContain('value="900"');
    expect(markup).toContain('value="750"');
    expect(markup).toContain('value="150"');
    expect(markup).toContain('value="0"');
    expect(markup).toContain(`Generated pile count: ${object.geometry.pileCentres.length}`);
  });

  it('renders soldier pile wall numeric defaults instead of blank inputs', () => {
    const model = createEmptyDraftingModel('drawing-soldier-properties');
    const object = createSoldierPileWallObject({ x: 0, y: 0 }, model);
    const markup = renderToStaticMarkup(
      React.createElement(SoldierPileWallProperties, {
        object,
        onUpdate: () => undefined,
      }),
    );

    expect(markup).toContain('value="600"');
    expect(markup).toContain('value="1500"');
    expect(markup).toContain('value="0"');
    expect(markup).toContain(`Generated pile count: ${object.geometry.pilePositions.length}`);
  });
});
