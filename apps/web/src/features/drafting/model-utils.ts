import {
  type DraftingImplementedObjectType,
  type DraftingLayer,
  type DraftingModel,
  type DraftingObject,
  type DraftingPoint,
  createEmptyDraftingModel,
} from '@eng/shared';
import { createExcavationLineObject } from './tools/excavation-line-tool';
import { createLeaderNoteObject } from './tools/leader-note-tool';
import { createMonitoringPointObject } from './tools/monitoring-point-tool';
import { createPileObject } from './tools/pile-tool';

export type DraftingBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function cloneDraftingModel(model: DraftingModel) {
  return structuredClone(model);
}

export function createDraftingObject(
  type: DraftingImplementedObjectType,
  point: DraftingPoint,
  model: DraftingModel,
  pendingLinePoints: DraftingPoint[] = [],
): DraftingObject {
  switch (type) {
    case 'pile':
      return createPileObject(point, model);
    case 'monitoring_point':
      return createMonitoringPointObject(point, model);
    case 'leader_note':
      return createLeaderNoteObject(point, model);
    case 'excavation_line':
      return createExcavationLineObject(point, model, pendingLinePoints);
    default:
      return createPileObject(point, model);
  }
}

export function replaceDraftingObject(
  model: DraftingModel,
  objectId: string,
  nextObject: DraftingObject,
) {
  return {
    ...model,
    objects: model.objects.map((object) => (object.id === objectId ? nextObject : object)),
  };
}

export function updateDraftingObject(
  model: DraftingModel,
  objectId: string,
  updater: (object: DraftingObject) => DraftingObject,
) {
  const object = model.objects.find((entry) => entry.id === objectId);
  if (!object) {
    return model;
  }

  return replaceDraftingObject(model, objectId, updater(object));
}

export function removeDraftingObject(model: DraftingModel, objectId: string) {
  return {
    ...model,
    objects: model.objects.filter((object) => object.id !== objectId),
  };
}

export function translateDraftingObject(
  object: DraftingObject,
  deltaX: number,
  deltaY: number,
): DraftingObject {
  const updatedAt = new Date().toISOString();

  switch (object.type) {
    case 'pile':
      return {
        ...object,
        geometry: {
          ...object.geometry,
          centre: {
            x: object.geometry.centre.x + deltaX,
            y: object.geometry.centre.y + deltaY,
          },
        },
        updatedAt,
      };
    case 'monitoring_point':
      return {
        ...object,
        geometry: {
          point: {
            x: object.geometry.point.x + deltaX,
            y: object.geometry.point.y + deltaY,
          },
        },
        updatedAt,
      };
    case 'leader_note':
      return {
        ...object,
        geometry: {
          anchor: {
            x: object.geometry.anchor.x + deltaX,
            y: object.geometry.anchor.y + deltaY,
          },
          textPoint: {
            x: object.geometry.textPoint.x + deltaX,
            y: object.geometry.textPoint.y + deltaY,
          },
        },
        updatedAt,
      };
    case 'excavation_line':
      return {
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      };
    default:
      return {
        ...object,
        updatedAt,
      };
  }
}

export function fitDraftingModelView(
  model: DraftingModel,
  width: number,
  height: number,
): DraftingModel['view'] {
  const bounds = getDraftingModelBounds(model.objects);

  if (!bounds) {
    return {
      scale: createEmptyDraftingModel(model.drawingId).view.scale,
      offsetX: width / 2,
      offsetY: height / 2,
    };
  }

  const padding = 64;
  const spanX = Math.max(bounds.maxX - bounds.minX, 1000);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1000);
  const scale = clampNumber(
    Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY),
    0.01,
    1,
  );

  return {
    scale,
    offsetX: padding + (width - padding * 2 - spanX * scale) / 2 - bounds.minX * scale,
    offsetY: padding + (height - padding * 2 - spanY * scale) / 2 - bounds.minY * scale,
  };
}

export function getDraftingModelBounds(objects: DraftingObject[]) {
  const allBounds = objects
    .map((object) => getDraftingObjectBounds(object))
    .filter((value): value is DraftingBounds => Boolean(value));

  if (allBounds.length === 0) {
    return null;
  }

  return allBounds.reduce<DraftingBounds>(
    (accumulator, bounds) => ({
      minX: Math.min(accumulator.minX, bounds.minX),
      minY: Math.min(accumulator.minY, bounds.minY),
      maxX: Math.max(accumulator.maxX, bounds.maxX),
      maxY: Math.max(accumulator.maxY, bounds.maxY),
    }),
    allBounds[0]!,
  );
}

export function getDraftingObjectBounds(object: DraftingObject): DraftingBounds | null {
  switch (object.type) {
    case 'pile': {
      const radius = object.geometry.diameterMm / 2;
      return {
        minX: object.geometry.centre.x - radius,
        minY: object.geometry.centre.y - radius,
        maxX: object.geometry.centre.x + radius,
        maxY: object.geometry.centre.y + radius,
      };
    }
    case 'monitoring_point':
      return {
        minX: object.geometry.point.x - 250,
        minY: object.geometry.point.y - 250,
        maxX: object.geometry.point.x + 250,
        maxY: object.geometry.point.y + 250,
      };
    case 'leader_note':
      return {
        minX: Math.min(object.geometry.anchor.x, object.geometry.textPoint.x),
        minY: Math.min(object.geometry.anchor.y, object.geometry.textPoint.y) - 250,
        maxX: Math.max(object.geometry.anchor.x, object.geometry.textPoint.x) + 1600,
        maxY: Math.max(object.geometry.anchor.y, object.geometry.textPoint.y) + 500,
      };
    case 'excavation_line': {
      const xs = object.geometry.points.map((point) => point.x);
      const ys = object.geometry.points.map((point) => point.y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }
    default:
      return null;
  }
}

export function getLayerById(model: DraftingModel, layerId: string) {
  return model.layers.find((layer) => layer.id === layerId) ?? null;
}

export function isLayerLocked(model: DraftingModel, layerId: string) {
  return getLayerById(model, layerId)?.locked ?? false;
}

export function canEditDraftingObject(model: DraftingModel, object: DraftingObject) {
  return !object.locked && !isLayerLocked(model, object.layerId);
}

export function isDraftingObjectVisible(model: DraftingModel, object: DraftingObject) {
  if (object.visible === false) {
    return false;
  }

  const layer = getLayerById(model, object.layerId);
  return layer?.visible !== false;
}

export function getVisibleDraftingObjects(model: DraftingModel) {
  return model.objects.filter((object) => isDraftingObjectVisible(model, object));
}

export function updateLayer(model: DraftingModel, nextLayer: DraftingLayer) {
  return {
    ...model,
    layers: model.layers.map((layer) => (layer.id === nextLayer.id ? nextLayer : layer)),
  };
}

export function formatDraftingTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export function formatDrawingRevision(drawing: { currentRevision: number }) {
  return `R${drawing.currentRevision}`;
}

export function buildDraftingExportFilename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'drafting-model'
  );
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
