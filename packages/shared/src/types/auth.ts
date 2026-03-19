export const ORG_ROLES = ['owner', 'admin', 'engineer', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const PROJECT_ROLES = ['lead', 'engineer', 'reviewer', 'viewer'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organisationId: string;
  orgRole: OrgRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  orgRole: OrgRole;
  iat: number;
  exp: number;
}
