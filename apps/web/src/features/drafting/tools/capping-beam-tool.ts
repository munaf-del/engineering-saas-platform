import type { DraftingCappingBeamObject, DraftingModel, DraftingPoint } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { createDefaultBaselinePoints } from '../semantic-object-utils';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createCappingBeamObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingCappingBeamObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'capping_beam');

  return {
    id: crypto.randomUUID(),
    type: 'capping_beam',
    layerId: defaultLayerIdForDraftingObjectType('capping_beam'),
    name: `Capping Beam ${sequence}`,
    visible: true,
    locked: false,
    style: {},
    geometry: {
      points: createDefaultBaselinePoints(point, 5000),
    },
    parameters: {
      beamId: `CB${sequence}`,
      widthMm: 900,
      depthMm: 1200,
      levelRl: 12,
      concreteGrade: '40 MPa',
    },
    metadata: {
      associatedWallId: '',
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}
