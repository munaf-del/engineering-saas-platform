import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createEmptyDraftingModel, type Project } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import {
  DraftingScheduleSheet,
  DraftingScheduleSheetPackPreview,
  DraftingScheduleSheetPreview,
} from './drafting-schedule-sheet-preview';
import {
  DRAFTING_SCHEDULE_ALL_GROUPS,
  buildDraftingScheduleSheetPackFromSnapshot,
  buildDraftingScheduleSheetPack,
  buildDraftingScheduleSheetRenderModel,
} from './drafting-schedule-sheet';
import { createDraftingScheduleSheetDefinition } from './drafting-schedule-sheet-definition-utils';
import { createDraftingSchedulePackIssueSnapshot } from './drafting-schedule-pack-issue-utils';
import { buildDraftingScheduleSheetTemplateSnapshotMap } from './drafting-schedule-template-snapshot';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import { createGenericTemplateDocument } from '@/features/templates/core/generic-template-document';

describe('DraftingScheduleSheet', () => {
  beforeAll(() => {
    vi.stubGlobal('React', React);
  });

  it('renders a selected schedule group on a sheet preview surface', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [createDraftingObject('anchor_tieback', { x: 1000, y: 2000 }, model)];
    const markup = renderToStaticMarkup(
      <DraftingScheduleSheet
        renderModel={buildDraftingScheduleSheetRenderModel({
          groupSelection: 'anchors',
          metadata: metadata(),
          model,
        })}
      />,
    );

    expect(markup).toContain('template-canvas-surface');
    expect(markup).toContain('Anchor Schedule');
    expect(markup).toContain('A1');
    expect(markup).toContain('DRAFTING SCHEDULE SHEET QA SCHEDULES');
  });

  it('renders all schedule groups as multiple sections', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [
      createDraftingObject('pile', { x: 1000, y: 2000 }, model),
      createDraftingObject('borehole', { x: 1600, y: 2600 }, model),
    ];
    const markup = renderToStaticMarkup(
      <DraftingScheduleSheet
        renderModel={buildDraftingScheduleSheetRenderModel({
          groupSelection: DRAFTING_SCHEDULE_ALL_GROUPS,
          metadata: metadata(),
          model,
        })}
      />,
    );

    expect(markup).toContain('Shoring / Pile Schedule');
    expect(markup).toContain('Anchor Schedule');
    expect(markup).toContain('Beam / Waler Schedule');
    expect(markup).toContain('Borehole Schedule');
    expect(markup).toContain('Services / Conflicts Schedule');
    expect(markup).toContain('Annotation / Reference Schedule');
  });

  it('renders the empty schedule placeholder state', () => {
    const markup = renderToStaticMarkup(
      <DraftingScheduleSheet
        renderModel={buildDraftingScheduleSheetRenderModel({
          groupSelection: 'services_conflicts',
          metadata: metadata(),
          model: createEmptyDraftingModel('drawing-empty'),
        })}
      />,
    );

    expect(markup).toContain('No services / conflicts rows');
  });

  it('renders one saved schedule sheet definition as a print page', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [createDraftingObject('anchor_tieback', { x: 1000, y: 2000 }, model)];
    const pack = buildDraftingScheduleSheetPack({
      definitions: [
        createDraftingScheduleSheetDefinition({
          id: 'sheet-anchors',
          includedScheduleGroups: ['anchors'],
          name: 'Anchor Sheet',
          title: 'Anchor Sheet',
        }),
      ],
      metadata: metadata(),
      model,
    });
    const markup = renderToStaticMarkup(<DraftingScheduleSheetPackPreview pack={pack} />);

    expect(markup).toContain('data-testid="drafting-schedule-pack-preview"');
    expect(markup).toContain('data-definition-id="sheet-anchors"');
    expect(markup).toContain('data-print-page-size="a3"');
    expect(markup).toContain('Anchor Schedule');
    expect(markup).toContain('Page');
    expect(markup).toContain('1 of 1');
  });

  it('renders all saved definitions as a multi-sheet print pack', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [
      createDraftingObject('pile', { x: 1000, y: 2000 }, model),
      createDraftingObject('borehole', { x: 1600, y: 2600 }, model),
    ];
    const pack = buildDraftingScheduleSheetPack({
      definitions: [
        createDraftingScheduleSheetDefinition({
          id: 'sheet-piles',
          includedScheduleGroups: ['shoring_piles'],
          name: 'Pile Sheet',
        }),
        createDraftingScheduleSheetDefinition({
          id: 'sheet-boreholes',
          includedScheduleGroups: ['boreholes'],
          name: 'Borehole Sheet',
          pageOrder: 2,
        }),
      ],
      metadata: metadata(),
      model,
    });
    const markup = renderToStaticMarkup(<DraftingScheduleSheetPackPreview pack={pack} />);

    expect(markup).toContain('data-definition-id="sheet-piles"');
    expect(markup).toContain('data-definition-id="sheet-boreholes"');
    expect(markup).toContain('Shoring / Pile Schedule');
    expect(markup).toContain('Borehole Schedule');
    expect(markup).toContain('2 of 2');
  });

  it('renders a frozen issued pack preview with issue metadata', () => {
    const model = createEmptyDraftingModel('drawing-preview');
    const anchor = createDraftingObject('anchor_tieback', { x: 1000, y: 2000 }, model);
    if (anchor.type !== 'anchor_tieback') {
      throw new Error('Expected anchor');
    }
    anchor.parameters.anchorId = 'A1';
    model.objects = [anchor];
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
    const pack = buildDraftingScheduleSheetPackFromSnapshot({
      issue,
      metadata: {
        ...metadata(),
        issueDateLabel: '23 Apr 2026',
      },
    });
    const markup = renderToStaticMarkup(<DraftingScheduleSheetPackPreview pack={pack} />);

    expect(markup).toContain('For construction');
    expect(markup).toContain('issued');
    expect(markup).toContain('A1');
    expect(markup).not.toContain('A99');
  });

  it('shows template drift state for issued packs without changing the frozen preview', () => {
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
    const model = createEmptyDraftingModel('drawing-preview');
    model.objects = [createDraftingObject('anchor_tieback', { x: 1000, y: 2000 }, model)];
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
    model.schedulePackIssues = [issue];
    model.scheduleSheets = [
      {
        ...model.scheduleSheets[0]!,
        orientation: 'landscape',
        pageSize: 'a2',
      },
    ];
    const drawing = {
      createdAt: '2026-04-22T00:00:00.000Z',
      createdById: 'user-1',
      currentRevision: 0,
      id: 'drawing-preview',
      model,
      modelVersion: 1,
      objectCount: model.objects.length,
      projectId: 'project-1',
      revisions: [],
      status: 'draft' as const,
      title: 'Drafting Schedule Sheet QA',
      updatedAt: '2026-04-23T00:00:00.000Z',
      updatedById: 'user-1',
    };
    const markup = renderToStaticMarkup(
      <DraftingScheduleSheetPreview
        drawing={drawing}
        groupSelection={DRAFTING_SCHEDULE_ALL_GROUPS}
        onGroupSelectionChange={() => {}}
        onModeChange={() => {}}
        onSelectedIssueIdChange={() => {}}
        onSelectedSheetIdChange={() => {}}
        onTemplateValueChange={() => {}}
        previewMode="issue"
        project={project()}
        projectId="project-1"
        rootTemplatesById={
          new Map([
            [
              'root-template-1',
              buildRootSheetTemplateRecord(
                'root-template-1',
                'Current live template',
                currentTemplate,
              ),
            ],
          ])
        }
        selectedIssueId="issue-a"
        selectedSheetId=""
        selectedTemplateSource={{ label: 'Default drafting schedule sheet', template: null }}
        templateBindingWarningsById={{}}
        templateOptions={[
          {
            label: 'Current live template - A2 landscape',
            source: { label: 'Current live template', template: currentTemplate },
            value: 'root-template-1',
          },
        ]}
        templateValue="default"
      />,
    );

    expect(markup).toContain('Template drift');
    expect(markup).toContain('Locked template snapshots');
    expect(markup).toContain('Live pack = current model + current template binding');
    expect(markup).toContain('Issued pack = locked rows + locked sheet definitions + locked template snapshot');
    expect(markup).toContain('Locked issue template');
  });
});

function metadata() {
  return {
    drawingId: 'drawing-preview',
    drawingStatus: 'draft',
    drawingTitle: 'Drafting Schedule Sheet QA',
    generatedAtLabel: 'Updated 23 Apr 2026',
    projectCode: 'NSYD',
    projectName: 'NORTH SYDNEY',
    revision: 'Revision 1',
  };
}

function project() {
  return {
    code: 'NSYD',
    id: 'project-1',
    name: 'NORTH SYDNEY',
  } as Project;
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
