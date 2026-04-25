import type { DraftingModel, DraftingPileObject, DraftingPoint } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createPileObject(point: DraftingPoint, model: DraftingModel): DraftingPileObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'pile');

  return {
    id: crypto.randomUUID(),
    type: 'pile',
    layerId: defaultLayerIdForDraftingObjectType('pile'),
    name: `Pile ${sequence}`,
    visible: true,
    locked: false,
    style: {},
    geometry: {
      centre: point,
      diameterMm: 600,
    },
    metadata: {
      pileId: `P${sequence}`,
      pileType: 'bored',
      material: 'reinforced_concrete',
    },
    createdAt: now,
    updatedAt: now,
  };
}
