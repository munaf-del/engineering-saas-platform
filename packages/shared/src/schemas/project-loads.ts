import { z } from 'zod';
import { PROJECT_LOAD_STANDARD_SETS } from '../types/project-loads.js';
import {
  MULTI_PILE_COMBINATION_FAMILIES,
  MULTI_PILE_COMBINATION_KINDS,
  MULTI_PILE_COMBINATION_SOURCES,
  MULTI_PILE_PATTERN_TYPES,
} from '../types/multi-pile.js';
import { MultiPileCombinationSettingsSchema } from './multi-pile.js';

const LegacyProjectLoadPatternSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  patternType: z.enum(MULTI_PILE_PATTERN_TYPES),
  reversible: z.boolean(),
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
});

const LegacyProjectLoadCombinationTermSchema = z.object({
  patternId: z.string().min(1),
  factor: z.number(),
});

const LegacyProjectLoadCombinationSchema = z.object({
  id: z.string().min(1),
  builtinKey: z.string().min(1).optional(),
  displayName: z.string().min(1),
  source: z.enum(MULTI_PILE_COMBINATION_SOURCES),
  kind: z.enum(MULTI_PILE_COMBINATION_KINDS),
  enabled: z.boolean(),
  includeInEnvelope: z.boolean(),
  reference: z.string().optional(),
  family: z.enum(MULTI_PILE_COMBINATION_FAMILIES).optional(),
  reversibleAware: z.boolean().optional(),
  terms: z.array(LegacyProjectLoadCombinationTermSchema).optional(),
  childCombinationIds: z.array(z.string().min(1)).optional(),
  expressionSummary: z.string().optional(),
  order: z.number().int().nonnegative(),
});

export const ProjectLoadCaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(MULTI_PILE_PATTERN_TYPES),
  reversible: z.boolean(),
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ProjectLoadPatternSchema = ProjectLoadCaseSchema;

export const ProjectLoadCombinationFactorSchema = z.object({
  loadCaseId: z.string().min(1),
  factor: z.number(),
});

export const ProjectLoadCombinationTermSchema = ProjectLoadCombinationFactorSchema;

export const ProjectLoadCombinationSchema = z.object({
  id: z.string().min(1),
  builtinKey: z.string().min(1).optional(),
  name: z.string().min(1),
  source: z.enum(MULTI_PILE_COMBINATION_SOURCES),
  kind: z.enum(MULTI_PILE_COMBINATION_KINDS),
  enabled: z.boolean(),
  includeInEnvelope: z.boolean(),
  reference: z.string().optional(),
  family: z.enum(MULTI_PILE_COMBINATION_FAMILIES).optional(),
  reversibleAware: z.boolean().optional(),
  factors: z.array(ProjectLoadCombinationFactorSchema).optional(),
  childCombinationIds: z.array(z.string().min(1)).optional(),
  expressionSummary: z.string().optional(),
  order: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ProjectLoadCombinationSettingsSchema = MultiPileCombinationSettingsSchema;

export const ProjectLoadDefinitionSchema = z
  .object({
    version: z.literal(1),
    standardSet: z.enum(PROJECT_LOAD_STANDARD_SETS),
    combinationSettings: ProjectLoadCombinationSettingsSchema,
    loadCases: z.array(ProjectLoadCaseSchema).optional(),
    loadCombinations: z.array(ProjectLoadCombinationSchema).optional(),
    patterns: z.array(LegacyProjectLoadPatternSchema).optional(),
    combinations: z.array(LegacyProjectLoadCombinationSchema).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .transform((value) => ({
    version: value.version,
    standardSet: value.standardSet,
    combinationSettings: value.combinationSettings,
    loadCases:
      value.loadCases ??
      value.patterns?.map((pattern) => ({
        id: pattern.id,
        name: pattern.displayName,
        type: pattern.patternType,
        reversible: pattern.reversible,
        enabled: pattern.enabled,
        order: pattern.order,
      })) ??
      [],
    loadCombinations:
      value.loadCombinations ??
      value.combinations?.map((combination) => ({
        id: combination.id,
        builtinKey: combination.builtinKey,
        name: combination.displayName,
        source: combination.source,
        kind: combination.kind,
        enabled: combination.enabled,
        includeInEnvelope: combination.includeInEnvelope,
        reference: combination.reference,
        family: combination.family,
        reversibleAware: combination.reversibleAware,
        factors: combination.terms?.map((term) => ({
          loadCaseId: term.patternId,
          factor: term.factor,
        })),
        childCombinationIds: combination.childCombinationIds,
        expressionSummary: combination.expressionSummary,
        order: combination.order,
      })) ??
      [],
    metadata: value.metadata,
  }));
