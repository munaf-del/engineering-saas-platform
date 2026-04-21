import { describe, expect, it } from 'vitest';
import {
  applyAs1100TitleBlockGeometry,
  DEFAULT_GENERIC_TEMPLATE_CHROME_STYLE,
  DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
  DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY,
  createDefaultGenericTemplateChromeStyleForDocument,
  createGenericTemplateDocument,
  createGenericTemplateObject,
  normalizeGenericTemplateDocument,
  normalizeGenericTemplateObjects,
  remapGenericTemplateObjectsToPage,
} from './generic-template-document';

describe('generic template document', () => {
  it('creates a default generic template with visible generic objects', () => {
    const template = createGenericTemplateDocument({ name: 'My Template' });

    expect(template.kind).toBe('generic');
    expect(template.name).toBe('My Template');
    expect(template.objects.map((object) => object.type)).toEqual([
      'titleBlock',
      'textBlock',
      'detailsBlock',
      'imageFrame',
    ]);
  });

  it('uses standards-backed chrome thickness for AS 1100-inspired templates', () => {
    const template = createGenericTemplateDocument({
      name: 'AS Sheet',
      orientation: 'landscape',
      paperSize: 'a1',
      presetId: 'as1100_inspired',
    });

    expect(template.chromeStyle).toEqual(
      createDefaultGenericTemplateChromeStyleForDocument({
        orientation: 'landscape',
        paperSize: 'a1',
        presetId: 'as1100_inspired',
      }),
    );
  });

  it('sizes and anchors the AS 1100 title block using the standard paper-specific envelope', () => {
    const template = createGenericTemplateDocument({
      name: 'AS A4',
      orientation: 'landscape',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const titleBlock = template.objects.find((object) => object.type === 'titleBlock');

    expect(titleBlock).toBeDefined();
    expect(titleBlock).toMatchObject({
      height: 75,
      width: 210,
      x: 77,
      y: 125,
      title: '',
      subtitle: '',
      projectName: '',
      projectCode: '',
      sheetNumber: '',
    });
  });

  it('creates AS 1100 starter sheets with blank helper titles and details labels', () => {
    const template = createGenericTemplateDocument({
      name: 'AS Starter',
      orientation: 'landscape',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const notesBlock = template.objects.find((object) => object.type === 'textBlock');
    const detailsBlock = template.objects.find((object) => object.type === 'detailsBlock');
    const imageFrame = template.objects.find((object) => object.type === 'imageFrame');

    expect(notesBlock).toMatchObject({
      title: '',
      body: '',
    });
    expect(detailsBlock).toMatchObject({
      title: '',
      rows: [
        { label: '', value: '' },
        { label: '', value: '' },
        { label: '', value: '' },
      ],
    });
    expect(imageFrame).toMatchObject({
      title: '',
      caption: '',
    });
  });

  it('normalizes invalid input into a usable generic template', () => {
    const template = normalizeGenericTemplateDocument({
      name: '  ',
      orientation: 'invalid',
      paperSize: 'invalid',
      presetId: 'invalid',
      objects: [{ type: 'unknown' }],
    });

    expect(template.name).toBe('Untitled Template');
    expect(template.orientation).toBe('landscape');
    expect(template.paperSize).toBe('a4');
    expect(template.presetId).toBe('system_default');
    expect(template.objects.length).toBeGreaterThan(0);
  });

  it('adds safe typography and chrome defaults for older saved templates', () => {
    const template = normalizeGenericTemplateDocument({
      name: 'Legacy Template',
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
    });

    expect(template.chromeStyle).toEqual(DEFAULT_GENERIC_TEMPLATE_CHROME_STYLE);
    expect(template.objects[0]?.lineStyle).toEqual(DEFAULT_GENERIC_TEMPLATE_LINE_STYLE);
    expect(template.objects[0]?.typography).toEqual(
      DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY,
    );
  });

  it('preserves saved AS 1100 title block geometry during normalization', () => {
    const template = normalizeGenericTemplateDocument({
      name: 'Legacy AS Template',
      orientation: 'landscape',
      paperSize: 'a1',
      presetId: 'as1100_inspired',
      objects: [
        {
          id: 'title-1',
          type: 'titleBlock',
          x: 20,
          y: 20,
          width: 190,
          height: 75,
        },
      ],
    });

    expect(template.objects[0]).toMatchObject({
      width: 190,
      height: 75,
      x: 20,
      y: 20,
    });
  });

  it('normalizes extended title block metadata fields for AS templates', () => {
    const template = normalizeGenericTemplateDocument({
      name: 'Metadata Template',
      orientation: 'landscape',
      paperSize: 'a3',
      presetId: 'as1100_inspired',
      objects: [
        {
          id: 'title-1',
          type: 'titleBlock',
          x: 10,
          y: 10,
          width: 400,
          height: 75,
          projectAddress: '123 Example Street',
          preparedBy: 'J Smith',
          checkedBy: 'A Brown',
          revision: 'B',
          scaleLabel: '1:100',
          generatedAtLabel: '17/04/2026',
        },
      ],
    });

    expect(template.objects[0]).toMatchObject({
      projectAddress: '123 Example Street',
      preparedBy: 'J Smith',
      checkedBy: 'A Brown',
      revision: 'B',
      scaleLabel: '1:100',
      generatedAtLabel: '17/04/2026',
    });
  });

  it('preserves intentionally blank AS detail row labels and values during normalization', () => {
    const template = normalizeGenericTemplateDocument({
      name: 'AS Blank Details',
      orientation: 'landscape',
      paperSize: 'a2',
      presetId: 'as1100_inspired',
      objects: [
        {
          id: 'details-1',
          type: 'detailsBlock',
          x: 10,
          y: 10,
          width: 120,
          height: 40,
          rows: [
            { id: 'row-1', label: '', value: '' },
            { id: 'row-2', label: '', value: '' },
            { id: 'row-3', label: '', value: '' },
          ],
        },
      ],
    });

    expect(template.objects[0]).toMatchObject({
      rows: [
        { label: '', value: '' },
        { label: '', value: '' },
        { label: '', value: '' },
      ],
    });
  });

  it('preserves valid duplicate-friendly generic objects', () => {
    const objects = normalizeGenericTemplateObjects(
      [
        {
          id: 'text-1',
          type: 'textBlock',
          name: 'Text A',
          x: 30,
          y: 20,
          width: 90,
          height: 30,
          order: 1,
        },
        {
          id: 'text-2',
          type: 'textBlock',
          name: 'Text B',
          x: 50,
          y: 60,
          width: 90,
          height: 30,
          order: 2,
        },
      ],
      'a4',
      'landscape',
    );

    expect(objects.filter((object) => object.type === 'textBlock')).toHaveLength(2);
  });

  it('creates new objects and remaps them across page changes', () => {
    const template = createGenericTemplateDocument({ paperSize: 'a4', orientation: 'landscape' });
    const object = createGenericTemplateObject({
      existingObjects: template.objects,
      orientation: 'landscape',
      paperSize: 'a4',
      type: 'imageFrame',
    });
    const remappedObjects = remapGenericTemplateObjectsToPage(
      [object],
      'a4',
      'landscape',
      'a3',
      'portrait',
    );

    const remappedObject = remappedObjects[0];
    expect(remappedObject).toBeDefined();
    if (!remappedObject) {
      throw new Error('Expected remapped object');
    }
    expect(remappedObject.width).toBeGreaterThan(0);
    expect(remappedObject.height).toBeGreaterThan(0);
  });

  it('re-applies the AS 1100 title block envelope after page remapping', () => {
    const standardized = applyAs1100TitleBlockGeometry(
      [
        {
          ...createGenericTemplateDocument({
            name: 'Legacy AS A2',
            orientation: 'landscape',
            paperSize: 'a2',
            presetId: 'as1100_inspired',
          }).objects.find((object) => object.type === 'titleBlock')!,
          width: 574,
          height: 55,
          x: 10,
          y: 355,
        },
      ],
      'a2',
      'landscape',
    );

    expect(standardized[0]).toMatchObject({
      width: 574,
      height: 75,
      x: 10,
      y: 335,
    });
  });
});
