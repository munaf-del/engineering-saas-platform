import type { ProjectRole } from './auth.js';

export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  organisationId: string;
  name: string;
  code: string;
  description?: string;
  status: ProjectStatus;
  standardsProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  code: string;
  description?: string;
  standardsProfileId?: string;
}

export interface Element {
  id: string;
  projectId: string;
  name: string;
  elementType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
