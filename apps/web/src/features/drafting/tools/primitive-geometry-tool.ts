import type {
  DraftingCircleObject,
  DraftingGeotechSurfaceObject,
  DraftingLineObject,
  DraftingModel,
  DraftingPoint,
  DraftingPolygonObject,
  DraftingPolylineObject,
  DraftingRectangleObject,
  DraftingStructuralJointObject,
} from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export function createDraftLineObject(
  startPoint: DraftingPoint,
  model: DraftingModel,
  endPoint: DraftingPoint = { x: startPoint.x + 2400, y: startPoint.y },
): DraftingLineObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'draft_line');

  return {
    id: crypto.randomUUID(),
    type: 'draft_line',
    layerId: defaultLayerIdForDraftingObjectType('draft_line'),
    name: `Line ${sequence}`,
    visible: true,
    locked: false,
    style: { stroke: '#334155', lineWeightMm: 0.25 },
    sourceRef: { sourceType: 'manual', status: 'manual', linkedAt: now },
    geometry: { startPoint, endPoint },
    metadata: { lineId: `L${sequence}`, notes: '' },
    createdAt: now,
    updatedAt: now,
  };
}

export function createDraftPolylineObject(
  points: DraftingPoint[],
  model: DraftingModel,
): DraftingPolylineObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'draft_polyline');

  return {
    id: crypto.randomUUID(),
    type: 'draft_polyline',
    layerId: defaultLayerIdForDraftingObjectType('draft_polyline'),
    name: `Polyline ${sequence}`,
    visible: true,
    locked: false,
    style: { stroke: '#334155', lineWeightMm: 0.25 },
    sourceRef: { sourceType: 'manual', status: 'manual', linkedAt: now },
    geometry: { points },
    metadata: { polylineId: `PL${sequence}`, notes: '' },
    createdAt: now,
    updatedAt: now,
  };
}

export function createDraftRectangleObject(
  cornerA: DraftingPoint,
  model: DraftingModel,
  cornerB: DraftingPoint = { x: cornerA.x + 2400, y: cornerA.y + 1600 },
): DraftingRectangleObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'draft_rectangle');

  return {
    id: crypto.randomUUID(),
    type: 'draft_rectangle',
    layerId: defaultLayerIdForDraftingObjectType('draft_rectangle'),
    name: `Rectangle ${sequence}`,
    visible: true,
    locked: false,
    style: { stroke: '#334155', lineWeightMm: 0.25 },
    sourceRef: { sourceType: 'manual', status: 'manual', linkedAt: now },
    geometry: { cornerA, cornerB },
    metadata: { rectangleId: `R${sequence}`, notes: '' },
    createdAt: now,
    updatedAt: now,
  };
}

export function createDraftCircleObject(
  centre: DraftingPoint,
  model: DraftingModel,
  radiusPoint: DraftingPoint = { x: centre.x + 900, y: centre.y },
): DraftingCircleObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'draft_circle');
  const radiusMm = Math.max(50, Math.hypot(radiusPoint.x - centre.x, radiusPoint.y - centre.y));

  return {
    id: crypto.randomUUID(),
    type: 'draft_circle',
    layerId: defaultLayerIdForDraftingObjectType('draft_circle'),
    name: `Circle ${sequence}`,
    visible: true,
    locked: false,
    style: { stroke: '#334155', lineWeightMm: 0.25 },
    sourceRef: { sourceType: 'manual', status: 'manual', linkedAt: now },
    geometry: { centre, radiusMm },
    metadata: { circleId: `C${sequence}`, notes: '' },
    createdAt: now,
    updatedAt: now,
  };
}

export function createDraftPolygonObject(
  points: DraftingPoint[],
  model: DraftingModel,
): DraftingPolygonObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'draft_polygon');

  return {
    id: crypto.randomUUID(),
    type: 'draft_polygon',
    layerId: defaultLayerIdForDraftingObjectType('draft_polygon'),
    name: `Polygon ${sequence}`,
    visible: true,
    locked: false,
    style: { stroke: '#334155', lineWeightMm: 0.25 },
    sourceRef: { sourceType: 'manual', status: 'manual', linkedAt: now },
    geometry: { points },
    metadata: { polygonId: `PG${sequence}`, notes: '' },
    createdAt: now,
    updatedAt: now,
  };
}

export function createStructuralJointObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingStructuralJointObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'structural_joint');

  return {
    id: crypto.randomUUID(),
    type: 'structural_joint',
    layerId: defaultLayerIdForDraftingObjectType('structural_joint'),
    name: `Joint ${sequence}`,
    visible: true,
    locked: false,
    style: { stroke: '#111827', fill: '#ffffff', lineWeightMm: 0.35, textSize: 220 },
    sourceRef: { sourceType: 'manual', status: 'manual', linkedAt: now },
    geometry: { point },
    parameters: {
      jointId: `J-NEW-${String(sequence).padStart(3, '0')}`,
      label: `J-NEW-${String(sequence).padStart(3, '0')}`,
      loadEnabled: false,
      units: 'kN',
    },
    metadata: { connectedObjectIds: [], notes: '' },
    createdAt: now,
    updatedAt: now,
  };
}

export function createGeotechSurfaceObject(
  point: DraftingPoint,
  model: DraftingModel,
): DraftingGeotechSurfaceObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'geotech_surface');
  const z = Number.isFinite(point.z) ? point.z : Number.isFinite(point.rl) ? point.rl : null;

  return {
    id: crypto.randomUUID(),
    type: 'geotech_surface',
    layerId: defaultLayerIdForDraftingObjectType('geotech_surface'),
    name: `Manual surface ${sequence}`,
    visible: true,
    locked: false,
    style: { stroke: '#0f766e', lineStyle: 'dashed', lineWeightMm: 0.25, textSize: 200 },
    sourceRef: { sourceType: 'manual', status: 'manual', linkedAt: now },
    geometry: { points: z === null ? [] : [{ ...point, z: z as number }] },
    parameters: {
      surfaceId: `SURF${sequence}`,
      name: `Manual surface ${sequence}`,
      surfaceType: 'other',
      showPointLabels: true,
    },
    metadata: {
      notes:
        'Manual RL/Z seed point only. Add more points or source borehole strata before using as a surface.',
    },
    createdAt: now,
    updatedAt: now,
  };
}
