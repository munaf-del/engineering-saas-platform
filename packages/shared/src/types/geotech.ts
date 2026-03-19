export interface GeotechMaterialClass {
  id: string;
  code: string;
  name: string;
  description?: string;
  classification?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeotechParameterSet {
  id: string;
  organisationId?: string;
  classId: string;
  name: string;
  description?: string;
  sourceStandard?: string;
  sourceEdition?: string;
  sourceAmendment?: string;
  parameters: Record<string, GeotechParameter>;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeotechParameter {
  value: number;
  unit: string;
  source?: string;
}
