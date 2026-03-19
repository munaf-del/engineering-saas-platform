export const STANDARD_STATUSES = ['current', 'superseded', 'withdrawn'] as const;
export type StandardStatus = (typeof STANDARD_STATUSES)[number];

export interface StandardEdition {
  id: string;
  code: string;
  title: string;
  edition: string;
  amendment?: string;
  clauseRef?: string;
  note?: string;
  sourceDoc?: string;
  effectiveDate: string;
  status: StandardStatus;
  rulePackId?: string;
}

export interface StandardsProfile {
  id: string;
  organisationId: string;
  name: string;
  description?: string;
  pinnedStandards: PinnedStandard[];
  createdAt: string;
  updatedAt: string;
}

export interface PinnedStandard {
  standardEditionId: string;
  standardCode: string;
  edition: string;
}
