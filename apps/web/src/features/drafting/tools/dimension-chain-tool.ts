import type { DraftingDimensionChainObject, DraftingModel, DraftingPoint } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createDimensionChainObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingDimensionChainObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'dimension_chain');

  return {
    id: crypto.randomUUID(),
    type: 'dimension_chain',
    layerId: defaultLayerIdForDraftingObjectType('dimension_chain'),
    name: `Dimension Chain ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#334155',
      lineWeight: 1,
      textSize: 220,
    },
    geometry: {
      points: [point, { x: point.x + 3000, y: point.y }, { x: point.x + 6000, y: point.y + 500 }],
      offsetDistanceMm: 1200,
    },
    parameters: {
      dimensionId: `DIM${sequence}`,
      unit: 'mm',
      precision: 0,
      showSegments: true,
      showTotal: true,
      textOverride: '',
    },
    metadata: {
      associatedObjectIds: [],
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}
