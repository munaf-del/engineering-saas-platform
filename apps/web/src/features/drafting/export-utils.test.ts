import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { serializeDraftingModelJson } from './export-utils';

describe('drafting export utils', () => {
  it('serializes valid drafting model JSON exports', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const exported = serializeDraftingModelJson(model);

    expect(JSON.parse(exported)).toEqual(model);
  });
});
