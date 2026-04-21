import { describe, expect, it } from 'vitest';
import {
  createEmptyDraftingModel,
  createDefaultDraftingLayers,
  defaultLayerIdForDraftingObjectType,
} from './drafting.js';
import { DraftingModelSchema } from '../schemas/drafting.js';

describe('drafting defaults', () => {
  it('creates a valid empty drafting model', () => {
    const model = createEmptyDraftingModel('drawing-123');
    const parsed = DraftingModelSchema.parse(model);

    expect(parsed.drawingId).toBe('drawing-123');
    expect(parsed.units).toBe('mm');
    expect(parsed.layers).toHaveLength(10);
    expect(parsed.objects).toHaveLength(0);
  });

  it('clones the default layers instead of reusing references', () => {
    const left = createDefaultDraftingLayers();
    const right = createDefaultDraftingLayers();

    left[0]!.visible = false;

    expect(right[0]!.visible).toBe(true);
  });

  it('maps authored object types to the expected default layer', () => {
    expect(defaultLayerIdForDraftingObjectType('pile')).toBe('piles');
    expect(defaultLayerIdForDraftingObjectType('excavation_line')).toBe('excavation');
    expect(defaultLayerIdForDraftingObjectType('monitoring_point')).toBe('monitoring');
    expect(defaultLayerIdForDraftingObjectType('leader_note')).toBe('notes');
  });
});
