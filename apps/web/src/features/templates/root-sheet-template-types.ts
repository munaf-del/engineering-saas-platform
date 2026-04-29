import {
  normalizeGenericTemplateDocument,
  type GenericTemplateDocument,
} from './core/generic-template-document';

export type RootSheetTemplateScopeType = 'global' | 'org' | 'project';

// Root Sheet Templates are durable generic reusable paper/layout records.
// Modules and reports use them, but do not define their library identity.
export type RootSheetTemplateVersion = {
  createdAt: string;
  createdBy: string | null;
  definitionJson: Record<string, unknown>;
  id: string;
  publishedAt: string | null;
  rootSheetTemplateId: string;
  schemaVersion: number;
  versionLabel: string;
};

export type RootSheetTemplate = {
  archivedAt: string | null;
  category: string | null;
  createdAt: string;
  createdBy: string | null;
  currentVersion: RootSheetTemplateVersion | null;
  currentVersionId: string | null;
  id: string;
  key: string;
  label: string;
  organisationId: string | null;
  scopeId: string | null;
  scopeType: RootSheetTemplateScopeType;
  updatedAt: string;
  versions: Array<Omit<RootSheetTemplateVersion, 'definitionJson'>>;
};

export type RootSheetTemplateInput = {
  category?: string | null;
  definitionJson: Record<string, unknown>;
  key?: string;
  label: string;
  schemaVersion?: number;
  scopeId?: string | null;
  scopeType?: RootSheetTemplateScopeType;
  versionLabel?: string;
};

export function coerceRootSheetTemplateDocument(
  template: RootSheetTemplate | null | undefined,
): GenericTemplateDocument | null {
  if (!template?.currentVersion?.definitionJson) {
    return null;
  }

  try {
    const document = normalizeGenericTemplateDocument(template.currentVersion.definitionJson);
    return normalizeGenericTemplateDocument({
      ...document,
      id: template.id,
      name: template.label,
      updatedAt: template.updatedAt,
    });
  } catch {
    return null;
  }
}
