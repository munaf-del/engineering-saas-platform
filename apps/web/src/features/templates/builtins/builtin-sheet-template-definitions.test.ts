import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_GENERIC_SPATIAL_TEMPLATE_DEFINITIONS,
  resolveBuiltInGenericSpatialTemplateDefinition,
} from './builtin-sheet-template-definitions';

describe('built-in generic spatial template definitions', () => {
  it('uses generic fallback labels instead of monitoring-specific labels', () => {
    expect(BUILT_IN_GENERIC_SPATIAL_TEMPLATE_DEFINITIONS.map((template) => template.label)).toEqual(
      ['A4 Landscape Map Sheet', 'A3 Landscape Map Sheet'],
    );
  });

  it('resolves the default built-in fallback definition', () => {
    expect(resolveBuiltInGenericSpatialTemplateDefinition(null).definitionId).toBe(
      'builtin-spatial-annexure-a4-landscape',
    );
  });
});
