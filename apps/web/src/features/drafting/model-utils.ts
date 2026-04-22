import {
  ensureDraftingModelLayers,
  type DraftingImplementedObjectType,
  type DraftingLayer,
  type DraftingModel,
  type DraftingObject,
  type DraftingPoint,
  type DraftingUnderlay,
  type DraftingUnderlayCrop,
  type DraftingUnderlayTransform,
  createEmptyDraftingModel,
} from '@eng/shared';
import { createAnchorTiebackObject } from './tools/anchor-tieback-tool';
import { createBoreholeObject } from './tools/borehole-tool';
import { createCalloutObject } from './tools/callout-tool';
import { createCappingBeamObject } from './tools/capping-beam-tool';
import { createDimensionChainObject } from './tools/dimension-chain-tool';
import { createExcavationLineObject } from './tools/excavation-line-tool';
import { createLeaderNoteObject } from './tools/leader-note-tool';
import { createMonitoringPointObject } from './tools/monitoring-point-tool';
import { createPileObject } from './tools/pile-tool';
import { createSecantPileWallObject } from './tools/secant-pile-wall-tool';
import { createSectionMarkerObject } from './tools/section-marker-tool';
import { createServiceCrossingObject } from './tools/service-crossing-tool';
import { createServiceRunObject } from './tools/service-run-tool';
import { createSoldierPileWallObject } from './tools/soldier-pile-wall-tool';
import { createWalerObject } from './tools/waler-tool';
import {
  buildDimensionChainOffsetPoints,
  defaultSoldierPileSymbolDiameterMm,
} from './semantic-object-utils';

export type DraftingBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type DraftingRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function cloneDraftingModel(model: DraftingModel) {
  return structuredClone(ensureDraftingModelLayers(model));
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
    case 'secant_pile_wall':
      return createSecantPileWallObject(point, model);
    case 'soldier_pile_wall':
      return createSoldierPileWallObject(point, model);
    case 'anchor_tieback':
      return createAnchorTiebackObject(point, model);
    case 'capping_beam':
      return createCappingBeamObject(point, model);
    case 'waler':
      return createWalerObject(point, model);
    case 'monitoring_point':
      return createMonitoringPointObject(point, model);
    case 'leader_note':
      return createLeaderNoteObject(point, model);
    case 'dimension_chain':
      return createDimensionChainObject(point, model);
    case 'callout':
      return createCalloutObject(point, model);
    case 'section_marker':
      return createSectionMarkerObject(point, model);
    case 'borehole':
      return createBoreholeObject(point, model);
    case 'service_run':
      return createServiceRunObject(point, model);
    case 'service_crossing':
      return createServiceCrossingObject(point, model);
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

export function addDraftingUnderlay(model: DraftingModel, underlay: DraftingUnderlay) {
  return {
    ...model,
    underlays: [...model.underlays, underlay],
  };
}

export function replaceDraftingUnderlay(
  model: DraftingModel,
  underlayId: string,
  nextUnderlay: DraftingUnderlay,
) {
  return {
    ...model,
    underlays: model.underlays.map((underlay) =>
      underlay.id === underlayId ? nextUnderlay : underlay,
    ),
  };
}

export function updateDraftingUnderlay(
  model: DraftingModel,
  underlayId: string,
  updater: (underlay: DraftingUnderlay) => DraftingUnderlay,
) {
  const underlay = model.underlays.find((entry) => entry.id === underlayId);
  if (!underlay) {
    return model;
  }

  return replaceDraftingUnderlay(model, underlayId, updater(underlay));
}

export function removeDraftingUnderlay(model: DraftingModel, underlayId: string) {
  return {
    ...model,
    underlays: model.underlays.filter((underlay) => underlay.id !== underlayId),
  };
}

export function translateDraftingUnderlay(
  underlay: DraftingUnderlay,
  deltaX: number,
  deltaY: number,
): DraftingUnderlay {
  return {
    ...underlay,
    transform: {
      ...underlay.transform,
      x: underlay.transform.x + deltaX,
      y: underlay.transform.y + deltaY,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function rotateDraftingUnderlay(
  underlay: DraftingUnderlay,
  rotationDeg: number,
): DraftingUnderlay {
  return {
    ...underlay,
    transform: {
      ...underlay.transform,
      rotationDeg,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function scaleDraftingUnderlay(
  underlay: DraftingUnderlay,
  scale: number,
  anchorLocalPoint?: DraftingPoint,
): DraftingUnderlay {
  const nextTransform = anchorLocalPoint
    ? positionDraftingUnderlayTransformAtWorldPoint(
        {
          ...underlay.transform,
          scale,
        },
        anchorLocalPoint,
        draftingUnderlayLocalToWorldPoint(anchorLocalPoint, underlay.transform),
      )
    : {
        ...underlay.transform,
        scale,
      };

  return {
    ...underlay,
    transform: nextTransform,
    updatedAt: new Date().toISOString(),
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
    case 'secant_pile_wall':
      return {
        ...object,
        geometry: {
          ...object.geometry,
          baselinePoints: object.geometry.baselinePoints.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
          pileCentres: object.geometry.pileCentres.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      };
    case 'soldier_pile_wall':
      return {
        ...object,
        geometry: {
          ...object.geometry,
          baselinePoints: object.geometry.baselinePoints.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
          pilePositions: object.geometry.pilePositions.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      };
    case 'anchor_tieback':
      return {
        ...object,
        geometry: {
          headPoint: {
            x: object.geometry.headPoint.x + deltaX,
            y: object.geometry.headPoint.y + deltaY,
          },
          tailPoint: {
            x: object.geometry.tailPoint.x + deltaX,
            y: object.geometry.tailPoint.y + deltaY,
          },
        },
        updatedAt,
      };
    case 'capping_beam':
    case 'waler':
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
    case 'dimension_chain':
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
    case 'callout':
      return {
        ...object,
        geometry: {
          anchorPoint: {
            x: object.geometry.anchorPoint.x + deltaX,
            y: object.geometry.anchorPoint.y + deltaY,
          },
          labelPoint: {
            x: object.geometry.labelPoint.x + deltaX,
            y: object.geometry.labelPoint.y + deltaY,
          },
        },
        updatedAt,
      };
    case 'section_marker':
      return {
        ...object,
        geometry: {
          startPoint: {
            x: object.geometry.startPoint.x + deltaX,
            y: object.geometry.startPoint.y + deltaY,
          },
          endPoint: {
            x: object.geometry.endPoint.x + deltaX,
            y: object.geometry.endPoint.y + deltaY,
          },
        },
        updatedAt,
      };
    case 'borehole':
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
    case 'service_run':
      return {
        ...object,
        geometry: {
          ...object.geometry,
          path: object.geometry.path.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      };
    case 'service_crossing':
      return {
        ...object,
        geometry: {
          crossingPoint: {
            x: object.geometry.crossingPoint.x + deltaX,
            y: object.geometry.crossingPoint.y + deltaY,
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
    case 'secant_pile_wall': {
      const radius = object.parameters.pileDiameterMm / 2;
      return getPointCollectionBounds(object.geometry.pileCentres, radius + 120);
    }
    case 'soldier_pile_wall': {
      const radius = defaultSoldierPileSymbolDiameterMm(object) / 2;
      return getPointCollectionBounds(object.geometry.pilePositions, radius + 120);
    }
    case 'anchor_tieback':
      return getPointCollectionBounds([object.geometry.headPoint, object.geometry.tailPoint], 240);
    case 'capping_beam':
      return getPointCollectionBounds(object.geometry.points, object.parameters.widthMm / 2 + 120);
    case 'waler':
      return getPointCollectionBounds(object.geometry.points, 260);
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
    case 'dimension_chain': {
      return getPointCollectionBounds(
        [...object.geometry.points, ...buildDimensionChainOffsetPoints(object)],
        360,
      );
    }
    case 'callout': {
      const bodyLineCount = Math.max(object.parameters.body.split('\n').length, 1);
      const boxHeight = 760 + bodyLineCount * 240;
      return getPointCollectionBounds(
        [
          object.geometry.anchorPoint,
          object.geometry.labelPoint,
          {
            x: object.geometry.labelPoint.x + 2200,
            y: object.geometry.labelPoint.y + boxHeight,
          },
        ],
        240,
      );
    }
    case 'section_marker':
      return getPointCollectionBounds(
        [object.geometry.startPoint, object.geometry.endPoint],
        520,
      );
    case 'borehole':
      return getPointCollectionBounds(
        [
          object.geometry.point,
          { x: object.geometry.point.x + 1700, y: object.geometry.point.y + 500 },
        ],
        280,
      );
    case 'service_run':
      return getPointCollectionBounds(object.geometry.path, 360);
    case 'service_crossing':
      return getPointCollectionBounds(
        [
          object.geometry.crossingPoint,
          {
            x: object.geometry.crossingPoint.x + 1800,
            y: object.geometry.crossingPoint.y + 400,
          },
        ],
        320,
      );
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

export function canEditDraftingUnderlay(model: DraftingModel, underlay: DraftingUnderlay) {
  return !underlay.locked && !isLayerLocked(model, 'underlay');
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

export function isDraftingUnderlayVisible(model: DraftingModel, underlay: DraftingUnderlay) {
  if (!underlay.visible) {
    return false;
  }

  const layer = getLayerById(model, 'underlay');
  return layer?.visible !== false;
}

export function getVisibleDraftingUnderlays(model: DraftingModel) {
  return model.underlays.filter((underlay) => isDraftingUnderlayVisible(model, underlay));
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

function getPointCollectionBounds(points: DraftingPoint[], padding = 0): DraftingBounds | null {
  if (points.length === 0) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs) - padding,
    minY: Math.min(...ys) - padding,
    maxX: Math.max(...xs) + padding,
    maxY: Math.max(...ys) + padding,
  };
}

export function draftingUnderlayLocalToWorldPoint(
  point: DraftingPoint,
  transform: DraftingUnderlayTransform,
): DraftingPoint {
  const angle = degreesToRadians(transform.rotationDeg);
  const scaledX = point.x * transform.scale;
  const scaledY = point.y * transform.scale;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: transform.x + scaledX * cos - scaledY * sin,
    y: transform.y + scaledX * sin + scaledY * cos,
  };
}

export function worldToDraftingUnderlayLocalPoint(
  point: DraftingPoint,
  transform: DraftingUnderlayTransform,
): DraftingPoint {
  const angle = degreesToRadians(transform.rotationDeg);
  const translatedX = point.x - transform.x;
  const translatedY = point.y - transform.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: (translatedX * cos + translatedY * sin) / transform.scale,
    y: (-translatedX * sin + translatedY * cos) / transform.scale,
  };
}

export function positionDraftingUnderlayTransformAtWorldPoint(
  transform: DraftingUnderlayTransform,
  localPoint: DraftingPoint,
  worldPoint: DraftingPoint,
): DraftingUnderlayTransform {
  const angle = degreesToRadians(transform.rotationDeg);
  const scaledX = localPoint.x * transform.scale;
  const scaledY = localPoint.y * transform.scale;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    ...transform,
    x: worldPoint.x - (scaledX * cos - scaledY * sin),
    y: worldPoint.y - (scaledX * sin + scaledY * cos),
  };
}

export function calculateTwoPointUniformCalibrationScale(
  pdfPointA: DraftingPoint,
  pdfPointB: DraftingPoint,
  modelDistanceMm: number,
) {
  const intrinsicDistance = Math.hypot(pdfPointB.x - pdfPointA.x, pdfPointB.y - pdfPointA.y);
  if (!Number.isFinite(modelDistanceMm) || modelDistanceMm <= 0) {
    throw new Error('Calibration distance must be greater than zero');
  }

  if (!Number.isFinite(intrinsicDistance) || intrinsicDistance <= 0) {
    throw new Error('Calibration points must be distinct');
  }

  return modelDistanceMm / intrinsicDistance;
}

export function applyTwoPointUniformCalibration(
  underlay: DraftingUnderlay,
  args: {
    pdfPointA: DraftingPoint;
    pdfPointB: DraftingPoint;
    modelDistanceMm: number;
    warningAcknowledged: boolean;
  },
): DraftingUnderlay {
  if (!args.warningAcknowledged) {
    throw new Error('Calibration warning acknowledgement is required');
  }

  const calculatedScale = calculateTwoPointUniformCalibrationScale(
    args.pdfPointA,
    args.pdfPointB,
    args.modelDistanceMm,
  );
  const anchoredWorldPoint = draftingUnderlayLocalToWorldPoint(args.pdfPointA, underlay.transform);
  const nextTransform = positionDraftingUnderlayTransformAtWorldPoint(
    {
      ...underlay.transform,
      scale: calculatedScale,
    },
    args.pdfPointA,
    anchoredWorldPoint,
  );
  const updatedAt = new Date().toISOString();

  return {
    ...underlay,
    transform: nextTransform,
    calibration: {
      method: 'two_point_uniform_scale',
      pdfPointA: args.pdfPointA,
      pdfPointB: args.pdfPointB,
      modelPointA: draftingUnderlayLocalToWorldPoint(args.pdfPointA, nextTransform),
      modelPointB: draftingUnderlayLocalToWorldPoint(args.pdfPointB, nextTransform),
      modelDistanceMm: args.modelDistanceMm,
      calculatedScale,
      calibratedAt: updatedAt,
      warningAcknowledged: true,
    },
    updatedAt,
  };
}

export function normalizeDraftingRect(start: DraftingPoint, end: DraftingPoint): DraftingRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function clampDraftingPoint(point: DraftingPoint, width: number, height: number) {
  return {
    x: clampNumber(point.x, 0, width),
    y: clampNumber(point.y, 0, height),
  };
}

export function clampDraftingUnderlayCrop(
  crop: DraftingRect,
  pageWidth: number,
  pageHeight: number,
): DraftingUnderlayCrop {
  const x = clampNumber(crop.x, 0, pageWidth);
  const y = clampNumber(crop.y, 0, pageHeight);
  const width = clampNumber(crop.width, 0, pageWidth - x);
  const height = clampNumber(crop.height, 0, pageHeight - y);

  if (width <= 0 || height <= 0) {
    throw new Error('Crop must have a positive width and height');
  }

  return {
    x,
    y,
    width,
    height,
  };
}

export function getDraftingUnderlayLocalRect(
  pageWidth: number,
  pageHeight: number,
  crop?: DraftingUnderlayCrop | null,
) {
  if (crop) {
    return crop;
  }

  return {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  };
}

export function getDraftingUnderlayWorldCorners(
  underlay: DraftingUnderlay,
  pageWidth: number,
  pageHeight: number,
) {
  const rect = getDraftingUnderlayLocalRect(pageWidth, pageHeight, underlay.crop);

  return [
    draftingUnderlayLocalToWorldPoint({ x: rect.x, y: rect.y }, underlay.transform),
    draftingUnderlayLocalToWorldPoint({ x: rect.x + rect.width, y: rect.y }, underlay.transform),
    draftingUnderlayLocalToWorldPoint(
      { x: rect.x + rect.width, y: rect.y + rect.height },
      underlay.transform,
    ),
    draftingUnderlayLocalToWorldPoint({ x: rect.x, y: rect.y + rect.height }, underlay.transform),
  ];
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
