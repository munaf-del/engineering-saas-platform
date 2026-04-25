import type { DraftingModel, DraftingPoint, DraftingServiceCrossingObject } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createServiceCrossingObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingServiceCrossingObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'service_crossing');

  return {
    id: crypto.randomUUID(),
    type: 'service_crossing',
    layerId: defaultLayerIdForDraftingObjectType('service_crossing'),
    name: `Service Crossing ${sequence}`,
    visible: true,
    locked: false,
    style: {
      textSize: 220,
    },
    geometry: {
      crossingPoint: point,
    },
    parameters: {
      crossingId: `SC${sequence}`,
      serviceType: 'unknown',
      conflictType: 'unknown',
      clearanceMm: 0,
      riskStatus: 'open',
    },
    metadata: {
      linkedServiceRunId: '',
      linkedObjectId: '',
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}
