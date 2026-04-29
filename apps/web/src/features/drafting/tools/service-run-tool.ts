import type { DraftingModel, DraftingPoint, DraftingServiceRunObject } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createServiceRunObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingServiceRunObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'service_run');

  return {
    id: crypto.randomUUID(),
    type: 'service_run',
    layerId: defaultLayerIdForDraftingObjectType('service_run'),
    name: `Service Run ${sequence}`,
    visible: true,
    locked: false,
    style: {
      lineStyle: 'solid',
      textSize: 220,
    },
    sourceRef: {
      sourceType: 'manual',
      status: 'manual',
      linkedAt: now,
    },
    geometry: {
      path: [point, { x: point.x + 2400, y: point.y }, { x: point.x + 4200, y: point.y + 600 }],
    },
    parameters: {
      serviceId: `SR${sequence}`,
      serviceType: 'unknown',
      status: 'existing',
      diameterMm: 0,
      depthM: 0,
      levelRl: 0,
      authority: '',
    },
    metadata: {
      sourceReference: '',
      surveyConfidence: '',
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}
