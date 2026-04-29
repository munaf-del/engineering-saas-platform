import { z } from 'zod';

const omnidotsFiniteNumberSchema = z.union([z.number(), z.string()]).transform((value, ctx) => {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected a finite number',
    });
    return z.NEVER;
  }

  const normalized = value.trim();
  const parsed = Number(normalized);
  if (!normalized || !Number.isFinite(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected a finite numeric string',
    });
    return z.NEVER;
  }

  return parsed;
});

export const omnidotsApiSuccessEnvelopeSchema = z
  .object({
    ok: z.literal(true),
  })
  .passthrough();

export const omnidotsApiErrorEnvelopeSchema = z
  .object({
    ok: z.literal(false),
    message: z.string().optional(),
    help: z.string().optional(),
  })
  .passthrough();

const omnidotsCoordinatesSchema = z
  .object({
    latitude: omnidotsFiniteNumberSchema.nullable(),
    longitude: omnidotsFiniteNumberSchema.nullable(),
  })
  .passthrough();

export const omnidotsSensorResponseItemSchema = z
  .object({
    connected_using: z.string().nullish(),
    battery_charge: omnidotsFiniteNumberSchema.nullish(),
    name: z.string().nullish(),
    lastseen: z.string().nullish(),
    online: z.boolean().nullish(),
    location: omnidotsCoordinatesSchema.nullish(),
  })
  .passthrough();

export const omnidotsMeasuringPointResponseItemSchema = z
  .object({
    id: omnidotsFiniteNumberSchema,
    name: z.string(),
    active: z.boolean(),
    building_level: z.string().nullish(),
    category: z.string().nullish(),
    data_save_level: omnidotsFiniteNumberSchema.nullish(),
    guide_line: z.string().nullish(),
    measurement_duration: omnidotsFiniteNumberSchema.nullish(),
    measuring_type: z.string().nullish(),
    timezone: z.string().nullish(),
    trace_post_trigger: omnidotsFiniteNumberSchema.nullish(),
    trace_pre_trigger: omnidotsFiniteNumberSchema.nullish(),
    trace_save_level: omnidotsFiniteNumberSchema.nullish(),
    vibration_type: z.string().nullish(),
    user_location: omnidotsCoordinatesSchema.nullish(),
    sensor: omnidotsSensorResponseItemSchema.nullish(),
  })
  .passthrough();

export const omnidotsPeakRecordAxisSchema = z
  .object({
    Vtop: z.number().nullish(),
    Fdom: z.number().nullish(),
    Atop: z.number().nullish(),
  })
  .passthrough();

export const omnidotsPeakRecordResponseItemSchema = z
  .object({
    timestamp: z.number(),
    category: z.string().nullish(),
    measuring_type: z.string().nullish(),
    vibration_type: z.string().nullish(),
    guide_line: z.string().nullish(),
    x: omnidotsPeakRecordAxisSchema.nullish(),
    y: omnidotsPeakRecordAxisSchema.nullish(),
    z: omnidotsPeakRecordAxisSchema.nullish(),
  })
  .passthrough();

export const omnidotsVdvRecordResponseItemSchema = z
  .object({
    timestamp: z.number(),
    vdv_period: z.number().nullish(),
    vdv_x: z.string().nullish(),
    vdv_y: z.string().nullish(),
    vdv_z: z.string().nullish(),
    x: z.number().nullish(),
    y: z.number().nullish(),
    z: z.number().nullish(),
  })
  .passthrough();

export const omnidotsVeffRecordResponseItemSchema = z
  .object({
    timestamp: z.number(),
    x: z.number().nullish(),
    y: z.number().nullish(),
    z: z.number().nullish(),
  })
  .passthrough();

export const omnidotsTraceListItemSchema = z
  .object({
    start_time: z.number(),
    end_time: z.number(),
    sample_frequency_hz: z.number().nullish(),
    unit: z.string().nullish(),
  })
  .passthrough();

export const omnidotsDetailedTraceItemSchema = z
  .object({
    start_time: z.number(),
    end_time: z.number(),
    sample_frequency_hz: z.number().nullish(),
    unit: z.string().nullish(),
    x: z.array(z.number()),
    y: z.array(z.number()),
    z: z.array(z.number()),
  })
  .passthrough();

export const omnidotsTokenDetailsResponseSchema = omnidotsApiSuccessEnvelopeSchema
  .extend({
    account_name: z.string().nullish(),
    account_id: z.number().nullish(),
  })
  .passthrough();

export const omnidotsListMeasuringPointsResponseSchema = omnidotsApiSuccessEnvelopeSchema
  .extend({
    measuring_points: z.array(omnidotsMeasuringPointResponseItemSchema),
  })
  .passthrough();

export const omnidotsPeakRecordsResponseSchema = omnidotsApiSuccessEnvelopeSchema
  .extend({
    records: z.array(omnidotsPeakRecordResponseItemSchema).optional(),
    peak_records: z.array(omnidotsPeakRecordResponseItemSchema).optional(),
  })
  .passthrough();

export const omnidotsVdvRecordsResponseSchema = omnidotsApiSuccessEnvelopeSchema
  .extend({
    records: z.array(omnidotsVdvRecordResponseItemSchema).optional(),
    vdv_records: z.array(omnidotsVdvRecordResponseItemSchema).optional(),
  })
  .passthrough();

export const omnidotsVeffRecordsResponseSchema = omnidotsApiSuccessEnvelopeSchema
  .extend({
    records: z.array(omnidotsVeffRecordResponseItemSchema).optional(),
    veff_records: z.array(omnidotsVeffRecordResponseItemSchema).optional(),
  })
  .passthrough();

export type OmnidotsApiSuccessEnvelope = z.infer<typeof omnidotsApiSuccessEnvelopeSchema>;
export type OmnidotsApiErrorEnvelope = z.infer<typeof omnidotsApiErrorEnvelopeSchema>;
export type OmnidotsSensorResponseItem = z.infer<typeof omnidotsSensorResponseItemSchema>;
export type OmnidotsMeasuringPointResponseItem = z.infer<
  typeof omnidotsMeasuringPointResponseItemSchema
>;
export type OmnidotsPeakRecordResponseItem = z.infer<typeof omnidotsPeakRecordResponseItemSchema>;
export type OmnidotsVdvRecordResponseItem = z.infer<typeof omnidotsVdvRecordResponseItemSchema>;
export type OmnidotsVeffRecordResponseItem = z.infer<typeof omnidotsVeffRecordResponseItemSchema>;
export type OmnidotsTraceListItem = z.infer<typeof omnidotsTraceListItemSchema>;
export type OmnidotsDetailedTraceItem = z.infer<typeof omnidotsDetailedTraceItemSchema>;
export type OmnidotsTokenDetailsResponse = z.infer<typeof omnidotsTokenDetailsResponseSchema>;
export type OmnidotsListMeasuringPointsResponse = z.infer<
  typeof omnidotsListMeasuringPointsResponseSchema
>;
export type OmnidotsPeakRecordsResponse = z.infer<typeof omnidotsPeakRecordsResponseSchema>;
export type OmnidotsVdvRecordsResponse = z.infer<typeof omnidotsVdvRecordsResponseSchema>;
export type OmnidotsVeffRecordsResponse = z.infer<typeof omnidotsVeffRecordsResponseSchema>;
