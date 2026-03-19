import { z } from 'zod';
import { CALC_TYPES, LOAD_CATEGORIES, LIMIT_STATES } from '../types/calculations.js';

export const InputValueSchema = z.object({
  value: z.number(),
  unit: z.string(),
  label: z.string(),
  source: z.string().optional(),
});

export const LoadCombinationFactorSchema = z.object({
  loadCaseId: z.string(),
  factor: z.number(),
  source: z.string(),
});

export const LoadCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(LOAD_CATEGORIES),
  values: z.record(z.number()),
});

export const LoadCombinationSchema = z.object({
  id: z.string(),
  name: z.string(),
  limitState: z.enum(LIMIT_STATES),
  factors: z.array(LoadCombinationFactorSchema),
  clauseRef: z.string(),
});

export const RuleEntrySchema = z.object({
  clauseRef: z.string(),
  description: z.string(),
  value: z.number().optional(),
  table: z.record(z.number()).optional(),
  formula: z.string().optional(),
});

export const RulePackSchema = z.object({
  id: z.string(),
  standardCode: z.string(),
  version: z.string(),
  rules: z.record(RuleEntrySchema),
});

export const StandardRefSchema = z.object({
  code: z.string(),
  edition: z.string(),
  amendment: z.string().optional(),
});

export const CalcOptionsSchema = z.object({
  includeIntermediateSteps: z.boolean().optional(),
  precisionDigits: z.number().int().min(1).max(15).optional(),
});

export const CalculationRequestSchema = z.object({
  calcType: z.enum(CALC_TYPES),
  inputs: z.record(InputValueSchema),
  loadCombinations: z.array(LoadCombinationSchema),
  rulePack: RulePackSchema,
  standardsRefs: z.array(StandardRefSchema),
  options: CalcOptionsSchema.optional(),
});
