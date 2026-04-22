import type { DraftingModel, DraftingPoint, DraftingSoldierPileWallObject } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import {
  createDefaultBaselinePoints,
  rebuildSoldierPileWallObject,
} from '../semantic-object-utils';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createSoldierPileWallObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingSoldierPileWallObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'soldier_pile_wall');

  return rebuildSoldierPileWallObject({
    id: crypto.randomUUID(),
    type: 'soldier_pile_wall',
    layerId: defaultLayerIdForDraftingObjectType('soldier_pile_wall'),
    name: `Soldier Wall ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#92400e',
      lineWeight: 2,
      lineStyle: 'solid',
    },
    geometry: {
      baselinePoints: createDefaultBaselinePoints(point, 6000),
      pilePositions: [point],
    },
    parameters: {
      pileDiameterMm: 600,
      sectionLabel: 'UC310',
      spacingMm: 1500,
      laggingType: 'timber lagging',
      embedmentNote: '',
    },
    metadata: {
      wallId: `SOL${sequence}`,
      constructionMethod: 'soldier piles with lagging',
      pileCount: 1,
    },
    createdAt: now,
    updatedAt: now,
  });
}
