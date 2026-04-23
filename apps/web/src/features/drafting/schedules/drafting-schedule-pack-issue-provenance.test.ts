import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingModel } from '@eng/shared';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import { createGenericTemplateDocument } from '@/features/templates/core/generic-template-document';
import { createDraftingObject } from '../model-utils';
import { createDraftingSchedulePackIssueSnapshot } from './drafting-schedule-pack-issue-utils';
import {
  buildDraftingSchedulePackIssueDetail,
  buildDraftingSchedulePackIssueHistoryRows,
  buildDraftingSchedulePackIssueManifest,
  serializeDraftingSchedulePackIssueManifestJson,
} from './drafting-schedule-pack-issue-provenance';
import { createDraftingScheduleSheetDefinition } from './drafting-schedule-sheet-definition-utils';
import { buildDraftingScheduleSheetTemplateSnapshotMap } from './drafting-schedule-template-snapshot';

describe('drafting schedule pack issue provenance', () => {
  it('derives issue history rows with snapshot and drift states', () => {
    const lockedTemplate = createGenericTemplateDocument({
      name: 'Locked QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const currentTemplate = createGenericTemplateDocument({
      name: 'Current QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const base = buildIssuedPackFixture({
      currentRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord('root-template-1', 'Current QA template', currentTemplate, '2'),
        ],
      ]),
      lockedRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord('root-template-1', 'Locked QA template', lockedTemplate, '1'),
        ],
      ]),
    });

    const rows = buildDraftingSchedulePackIssueHistoryRows({
      issues: [base.issue],
      model: base.model,
      rootTemplatesById: base.currentRootTemplatesById,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        driftState: 'template_drift',
        id: 'issue-a',
        issueName: 'Anchor Issue',
        issuePurpose: 'For construction',
        issueStatus: 'issued',
        issuedAt: '2026-04-23T00:00:00.000Z',
        issuedBy: 'Casey Reviewer',
        pageCount: 1,
        revisionLabel: 'A',
        selectedSheetCount: 1,
        snapshotStatus: 'locked_template_snapshot',
      }),
    ]);
  });

  it('maps issue detail provenance with issued and live template metadata', () => {
    const lockedTemplate = createGenericTemplateDocument({
      name: 'Locked QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const currentTemplate = createGenericTemplateDocument({
      name: 'Current QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const base = buildIssuedPackFixture({
      currentRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord('root-template-1', 'Current QA template', currentTemplate, '2'),
        ],
      ]),
      lockedRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord('root-template-1', 'Locked QA template', lockedTemplate, '1'),
        ],
      ]),
    });

    const detail = buildDraftingSchedulePackIssueDetail({
      issue: base.issue,
      model: base.model,
      rootTemplatesById: base.currentRootTemplatesById,
    });
    const sheet = detail.selectedSheetDefinitions[0];

    expect(detail.snapshotStatus).toBe('locked_template_snapshot');
    expect(detail.lockedScheduleGroupCounts).toEqual([
      {
        groupKey: 'anchors',
        rowCount: 1,
        title: 'Anchor Schedule',
      },
    ]);
    expect(sheet).toMatchObject({
      currentLiveLayoutSummary: 'A4 portrait / compact',
      currentLiveTemplate: {
        label: 'Current QA template',
        rootSheetTemplateId: 'root-template-1',
        rootSheetTemplateVersionId: 'root-template-1-version-2',
        source: 'root_template',
      },
      currentLiveTemplateDiffers: true,
      issuedLayoutSummary: 'A4 portrait / compact',
      name: 'Anchor Sheet',
      snapshotStatus: 'locked_template_snapshot',
      templateSnapshotInfo: {
        fallbackProvenance:
          'Locked against the published root sheet template snapshot that was active at issue time.',
        label: 'Locked QA template',
        legacy: false,
        rootSheetTemplateId: 'root-template-1',
        rootSheetTemplateVersionId: 'root-template-1-version-1',
        source: 'root_template',
      },
    });
  });

  it('derives drift states across template, sheet, row, and mixed changes', () => {
    const lockedTemplate = createGenericTemplateDocument({
      name: 'Locked QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const currentTemplate = createGenericTemplateDocument({
      name: 'Current QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const lockedRootTemplatesById = new Map([
      [
        'root-template-1',
        buildRootSheetTemplateRecord('root-template-1', 'Locked QA template', lockedTemplate, '1'),
      ],
    ]);
    const currentRootTemplatesById = new Map([
      [
        'root-template-1',
        buildRootSheetTemplateRecord('root-template-1', 'Current QA template', currentTemplate, '2'),
      ],
    ]);
    const base = buildIssuedPackFixture({
      currentRootTemplatesById: lockedRootTemplatesById,
      lockedRootTemplatesById,
    });

    const inSync = buildDraftingSchedulePackIssueDetail({
      issue: base.issue,
      model: base.model,
      rootTemplatesById: lockedRootTemplatesById,
    });
    expect(inSync.comparison.driftState).toBe('in_sync');

    const templateDrift = buildDraftingSchedulePackIssueDetail({
      issue: base.issue,
      model: base.model,
      rootTemplatesById: currentRootTemplatesById,
    });
    expect(templateDrift.comparison.driftState).toBe('template_drift');

    const sheetDriftModel = cloneModel(base.model);
    sheetDriftModel.scheduleSheets = [
      {
        ...sheetDriftModel.scheduleSheets[0]!,
        orientation: 'landscape',
        pageSize: 'a3',
      },
    ];
    const sheetDrift = buildDraftingSchedulePackIssueDetail({
      issue: base.issue,
      model: sheetDriftModel,
      rootTemplatesById: lockedRootTemplatesById,
    });
    expect(sheetDrift.comparison.driftState).toBe('sheet_definition_drift');

    const rowDriftModel = cloneModel(base.model);
    rowDriftModel.objects = [...rowDriftModel.objects, buildAnchorObject(rowDriftModel, 'A2')];
    const rowDrift = buildDraftingSchedulePackIssueDetail({
      issue: base.issue,
      model: rowDriftModel,
      rootTemplatesById: lockedRootTemplatesById,
    });
    expect(rowDrift.comparison.driftState).toBe('row_summary_drift');

    const mixedDriftModel = cloneModel(base.model);
    mixedDriftModel.objects = [...mixedDriftModel.objects, buildAnchorObject(mixedDriftModel, 'A2')];
    const mixedDrift = buildDraftingSchedulePackIssueDetail({
      issue: base.issue,
      model: mixedDriftModel,
      rootTemplatesById: currentRootTemplatesById,
    });
    expect(mixedDrift.comparison.driftState).toBe('mixed_drift');
  });

  it('labels legacy snapshots without fabricating locked template metadata', () => {
    const model = createEmptyDraftingModel('drawing-legacy');
    model.schedulePackIssues = [
      {
        id: 'issue-legacy',
        name: 'Legacy Issue',
        revisionLabel: 'A',
        issuePurpose: 'For review',
        issueStatus: 'issued',
        issuedAt: '2026-04-20T00:00:00.000Z',
        issuedBy: 'Legacy Reviewer',
        includedScheduleSheetIds: ['sheet-legacy'],
        lockedSheetDefinitions: [
          {
            ...createDraftingScheduleSheetDefinition({
              id: 'sheet-legacy',
              includedScheduleGroups: ['anchors'],
              name: 'Legacy Anchor Sheet',
            }),
            rootSheetTemplateId: 'root-template-legacy',
            templateId: 'root-template-legacy',
          },
        ],
        lockedScheduleSummary: {
          counts: { anchors: 0 },
          drawingId: model.drawingId,
          groups: [],
          units: 'mm',
        },
        pageCount: 1,
      },
    ];

    const detail = buildDraftingSchedulePackIssueDetail({
      issue: model.schedulePackIssues[0]!,
      model,
      rootTemplatesById: new Map(),
    });

    expect(detail.snapshotStatus).toBe('legacy_snapshot');
    expect(detail.legacyWarning).toContain('Legacy issue snapshot created before template snapshot locking');
    expect(detail.selectedSheetDefinitions[0]?.templateSnapshotInfo).toEqual(
      expect.objectContaining({
        legacy: true,
        rootSheetTemplateId: 'root-template-legacy',
        rootSheetTemplateVersionId: null,
        safeArea: null,
        scheduleRegion: null,
        source: 'legacy',
      }),
    );
  });

  it('exports a deterministic issue manifest json payload', () => {
    const lockedTemplate = createGenericTemplateDocument({
      name: 'Locked QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const base = buildIssuedPackFixture({
      currentRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord('root-template-1', 'Locked QA template', lockedTemplate, '1'),
        ],
      ]),
      lockedRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord('root-template-1', 'Locked QA template', lockedTemplate, '1'),
        ],
      ]),
    });

    const manifest = buildDraftingSchedulePackIssueManifest({
      issue: base.issue,
      model: base.model,
      rootTemplatesById: base.currentRootTemplatesById,
    });
    const exported = serializeDraftingSchedulePackIssueManifestJson(manifest);

    expect(JSON.parse(exported)).toEqual(
      expect.objectContaining({
        driftStatus: 'in_sync',
        issueId: 'issue-a',
        issuePurpose: 'For construction',
        issueStatus: 'issued',
        pageCount: 1,
        revisionLabel: 'A',
        snapshotStatus: 'locked_template_snapshot',
      }),
    );
    expect(exported).toContain('"selectedSheetDefinitions"');
    expect(exported).toContain('"lockedScheduleGroupCounts"');
  });

  it('builds live-vs-issued comparison summaries with deterministic pack deltas', () => {
    const lockedTemplate = createGenericTemplateDocument({
      name: 'Locked QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const rootTemplatesById = new Map([
      [
        'root-template-1',
        buildRootSheetTemplateRecord('root-template-1', 'Locked QA template', lockedTemplate, '1'),
      ],
    ]);
    const base = buildIssuedPackFixture({
      currentRootTemplatesById: rootTemplatesById,
      lockedRootTemplatesById: rootTemplatesById,
    });
    const liveModel = cloneModel(base.model);
    liveModel.objects = [...liveModel.objects, buildAnchorObject(liveModel, 'A2')];
    liveModel.scheduleSheets = [
      ...liveModel.scheduleSheets,
      createDraftingScheduleSheetDefinition({
        id: 'sheet-boreholes',
        includedScheduleGroups: ['boreholes'],
        name: 'Borehole Sheet',
        pageOrder: 2,
      }),
    ];

    const detail = buildDraftingSchedulePackIssueDetail({
      issue: base.issue,
      model: liveModel,
      rootTemplatesById,
    });

    expect(detail.comparison).toEqual(
      expect.objectContaining({
        driftState: 'mixed_drift',
        pageCount: {
          difference: 1,
          issued: 1,
          live: 2,
        },
        rowCount: {
          difference: 1,
          issued: 1,
          live: 2,
        },
        sheetCount: {
          difference: 1,
          issued: 1,
          live: 2,
        },
      }),
    );
    expect(detail.comparison.groupCounts).toEqual([
      {
        difference: 1,
        groupKey: 'anchors',
        issuedRowCount: 1,
        liveRowCount: 2,
        title: 'Anchor Schedule',
      },
      {
        difference: 0,
        groupKey: 'boreholes',
        issuedRowCount: 0,
        liveRowCount: 0,
        title: 'Borehole Schedule',
      },
    ]);
  });
});

function buildIssuedPackFixture(args: {
  currentRootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
  lockedRootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
}) {
  const model = createEmptyDraftingModel('drawing-issue-history');
  model.objects = [buildAnchorObject(model, 'A1')];
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
    issuedBy: 'Casey Reviewer',
    metadata: {
      drawingId: model.drawingId,
      drawingStatus: 'draft',
      drawingTitle: 'Drafting Schedule Issue History QA',
      generatedAtLabel: 'Updated 23 Apr 2026',
      projectCode: 'NSYD',
      projectName: 'NORTH SYDNEY',
      revision: 'R0',
    },
    name: 'Anchor Issue',
    revisionLabel: 'A',
    templateSnapshotsBySheetId: buildDraftingScheduleSheetTemplateSnapshotMap(
      model.scheduleSheets,
      args.lockedRootTemplatesById,
    ),
  });

  return {
    currentRootTemplatesById: args.currentRootTemplatesById,
    issue,
    model,
  };
}

function buildAnchorObject(model: DraftingModel, anchorId: string) {
  const anchor = createDraftingObject('anchor_tieback', { x: 1000, y: 2000 }, model);
  if (anchor.type !== 'anchor_tieback') {
    throw new Error('Expected anchor');
  }
  anchor.parameters.anchorId = anchorId;
  return anchor;
}

function buildRootSheetTemplateRecord(
  id: string,
  label: string,
  template: ReturnType<typeof createGenericTemplateDocument>,
  versionSuffix: string,
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
      id: `${id}-version-${versionSuffix}`,
      publishedAt: '2026-04-22T00:00:00.000Z',
      rootSheetTemplateId: id,
      schemaVersion: 1,
      versionLabel: versionSuffix,
    },
    currentVersionId: `${id}-version-${versionSuffix}`,
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

function cloneModel(model: DraftingModel): DraftingModel {
  return JSON.parse(JSON.stringify(model)) as DraftingModel;
}
