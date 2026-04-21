import type {
  DraftingExcavationLineObject,
  DraftingModel,
  DraftingPoint,
} from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createExcavationLineObject(
  point: DraftingPoint,
  model: DraftingModel,
  pendingLinePoints: DraftingPoint[] = [],
): DraftingExcavationLineObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'excavation_line');

  return {
    id: crypto.randomUUID(),
    type: 'excavation_line',
    layerId: defaultLayerIdForDraftingObjectType('excavation_line'),
    name: `Excavation ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#b91c1c',
      lineWeight: 2,
      lineStyle: 'solid',
    },
    geometry: {
      points:
        pendingLinePoints.length >= 2
          ? pendingLinePoints
          : [point, { x: point.x + 3000, y: point.y }],
      closed: false,
    },
    metadata: {
      excavationId: `EX${sequence}`,
      stage: 'Stage 1',
    },
    createdAt: now,
    updatedAt: now,
  };
}
