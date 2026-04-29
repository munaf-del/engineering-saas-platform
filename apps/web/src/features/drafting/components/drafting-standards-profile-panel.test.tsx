import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import {
  DraftingStandardsProfilePanel,
  resetDraftingProfileOverrides,
} from './drafting-standards-profile-panel';

describe('DraftingStandardsProfilePanel', () => {
  it('renders profile role and text preset previews with the AS warning', () => {
    const model = createEmptyDraftingModel('standards-profile-preview');
    const markup = renderToStaticMarkup(
      <DraftingStandardsProfilePanel model={model} onModelChange={() => undefined} />,
    );

    expect(markup).toContain('Standards Profile');
    expect(markup).toContain(
      'AS1100-informed profile; not a certification or full compliance claim.',
    );
    expect(markup).toContain('OBJECT_OUTLINE');
    expect(markup).toContain('HIDDEN');
    expect(markup).toContain('CENTRE');
    expect(markup).toContain('DIMENSION');
    expect(markup).toContain('EXTENSION');
    expect(markup).toContain('HATCH');
    expect(markup).toContain('SECTION');
    expect(markup).toContain('LEADER');
    expect(markup).toContain('GRID');
    expect(markup).toContain('BORDER');
    expect(markup).toContain('TITLE');
    expect(markup).toContain('SUBTITLE');
    expect(markup).toContain('ANNOTATION');
    expect(markup).toContain('NOTE_SMALL');
    expect(markup).toContain('TABLE');
    expect(markup).toContain('Dimension Style');
    expect(markup).toContain('Leader Style');
  });

  it('shows editor and sheet values separately for profile rows', () => {
    const model = createEmptyDraftingModel('standards-profile-values');
    const markup = renderToStaticMarkup(
      <DraftingStandardsProfilePanel model={model} onModelChange={() => undefined} />,
    );

    expect(markup).toContain('px non-scaling');
    expect(markup).toContain('mm paper');
    expect(markup).toContain('model display units');
  });

  it('resets only drawing setup profile overrides without changing objects', () => {
    const model = createEmptyDraftingModel('standards-profile-reset');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const configured = {
      ...model,
      drawingSetup: {
        ...model.drawingSetup!,
        activeStandardProfileId: 'as1100-structural' as const,
        defaultSheetSize: 'A3' as const,
        outputLineWeightScale: 1.6,
        scale: {
          ...model.drawingSetup!.scale,
          defaultSheetScale: '1:250',
        },
        graphics: {
          ...model.drawingSetup!.graphics,
          textScaleMode: 'screen_constant' as const,
        },
      },
      objects: [pile],
    };

    const reset = resetDraftingProfileOverrides(configured);

    expect(reset.objects).toEqual([pile]);
    expect(reset.drawingSetup?.activeStandardProfileId).toBe('as1100-general');
    expect(reset.drawingSetup?.defaultSheetSize).toBe('A1');
    expect(reset.drawingSetup?.outputLineWeightScale).toBe(1);
    expect(reset.drawingSetup?.scale.defaultSheetScale).toBe('1:100');
    expect(reset.drawingSetup?.graphics.textScaleMode).toBe('model');
  });
});
