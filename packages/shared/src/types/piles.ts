export const PILE_TYPES = ['bored', 'driven', 'cfa', 'micropile', 'screw'] as const;
export type PileType = (typeof PILE_TYPES)[number];

export interface PileGroup {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Pile {
  id: string;
  pileGroupId: string;
  name: string;
  pileType: PileType;
  diameter: number;
  length: number;
  embedmentDepth?: number;
  rakeAngle?: number;
  materialId?: string;
  properties?: Record<string, unknown>;
}

export interface PileLayoutPoint {
  id: string;
  pileGroupId: string;
  pileId?: string;
  x: number;
  y: number;
  z: number;
  label?: string;
}

export interface PileCapacityProfile {
  id: string;
  projectId: string;
  pileId?: string;
  soilProfileId?: string;
  method: string;
  standardRef?: string;
  parameters: Record<string, unknown>;
  inputSnapshot: Record<string, unknown>;
  inputHash: string;
}

export interface PileDesignCheck {
  id: string;
  calculationRunId: string;
  pileId?: string;
  pileGroupId?: string;
  checkType: string;
  limitState: string;
  demandValue: number;
  capacityValue: number;
  utilisationRatio: number;
  status: string;
  clauseRef?: string;
  notes?: string;
}
