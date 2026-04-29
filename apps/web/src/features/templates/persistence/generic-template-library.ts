import {
  createBrowserTemplateLibraryStorageKey,
  mergeTemplateLibraries,
  parseStoredTemplateLibrary,
} from './template-library';
import {
  createGenericTemplateDocument,
  duplicateGenericTemplateDocument,
  normalizeGenericTemplateDocument,
  type GenericTemplateDocument,
} from '../core/generic-template-document';
import type { TemplatePaperSize } from '../core/template-preset';

export type LegacySpatialTemplateSummary = {
  id: string;
  kind: 'legacy_spatial';
  mode: string;
  name: string;
  objectCount: number;
  orientation: string;
  paperSize: string;
  updatedAt: string;
};

export const GENERIC_TEMPLATE_LIBRARY_STORAGE_KEY = createBrowserTemplateLibraryStorageKey(
  'templates-generic-library',
);

export const LEGACY_SPATIAL_TEMPLATE_LIBRARY_STORAGE_KEY = createBrowserTemplateLibraryStorageKey(
  'project-spatial-sheet-template-library',
);

const BUILT_IN_GENERIC_STANDARD_SHEETS: Array<{
  id: string;
  name: string;
  paperSize: TemplatePaperSize;
  updatedAt: string;
}> = [
  {
    id: 'builtin-template-as1100-a4-landscape',
    name: 'AS 1100 A4 Landscape',
    paperSize: 'a4',
    updatedAt: '2026-04-16T23:44:00.000Z',
  },
  {
    id: 'builtin-template-as1100-a3-landscape',
    name: 'AS 1100 A3 Landscape',
    paperSize: 'a3',
    updatedAt: '2026-04-16T23:43:00.000Z',
  },
  {
    id: 'builtin-template-as1100-a2-landscape',
    name: 'AS 1100 A2 Landscape',
    paperSize: 'a2',
    updatedAt: '2026-04-16T23:42:00.000Z',
  },
  {
    id: 'builtin-template-as1100-a1-landscape',
    name: 'AS 1100 A1 Landscape',
    paperSize: 'a1',
    updatedAt: '2026-04-16T23:41:00.000Z',
  },
  {
    id: 'builtin-template-as1100-a0-landscape',
    name: 'AS 1100 A0 Landscape',
    paperSize: 'a0',
    updatedAt: '2026-04-16T23:40:00.000Z',
  },
];

const BUILT_IN_GENERIC_STANDARD_SHEET_IDS = new Set(
  BUILT_IN_GENERIC_STANDARD_SHEETS.map((template) => template.id),
);

export function parseStoredGenericTemplateLibrary(value: string) {
  return parseStoredTemplateLibrary(value, normalizeGenericTemplateDocument);
}

export function mergeGenericTemplateLibrary(...libraries: GenericTemplateDocument[][]) {
  return mergeTemplateLibraries(normalizeGenericTemplateDocument, ...libraries);
}

export function createBuiltInGenericTemplateLibrary() {
  return BUILT_IN_GENERIC_STANDARD_SHEETS.map((template) => {
    const document = createGenericTemplateDocument({
      name: template.name,
      orientation: 'landscape',
      paperSize: template.paperSize,
      presetId: 'as1100_inspired',
    });

    return normalizeGenericTemplateDocument({
      ...document,
      createdAt: template.updatedAt,
      id: template.id,
      updatedAt: template.updatedAt,
    });
  });
}

export function ensureBuiltInGenericTemplates(library: GenericTemplateDocument[]) {
  const preservedTemplates = library.filter(
    (template) => !BUILT_IN_GENERIC_STANDARD_SHEET_IDS.has(template.id),
  );

  return mergeGenericTemplateLibrary(preservedTemplates, createBuiltInGenericTemplateLibrary());
}

export function isBuiltInGenericTemplateId(templateId: string) {
  return BUILT_IN_GENERIC_STANDARD_SHEET_IDS.has(templateId);
}

export function upsertGenericTemplate(
  library: GenericTemplateDocument[],
  template: GenericTemplateDocument,
) {
  const now = new Date().toISOString();
  const existingTemplate = library.find((candidate) => candidate.id === template.id);
  const updatedAt =
    existingTemplate && existingTemplate.updatedAt.localeCompare(now) >= 0
      ? new Date(Date.parse(existingTemplate.updatedAt) + 1).toISOString()
      : now;

  return mergeGenericTemplateLibrary(library, [
    {
      ...normalizeGenericTemplateDocument(template),
      updatedAt,
    },
  ]);
}

export function createAndInsertGenericTemplate(
  library: GenericTemplateDocument[],
  overrides: Parameters<typeof createGenericTemplateDocument>[0] = {},
) {
  const template = createGenericTemplateDocument(overrides);
  return {
    library: upsertGenericTemplate(library, template),
    template,
  };
}

export function duplicateAndInsertGenericTemplate(
  library: GenericTemplateDocument[],
  template: GenericTemplateDocument,
) {
  const duplicate = duplicateGenericTemplateDocument(template);
  return {
    duplicate,
    library: upsertGenericTemplate(library, duplicate),
  };
}

export function deleteGenericTemplate(library: GenericTemplateDocument[], templateId: string) {
  return library.filter((template) => template.id !== templateId);
}

export function parseLegacySpatialTemplateSummaries(value: string) {
  try {
    const parsed = JSON.parse(value);
    const rawTemplates = Array.isArray(parsed) ? parsed : [];

    return rawTemplates
      .map((template, index) => {
        const record =
          template && typeof template === 'object' && !Array.isArray(template)
            ? (template as Record<string, unknown>)
            : {};

        return {
          id:
            typeof record.id === 'string' && record.id.trim()
              ? record.id
              : `legacy-spatial-${index + 1}`,
          kind: 'legacy_spatial',
          mode: typeof record.mode === 'string' ? record.mode : 'spatial',
          name:
            typeof record.name === 'string' && record.name.trim()
              ? record.name.trim()
              : 'Spatial Template',
          objectCount: Array.isArray(record.objects) ? record.objects.length : 0,
          orientation: typeof record.orientation === 'string' ? record.orientation : 'landscape',
          paperSize: typeof record.paperSize === 'string' ? record.paperSize : 'a4',
          updatedAt:
            typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
        } satisfies LegacySpatialTemplateSummary;
      })
      .filter(
        (template, index, templates) =>
          templates.findIndex((candidate) => candidate.id === template.id) === index,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}
