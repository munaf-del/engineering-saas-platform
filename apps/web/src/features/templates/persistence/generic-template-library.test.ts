import { describe, expect, it } from 'vitest';
import {
  createBuiltInGenericTemplateLibrary,
  createAndInsertGenericTemplate,
  deleteGenericTemplate,
  duplicateAndInsertGenericTemplate,
  ensureBuiltInGenericTemplates,
  GENERIC_TEMPLATE_LIBRARY_STORAGE_KEY,
  LEGACY_SPATIAL_TEMPLATE_LIBRARY_STORAGE_KEY,
  parseLegacySpatialTemplateSummaries,
  parseStoredGenericTemplateLibrary,
  upsertGenericTemplate,
} from './generic-template-library';
import { createGenericTemplateDocument } from '../core/generic-template-document';

describe('generic template library persistence', () => {
  it('uses stable browser storage keys for generic and legacy libraries', () => {
    expect(GENERIC_TEMPLATE_LIBRARY_STORAGE_KEY).toBe('templates-generic-library:v1');
    expect(LEGACY_SPATIAL_TEMPLATE_LIBRARY_STORAGE_KEY).toBe(
      'project-spatial-sheet-template-library:v1',
    );
  });

  it('creates, upserts, duplicates, and deletes generic templates', () => {
    const created = createAndInsertGenericTemplate([], { name: 'Alpha' });
    expect(created.library).toHaveLength(1);
    expect(created.template.name).toBe('Alpha');

    const saved = upsertGenericTemplate(created.library, {
      ...created.template,
      name: 'Alpha Updated',
    });
    const savedTemplate = saved[0];
    expect(savedTemplate).toBeDefined();
    if (!savedTemplate) {
      throw new Error('Expected saved template');
    }
    expect(savedTemplate.name).toBe('Alpha Updated');

    const duplicated = duplicateAndInsertGenericTemplate(saved, savedTemplate);
    expect(duplicated.library).toHaveLength(2);
    expect(duplicated.duplicate.name).toContain('Copy');

    const deleted = deleteGenericTemplate(duplicated.library, savedTemplate.id);
    expect(deleted).toHaveLength(1);
    const deletedTemplate = deleted[0];
    expect(deletedTemplate).toBeDefined();
    if (!deletedTemplate) {
      throw new Error('Expected remaining template');
    }
    expect(deletedTemplate.id).toBe(duplicated.duplicate.id);
  });

  it('provides built-in AS 1100 landscape templates for A0 through A4', () => {
    const builtIns = createBuiltInGenericTemplateLibrary();
    const a4TitleBlock = builtIns
      .find((template) => template.paperSize === 'a4')
      ?.objects.find((object) => object.type === 'titleBlock');

    expect(builtIns.map((template) => template.paperSize)).toEqual(['a4', 'a3', 'a2', 'a1', 'a0']);
    expect(builtIns.every((template) => template.orientation === 'landscape')).toBe(true);
    expect(builtIns.every((template) => template.presetId === 'as1100_inspired')).toBe(true);
    expect(a4TitleBlock).toMatchObject({
      height: 75,
      width: 210,
    });
  });

  it('merges built-in templates into an existing library without duplicating named standards', () => {
    const existing = createGenericTemplateDocument({ name: 'My Working Template' });
    const merged = ensureBuiltInGenericTemplates([existing]);

    expect(merged).toHaveLength(6);
    expect(merged.some((template) => template.name === 'AS 1100 A0 Landscape')).toBe(true);
    expect(merged.some((template) => template.id === existing.id)).toBe(true);
  });

  it('refreshes an older built-in template revision with the newer seeded standard', () => {
    const olderBuiltIn = createGenericTemplateDocument({
      name: 'AS 1100 A4 Landscape',
      orientation: 'landscape',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const merged = ensureBuiltInGenericTemplates([
      {
        ...olderBuiltIn,
        id: 'builtin-template-as1100-a4-landscape',
        updatedAt: '2026-04-16T23:04:00.000Z',
      },
    ]);
    const refreshed = merged.find((template) => template.id === 'builtin-template-as1100-a4-landscape');

    expect(refreshed?.updatedAt).toBe('2026-04-16T23:44:00.000Z');
    expect(refreshed?.objects.find((object) => object.type === 'titleBlock')).toMatchObject({
      height: 75,
      width: 210,
    });
  });

  it('replaces a locally newer built-in template with the current seeded standard revision', () => {
    const locallyEditedBuiltIn = createGenericTemplateDocument({
      name: 'AS 1100 A1 Landscape',
      orientation: 'landscape',
      paperSize: 'a1',
      presetId: 'as1100_inspired',
    });
    const merged = ensureBuiltInGenericTemplates([
      {
        ...locallyEditedBuiltIn,
        id: 'builtin-template-as1100-a1-landscape',
        updatedAt: '2026-04-17T00:10:00.000Z',
        objects: locallyEditedBuiltIn.objects.map((object) =>
          object.type === 'titleBlock'
            ? {
                ...object,
                height: 40,
                width: 320,
                x: 0,
                y: 0,
              }
            : object,
        ),
      },
    ]);
    const refreshed = merged.find((template) => template.id === 'builtin-template-as1100-a1-landscape');

    expect(refreshed?.updatedAt).toBe('2026-04-16T23:41:00.000Z');
    expect(refreshed?.objects.find((object) => object.type === 'titleBlock')).toMatchObject({
      height: 75,
      width: 801,
    });
  });

  it('parses stored generic templates through the shared normalizer', () => {
    const template = createGenericTemplateDocument({ name: 'Persisted' });
    const parsed = parseStoredGenericTemplateLibrary(JSON.stringify([template]));

    expect(parsed).toHaveLength(1);
    const parsedTemplate = parsed[0];
    expect(parsedTemplate).toBeDefined();
    if (!parsedTemplate) {
      throw new Error('Expected parsed template');
    }
    expect(parsedTemplate.name).toBe('Persisted');
  });

  it('keeps legacy generic templates without style fields compatible', () => {
    const parsed = parseStoredGenericTemplateLibrary(
      JSON.stringify([
        {
          id: 'legacy-generic-1',
          name: 'Legacy Generic',
          orientation: 'landscape',
          paperSize: 'a4',
          presetId: 'system_default',
          objects: [
            {
              id: 'title-1',
              type: 'titleBlock',
              x: 20,
              y: 20,
              width: 180,
              height: 45,
            },
          ],
        },
      ]),
    );

    expect(parsed[0]?.chromeStyle.color).toBe('#0f172a');
    expect(parsed[0]?.objects[0]?.lineStyle?.widthPx).toBe(2);
    expect(parsed[0]?.objects[0]?.typography?.title.fontSizePx).toBe(13);
  });

  it('reads legacy spatial templates as compatibility summaries', () => {
    const parsed = parseLegacySpatialTemplateSummaries(
      JSON.stringify([
        {
          id: 'spatial-1',
          name: 'Spatial Layout',
          mode: 'as1100_inspired',
          paperSize: 'a3',
          orientation: 'landscape',
          updatedAt: '2026-04-16T00:00:00.000Z',
          objects: [{ id: 'a' }, { id: 'b' }],
        },
      ]),
    );

    expect(parsed).toEqual([
      {
        id: 'spatial-1',
        kind: 'legacy_spatial',
        mode: 'as1100_inspired',
        name: 'Spatial Layout',
        objectCount: 2,
        orientation: 'landscape',
        paperSize: 'a3',
        updatedAt: '2026-04-16T00:00:00.000Z',
      },
    ]);
  });
});
