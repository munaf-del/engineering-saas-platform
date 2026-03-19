export const MATERIAL_CATEGORIES = [
  'concrete',
  'structural_steel',
  'reinforcing_steel',
  'soil',
  'rock',
  'timber',
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export interface Material {
  id: string;
  organisationId?: string;
  category: MaterialCategory;
  name: string;
  grade?: string;
  standardRef?: string;
  properties: Record<string, MaterialProperty>;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialProperty {
  value: number;
  unit: string;
  source?: string;
  clauseRef?: string;
}

export interface SteelSection {
  id: string;
  designation: string;
  sectionType: string;
  properties: SteelSectionProperties;
  standardRef?: string;
  sourceDoc?: string;
}

export interface SteelSectionProperties {
  massPerMetre: number;
  depth: number;
  flangeWidth: number;
  flangeThickness: number;
  webThickness: number;
  sectionArea: number;
  momentOfInertiaX: number;
  momentOfInertiaY: number;
  sectionModulusX: number;
  sectionModulusY: number;
  plasticModulusX: number;
  plasticModulusY: number;
  radiusOfGyrationX: number;
  radiusOfGyrationY: number;
}

export interface RebarSpecification {
  id: string;
  designation: string;
  grade: string;
  nominalDiameter: number;
  nominalArea: number;
  nominalMassPerMetre: number;
  characteristicYieldStrength: number;
  characteristicTensileStrength: number;
  ductilityClass: string;
  standardRef?: string;
}

export interface SoilLayer {
  id: string;
  name: string;
  soilType: string;
  depthFrom: number;
  depthTo: number;
  properties: SoilProperties;
}

export interface SoilProperties {
  unitWeight: number;
  cohesion?: number;
  frictionAngle?: number;
  undrainedShearStrength?: number;
  sptN?: number;
  elasticModulus?: number;
  poissonRatio?: number;
  description?: string;
}
