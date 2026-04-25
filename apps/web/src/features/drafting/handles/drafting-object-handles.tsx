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

export type DraftingObjectHandle = {
  cursor?: string;
  id: string;
  label: string;
  point: DraftingPoint;
  tone?: 'primary' | 'secondary' | 'warning';
};

export function getDraftingObjectHandles(object: DraftingObject): DraftingObjectHandle[] {
  switch (object.type) {
    case 'pile': {
      const radius = object.geometry.diameterMm / 2;
      return [
        { id: 'centre', label: 'Pile centre', point: object.geometry.centre, cursor: 'move' },
        {
          id: 'diameter',
          label: 'Diameter grip',
          point: { x: object.geometry.centre.x + radius, y: object.geometry.centre.y },
          cursor: 'ew-resize',
          tone: 'secondary',
        },
      ];
    }
    case 'secant_pile_wall':
      return [
        ...object.geometry.baselinePoints.map((point, index) => ({
          id: `baseline-${index}`,
          label: index === 0 ? 'Baseline start' : 'Baseline end',
          point,
          cursor: 'move',
        })),
        ...object.geometry.pileCentres.map((point, index) => ({
          id: `pile-centre-${index}`,
          label: `Pile centre ${index + 1}`,
          point,
          tone: 'secondary' as const,
        })),
      ];
    case 'soldier_pile_wall':
      return [
        ...object.geometry.baselinePoints.map((point, index) => ({
          id: `baseline-${index}`,
          label: index === 0 ? 'Baseline start' : 'Baseline end',
          point,
          cursor: 'move',
        })),
        ...object.geometry.pilePositions.map((point, index) => ({
          id: `pile-position-${index}`,
          label: `Soldier pile ${index + 1}`,
          point,
          tone: 'secondary' as const,
        })),
      ];
    case 'anchor_tieback':
      return [
        { id: 'head', label: 'Anchor head', point: object.geometry.headPoint, cursor: 'move' },
        { id: 'tail', label: 'Anchor tail', point: object.geometry.tailPoint, cursor: 'move' },
      ];
    case 'capping_beam':
    case 'waler':
      return object.geometry.points.map((point, index) => ({
        id: `point-${index}`,
        label:
          index === 0
            ? 'Path start'
            : index === object.geometry.points.length - 1
              ? 'Path end'
              : `Path vertex ${index + 1}`,
        point,
        cursor: 'move',
      }));
    case 'service_run':
      return object.geometry.path.map((point, index) => ({
        id: `path-${index}`,
        label:
          index === 0
            ? 'Service start'
            : index === object.geometry.path.length - 1
              ? 'Service end'
              : `Service vertex ${index + 1}`,
        point,
        cursor: 'move',
      }));
    case 'service_crossing':
      return [
        {
          id: 'crossing',
          label: linkedServiceLabel(object),
          point: object.geometry.crossingPoint,
          cursor: 'move',
          tone: 'warning',
        },
      ];
    case 'monitoring_point':
    case 'borehole':
      return [{ id: 'point', label: 'Point grip', point: object.geometry.point, cursor: 'move' }];
    case 'leader_note':
      return [
        { id: 'anchor', label: 'Leader anchor', point: object.geometry.anchor, cursor: 'move' },
        { id: 'text', label: 'Note text', point: object.geometry.textPoint, cursor: 'move' },
      ];
    case 'dimension_chain': {
      const offsetPoints = buildDimensionChainOffsetPoints(object);
      return [
        ...object.geometry.points.map((point, index) => ({
          id: `point-${index}`,
          label: `Dimension witness ${index + 1}`,
          point,
          cursor: 'move',
        })),
        ...offsetPoints.map((point, index) => ({
          id: `offset-${index}`,
          label: `Dimension line ${index + 1}`,
          point,
          cursor: 'move',
          tone: 'secondary' as const,
        })),
      ];
    }
    case 'callout':
      return [
        {
          id: 'anchor',
          label: 'Callout anchor',
          point: object.geometry.anchorPoint,
          cursor: 'move',
        },
        { id: 'label', label: 'Callout label', point: object.geometry.labelPoint, cursor: 'move' },
      ];
    case 'section_marker':
      return [
        { id: 'start', label: 'Section start', point: object.geometry.startPoint, cursor: 'move' },
        { id: 'end', label: 'Section end', point: object.geometry.endPoint, cursor: 'move' },
      ];
    case 'excavation_line':
      return object.geometry.points.map((point, index) => ({
        id: `point-${index}`,
        label: `Excavation vertex ${index + 1}`,
        point,
        cursor: 'move',
      }));
    default:
      return [];
  }
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
      return moved({ ...object, geometry: { ...object.geometry, centre: point } });
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
              existingIndex === index ? point : existing,
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
              existingIndex === index ? point : existing,
            ),
          },
        }),
      );
    }
    case 'anchor_tieback': {
      const geometry =
        handleId === 'head'
          ? { headPoint: point, tailPoint: object.geometry.tailPoint }
          : { headPoint: object.geometry.headPoint, tailPoint: point };
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
            existingIndex === index ? point : existing,
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
            existingIndex === index ? point : existing,
          ),
        },
      });
    }
    case 'service_crossing':
      return moved({ ...object, geometry: { crossingPoint: point } });
    case 'monitoring_point':
    case 'borehole':
      return moved({ ...object, geometry: { ...object.geometry, point } });
    case 'leader_note':
      return moved({
        ...object,
        geometry:
          handleId === 'anchor'
            ? { ...object.geometry, anchor: point }
            : { ...object.geometry, textPoint: point },
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
            offsetVector: { x: point.x - basePoint.x, y: point.y - basePoint.y },
          },
        });
      }
      const index = Number(handleId.replace('point-', ''));
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existing, existingIndex) =>
            existingIndex === index ? point : existing,
          ),
        },
      });
    }
    case 'callout':
      return moved({
        ...object,
        geometry:
          handleId === 'anchor'
            ? { ...object.geometry, anchorPoint: point }
            : { ...object.geometry, labelPoint: point },
      });
    case 'section_marker':
      return moved({
        ...object,
        geometry:
          handleId === 'start'
            ? { ...object.geometry, startPoint: point }
            : { ...object.geometry, endPoint: point },
      });
    case 'excavation_line': {
      const index = Number(handleId.replace('point-', ''));
      return moved({
        ...object,
        geometry: {
          ...object.geometry,
          points: object.geometry.points.map((existing, existingIndex) =>
            existingIndex === index ? point : existing,
          ),
        },
      });
    }
    default:
      return object;
  }
}

export function DraftingObjectHandles({
  model,
  object,
  onHandlePointerDown,
  scale,
}: {
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
  const handles = getDraftingObjectHandles(object);

  return (
    <g data-testid="drafting-object-handles">
      {handles.map((handle) => (
        <g
          key={handle.id}
          data-drafting-handle="true"
          data-handle-id={handle.id}
          onPointerDown={(event) => onHandlePointerDown(event, object, handle.id)}
          style={{ cursor: handle.cursor ?? 'grab' }}
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
          <title>{handle.label}</title>
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
