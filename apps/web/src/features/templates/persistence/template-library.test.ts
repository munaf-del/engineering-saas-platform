import { describe, expect, it } from 'vitest';
import {
  createBrowserTemplateLibraryStorageKey,
  createLegacyProjectTemplateMetadataStorageKey,
  createProjectTemplateStoreStorageKey,
  mergeTemplateLibraries,
  parseStoredTemplateLibrary,
} from './template-library';

type TestTemplate = {
  id: string;
  name: string;
  updatedAt: string;
};

function normalizeTemplate(value: unknown): TestTemplate {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    id: typeof record.id === 'string' ? record.id : 'template-1',
    name: typeof record.name === 'string' ? record.name : 'Template',
    updatedAt:
      typeof record.updatedAt === 'string'
        ? record.updatedAt
        : '2026-04-16T00:00:00.000Z',
  };
}

describe('template library persistence', () => {
  it('builds the existing storage keys', () => {
    expect(createProjectTemplateStoreStorageKey('project-spatial-sheets', 'project-1')).toBe(
      'project-spatial-sheets:project-1',
    );
    expect(
      createLegacyProjectTemplateMetadataStorageKey(
        'project-spatial-sheet-metadata',
        'project-1',
      ),
    ).toBe('project-spatial-sheet-metadata:project-1');
    expect(
      createBrowserTemplateLibraryStorageKey('project-spatial-sheet-template-library'),
    ).toBe('project-spatial-sheet-template-library:v1');
  });

  it('parses and sorts a stored browser template library', () => {
    const result = parseStoredTemplateLibrary(
      JSON.stringify([
        { id: 'older', name: 'Older', updatedAt: '2026-04-15T00:00:00.000Z' },
        { id: 'newer', name: 'Newer', updatedAt: '2026-04-16T00:00:00.000Z' },
      ]),
      normalizeTemplate,
    );

    expect(result.map((template) => template.id)).toEqual(['newer', 'older']);
  });

  it('merges libraries by most recent update', () => {
    const result = mergeTemplateLibraries(
      normalizeTemplate,
      [{ id: 'shared', name: 'Old', updatedAt: '2026-04-15T00:00:00.000Z' }],
      [
        { id: 'shared', name: 'New', updatedAt: '2026-04-16T00:00:00.000Z' },
        { id: 'fresh', name: 'Fresh', updatedAt: '2026-04-14T00:00:00.000Z' },
      ],
    );

    expect(result).toEqual([
      { id: 'shared', name: 'New', updatedAt: '2026-04-16T00:00:00.000Z' },
      { id: 'fresh', name: 'Fresh', updatedAt: '2026-04-14T00:00:00.000Z' },
    ]);
  });
});
