export const STANDARD_STATUSES = ['current', 'superseded', 'withdrawn'] as const;
export type StandardStatus = (typeof STANDARD_STATUSES)[number];

export const STANDARD_CATEGORIES = [
  'loading',
  'concrete',
  'steel',
  'reinforcement',
  'geotech',
  'general',
] as const;
export type StandardCategory = (typeof STANDARD_CATEGORIES)[number];

export interface Standard {
  id: string;
  code: string;
  title: string;
  category: StandardCategory;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StandardEdition {
  id: string;
  standardId: string;
  code: string;
  title: string;
  edition: string;
  amendment?: string;
  sourceEdition: string;
  sourceAmendment?: string;
  clauseRef?: string;
  note?: string;
  sourceDoc?: string;
  effectiveDate: string;
  status: StandardStatus;
  isDemo: boolean;
  rulePackId?: string;
}

export interface StandardClauseRef {
  id: string;
  standardEditionId: string;
  clause: string;
  title: string;
  description?: string;
  isDemo: boolean;
}

export interface StandardsProfile {
  id: string;
  organisationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  pinnedStandards: PinnedStandard[];
  createdAt: string;
  updatedAt: string;
}

export interface PinnedStandard {
  id: string;
  standardEditionId: string;
  standardCode: string;
  edition: string;
}

export interface ProjectStandardAssignment {
  id: string;
  projectId: string;
  standardEditionId: string;
  notes?: string;
  pinnedAt: string;
  pinnedBy: string;
}
