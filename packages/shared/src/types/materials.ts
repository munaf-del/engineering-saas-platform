export const MATERIAL_CATEGORIES = [
  'concrete',
  'structural_steel',
  'reinforcing_steel',
  'soil',
  'rock',
  'timber',
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export interface MaterialFamily {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: MaterialCategory;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  organisationId?: string;
  familyId?: string;
  category: MaterialCategory;
  name: string;
  grade?: string;
  standardRef?: string;
  sourceStandard?: string;
  sourceEdition?: string;
  sourceAmendment?: string;
  properties: Record<string, MaterialProperty>;
  isSystemDefault: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialProperty {
  value: number;
  unit: string;
  source?: string;
  clauseRef?: string;
}

export interface MaterialPropertySchema {
  id: string;
  familyId: string;
  key: string;
  label: string;
  unit: string;
  required: boolean;
  sortOrder: number;
}

export interface MaterialPropertySet {
  id: string;
  materialId: string;
  key: string;
  value: number;
  unit: string;
  source?: string;
  clauseRef?: string;
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
