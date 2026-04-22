import type { DraftingModel, DraftingPoint, DraftingWalerObject } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { createDefaultBaselinePoints } from '../semantic-object-utils';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createWalerObject(point: DraftingPoint, model: DraftingModel): DraftingWalerObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'waler');

  return {
    id: crypto.randomUUID(),
    type: 'waler',
    layerId: defaultLayerIdForDraftingObjectType('waler'),
    name: `Waler ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#7c2d12',
      lineWeight: 2,
      lineStyle: 'solid',
    },
    geometry: {
      points: createDefaultBaselinePoints(point, 5000),
    },
    parameters: {
      walerId: `W${sequence}`,
      sectionLabel: '2UC360',
      levelRl: 10.5,
      connectionNotes: '',
    },
    metadata: {
      associatedWallId: '',
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}
