import type { DraftingLeaderNoteObject, DraftingModel, DraftingPoint } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createLeaderNoteObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingLeaderNoteObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'leader_note');

  return {
    id: crypto.randomUUID(),
    type: 'leader_note',
    layerId: defaultLayerIdForDraftingObjectType('leader_note'),
    name: `Note ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#111827',
      fill: '#ffffff',
      lineWeight: 1,
      textSize: 250,
    },
    geometry: {
      anchor: point,
      textPoint: {
        x: point.x + 1200,
        y: point.y - 600,
      },
    },
    metadata: {
      text: `Draft note ${sequence}`,
    },
    createdAt: now,
    updatedAt: now,
  };
}
