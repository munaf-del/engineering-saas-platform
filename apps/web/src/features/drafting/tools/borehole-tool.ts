import type { DraftingBoreholeObject, DraftingModel, DraftingPoint } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createBoreholeObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingBoreholeObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'borehole');
  const label = `BH-${String(sequence).padStart(2, '0')}`;

  return {
    id: crypto.randomUUID(),
    type: 'borehole',
    layerId: defaultLayerIdForDraftingObjectType('borehole'),
    name: `Borehole ${sequence}`,
    visible: true,
    locked: false,
    style: {
      textSize: 220,
    },
    sourceRef: {
      sourceType: 'manual',
      status: 'manual',
      linkedAt: now,
    },
    geometry: {
      point,
    },
    parameters: {
      boreholeId: `BH${sequence}`,
      label,
      groundLevelRl: undefined,
      terminationDepthM: 12,
      terminationLevelRl: undefined,
      boreholeType: '',
    },
    metadata: {
      linkedGeotechEntityId: '',
      sourceReference: '',
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}
