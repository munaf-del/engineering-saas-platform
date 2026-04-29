import type { DraftingModel, DraftingMonitoringPointObject, DraftingPoint } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createMonitoringPointObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingMonitoringPointObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'monitoring_point');

  return {
    id: crypto.randomUUID(),
    type: 'monitoring_point',
    layerId: defaultLayerIdForDraftingObjectType('monitoring_point'),
    name: `Monitoring Point ${sequence}`,
    visible: true,
    locked: false,
    style: {},
    sourceRef: {
      sourceType: 'manual',
      status: 'manual',
      linkedAt: now,
    },
    geometry: {
      point,
    },
    metadata: {
      pointId: `MP${sequence}`,
      monitoringType: 'vibration',
    },
    createdAt: now,
    updatedAt: now,
  };
}
