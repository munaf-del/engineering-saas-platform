export const CALC_TYPES = [
  'pile_capacity',
  'pile_settlement',
  'pile_lateral',
  'pile_group',
  'beam_check',
  'column_check',
  'connection_check',
  'footing_check',
  'retaining_wall',
  'bearing_capacity',
] as const;
export type CalcType = (typeof CALC_TYPES)[number];

export const CALC_STATUSES = ['draft', 'running', 'completed', 'failed', 'superseded'] as const;
export type CalcStatus = (typeof CALC_STATUSES)[number];

export const LOAD_CATEGORIES = [
  'permanent',
  'imposed',
  'wind',
  'earthquake',
  'liquid_pressure',
  'earth_pressure',
  'thermal',
] as const;
export type LoadCategory = (typeof LOAD_CATEGORIES)[number];

export const LIMIT_STATES = ['strength', 'serviceability', 'stability'] as const;
export type LimitState = (typeof LIMIT_STATES)[number];

export interface LoadCase {
  id: string;
  name: string;
  category: LoadCategory;
  values: Record<string, number>;
}

export interface LoadCombination {
  id: string;
  name: string;
  limitState: LimitState;
  factors: LoadCombinationFactor[];
  clauseRef: string;
}

export interface LoadCombinationFactor {
  loadCaseId: string;
  factor: number;
  source: string;
}

export interface CalculationRequest {
  calcType: CalcType;
  inputs: Record<string, InputValue>;
  loadCombinations: LoadCombination[];
  rulePack: RulePack;
  standardsRefs: StandardRef[];
  options?: CalcOptions;
}

export interface InputValue {
  value: number;
  unit: string;
  label: string;
  source?: string;
}

export interface CalcOptions {
  includeIntermediateSteps?: boolean;
  precisionDigits?: number;
}

export interface CalculationResult {
  requestHash: string;
  outputs: Record<string, OutputValue>;
  steps: CalculationStep[];
  governingCase?: string;
  warnings: CalcWarning[];
  errors: CalcError[];
  standardRefsUsed: ClauseReference[];
  durationMs: number;
}

export interface OutputValue {
  value: number;
  unit: string;
  label: string;
  clauseRef?: string;
}

export interface CalculationStep {
  name: string;
  description: string;
  formula: string;
  inputs: Record<string, { value: number; unit: string }>;
  result: { value: number; unit: string };
  clauseRef: string;
}

export interface CalcWarning {
  code: string;
  message: string;
  clauseRef?: string;
}

export interface CalcError {
  code: string;
  message: string;
  clauseRef?: string;
}

export interface ClauseReference {
  standardCode: string;
  clause: string;
  description?: string;
}

export interface RulePack {
  id: string;
  standardCode: string;
  version: string;
  rules: Record<string, RuleEntry>;
}

export interface RuleEntry {
  clauseRef: string;
  description: string;
  value?: number;
  table?: Record<string, number>;
  formula?: string;
}

export interface StandardRef {
  code: string;
  edition: string;
  amendment?: string;
}

export interface CalculationRun {
  id: string;
  projectId: string;
  elementId?: string;
  calcType: CalcType;
  status: CalcStatus;
  requestSnapshot: CalculationRequest;
  resultSnapshot?: CalculationResult;
  requestHash: string;
  createdBy: string;
  createdAt: string;
}
