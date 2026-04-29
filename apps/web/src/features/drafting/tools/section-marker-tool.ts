import type { DraftingModel, DraftingPoint, DraftingSectionMarkerObject } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createSectionMarkerObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingSectionMarkerObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'section_marker');

  return {
    id: crypto.randomUUID(),
    type: 'section_marker',
    layerId: defaultLayerIdForDraftingObjectType('section_marker'),
    name: `Section Marker ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#1e293b',
      fill: '#ffffff',
      lineWeight: 2,
      textSize: 220,
    },
    geometry: {
      startPoint: point,
      endPoint: { x: point.x + 4000, y: point.y },
    },
    parameters: {
      sectionId: `S${sequence}`,
      sectionLabel: `S${sequence}`,
      sheetReference: '',
      arrowDirection: 'both',
    },
    metadata: {
      linkedDrawingId: '',
      notes: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}
