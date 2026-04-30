import * as React from 'react';
import type { DraftingModel, DraftingObject, DraftingPoint } from '@eng/shared';
import {
  buildDimensionChainOffsetPoints,
  calculateAnchorAngleDeg,
  calculateAnchorPlanLengthMm,
  rebuildSecantPileWallObject,
  rebuildSoldierPileWallObject,
} from '../semantic-object-utils';
import { canEditDraftingObject, stampDraftingObjectProvenance } from '../model-utils';
import {
  isDraftingRendererContextInteractive,
  type DraftingRendererContext,
  type DraftingRendererSurface,
} from '../renderers/renderer-types';

export type DraftingObjectHandleKind =
  | 'anchor'
  | 'baseline'
  | 'centre'
  | 'corner'
  | 'endpoint'
  | 'generated'
  | 'label'
  | 'offset'
  | 'point'
  | 'radius'
  | 'vertex';

export type DraftingObjectHandleMetadata = Pick<DraftingPoint, 'rl' | 'snapRef' | 'z'>;

export type DraftingObjectHandle = {
  blockedReason?: string;
  cursor?: string;
  editable: boolean;
  id: string;
  kind: DraftingObjectHandleKind;
  label: string;
  objectId: string;
  point: DraftingPoint;
  sourcePointMetadata?: DraftingObjectHandleMetadata;
  tone?: 'primary' | 'secondary' | 'warning';
  updatePath?: string;
};

export type DraftingObjectHandleResolverOptions = {
  context?: DraftingRendererContext;
  includeBlocked?: boolean;
  interactionEnabled?: boolean;
  model?: DraftingModel;
  object: DraftingObject | null;
  readOnly?: boolean;
  surface?: DraftingRendererSurface;
};

export function getDraftingObjectHandles(object: DraftingObject): DraftingObjectHandle[] {
  switch (object.type) {
    case 'pile': {
      const radius = object.geometry.diameterMm / 2;
      return [
        createHandle(object, 'centre', 'centre', 'Pile centre', object.geometry.centre, {
          cursor: 'move',
          updatePath: 'geometry.centre',
        }),
        createHandle(
          object,
          'diameter',
          'radius',
          'Diameter grip',
          { x: object.geometry.centre.x + radius, y: object.geometry.centre.y },
          {
            cursor: 'ew-resize',
            tone: 'secondary',
            updatePath: 'geometry.diameterMm',
          },
        ),
      ];
    }
    case 'secant_pile_wall':
      return [
        ...object.geometry.baselinePoints.map((point, index) =>
          createHandle(
            object,
            `baseline-${index}`,
            'baseline',
            index === 0 ? 'Baseline start' : 'Baseline end',
            point,
            {
              cursor: 'move',
              updatePath: `geometry.baselinePoints.${index}`,
            },
          ),
        ),
        ...object.geometry.pileCentres.map((point, index) =>
          createHandle(
            object,
            `pile-centre-${index}`,
            'generated',
            `Pile centre ${index + 1}`,
            point,
            {
              blockedReason: 'Generated from baseline points',
              editable: false,
              tone: 'secondary',
            },
          ),
        ),
      ];
    case 'soldier_pile_wall':
      return [
        ...object.geometry.baselinePoints.map((point, index) =>
          createHandle(
            object,
            `baseline-${index}`,
            'baseline',
            index === 0 ? 'Baseline start' : 'Baseline end',
            point,
            {
              cursor: 'move',
              updatePath: `geometry.baselinePoints.${index}`,
            },
          ),
        ),
        ...object.geometry.pilePositions.map((point, index) =>
          createHandle(
            object,
            `pile-position-${index}`,
            'generated',
            `Soldier pile ${index + 1}`,
            point,
            {
              blockedReason: 'Generated from baseline points',
              editable: false,
              tone: 'secondary',
            },
          ),
        ),
      ];
    case 'anchor_tieback':
      return [
        createHandle(object, 'head', 'endpoint', 'Anchor head', object.geometry.headPoint, {
          cursor: 'move',
          updatePath: 'geometry.headPoint',
        }),
        createHandle(object, 'tail', 'endpoint', 'Anchor tail', object.geometry.tailPoint, {
          cursor: 'move',
          updatePath: 'geometry.tailPoint',
        }),
      ];
    case 'capping_beam':
    case 'waler':
      return object.geometry.points.map((point, index) =>
        createHandle(
          object,
          `point-${index}`,
          index === 0 || index === object.geometry.points.length - 1 ? 'endpoint' : 'vertex',
          index === 0
            ? 'Path start'
            : index === object.geometry.points.length - 1
              ? 'Path end'
              : `Path vertex ${index + 1}`,
          point,
          {
            cursor: 'move',
            updatePath: `geometry.points.${index}`,
          },
        ),
      );
    case 'service_run':
      return object.geometry.path.map((point, index) =>
        createHandle(
          object,
          `path-${index}`,
          index === 0 || index === object.geometry.path.length - 1 ? 'endpoint' : 'vertex',
          index === 0
            ? 'Service start'
            : index === object.geometry.path.length - 1
              ? 'Service end'
              : `Service vertex ${index + 1}`,
          point,
          {
            cursor: 'move',
            updatePath: `geometry.path.${index}`,
          },
        ),
      );
    case 'service_crossing':
      return [
        createHandle(
          object,
          'crossing',
          'point',
          linkedServiceLabel(object),
          object.geometry.crossingPoint,
          {
            cursor: 'move',
            tone: 'warning',
            updatePath: 'geometry.crossingPoint',
          },
        ),
      ];
    case 'monitoring_point':
    case 'borehole':
      return [
        createHandle(object, 'point', 'point', 'Point grip', object.geometry.point, {
          cursor: 'move',
          updatePath: 'geometry.point',
        }),
      ];
    case 'leader_note':
      return [
        createHandle(object, 'anchor', 'anchor', 'Leader anchor', object.geometry.anchor, {
          cursor: 'move',
          updatePath: 'geometry.anchor',
        }),
        createHandle(object, 'text', 'label', 'Note text', object.geometry.textPoint, {
          cursor: 'move',
          updatePath: 'geometry.textPoint',
        }),
      ];
    case 'dimension_chain': {
      const offsetPoints = buildDimensionChainOffsetPoints(object);
      return [
        ...object.geometry.points.map((point, index) =>
          createHandle(object, `point-${index}`, 'point', `Dimension witness ${index + 1}`, point, {
            cursor: 'move',
            updatePath: `geometry.points.${index}`,
          }),
        ),
        ...offsetPoints.map((point, index) =>
          createHandle(object, `offset-${index}`, 'offset', `Dimension line ${index + 1}`, point, {
            cursor: 'move',
            tone: 'secondary',
            updatePath: 'geometry.offsetVector',
          }),
        ),
      ];
    }
    case 'callout':
      return [
        createHandle(object, 'anchor', 'anchor', 'Callout anchor', object.geometry.anchorPoint, {
          cursor: 'move',
          updatePath: 'geometry.anchorPoint',
        }),
        createHandle(object, 'label', 'label', 'Callout label', object.geometry.labelPoint, {
          cursor: 'move',
          updatePath: 'geometry.labelPoint',
        }),
      ];
    case 'section_marker':
      return [
        createHandle(object, 'start', 'endpoint', 'Section start', object.geometry.startPoint, {
          cursor: 'move',
          updatePath: 'geometry.startPoint',
        }),
        createHandle(object, 'end', 'endpoint', 'Section end', object.geometry.endPoint, {
          cursor: 'move',
          updatePath: 'geometry.endPoint',
        }),
      ];
    case 'excavation_line':
      return object.geometry.points.map((point, index) =>
        createHandle(object, `point-${index}`, 'vertex', `Excavation vertex ${index + 1}`, point, {
          cursor: 'move',
          updatePath: `geometry.points.${index}`,
        }),
      );
    case 'draft_line':
      return [
        createHandle(object, 'start', 'endpoint', 'Line start', object.geometry.startPoint, {
          cursor: 'move',
          updatePath: 'geometry.startPoint',
        }),
        createHandle(object, 'end', 'endpoint', 'Line end', object.geometry.endPoint, {
          cursor: 'move',
          updatePath: 'geometry.endPoint',
        }),
      ];
    case 'draft_polyline':
    case 'draft_polygon':
      return object.geometry.points.map((point, index) =>
        createHandle(object, `point-${index}`, 'vertex', `Vertex ${index + 1}`, point, {
          cursor: 'move',
          updatePath: `geometry.points.${index}`,
        }),
      );
    case 'draft_rectangle':
      return [
        createHandle(
          object,
          'corner-a',
          'corner',
          'Rectangle first corner',
          object.geometry.cornerA,
          {
            cursor: 'move',
            updatePath: 'geometry.cornerA',
          },
        ),
        createHandle(
          object,
          'corner-b',
          'corner',
          'Rectangle opposite corner',
          object.geometry.cornerB,
          {
            cursor: 'move',
            updatePath: 'geometry.cornerB',
          },
        ),
      ];
    case 'draft_circle':
      return [
        createHandle(object, 'centre', 'centre', 'Circle centre', object.geometry.centre, {
          cursor: 'move',
          updatePath: 'geometry.centre',
        }),
        createHandle(
          object,
          'radius',
          'radius',
          'Circle radius',
          {
            x: object.geometry.centre.x + object.geometry.radiusMm,
            y: object.geometry.centre.y,
          },
          {
            cursor: 'ew-resize',
            tone: 'secondary',
            updatePath: 'geometry.radiusMm',
          },
        ),
      ];
    case 'structural_joint':
      return [
        createHandle(object, 'point', 'point', 'Joint point', object.geometry.point, {
          cursor: 'move',
          updatePath: 'geometry.point',
        }),
      ];
    case 'geotech_surface':
      return object.geometry.points.map((point, index) =>
        createHandle(
          object,
          `surface-point-${index}`,
          'point',
          `Surface point ${index + 1}`,
          point,
          {
            cursor: 'move',
            updatePath: `geometry.points.${index}`,
          },
        ),
      );
    case 'project_grid':
      return [
        createHandle(object, 'origin', 'anchor', 'Grid origin', object.geometry.origin, {
          cursor: 'move',
          updatePath: 'geometry.origin',
        }),
        createHandle(
          object,
          'x-extent',
          'generated',
          'X grid extent',
          projectGridLocalToWorld(object, object.geometry.extentXPositiveMm, 0),
          {
            blockedReason: 'Edit grid spacing and counts in Properties',
            editable: false,
            tone: 'secondary',
          },
        ),
        createHandle(
          object,
          'y-extent',
          'generated',
          'Y grid extent',
          projectGridLocalToWorld(object, 0, object.geometry.extentYPositiveMm),
          {
            blockedReason: 'Edit grid spacing and counts in Properties',
            editable: false,
            tone: 'secondary',
          },
        ),
      ];
    case 'project_grid_line':
      return [
        createHandle(object, 'start', 'endpoint', 'Grid line start', object.geometry.start, {
          cursor: 'move',
          updatePath: 'geometry.start',
        }),
        createHandle(object, 'end', 'endpoint', 'Grid line end', object.geometry.end, {
          cursor: 'move',
          updatePath: 'geometry.end',
        }),
      ];
    case 'shaft':
      return [
        createHandle(object, 'centre', 'centre', 'Shaft centre', object.geometry.centre, {
          cursor: 'move',
          updatePath: 'geometry.centre',
        }),
        createHandle(
          object,
          'radius',
          'radius',
          'Shaft radius',
          {
            x: object.geometry.centre.x + object.geometry.radiusMm,
            y: object.geometry.centre.y,
          },
          {
            cursor: 'ew-resize',
            tone: 'secondary',
            updatePath: 'geometry.radiusMm',
          },
        ),
      ];
    default:
      return [];
  }
}

export function resolveDraftingObjectHandles({
  context,
  includeBlocked = true,
  interactionEnabled,
  model,
  object,
  readOnly,
  surface,
}: DraftingObjectHandleResolverOptions): DraftingObjectHandle[] {
  if (!object) {
    return [];
  }

  const handles = getDraftingObjectHandles(object);
  const blockedReason = resolveObjectHandleBlockedReason({
    context,
    interactionEnabled,
    model,
    object,
    readOnly,
    surface,
  });
  const resolvedHandles = blockedReason
    ? handles.map((handle) => ({ ...handle, blockedReason, editable: false }))
    : handles;

  return includeBlocked ? resolvedHandles : resolvedHandles.filter((handle) => handle.editable);
}

function createHandle(
  object: DraftingObject,
  id: string,
  kind: DraftingObjectHandleKind,
  label: string,
  point: DraftingPoint,
  options: {
    blockedReason?: string;
    cursor?: string;
    editable?: boolean;
    tone?: DraftingObjectHandle['tone'];
    updatePath?: string;
  } = {},
): DraftingObjectHandle {
  return {
    editable: options.editable ?? true,
    id,
    kind,
    label,
    objectId: object.id,
    point,
    sourcePointMetadata: extractPointMetadata(point),
    ...(options.blockedReason ? { blockedReason: options.blockedReason } : {}),
    ...(options.cursor ? { cursor: options.cursor } : {}),
    ...(options.tone ? { tone: options.tone } : {}),
    ...(options.updatePath ? { updatePath: options.updatePath } : {}),
  };
}

function resolveObjectHandleBlockedReason({
  context,
  interactionEnabled,
  model,
  object,
  readOnly,
  surface,
}: Omit<DraftingObjectHandleResolverOptions, 'includeBlocked'> & {
  object: DraftingObject;
}) {
  if (context) {
    if (!isDraftingRendererContextInteractive(context)) {
      return context.readOnly
        ? 'Read-only surface'
        : `${formatRendererSurface(context.surface)} surface is not interactive`;
    }
  } else {
    if (readOnly || surface === 'read_only') {
      return 'Read-only surface';
    }
    if (surface && surface !== 'editor') {
      return `${formatRendererSurface(surface)} surface is not interactive`;
    }
    if (interactionEnabled === false) {
      return 'Interaction disabled';
    }
  }

  if (model) {
    if (object.locked) {
      return 'Object locked';
    }
    const layer = model.layers.find((candidate) => candidate.id === object.layerId);
    if (layer?.locked) {
      return 'Layer locked';
    }
  }

  return null;
}

function formatRendererSurface(surface: DraftingRendererSurface) {
  return surface.replaceAll('_', ' ');
}

function extractPointMetadata(point: DraftingPoint): DraftingObjectHandleMetadata | undefined {
  const metadata: DraftingObjectHandleMetadata = {};
  if (point.snapRef) {
    metadata.snapRef = point.snapRef;
  }
  if (point.z !== undefined) {
    metadata.z = point.z;
  }
  if (point.rl !== undefined) {
    metadata.rl = point.rl;
  }
  return Object.keys(metadata).length ? metadata : undefined;
}

function preserveDraftingPointMetadata(
  previousPoint: DraftingPoint | undefined,
  nextPoint: DraftingPoint,
): DraftingPoint {
  if (!previousPoint) {
    return nextPoint;
  }

  return {
    ...nextPoint,
    ...(previousPoint.snapRef ? { snapRef: previousPoint.snapRef } : {}),
    ...(previousPoint.z !== undefined ? { z: previousPoint.z } : {}),
    ...(previousPoint.rl !== undefined ? { rl: previousPoint.rl } : {}),
  };
}

export function updateDraftingObjectHandle(
  object: DraftingObject,
  handleId: string,
  point: DraftingPoint,
  by?: string | null,
): DraftingObject {
  const updatedAt = new Date().toISOString();
  const moved = (nextObject: DraftingObject) =>
    stampDraftingObjectProvenance(
      { ...nextObject, updatedAt },
      { action: 'moved', at: updatedAt, by },
    );

  switch (object.type) {
    case 'pile': {
      if (handleId === 'diameter') {
        const diameterMm = Math.max(
          100,
          Math.hypot(point.x - object.geometry.centre.x, point.y - object.geometry.centre.y) * 2,
        );
        return moved({ ...object, geometry: { ...object.geometry, diameterMm } });
      }
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          centre: preserveDraftingPointMetadata(object.geometry.centre, point),
        },
      });
    }
    case 'secant_pile_wall': {
      const index = Number(handleId.replace('baseline-', ''));
      if (!Number.isInteger(index)) {
        return object;
      }
      return moved(
        rebuildSecantPileWallObject({
          ...object,
          geometry: {
            ...object.geometry,
            baselinePoints: object.geometry.baselinePoints.map((existing, existingIndex) =>
              existingIndex === index ? preserveDraftingPointMetadata(existing, point) : existing,
            ),
          },
        }),
      );
    }
    case 'soldier_pile_wall': {
      const index = Number(handleId.replace('baseline-', ''));
      if (!Number.isInteger(index)) {
        return object;
      }
      return moved(
        rebuildSoldierPileWallObject({
          ...object,
          geometry: {
            ...object.geometry,
            baselinePoints: object.geometry.baselinePoints.map((existing, existingIndex) =>
              existingIndex === index ? preserveDraftingPointMetadata(existing, point) : existing,
            ),
          },
        }),
      );
    }
    case 'anchor_tieback': {
      const geometry =
        handleId === 'head'
          ? {
              headPoint: preserveDraftingPointMetadata(object.geometry.headPoint, point),
              tailPoint: object.geometry.tailPoint,
            }
          : {
              headPoint: object.geometry.headPoint,
              tailPoint: preserveDraftingPointMetadata(object.geometry.tailPoint, point),
            };
      return moved({
        ...object,
        geometry,
        parameters: {
          ...object.parameters,
          angleDeg: calculateAnchorAngleDeg(geometry.headPoint, geometry.tailPoint),
          planLengthMm: calculateAnchorPlanLengthMm(geometry.headPoint, geometry.tailPoint),
        },
      });
    }
    case 'capping_beam':
    case 'waler': {
      const index = Number(handleId.replace('point-', ''));
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existing, existingIndex) =>
            existingIndex === index
              ? (preserveDraftingPointMetadata(existing, point) as typeof existing)
              : existing,
          ),
        },
      });
    }
    case 'service_run': {
      const index = Number(handleId.replace('path-', ''));
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          path: object.geometry.path.map((existing, existingIndex) =>
            existingIndex === index ? preserveDraftingPointMetadata(existing, point) : existing,
          ),
        },
      });
    }
    case 'service_crossing':
      return moved({
        ...object,
        geometry: {
          crossingPoint: preserveDraftingPointMetadata(object.geometry.crossingPoint, point),
        },
      });
    case 'monitoring_point':
    case 'borehole':
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          point: preserveDraftingPointMetadata(object.geometry.point, point),
        },
      });
    case 'leader_note':
      return moved({
        ...object,
        geometry:
          handleId === 'anchor'
            ? {
                ...object.geometry,
                anchor: preserveDraftingPointMetadata(object.geometry.anchor, point),
              }
            : {
                ...object.geometry,
                textPoint: preserveDraftingPointMetadata(object.geometry.textPoint, point),
              },
      });
    case 'dimension_chain': {
      if (handleId.startsWith('offset-')) {
        const index = Number(handleId.replace('offset-', ''));
        const basePoint = object.geometry.points[index];
        if (!basePoint) {
          return object;
        }
        return moved({
          ...object,
          geometry: {
            ...object.geometry,
            offsetVector: preserveDraftingPointMetadata(object.geometry.offsetVector, {
              x: point.x - basePoint.x,
              y: point.y - basePoint.y,
            }),
          },
        });
      }
      const index = Number(handleId.replace('point-', ''));
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existing, existingIndex) =>
            existingIndex === index
              ? (preserveDraftingPointMetadata(existing, point) as typeof existing)
              : existing,
          ),
        },
      });
    }
    case 'callout':
      return moved({
        ...object,
        geometry:
          handleId === 'anchor'
            ? {
                ...object.geometry,
                anchorPoint: preserveDraftingPointMetadata(object.geometry.anchorPoint, point),
              }
            : {
                ...object.geometry,
                labelPoint: preserveDraftingPointMetadata(object.geometry.labelPoint, point),
              },
      });
    case 'section_marker':
      return moved({
        ...object,
        geometry:
          handleId === 'start'
            ? {
                ...object.geometry,
                startPoint: preserveDraftingPointMetadata(object.geometry.startPoint, point),
              }
            : {
                ...object.geometry,
                endPoint: preserveDraftingPointMetadata(object.geometry.endPoint, point),
              },
      });
    case 'excavation_line': {
      const index = Number(handleId.replace('point-', ''));
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existing, existingIndex) =>
            existingIndex === index ? preserveDraftingPointMetadata(existing, point) : existing,
          ),
        },
      });
    }
    case 'draft_line':
      return moved({
        ...object,
        geometry:
          handleId === 'start'
            ? {
                ...object.geometry,
                startPoint: preserveDraftingPointMetadata(object.geometry.startPoint, point),
              }
            : {
                ...object.geometry,
                endPoint: preserveDraftingPointMetadata(object.geometry.endPoint, point),
              },
      });
    case 'draft_polyline':
    case 'draft_polygon': {
      const index = Number(handleId.replace('point-', ''));
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existing, existingIndex) =>
            existingIndex === index ? preserveDraftingPointMetadata(existing, point) : existing,
          ),
        },
      });
    }
    case 'draft_rectangle':
      return moved({
        ...object,
        geometry:
          handleId === 'corner-a'
            ? {
                ...object.geometry,
                cornerA: preserveDraftingPointMetadata(object.geometry.cornerA, point),
              }
            : {
                ...object.geometry,
                cornerB: preserveDraftingPointMetadata(object.geometry.cornerB, point),
              },
      });
    case 'draft_circle':
      if (handleId === 'radius') {
        return moved({
          ...object,
          geometry: {
            ...object.geometry,
            radiusMm: Math.max(
              50,
              Math.hypot(point.x - object.geometry.centre.x, point.y - object.geometry.centre.y),
            ),
          },
        });
      }
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          centre: preserveDraftingPointMetadata(object.geometry.centre, point),
        },
      });
    case 'structural_joint':
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          point: preserveDraftingPointMetadata(object.geometry.point, point),
        },
      });
    case 'geotech_surface': {
      const index = Number(handleId.replace('surface-point-', ''));
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existing, existingIndex) =>
            existingIndex === index
              ? (preserveDraftingPointMetadata(existing, point) as typeof existing)
              : existing,
          ),
        },
      });
    }
    case 'project_grid':
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          origin: preserveDraftingPointMetadata(object.geometry.origin, point),
        },
      });
    case 'project_grid_line':
      return moved({
        ...object,
        geometry:
          handleId === 'start'
            ? {
                ...object.geometry,
                start: preserveDraftingPointMetadata(object.geometry.start, point),
              }
            : {
                ...object.geometry,
                end: preserveDraftingPointMetadata(object.geometry.end, point),
              },
      });
    case 'shaft':
      if (handleId === 'radius') {
        return moved({
          ...object,
          geometry: {
            ...object.geometry,
            radiusMm: Math.max(
              1,
              Math.hypot(point.x - object.geometry.centre.x, point.y - object.geometry.centre.y),
            ),
          },
        });
      }
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          centre: preserveDraftingPointMetadata(object.geometry.centre, point),
        },
      });
    default:
      return object;
  }
}

function projectGridLocalToWorld(
  object: Extract<DraftingObject, { type: 'project_grid' }>,
  x: number,
  y: number,
) {
  const angle = (object.geometry.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: object.geometry.origin.x + x * cos - y * sin,
    y: object.geometry.origin.y + x * sin + y * cos,
  };
}

export function DraftingObjectHandles({
  context,
  model,
  object,
  onHandlePointerDown,
  scale,
}: {
  context?: DraftingRendererContext;
  model: DraftingModel;
  object: DraftingObject | null;
  onHandlePointerDown: (
    event: React.PointerEvent,
    object: DraftingObject,
    handleId: string,
  ) => void;
  scale: number;
}) {
  if (!object || !canEditDraftingObject(model, object)) {
    return null;
  }

  const safeScale = Math.max(0.0001, scale);
  const handles = resolveDraftingObjectHandles({ context, model, object });
  if (!handles.length) {
    return null;
  }

  return (
    <g data-testid="drafting-object-handles">
      {handles.map((handle) => (
        <g
          key={handle.id}
          data-drafting-handle="true"
          data-drafting-handle-editable={handle.editable ? 'true' : 'false'}
          data-drafting-handle-kind={handle.kind}
          data-drafting-handle-update-path={handle.updatePath}
          data-drafting-handle-blocked-reason={handle.blockedReason}
          data-handle-id={handle.id}
          data-testid={`drafting-handle-${object.id}-${handle.id}`}
          onPointerDown={
            handle.editable ? (event) => onHandlePointerDown(event, object, handle.id) : undefined
          }
          style={{ cursor: handle.editable ? (handle.cursor ?? 'grab') : 'not-allowed' }}
          transform={`translate(${handle.point.x} ${handle.point.y}) scale(${1 / safeScale})`}
        >
          <circle
            fill={handle.tone === 'warning' ? '#fef2f2' : '#ffffff'}
            r={6}
            stroke={
              handle.tone === 'secondary'
                ? '#475569'
                : handle.tone === 'warning'
                  ? '#b91c1c'
                  : '#2563eb'
            }
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <line
            stroke={handle.tone === 'warning' ? '#b91c1c' : '#2563eb'}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            x1={-9}
            x2={9}
            y1={0}
            y2={0}
          />
          <line
            stroke={handle.tone === 'warning' ? '#b91c1c' : '#2563eb'}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            x1={0}
            x2={0}
            y1={-9}
            y2={9}
          />
          <title>
            {handle.blockedReason ? `${handle.label} - ${handle.blockedReason}` : handle.label}
          </title>
        </g>
      ))}
    </g>
  );
}

function linkedServiceLabel(object: Extract<DraftingObject, { type: 'service_crossing' }>) {
  const linked = [object.metadata.linkedServiceRunId, object.metadata.linkedObjectId]
    .filter(Boolean)
    .join(' / ');

  return linked ? `Crossing point linked to ${linked}` : 'Crossing point';
}
