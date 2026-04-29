import type { DraftingAnchorTiebackObject, DraftingModel, DraftingPoint } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { rebuildAnchorTiebackObject } from '../semantic-object-utils';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createAnchorTiebackObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingAnchorTiebackObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'anchor_tieback');

  return rebuildAnchorTiebackObject({
    id: crypto.randomUUID(),
    type: 'anchor_tieback',
    layerId: defaultLayerIdForDraftingObjectType('anchor_tieback'),
    name: `Anchor ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#0f766e',
      lineWeight: 2,
      lineStyle: 'solid',
    },
    geometry: {
      headPoint: point,
      tailPoint: { x: point.x + 4500, y: point.y - 1200 },
    },
    parameters: {
      anchorId: `A${sequence}`,
      angleDeg: -15,
      planLengthMm: 4657,
      freeLengthMm: 3200,
      bondLengthMm: 1457,
      designLoadKn: 400,
      lockOffLoadKn: 320,
      stage: 'Stage 1',
    },
    metadata: {
      associatedWallId: '',
      installationStage: 'Stage 1',
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  });
}
