import { z } from 'zod';
import {
  DRAFTING_DRAWING_STATUSES,
  DRAFTING_FUTURE_OBJECT_TYPES,
  DRAFTING_LAYER_IDS,
  DRAFTING_LINE_STYLES,
  DRAFTING_MONITORING_TYPES,
  DRAFTING_OBJECT_TYPES,
  DRAFTING_PILE_MATERIALS,
  DRAFTING_PILE_TYPES,
} from '../types/drafting.js';

const DraftingPointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const DraftingStyleSchema = z.object({
  stroke: z.string().optional(),
  fill: z.string().optional(),
  lineWeight: z.number().finite().optional(),
  lineStyle: z.enum(DRAFTING_LINE_STYLES).optional(),
  textSize: z.number().finite().optional(),
});

export const DraftingLayerSchema = z.object({
  id: z.enum(DRAFTING_LAYER_IDS),
  name: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  color: z.string().min(1),
  lineWeight: z.number().finite().nonnegative(),
});

export const DraftingUnderlaySchema = z.object({
  id: z.string().min(1),
  kind: z.literal('pdf'),
  label: z.string().min(1),
  pageNumber: z.number().int().nonnegative(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  transformJson: z.record(z.unknown()).nullable().optional(),
  calibrationJson: z.record(z.unknown()).nullable().optional(),
  cropJson: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const DraftingObjectBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum(DRAFTING_OBJECT_TYPES),
  layerId: z.enum(DRAFTING_LAYER_IDS),
  name: z.string().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  style: DraftingStyleSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DraftingPileObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('pile'),
  geometry: z.object({
    centre: DraftingPointSchema,
    diameterMm: z.number().positive(),
  }),
  metadata: z.object({
    pileId: z.string().min(1),
    pileType: z.enum(DRAFTING_PILE_TYPES).optional(),
    material: z.enum(DRAFTING_PILE_MATERIALS).optional(),
    cutOffLevel: z.number().finite().optional(),
    toeLevel: z.number().finite().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingExcavationLineObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('excavation_line'),
  geometry: z.object({
    points: z.array(DraftingPointSchema).min(2),
    closed: z.boolean().optional(),
  }),
  metadata: z.object({
    excavationId: z.string().optional(),
    stage: z.string().optional(),
    designLevel: z.number().finite().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingMonitoringPointObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('monitoring_point'),
  geometry: z.object({
    point: DraftingPointSchema,
  }),
  metadata: z.object({
    pointId: z.string().min(1),
    monitoringType: z.enum(DRAFTING_MONITORING_TYPES),
    triggerLevel: z.number().finite().optional(),
    actionLevel: z.number().finite().optional(),
    units: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingLeaderNoteObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('leader_note'),
  geometry: z.object({
    anchor: DraftingPointSchema,
    textPoint: DraftingPointSchema,
  }),
  metadata: z.object({
    text: z.string().min(1),
  }),
});

export const DraftingPlaceholderObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.enum(DRAFTING_FUTURE_OBJECT_TYPES),
  geometry: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

export const DraftingObjectSchema = z.discriminatedUnion('type', [
  DraftingPileObjectSchema,
  DraftingExcavationLineObjectSchema,
  DraftingMonitoringPointObjectSchema,
  DraftingLeaderNoteObjectSchema,
  DraftingPlaceholderObjectSchema,
]);

export const DraftingModelSchema = z.object({
  version: z.literal(1),
  units: z.literal('mm'),
  drawingId: z.string().min(1),
  view: z.object({
    scale: z.number().positive(),
    offsetX: z.number().finite(),
    offsetY: z.number().finite(),
  }),
  layers: z.array(DraftingLayerSchema),
  underlays: z.array(DraftingUnderlaySchema),
  objects: z.array(DraftingObjectSchema),
});

export const DraftingDrawingSummarySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(1),
  status: z.enum(DRAFTING_DRAWING_STATUSES),
  currentRevision: z.number().int().nonnegative(),
  modelVersion: z.number().int().positive(),
  objectCount: z.number().int().nonnegative(),
  createdById: z.string().uuid().nullable(),
  updatedById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DraftingRevisionSchema = z.object({
  id: z.string().uuid(),
  drawingId: z.string().uuid(),
  projectId: z.string().uuid(),
  revisionNumber: z.number().int().nonnegative(),
  title: z.string().min(1),
  notes: z.string().nullable(),
  modelJsonSnapshot: DraftingModelSchema,
  createdById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const DraftingDrawingSchema = DraftingDrawingSummarySchema.extend({
  model: DraftingModelSchema,
  revisions: z.array(DraftingRevisionSchema),
});
