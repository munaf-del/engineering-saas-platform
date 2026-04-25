import type { DraftingModel, DraftingPoint, DraftingSecantPileWallObject } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { createDefaultBaselinePoints, rebuildSecantPileWallObject } from '../semantic-object-utils';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createSecantPileWallObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingSecantPileWallObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'secant_pile_wall');

  return rebuildSecantPileWallObject({
    id: crypto.randomUUID(),
    type: 'secant_pile_wall',
    layerId: defaultLayerIdForDraftingObjectType('secant_pile_wall'),
    name: `Secant Wall ${sequence}`,
    visible: true,
    locked: false,
    style: {},
    geometry: {
      baselinePoints: createDefaultBaselinePoints(point, 6000),
      pileCentres: [point],
    },
    parameters: {
      pileDiameterMm: 900,
      spacingMm: 750,
      overlapMm: 150,
      secantType: 'overlapping',
      primarySecondaryPattern: 'hard_soft',
    },
    metadata: {
      wallId: `SEC${sequence}`,
      constructionMethod: 'secant bored piles',
      pileCount: 1,
      designNotes: '',
    },
    createdAt: now,
    updatedAt: now,
  });
}
