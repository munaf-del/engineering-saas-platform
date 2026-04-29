import type { DraftingCalloutObject, DraftingModel, DraftingPoint } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createCalloutObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingCalloutObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'callout');

  return {
    id: crypto.randomUUID(),
    type: 'callout',
    layerId: defaultLayerIdForDraftingObjectType('callout'),
    name: `Callout ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#111827',
      fill: '#ffffff',
      lineWeight: 1,
      textSize: 220,
    },
    geometry: {
      anchorPoint: point,
      labelPoint: { x: point.x + 1800, y: point.y - 1400 },
    },
    parameters: {
      calloutId: `CO${sequence}`,
      title: `Callout ${sequence}`,
      body: 'Coordination note',
      leaderStyle: 'dogleg',
      arrowStyle: 'filled',
    },
    metadata: {
      associatedObjectId: '',
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}
