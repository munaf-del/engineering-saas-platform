import type {
  MultiPileCombinationFamily,
  MultiPileCombinationKind,
  MultiPileCombinationSettings,
  MultiPileCombinationSource,
  MultiPilePatternType,
} from './multi-pile.js';

export const PROJECT_LOAD_STANDARD_SETS = ['eng-default-v1'] as const;
export type ProjectLoadStandardSet = (typeof PROJECT_LOAD_STANDARD_SETS)[number];

export interface ProjectLoadCase {
  id: string;
  name: string;
  type: MultiPilePatternType;
  reversible: boolean;
  enabled: boolean;
  order: number;
  metadata?: Record<string, unknown>;
}

export type ProjectLoadPattern = ProjectLoadCase;

export interface ProjectLoadCombinationFactor {
  loadCaseId: string;
  factor: number;
}

export type ProjectLoadCombinationTerm = ProjectLoadCombinationFactor;

export interface ProjectLoadCombination {
  id: string;
  builtinKey?: string;
  name: string;
  source: MultiPileCombinationSource;
  kind: MultiPileCombinationKind;
  enabled: boolean;
  includeInEnvelope: boolean;
  reference?: string;
  family?: MultiPileCombinationFamily;
  reversibleAware?: boolean;
  factors?: ProjectLoadCombinationFactor[];
  childCombinationIds?: string[];
  expressionSummary?: string;
  order: number;
  metadata?: Record<string, unknown>;
}

export interface ProjectLoadCombinationSettings extends MultiPileCombinationSettings {}

export interface ProjectLoadDefinition {
  version: 1;
  standardSet: ProjectLoadStandardSet;
  combinationSettings: ProjectLoadCombinationSettings;
  loadCases: ProjectLoadCase[];
  loadCombinations: ProjectLoadCombination[];
  metadata?: Record<string, unknown>;
}
