import {
  ensureDraftingDrawingSetup,
  ensureDraftingModelLayers,
  type DraftingImplementedObjectType,
  type DraftingLayer,
  type DraftingModel,
  type DraftingObject,
  type DraftingObjectChangeEvent,
  type DraftingObjectProvenanceAction,
  type DraftingPoint,
  type DraftingProjectGridLineObject,
  type DraftingProjectGridObject,
  type DraftingShaftObject,
  type DraftingUnderlay,
  type DraftingUnderlayCrop,
  type DraftingUnderlayTransform,
  type DraftingWorkspace,
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
import {
  createDraftCircleObject,
  createDraftLineObject,
  createDraftPolygonObject,
  createDraftPolylineObject,
  createDraftRectangleObject,
  createGeotechSurfaceObject,
  createStructuralJointObject,
} from './tools/primitive-geometry-tool';
import { createSecantPileWallObject } from './tools/secant-pile-wall-tool';
import { createSectionMarkerObject } from './tools/section-marker-tool';
import { createServiceCrossingObject } from './tools/service-crossing-tool';
import { createServiceRunObject } from './tools/service-run-tool';
import { createSoldierPileWallObject } from './tools/soldier-pile-wall-tool';
import { createWalerObject } from './tools/waler-tool';
import {
  buildDimensionChainOffsetPoints,
  calculateAnchorAngleDeg,
  calculateAnchorPlanLengthMm,
  defaultSoldierPileSymbolDiameterMm,
  rebuildSecantPileWallObject,
  rebuildSoldierPileWallObject,
} from './semantic-object-utils';
import { createManualDraftingPointAnchorRef } from './anchors/drafting-anchor-resolution';
import { createProjectGridObject } from './tools/project-grid-tool';
import { createProjectGridLineObject } from './tools/project-grid-line-tool';
import { createShaftObject } from './tools/shaft-tool';

const MAX_DRAFTING_OBJECT_CHANGE_EVENTS = 200;

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

export const DRAFTING_VIEW_MIN_SCALE = 0.005;
export const DRAFTING_VIEW_MAX_SCALE = 2;
export const DRAFTING_VIEW_RESET_SCALE = 1;

export function cloneDraftingModel(model: DraftingModel) {
  return structuredClone(ensureDraftingModelLayers(model));
}

export function updateDraftingDrawingSetup(
  model: DraftingModel,
  updater: (
    setup: NonNullable<DraftingModel['drawingSetup']>,
  ) => NonNullable<DraftingModel['drawingSetup']>,
): DraftingModel {
  return {
    ...model,
    drawingSetup: updater(ensureDraftingDrawingSetup(model)),
  };
}

export function centerDraftingViewOnPoint(
  model: DraftingModel,
  point: DraftingPoint,
  canvasSize: { height: number; width: number },
): DraftingModel {
  return {
    ...model,
    view: {
      ...model.view,
      offsetX: canvasSize.width / 2 - point.x * model.view.scale,
      offsetY: canvasSize.height / 2 - point.y * model.view.scale,
    },
  };
}

export function zoomDraftingViewAtPoint(
  view: DraftingModel['view'],
  worldPoint: DraftingPoint,
  screenPoint: DraftingPoint,
  nextScale: number,
): DraftingModel['view'] {
  const scale = clampNumber(nextScale, DRAFTING_VIEW_MIN_SCALE, DRAFTING_VIEW_MAX_SCALE);

  return {
    scale,
    offsetX: screenPoint.x - worldPoint.x * scale,
    offsetY: screenPoint.y - worldPoint.y * scale,
  };
}

export function resetDraftingViewZoom(
  model: DraftingModel,
  canvasSize: { height: number; width: number },
): DraftingModel['view'] {
  const centerWorld = {
    x: (canvasSize.width / 2 - model.view.offsetX) / model.view.scale,
    y: (canvasSize.height / 2 - model.view.offsetY) / model.view.scale,
  };

  return zoomDraftingViewAtPoint(
    model.view,
    centerWorld,
    { x: canvasSize.width / 2, y: canvasSize.height / 2 },
    DRAFTING_VIEW_RESET_SCALE,
  );
}

export function createDraftingObject(
  type: DraftingImplementedObjectType,
  point: DraftingPoint,
  model: DraftingModel,
  pendingLinePoints: DraftingPoint[] = [],
  author?: string | null,
): DraftingObject {
  let object: DraftingObject;

  switch (type) {
    case 'pile':
      object = createPileObject(point, model);
      break;
    case 'secant_pile_wall':
      object = createSecantPileWallObject(point, model);
      if (pendingLinePoints.length >= 2 && object.type === 'secant_pile_wall') {
        object = rebuildSecantPileWallObject({
          ...object,
          geometry: {
            ...object.geometry,
            baselinePoints: pendingLinePoints.slice(0, 2),
          },
        });
      }
      break;
    case 'soldier_pile_wall':
      object = createSoldierPileWallObject(point, model);
      if (pendingLinePoints.length >= 2 && object.type === 'soldier_pile_wall') {
        object = rebuildSoldierPileWallObject({
          ...object,
          geometry: {
            ...object.geometry,
            baselinePoints: pendingLinePoints.slice(0, 2),
          },
        });
      }
      break;
    case 'anchor_tieback':
      object = createAnchorTiebackObject(point, model);
      if (pendingLinePoints.length >= 2 && object.type === 'anchor_tieback') {
        const [headPoint, tailPoint] = pendingLinePoints;
        object = {
          ...object,
          geometry: { headPoint: headPoint!, tailPoint: tailPoint! },
          parameters: {
            ...object.parameters,
            angleDeg: calculateAnchorAngleDeg(headPoint!, tailPoint!),
            planLengthMm: calculateAnchorPlanLengthMm(headPoint!, tailPoint!),
          },
        };
      }
      break;
    case 'capping_beam':
      object = createCappingBeamObject(point, model);
      if (pendingLinePoints.length >= 2 && object.type === 'capping_beam') {
        object = { ...object, geometry: { ...object.geometry, points: pendingLinePoints } };
      }
      break;
    case 'waler':
      object = createWalerObject(point, model);
      if (pendingLinePoints.length >= 2 && object.type === 'waler') {
        object = { ...object, geometry: { ...object.geometry, points: pendingLinePoints } };
      }
      break;
    case 'monitoring_point':
      object = createMonitoringPointObject(point, model);
      break;
    case 'leader_note':
      object = createLeaderNoteObject(point, model);
      break;
    case 'dimension_chain':
      object = createDimensionChainObject(point, model);
      if (pendingLinePoints.length >= 3 && object.type === 'dimension_chain') {
        const witnessPoints = pendingLinePoints.slice(0, -1);
        const offsetPoint = pendingLinePoints[pendingLinePoints.length - 1]!;
        const basePoint = witnessPoints[0]!;
        object = {
          ...object,
          geometry: {
            points: witnessPoints,
            offsetVector: {
              x: offsetPoint.x - basePoint.x,
              y: offsetPoint.y - basePoint.y,
            },
          },
          metadata: {
            ...object.metadata,
            associatedObjectIds: witnessPoints
              .map((entry) => entry.snapRef?.sourceObjectId)
              .filter((entry): entry is string => Boolean(entry)),
            witnessAnchorRefs: witnessPoints.map(
              (entry, index) =>
                entry.snapRef ?? createManualDraftingPointAnchorRef(entry, `Witness ${index + 1}`),
            ),
          },
        };
      }
      break;
    case 'callout':
      object = createCalloutObject(point, model);
      break;
    case 'section_marker':
      object = createSectionMarkerObject(point, model);
      if (pendingLinePoints.length >= 2 && object.type === 'section_marker') {
        object = {
          ...object,
          geometry: {
            ...object.geometry,
            startPoint: pendingLinePoints[0]!,
            endPoint: pendingLinePoints[1]!,
          },
        };
      }
      break;
    case 'borehole':
      object = createBoreholeObject(point, model);
      break;
    case 'service_run':
      object = createServiceRunObject(point, model);
      if (pendingLinePoints.length >= 2 && object.type === 'service_run') {
        object = { ...object, geometry: { ...object.geometry, path: pendingLinePoints } };
      }
      break;
    case 'service_crossing':
      object = createServiceCrossingObject(point, model);
      break;
    case 'excavation_line':
      object = createExcavationLineObject(point, model, pendingLinePoints);
      break;
    case 'draft_line':
      object = createDraftLineObject(point, model, pendingLinePoints[1]);
      break;
    case 'draft_polyline':
      object = createDraftPolylineObject(
        pendingLinePoints.length >= 2
          ? pendingLinePoints
          : [point, { x: point.x + 2400, y: point.y }],
        model,
      );
      break;
    case 'draft_rectangle':
      object = createDraftRectangleObject(point, model, pendingLinePoints[1]);
      break;
    case 'draft_circle':
      object = createDraftCircleObject(point, model, pendingLinePoints[1]);
      break;
    case 'draft_polygon':
      object = createDraftPolygonObject(
        pendingLinePoints.length >= 3
          ? pendingLinePoints
          : [point, { x: point.x + 1800, y: point.y }, { x: point.x + 900, y: point.y + 1400 }],
        model,
      );
      break;
    case 'structural_joint':
      object = createStructuralJointObject(point, model);
      break;
    case 'geotech_surface':
      object = createGeotechSurfaceObject(point, model);
      break;
    case 'project_grid':
      object = createProjectGridObject(point, model);
      break;
    case 'project_grid_line':
      object = createProjectGridLineObject(point, model, pendingLinePoints[1]);
      break;
    case 'shaft':
      object = createShaftObject(point, model, pendingLinePoints[1]);
      break;
    default:
      object = createPileObject(point, model);
      break;
  }

  return stampDraftingObjectProvenance(object, {
    action: 'created',
    at: object.createdAt,
    by: author,
  });
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

export function addDraftingObject(
  model: DraftingModel,
  object: DraftingObject,
  args: {
    at?: string;
    by?: string | null;
    summary?: string;
  } = {},
) {
  const at = args.at ?? object.provenance?.createdAt ?? object.createdAt;
  const nextObject = stampDraftingObjectProvenance(object, {
    action: 'created',
    at,
    by: args.by,
  });

  return {
    ...model,
    objects: [...model.objects, nextObject],
    objectChangeEvents: appendDraftingObjectChangeEvent(model.objectChangeEvents ?? [], {
      id: crypto.randomUUID(),
      objectId: nextObject.id,
      objectType: nextObject.type,
      action: 'created',
      at,
      ...(args.by ? { by: args.by } : {}),
      source: 'drafting-editor',
      summary: args.summary ?? summarizeDraftingObjectChange('created', nextObject),
    }),
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

export function replaceDraftingObjectWithProvenance(
  model: DraftingModel,
  objectId: string,
  nextObject: DraftingObject,
  args: {
    action: Extract<DraftingObjectProvenanceAction, 'updated' | 'moved'>;
    at?: string;
    by?: string | null;
    summary?: string;
  },
) {
  const at = args.at ?? nextObject.updatedAt ?? new Date().toISOString();
  const stampedObject = stampDraftingObjectProvenance(nextObject, {
    action: args.action,
    at,
    by: args.by,
  });

  return {
    ...replaceDraftingObject(model, objectId, stampedObject),
    objectChangeEvents: appendDraftingObjectChangeEvent(model.objectChangeEvents ?? [], {
      id: crypto.randomUUID(),
      objectId: stampedObject.id,
      objectType: stampedObject.type,
      action: args.action,
      at,
      ...(args.by ? { by: args.by } : {}),
      source: 'drafting-editor',
      summary: args.summary ?? summarizeDraftingObjectChange(args.action, stampedObject),
    }),
  };
}

export function removeDraftingObject(model: DraftingModel, objectId: string) {
  const object = model.objects.find((entry) => entry.id === objectId);

  return {
    ...model,
    objects: model.objects.filter((object) => object.id !== objectId),
    objectChangeEvents: object
      ? appendDraftingObjectChangeEvent(model.objectChangeEvents ?? [], {
          id: crypto.randomUUID(),
          objectId: object.id,
          objectType: object.type,
          action: 'deleted',
          at: new Date().toISOString(),
          source: 'drafting-editor',
          summary: object.name ? `Deleted ${object.name}` : `Deleted ${object.type}`,
        })
      : (model.objectChangeEvents ?? []),
  };
}

export function removeDraftingObjectWithProvenance(
  model: DraftingModel,
  objectId: string,
  args: {
    at?: string;
    by?: string | null;
  } = {},
) {
  const object = model.objects.find((entry) => entry.id === objectId);
  if (!object) {
    return model;
  }

  const at = args.at ?? new Date().toISOString();

  return {
    ...model,
    objects: model.objects.filter((entry) => entry.id !== objectId),
    objectChangeEvents: appendDraftingObjectChangeEvent(model.objectChangeEvents ?? [], {
      id: crypto.randomUUID(),
      objectId: object.id,
      objectType: object.type,
      action: 'deleted',
      at,
      ...(args.by ? { by: args.by } : {}),
      source: 'drafting-editor',
      summary: object.name ? `Deleted ${object.name}` : `Deleted ${object.type}`,
    }),
  };
}

export function recordDraftingObjectChangeEvent(
  model: DraftingModel,
  object: DraftingObject,
  args: {
    action: Extract<DraftingObjectProvenanceAction, 'created' | 'updated' | 'moved' | 'deleted'>;
    at?: string;
    by?: string | null;
    summary?: string;
  },
) {
  const at = args.at ?? object.updatedAt ?? new Date().toISOString();

  return {
    ...model,
    objectChangeEvents: appendDraftingObjectChangeEvent(model.objectChangeEvents ?? [], {
      id: crypto.randomUUID(),
      objectId: object.id,
      objectType: object.type,
      action: args.action,
      at,
      ...(args.by ? { by: args.by } : {}),
      source: 'drafting-editor',
      summary: args.summary ?? summarizeDraftingObjectChange(args.action, object),
    }),
  };
}

export function stampDraftingObjectProvenance(
  object: DraftingObject,
  args: {
    action: DraftingObjectProvenanceAction;
    at?: string;
    by?: string | null;
  },
): DraftingObject {
  const at = args.at ?? new Date().toISOString();
  const existing = object.provenance ?? {};
  const createdAt = existing.createdAt ?? (args.action === 'created' ? at : object.createdAt);
  const createdBy =
    existing.createdBy ?? (args.action === 'created' ? (args.by ?? undefined) : undefined);
  const updatedAt = args.action === 'created' ? (existing.updatedAt ?? at) : at;
  const updatedBy =
    args.action === 'created'
      ? (existing.updatedBy ?? args.by ?? undefined)
      : (args.by ?? existing.updatedBy);

  return {
    ...object,
    provenance: {
      createdAt,
      ...(createdBy ? { createdBy } : {}),
      updatedAt,
      ...(updatedBy ? { updatedBy } : {}),
      lastAction: args.action,
    },
    updatedAt,
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
  provenance?: {
    by?: string | null;
  },
): DraftingObject {
  const updatedAt = new Date().toISOString();
  const stampMoved = (nextObject: DraftingObject) =>
    stampDraftingObjectProvenance(nextObject, {
      action: 'moved',
      at: updatedAt,
      by: provenance?.by,
    });

  switch (object.type) {
    case 'pile':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          centre: {
            x: object.geometry.centre.x + deltaX,
            y: object.geometry.centre.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'secant_pile_wall':
      return stampMoved({
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
      });
    case 'soldier_pile_wall':
      return stampMoved({
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
      });
    case 'anchor_tieback':
      return stampMoved({
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
      });
    case 'capping_beam':
    case 'waler':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      });
    case 'monitoring_point':
      return stampMoved({
        ...object,
        geometry: {
          point: {
            x: object.geometry.point.x + deltaX,
            y: object.geometry.point.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'leader_note':
      return stampMoved({
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
      });
    case 'dimension_chain':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      });
    case 'callout':
      return stampMoved({
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
      });
    case 'section_marker':
      return stampMoved({
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
      });
    case 'borehole':
      return stampMoved({
        ...object,
        geometry: {
          point: {
            x: object.geometry.point.x + deltaX,
            y: object.geometry.point.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'service_run':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          path: object.geometry.path.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      });
    case 'service_crossing':
      return stampMoved({
        ...object,
        geometry: {
          crossingPoint: {
            x: object.geometry.crossingPoint.x + deltaX,
            y: object.geometry.crossingPoint.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'excavation_line':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existingPoint) => ({
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      });
    case 'draft_line':
      return stampMoved({
        ...object,
        geometry: {
          startPoint: {
            x: object.geometry.startPoint.x + deltaX,
            y: object.geometry.startPoint.y + deltaY,
            ...(object.geometry.startPoint.z !== undefined
              ? { z: object.geometry.startPoint.z }
              : {}),
            ...(object.geometry.startPoint.rl !== undefined
              ? { rl: object.geometry.startPoint.rl }
              : {}),
          },
          endPoint: {
            x: object.geometry.endPoint.x + deltaX,
            y: object.geometry.endPoint.y + deltaY,
            ...(object.geometry.endPoint.z !== undefined ? { z: object.geometry.endPoint.z } : {}),
            ...(object.geometry.endPoint.rl !== undefined
              ? { rl: object.geometry.endPoint.rl }
              : {}),
          },
        },
        updatedAt,
      });
    case 'draft_polyline':
    case 'draft_polygon':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existingPoint) => ({
            ...existingPoint,
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      });
    case 'draft_rectangle':
      return stampMoved({
        ...object,
        geometry: {
          cornerA: {
            ...object.geometry.cornerA,
            x: object.geometry.cornerA.x + deltaX,
            y: object.geometry.cornerA.y + deltaY,
          },
          cornerB: {
            ...object.geometry.cornerB,
            x: object.geometry.cornerB.x + deltaX,
            y: object.geometry.cornerB.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'draft_circle':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          centre: {
            ...object.geometry.centre,
            x: object.geometry.centre.x + deltaX,
            y: object.geometry.centre.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'structural_joint':
      return stampMoved({
        ...object,
        geometry: {
          point: {
            ...object.geometry.point,
            x: object.geometry.point.x + deltaX,
            y: object.geometry.point.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'geotech_surface':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existingPoint) => ({
            ...existingPoint,
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
          breaklines: object.geometry.breaklines?.map((line) =>
            line.map((existingPoint) => ({
              ...existingPoint,
              x: existingPoint.x + deltaX,
              y: existingPoint.y + deltaY,
            })),
          ),
          boundary: object.geometry.boundary?.map((existingPoint) => ({
            ...existingPoint,
            x: existingPoint.x + deltaX,
            y: existingPoint.y + deltaY,
          })),
        },
        updatedAt,
      });
    case 'project_grid':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          origin: {
            ...object.geometry.origin,
            x: object.geometry.origin.x + deltaX,
            y: object.geometry.origin.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'project_grid_line':
      return stampMoved({
        ...object,
        geometry: {
          start: {
            ...object.geometry.start,
            x: object.geometry.start.x + deltaX,
            y: object.geometry.start.y + deltaY,
          },
          end: {
            ...object.geometry.end,
            x: object.geometry.end.x + deltaX,
            y: object.geometry.end.y + deltaY,
          },
        },
        updatedAt,
      });
    case 'shaft':
      return stampMoved({
        ...object,
        geometry: {
          ...object.geometry,
          centre: {
            ...object.geometry.centre,
            x: object.geometry.centre.x + deltaX,
            y: object.geometry.centre.y + deltaY,
          },
        },
        updatedAt,
      });
    default:
      return stampMoved({
        ...object,
        updatedAt,
      });
  }
}

export function haveDraftingObjectGeometryOrLayerChanged(
  previous: DraftingObject,
  next: DraftingObject,
) {
  return (
    previous.layerId !== next.layerId ||
    JSON.stringify(previous.geometry) !== JSON.stringify(next.geometry)
  );
}

export function appendDraftingObjectChangeEvent(
  events: DraftingObjectChangeEvent[],
  event: DraftingObjectChangeEvent,
) {
  return [...events, event].slice(-MAX_DRAFTING_OBJECT_CHANGE_EVENTS);
}

function summarizeDraftingObjectChange(
  action: Exclude<DraftingObjectProvenanceAction, 'imported' | 'unknown'>,
  object: DraftingObject,
) {
  const label = object.name || getDraftingObjectSemanticLabel(object) || object.type;
  const verb =
    action === 'created'
      ? 'Created'
      : action === 'updated'
        ? 'Updated'
        : action === 'moved'
          ? 'Moved'
          : 'Deleted';

  return `${verb} ${label}`;
}

function getDraftingObjectSemanticLabel(object: DraftingObject) {
  switch (object.type) {
    case 'pile':
      return object.metadata.pileId;
    case 'secant_pile_wall':
    case 'soldier_pile_wall':
      return object.metadata.wallId;
    case 'anchor_tieback':
      return object.parameters.anchorId;
    case 'capping_beam':
      return object.parameters.beamId;
    case 'waler':
      return object.parameters.walerId;
    case 'monitoring_point':
      return object.metadata.pointId;
    case 'dimension_chain':
      return object.parameters.dimensionId;
    case 'callout':
      return object.parameters.calloutId;
    case 'section_marker':
      return object.parameters.sectionId;
    case 'borehole':
      return object.parameters.boreholeId;
    case 'service_run':
      return object.parameters.serviceId;
    case 'service_crossing':
      return object.parameters.crossingId;
    case 'leader_note':
      return object.metadata.text;
    case 'excavation_line':
      return object.metadata.excavationId;
    case 'draft_line':
      return object.metadata.lineId;
    case 'draft_polyline':
      return object.metadata.polylineId;
    case 'draft_rectangle':
      return object.metadata.rectangleId;
    case 'draft_circle':
      return object.metadata.circleId;
    case 'draft_polygon':
      return object.metadata.polygonId;
    case 'structural_joint':
      return object.parameters.jointId;
    case 'geotech_surface':
      return object.parameters.surfaceId;
    case 'project_grid':
      return object.metadata.gridId;
    case 'project_grid_line':
      return object.metadata.gridLineId;
    case 'shaft':
      return object.metadata.shaftId;
    default:
      return object.id;
  }
}

export function fitDraftingModelView(
  model: DraftingModel,
  width: number,
  height: number,
): DraftingModel['view'] {
  return fitDraftingObjectsView(model.objects, width, height, {
    scale: createEmptyDraftingModel(model.drawingId).view.scale,
    offsetX: width / 2,
    offsetY: height / 2,
  });
}

export function fitDraftingObjectsView(
  objects: DraftingObject[],
  width: number,
  height: number,
  fallbackView?: DraftingModel['view'],
): DraftingModel['view'] {
  const bounds = getDraftingModelBounds(objects);
  if (!bounds) {
    return (
      fallbackView ?? { scale: DRAFTING_VIEW_RESET_SCALE, offsetX: width / 2, offsetY: height / 2 }
    );
  }

  return fitDraftingBoundsView(bounds, width, height);
}

export function fitDraftingBoundsView(
  bounds: DraftingBounds,
  width: number,
  height: number,
): DraftingModel['view'] {
  const padding = 64;
  const spanX = Math.max(bounds.maxX - bounds.minX, 1000);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1000);
  const scale = clampNumber(
    Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY),
    DRAFTING_VIEW_MIN_SCALE,
    DRAFTING_VIEW_RESET_SCALE,
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
      return getPointCollectionBounds([object.geometry.startPoint, object.geometry.endPoint], 520);
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
    case 'draft_line':
      return getPointCollectionBounds([object.geometry.startPoint, object.geometry.endPoint], 120);
    case 'draft_polyline':
    case 'draft_polygon':
      return getPointCollectionBounds(object.geometry.points, 120);
    case 'draft_rectangle':
      return getPointCollectionBounds([object.geometry.cornerA, object.geometry.cornerB], 120);
    case 'draft_circle':
      return {
        minX: object.geometry.centre.x - object.geometry.radiusMm,
        minY: object.geometry.centre.y - object.geometry.radiusMm,
        maxX: object.geometry.centre.x + object.geometry.radiusMm,
        maxY: object.geometry.centre.y + object.geometry.radiusMm,
      };
    case 'structural_joint':
      return getPointCollectionBounds([object.geometry.point], 360);
    case 'geotech_surface':
      return getPointCollectionBounds(
        [
          ...object.geometry.points,
          ...(object.geometry.breaklines ?? []).flat(),
          ...(object.geometry.boundary ?? []),
        ],
        360,
      );
    case 'project_grid':
      return getProjectGridObjectBounds(object);
    case 'project_grid_line':
      return getProjectGridLineObjectBounds(object);
    case 'shaft':
      return getShaftObjectBounds(object);
    default:
      return null;
  }
}

function getProjectGridLineObjectBounds(object: DraftingProjectGridLineObject): DraftingBounds {
  const padding = Math.max(object.metadata.bubbleRadiusMm * 2.4, 360);
  return getPointCollectionBounds([object.geometry.start, object.geometry.end], padding)!;
}

function getShaftObjectBounds(object: DraftingShaftObject): DraftingBounds {
  const radius =
    object.geometry.radiusMm + Math.max(object.parameters.pileDiameterMm / 2, 180) + 160;
  return {
    minX: object.geometry.centre.x - radius,
    minY: object.geometry.centre.y - radius,
    maxX: object.geometry.centre.x + radius,
    maxY: object.geometry.centre.y + radius,
  };
}

function getProjectGridObjectBounds(object: DraftingProjectGridObject): DraftingBounds {
  const corners = [
    projectGridLocalToWorld(
      object,
      -object.geometry.extentXNegativeMm,
      -object.geometry.extentYNegativeMm,
    ),
    projectGridLocalToWorld(
      object,
      object.geometry.extentXPositiveMm,
      -object.geometry.extentYNegativeMm,
    ),
    projectGridLocalToWorld(
      object,
      -object.geometry.extentXNegativeMm,
      object.geometry.extentYPositiveMm,
    ),
    projectGridLocalToWorld(
      object,
      object.geometry.extentXPositiveMm,
      object.geometry.extentYPositiveMm,
    ),
  ];
  const bubblePadding = Math.max(object.metadata.bubbleRadiusMm * 2.4, 360);
  return getPointCollectionBounds(corners, bubblePadding)!;
}

function projectGridLocalToWorld(object: DraftingProjectGridObject, x: number, y: number) {
  const angle = (object.geometry.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: object.geometry.origin.x + x * cos - y * sin,
    y: object.geometry.origin.y + x * sin + y * cos,
  };
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

export function getDraftingWorkspaces(model: DraftingModel) {
  return model.workspaces ?? [];
}

export function getVisibleDraftingObjectsForWorkspace(
  model: DraftingModel,
  workspaceId: string | null,
) {
  const visibleObjects = getVisibleDraftingObjects(model);
  if (!workspaceId || workspaceId === 'workspace-all') {
    return visibleObjects;
  }

  const workspace = getDraftingWorkspaces(model).find((candidate) => candidate.id === workspaceId);
  if (!workspace || workspace.visible === false) {
    return visibleObjects;
  }

  return visibleObjects.filter((object) => isDraftingObjectInWorkspace(object, workspace));
}

export function isDraftingObjectInWorkspace(object: DraftingObject, workspace: DraftingWorkspace) {
  if (workspace.kind === 'parent') {
    return true;
  }
  if (object.workspaceId === workspace.id) {
    return true;
  }

  const filter = workspace.objectFilter;
  if (!filter) {
    return false;
  }
  if (filter.objectIds?.includes(object.id)) {
    return true;
  }
  if (filter.objectTypes?.includes(object.type)) {
    return true;
  }
  if (filter.layerIds?.includes(object.layerId)) {
    return true;
  }

  return false;
}

export function assignDraftingObjectWorkspace(
  object: DraftingObject,
  workspaceId: string | undefined,
): DraftingObject {
  return {
    ...object,
    workspaceId: workspaceId && workspaceId !== 'workspace-all' ? workspaceId : undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function isDraftingUnderlayVisible(model: DraftingModel, underlay: DraftingUnderlay) {
  if (!underlay.visible) {
    return false;
  }

  const layer = getLayerById(model, 'underlay');
  return layer?.visible !== false;
}

export function isDraftingUnderlayRenderable(underlay: DraftingUnderlay) {
  const runtimeUnderlay = underlay as Partial<DraftingUnderlay>;
  const transform = runtimeUnderlay.transform as Partial<DraftingUnderlayTransform> | undefined;
  const crop = runtimeUnderlay.crop as Partial<DraftingUnderlayCrop> | null | undefined;

  if (
    typeof runtimeUnderlay.fileId !== 'string' ||
    runtimeUnderlay.fileId.trim().length === 0 ||
    !Number.isInteger(runtimeUnderlay.pageNumber) ||
    (runtimeUnderlay.pageNumber ?? 0) <= 0 ||
    !Number.isFinite(runtimeUnderlay.opacity) ||
    (runtimeUnderlay.opacity ?? -1) < 0 ||
    (runtimeUnderlay.opacity ?? 2) > 1 ||
    !transform ||
    !Number.isFinite(transform.x) ||
    !Number.isFinite(transform.y) ||
    !Number.isFinite(transform.scale) ||
    (transform.scale ?? 0) <= 0 ||
    !Number.isFinite(transform.rotationDeg)
  ) {
    return false;
  }

  if (!crop) {
    return true;
  }

  return (
    Number.isFinite(crop.x) &&
    Number.isFinite(crop.y) &&
    Number.isFinite(crop.width) &&
    Number.isFinite(crop.height) &&
    (crop.width ?? 0) > 0 &&
    (crop.height ?? 0) > 0
  );
}

export function getVisibleDraftingUnderlays(model: DraftingModel) {
  return model.underlays.filter(
    (underlay) =>
      isDraftingUnderlayVisible(model, underlay) && isDraftingUnderlayRenderable(underlay),
  );
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

export function getDraftingCurrentRevisionLabel(model: DraftingModel) {
  return model.revisionBlock?.currentRevision || model.revisionBlock?.revisions.at(-1)?.revision;
}

export function getDraftingDrawingTitle(model: DraftingModel, fallback: string) {
  return model.titleBlock?.drawingTitle?.trim() || fallback;
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
