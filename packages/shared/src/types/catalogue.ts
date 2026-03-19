export const CATALOG_STATUSES = ['draft', 'active', 'superseded', 'archived'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export interface SteelSectionCatalog {
  id: string;
  organisationId?: string;
  name: string;
  version: string;
  sourceStandard: string;
  sourceEdition: string;
  sourceAmendment?: string;
  snapshotHash?: string;
  status: CatalogStatus;
  isDemo: boolean;
  importJobId?: string;
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SteelSection {
  id: string;
  catalogId: string;
  designation: string;
  sectionType: string;
  properties: Record<string, number>;
  standardRef?: string;
  sourceDoc?: string;
  isDemo: boolean;
}

export interface RebarCatalog {
  id: string;
  organisationId?: string;
  name: string;
  version: string;
  sourceStandard: string;
  sourceEdition: string;
  sourceAmendment?: string;
  snapshotHash?: string;
  status: CatalogStatus;
  isDemo: boolean;
  importJobId?: string;
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RebarSize {
  id: string;
  catalogId: string;
  designation: string;
  barDiameter: number;
  nominalArea: number;
  massPerMetre: number;
  grade: string;
  ductilityClass: string;
  standardRef?: string;
  isDemo: boolean;
}
