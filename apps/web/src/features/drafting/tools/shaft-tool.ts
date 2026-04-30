import type { DraftingModel, DraftingPoint, DraftingShaftObject } from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export const DEFAULT_SHAFT_RADIUS_MM = 1500;
export const DEFAULT_SHAFT_PILE_DIAMETER_MM = 600;
export const DEFAULT_SHAFT_SPACING_MM = 600;

export function createShaftObject(
  centre: DraftingPoint,
  model: DraftingModel,
  radiusPoint: DraftingPoint = { x: centre.x + DEFAULT_SHAFT_RADIUS_MM, y: centre.y },
): DraftingShaftObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'shaft');
  const shaftId = `SH${sequence}`;
  const radiusMm = Math.max(1, Math.hypot(radiusPoint.x - centre.x, radiusPoint.y - centre.y));

  return {
    id: crypto.randomUUID(),
    type: 'shaft',
    layerId: defaultLayerIdForDraftingObjectType('shaft'),
    name: `Shaft ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#111827',
      fill: '#ffffff',
      lineWeight: 2,
    },
    geometry: {
      centre: { ...centre },
      radiusMm,
      rotationDeg: 0,
    },
    parameters: {
      constructionType: 'secant_piles',
      pileDiameterMm: DEFAULT_SHAFT_PILE_DIAMETER_MM,
      spacingMm: DEFAULT_SHAFT_SPACING_MM,
      sourceMode: 'manual_sketch',
    },
    metadata: {
      shaftId,
      label: shaftId,
      notes: '',
    },
    sourceRef: {
      sourceType: 'manual',
      sourceLabel: shaftId,
      status: 'manual',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateShaftPileMarkerCount(object: DraftingShaftObject) {
  const circumference = 2 * Math.PI * object.geometry.radiusMm;
  const rawCount = circumference / Math.max(1, object.parameters.spacingMm);

  return Math.max(6, Math.min(160, Math.round(rawCount)));
}
