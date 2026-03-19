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
  calculatorVersionId?: string;
  calcType: CalcType;
  status: CalcStatus;
  requestSnapshot: CalculationRequest;
  resultSnapshot?: CalculationResult;
  requestHash: string;
  durationMs?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface CalculationSnapshot {
  id: string;
  calculationRunId: string;
  inputSnapshot: Record<string, unknown>;
  inputHash: string;
  standardsSnapshot: Record<string, unknown>;
  standardsHash: string;
  rulePackSnapshot: Record<string, unknown>;
  rulePackHash: string;
  outputSnapshot?: Record<string, unknown>;
  outputHash?: string;
  combinedHash: string;
  createdAt: string;
}

export const CALCULATOR_STATUSES = ['draft', 'active', 'deprecated'] as const;
export type CalculatorStatus = (typeof CALCULATOR_STATUSES)[number];

export interface CalculatorDefinition {
  id: string;
  code: string;
  name: string;
  calcType: CalcType;
  description?: string;
  category: string;
}

export interface CalculatorVersion {
  id: string;
  definitionId: string;
  version: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  defaultInputs?: Record<string, unknown>;
  status: CalculatorStatus;
  releaseNotes?: string;
}

export const REPORT_STATUSES = ['draft', 'generating', 'completed', 'failed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface CalculationReport {
  id: string;
  calculationRunId: string;
  projectId: string;
  title: string;
  format: string;
  status: ReportStatus;
  evidenceBundle?: EvidenceBundle;
  generatedBy: string;
  generatedAt?: string;
}

export interface EvidenceBundle {
  calcType: string;
  runId: string;
  snapshotHash: string;
  inputs: Record<string, InputValue>;
  outputs: Record<string, OutputValue>;
  steps: CalculationStep[];
  standardsUsed: ClauseReference[];
  designChecks: DesignCheckSummary[];
  warnings: CalcWarning[];
}

export const DESIGN_CHECK_STATUSES = ['pass', 'fail', 'warning', 'not_checked'] as const;
export type DesignCheckStatus = (typeof DESIGN_CHECK_STATUSES)[number];

export interface DesignCheckSummary {
  checkType: string;
  limitState: LimitState;
  demandValue: number;
  capacityValue: number;
  utilisationRatio: number;
  status: DesignCheckStatus;
  clauseRef?: string;
}
