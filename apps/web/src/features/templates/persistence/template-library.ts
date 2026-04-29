export type TemplateLibraryEntry = {
  id: string;
  updatedAt: string;
};

export function createProjectTemplateStoreStorageKey(namespace: string, projectId: string) {
  return `${namespace}:${projectId}`;
}

export function createLegacyProjectTemplateMetadataStorageKey(
  namespace: string,
  projectId: string,
) {
  return `${namespace}:${projectId}`;
}

export function createBrowserTemplateLibraryStorageKey(namespace: string, version = 'v1') {
  return `${namespace}:${version}`;
}

export function parseStoredTemplateLibrary<TTemplate extends TemplateLibraryEntry>(
  value: string,
  normalizeTemplate: (value: unknown) => TTemplate,
) {
  try {
    const parsed = JSON.parse(value);
    const rawTemplates = Array.isArray(parsed) ? parsed : [];

    return rawTemplates
      .map((template) => normalizeTemplate(template))
      .filter(
        (template, index, templates) =>
          templates.findIndex((candidate) => candidate.id === template.id) === index,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

export function mergeTemplateLibraries<TTemplate extends TemplateLibraryEntry>(
  normalizeTemplate: (value: unknown) => TTemplate,
  ...libraries: TTemplate[][]
) {
  const merged = new Map<string, TTemplate>();

  for (const library of libraries) {
    for (const template of library) {
      const normalizedTemplate = normalizeTemplate(template);
      const existing = merged.get(normalizedTemplate.id);
      if (!existing || existing.updatedAt.localeCompare(normalizedTemplate.updatedAt) < 0) {
        merged.set(normalizedTemplate.id, normalizedTemplate);
      }
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}
