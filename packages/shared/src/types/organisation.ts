import type { OrgRole } from './auth.js';

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  abn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationMember {
  id: string;
  userId: string;
  organisationId: string;
  role: OrgRole;
  createdAt: string;
}

export interface CreateOrganisationInput {
  name: string;
  slug: string;
  abn?: string;
}
