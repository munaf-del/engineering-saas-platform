import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingModel } from '@eng/shared';
import { createGenericTemplateDocument } from '@/features/templates/core/generic-template-document';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import type { SharedSheetBlockContent } from '@/features/templates/core/shared-sheet-schema';
import { createDraftingObject } from '../model-utils';
import {
  DRAFTING_SCHEDULE_ALL_GROUPS,
  buildDraftingScheduleSheetPackFromSnapshot,
  buildDraftingScheduleSheetPack,
  buildDraftingScheduleSheetRenderModel,
  serializeDraftingScheduleSheetPackJson,
} from './drafting-schedule-sheet';
import { createDraftingScheduleSheetDefinition } from './drafting-schedule-sheet-definition-utils';
import { createDraftingSchedulePackIssueSnapshot } from './drafting-schedule-pack-issue-utils';
import { buildDraftingScheduleSheetTemplateSnapshotMap } from './drafting-schedule-template-snapshot';

describe('drafting schedule sheet render model', () => {
  it('renders the selected schedule group as a plotted table block', () => {
    const model = modelWith(['pile', 'anchor_tieback']);
    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: 'anchors',
      metadata: metadata(),
      model,
    });
    const anchorTable = renderModel.contentByBlockId['drafting-schedule-table-anchors'];

    expect(renderModel.definition.objects.some((object) => object.type === 'titleBlock')).toBe(
      true,
    );
    const anchorTableContent = expectTableContent(anchorTable);

    expect(anchorTableContent.title).toBe('Anchor Schedule');
    expect(anchorTableContent.rows).toHaveLength(1);
    expect(anchorTableContent.rows?.[0]).toMatchObject({
      anchorId: 'A1',
      stage: 'Stage 1',
    });
    expect(renderModel.contentByBlockId['drafting-schedule-table-shoring_piles']).toBeUndefined();
  });

  it('renders all schedule groups as multiple table sections', () => {
    const model = modelWith([
      'pile',
      'anchor_tieback',
      'waler',
      'borehole',
      'service_run',
      'callout',
    ]);
    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: DRAFTING_SCHEDULE_ALL_GROUPS,
      metadata: metadata(),
      model,
    });
    const tableBlocks = renderModel.definition.objects.filter(
      (object) => object.type === 'tableBlock',
    );

    expect(tableBlocks.map((block) => block.id)).toEqual([
      'drafting-schedule-table-shoring_piles',
      'drafting-schedule-table-anchors',
      'drafting-schedule-table-beams_walers',
      'drafting-schedule-table-boreholes',
      'drafting-schedule-table-services_conflicts',
      'drafting-schedule-table-annotations_references',
    ]);
    expect(renderModel.contentByBlockId['drafting-schedule-table-shoring_piles']).toMatchObject({
      title: 'Shoring / Pile Schedule',
      type: 'tableBlock',
    });
    expect(
      renderModel.contentByBlockId['drafting-schedule-table-annotations_references'],
    ).toMatchObject({
      title: 'Annotation / Reference Schedule',
      type: 'tableBlock',
    });
  });

  it('keeps empty schedules on the sheet with a useful placeholder', () => {
    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: 'boreholes',
      metadata: metadata(),
      model: createEmptyDraftingModel('drawing-empty'),
    });
    const boreholeTable = renderModel.contentByBlockId['drafting-schedule-table-boreholes'];

    const boreholeTableContent = expectTableContent(boreholeTable);

    expect(boreholeTableContent.rows).toEqual([]);
    expect(boreholeTableContent.placeholder).toContain('No borehole rows');
  });

  it('passes only DraftingModel-derived schedule rows into preview content', () => {
    const model = modelWith(['service_crossing']);
    model.underlays.push({
      id: 'underlay-1',
      name: 'Source underlay',
      fileId: 'pdf-file-1',
      fileName: 'source.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: { x: 0, y: 0, scale: 1, rotationDeg: 0 },
      crop: null,
      calibration: null,
      createdAt: '2026-04-22T00:00:00.000Z',
      updatedAt: '2026-04-22T00:00:00.000Z',
    });

    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: 'services_conflicts',
      metadata: metadata(),
      model,
    });
    const exportedPreviewContent = JSON.stringify(renderModel.contentByBlockId);

    expect(exportedPreviewContent).toContain('SC1');
    expect(exportedPreviewContent).not.toContain('pdf-file-1');
    expect(exportedPreviewContent).not.toContain('data:application/pdf');
    expect(exportedPreviewContent).not.toContain('"buffer"');
  });

  it('can reuse a root sheet template surface for schedule placement', () => {
    const template = createGenericTemplateDocument({
      name: 'A4 Schedule Template',
      orientation: 'landscape',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const renderModel = buildDraftingScheduleSheetRenderModel({
      groupSelection: 'shoring_piles',
      metadata: metadata(),
      model: modelWith(['pile']),
      templateSource: {
        label: 'A4 Schedule Template',
        template,
      },
    });

    expect(renderModel.definition.paperSize).toBe('a4');
    expect(renderModel.definition.orientation).toBe('landscape');
    expect(renderModel.definition.objects.some((object) => object.type === 'titleBlock')).toBe(
      true,
    );
    expect(
      renderModel.definition.objects.some(
        (object) => object.id === 'drafting-schedule-table-shoring_piles',
      ),
    ).toBe(true);
  });

  it('falls back to the default schedule layout when a bound template source is unavailable', () => {
    const definition = {
      ...createDraftingScheduleSheetDefinition({
        id: 'sheet-bound',
        includedScheduleGroups: ['shoring_piles'],
        name: 'Bound Pile Sheet',
      }),
      rootSheetTemplateId: 'missing-root-template',
      templateId: 'missing-root-template',
    };
    const pack = buildDraftingScheduleSheetPack({
      definitions: [definition],
      metadata: metadata(),
      model: modelWith(['pile']),
      templateSourcesById: {},
    });

    expect(pack.pages[0]?.renderModel.definition.source).toBe('built_in_template_definition');
    expect(
      pack.pages[0]?.renderModel.contentByBlockId['drafting-schedule-details-block'],
    ).toMatchObject({
      type: 'detailsBlock',
    });
  });

  it('uses the current live template binding when rendering a saved pack', () => {
    const template = createGenericTemplateDocument({
      name: 'Current live template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const definition = {
      ...createDraftingScheduleSheetDefinition({
        id: 'sheet-live-template',
        includedScheduleGroups: ['shoring_piles'],
        name: 'Bound pile sheet',
      }),
      orientation: 'portrait' as const,
      pageSize: 'a4' as const,
      rootSheetTemplateId: 'root-template-live',
      templateId: 'root-template-live',
    };
    const pack = buildDraftingScheduleSheetPack({
      definitions: [definition],
      metadata: metadata(),
      model: modelWith(['pile']),
      templateSourcesById: {
        'root-template-live': {
          label: 'Current live template',
          template,
        },
      },
    });

    expect(pack.pages[0]?.renderModel.definition.paperSize).toBe('a4');
    expect(pack.pages[0]?.renderModel.definition.orientation).toBe('portrait');
    expect(pack.pages[0]?.renderModel.definition.source).toBe('generic_template_adapter');
  });

  it('paginates a long saved schedule definition into multiple printable pages', () => {
    const definition = createDraftingScheduleSheetDefinition({
      id: 'sheet-piles',
      includedScheduleGroups: ['shoring_piles'],
      name: 'Pile Schedule',
      title: 'Pile Schedule',
    });
    const pack = buildDraftingScheduleSheetPack({
      definitions: [definition],
      metadata: metadata(),
      model: modelWithManyPiles(40),
    });
    const firstPageContent =
      pack.pages[0]?.renderModel.contentByBlockId['drafting-schedule-table-shoring_piles'];
    const secondPageContent = JSON.stringify(pack.pages[1]?.renderModel.contentByBlockId);

    expect(pack.pages.length).toBeGreaterThan(1);
    expect(pack.pages.every((page) => page.groupKeys[0] === 'shoring_piles')).toBe(true);
    expect(firstPageContent).toMatchObject({
      title: 'Shoring / Pile Schedule (1 of 2)',
      type: 'tableBlock',
    });
    expect(secondPageContent).toContain('Page');
    expect(secondPageContent).toContain('2 of 2');
  });

  it('generates a multi-definition schedule pack without embedding underlay payloads', () => {
    const model = modelWith(['pile', 'anchor_tieback', 'borehole']);
    model.underlays.push({
      id: 'underlay-pack',
      name: 'Pack underlay',
      fileId: 'pdf-file-pack',
      fileName: 'pack.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: { x: 0, y: 0, scale: 1, rotationDeg: 0 },
      crop: null,
      calibration: null,
      createdAt: '2026-04-22T00:00:00.000Z',
      updatedAt: '2026-04-22T00:00:00.000Z',
    });
    const pack = buildDraftingScheduleSheetPack({
      definitions: [
        createDraftingScheduleSheetDefinition({
          id: 'sheet-shoring',
          includedScheduleGroups: ['shoring_piles', 'anchors'],
          name: 'Shoring Pack',
        }),
        createDraftingScheduleSheetDefinition({
          id: 'sheet-boreholes',
          includedScheduleGroups: ['boreholes'],
          name: 'Borehole Pack',
          pageOrder: 2,
        }),
      ],
      metadata: metadata(),
      model,
    });
    const exported = serializeDraftingScheduleSheetPackJson(pack);

    expect(pack.pages.map((page) => page.definition.id)).toEqual([
      'sheet-shoring',
      'sheet-shoring',
      'sheet-boreholes',
    ]);
    expect(pack.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3]);
    expect(exported).toContain('"pageCount": 3');
    expect(exported).not.toContain('pdf-file-pack');
    expect(exported).not.toContain('data:application/pdf');
    expect(exported).not.toContain('"buffer"');
  });

  it('returns an empty printable pack for an empty sheet definition list', () => {
    const pack = buildDraftingScheduleSheetPack({
      definitions: [],
      metadata: metadata(),
      model: createEmptyDraftingModel('drawing-empty-pack'),
    });

    expect(pack.definitions).toEqual([]);
    expect(pack.pages).toEqual([]);
  });

  it('renders frozen issued packs from locked summary data instead of the live model', () => {
    const model = modelWith(['anchor_tieback']);
    const anchor = model.objects[0];
    if (anchor?.type !== 'anchor_tieback') {
      throw new Error('Expected anchor');
    }
    anchor.parameters.anchorId = 'A1';
    model.scheduleSheets = [
      createDraftingScheduleSheetDefinition({
        id: 'sheet-anchors',
        includedScheduleGroups: ['anchors'],
        name: 'Anchor Sheet',
      }),
    ];
    const issue = createDraftingSchedulePackIssueSnapshot(model, {
      id: 'issue-a',
      issuePurpose: 'For construction',
      issueStatus: 'issued',
      issuedAt: '2026-04-23T00:00:00.000Z',
      metadata: metadata(),
      name: 'Anchor Issue',
      revisionLabel: 'A',
    });
    anchor.parameters.anchorId = 'A99';

    const frozenPack = buildDraftingScheduleSheetPackFromSnapshot({
      issue,
      metadata: metadata(),
    });
    const livePack = buildDraftingScheduleSheetPack({
      definitions: model.scheduleSheets,
      metadata: metadata(),
      model,
    });
    const frozenMarkup = JSON.stringify(frozenPack.pages[0]?.renderModel.contentByBlockId);
    const liveMarkup = JSON.stringify(livePack.pages[0]?.renderModel.contentByBlockId);

    expect(frozenMarkup).toContain('A1');
    expect(frozenMarkup).not.toContain('A99');
    expect(liveMarkup).toContain('A99');
  });

  it('renders frozen issued packs from the locked template snapshot instead of the current live template', () => {
    const lockedTemplate = createGenericTemplateDocument({
      name: 'Locked issue template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const currentTemplate = createGenericTemplateDocument({
      name: 'Current live template',
      orientation: 'landscape',
      paperSize: 'a2',
      presetId: 'as1100_inspired',
    });
    const model = modelWith(['anchor_tieback']);
    model.scheduleSheets = [
      {
        ...createDraftingScheduleSheetDefinition({
          id: 'sheet-anchors',
          includedScheduleGroups: ['anchors'],
          name: 'Anchor Sheet',
        }),
        orientation: 'portrait',
        pageSize: 'a4',
        rootSheetTemplateId: 'root-template-1',
        templateId: 'root-template-1',
      },
    ];
    const issue = createDraftingSchedulePackIssueSnapshot(model, {
      id: 'issue-a',
      issuePurpose: 'For construction',
      issueStatus: 'issued',
      issuedAt: '2026-04-23T00:00:00.000Z',
      metadata: metadata(),
      name: 'Anchor Issue',
      revisionLabel: 'A',
      templateSnapshotsBySheetId: buildDraftingScheduleSheetTemplateSnapshotMap(
        model.scheduleSheets,
        new Map([
          [
            'root-template-1',
            buildRootSheetTemplateRecord('root-template-1', 'Locked issue template', lockedTemplate),
          ],
        ]),
      ),
    });

    model.scheduleSheets = [
      {
        ...model.scheduleSheets[0]!,
        orientation: 'landscape',
        pageSize: 'a2',
      },
    ];

    const frozenPack = buildDraftingScheduleSheetPackFromSnapshot({
      issue,
      metadata: metadata(),
      templateSourcesById: {
        'root-template-1': {
          label: 'Current live template',
          template: currentTemplate,
        },
      },
    });
    const livePack = buildDraftingScheduleSheetPack({
      definitions: model.scheduleSheets,
      metadata: metadata(),
      model,
      templateSourcesById: {
        'root-template-1': {
          label: 'Current live template',
          template: currentTemplate,
        },
      },
    });

    expect(frozenPack.pages[0]?.renderModel.definition.paperSize).toBe('a4');
    expect(frozenPack.pages[0]?.renderModel.definition.orientation).toBe('portrait');
    expect(livePack.pages[0]?.renderModel.definition.paperSize).toBe('a2');
    expect(livePack.pages[0]?.renderModel.definition.orientation).toBe('landscape');
  });
});

function modelWith(types: Parameters<typeof createDraftingObject>[0][]): DraftingModel {
  const model = createEmptyDraftingModel('drawing-schedules');
  model.objects = types.map((type, index) =>
    createDraftingObject(type, { x: 1000 + index * 500, y: 2000 + index * 500 }, model),
  );
  return model;
}

function modelWithManyPiles(count: number): DraftingModel {
  const model = createEmptyDraftingModel('drawing-schedules');

  for (let index = 0; index < count; index += 1) {
    model.objects.push(createDraftingObject('pile', { x: index * 500, y: 2000 }, model));
  }

  return model;
}

function metadata() {
  return {
    drawingId: 'drawing-schedules',
    drawingStatus: 'draft',
    drawingTitle: 'Drafting Schedule Sheet QA',
    generatedAtLabel: 'Updated 23 Apr 2026',
    projectCode: 'NSYD',
    projectName: 'NORTH SYDNEY',
    revision: 'Revision 1',
  };
}

function buildRootSheetTemplateRecord(
  id: string,
  label: string,
  template: ReturnType<typeof createGenericTemplateDocument>,
) {
  return {
    archivedAt: null,
    category: null,
    createdAt: '2026-04-22T00:00:00.000Z',
    createdBy: 'user-1',
    currentVersion: {
      createdAt: '2026-04-22T00:00:00.000Z',
      createdBy: 'user-1',
      definitionJson: template,
      id: `${id}-version-1`,
      publishedAt: '2026-04-22T00:00:00.000Z',
      rootSheetTemplateId: id,
      schemaVersion: 1,
      versionLabel: 'A',
    },
    currentVersionId: `${id}-version-1`,
    id,
    key: `${id}-key`,
    label,
    organisationId: null,
    scopeId: null,
    scopeType: 'global',
    updatedAt: '2026-04-22T00:00:00.000Z',
    versions: [],
  } satisfies RootSheetTemplate;
}

function expectTableContent(content: SharedSheetBlockContent | undefined) {
  expect(content?.type).toBe('tableBlock');
  if (!content || content.type !== 'tableBlock') {
    throw new Error('Expected table block content');
  }

  return content;
}
