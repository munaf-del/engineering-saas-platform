import { describe, expect, it } from 'vitest';
import {
  createEmptyDraftingModel,
  type DraftingModel,
  type DraftingSchedulePackIssue,
} from '@eng/shared';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import { createGenericTemplateDocument } from '@/features/templates/core/generic-template-document';
import {
  createDraftingObject,
  recordDraftingObjectChangeEvent,
  translateDraftingObject,
} from '../model-utils';
import { createDraftingSchedulePackIssueSnapshot } from './drafting-schedule-pack-issue-utils';
import {
  buildDraftingSchedulePackIssueRowComparison,
  buildDraftingSchedulePackIssueDetail,
  buildDraftingSchedulePackIssueHistoryRows,
  buildDraftingSchedulePackIssueManifest,
  deriveDraftingScheduleRowKey,
  serializeDraftingSchedulePackIssueManifestJson,
} from './drafting-schedule-pack-issue-provenance';
import { createDraftingScheduleSheetDefinition } from './drafting-schedule-sheet-definition-utils';
import { buildDraftingScheduleSheetTemplateSnapshotMap } from './drafting-schedule-template-snapshot';
import { buildDraftingScheduleSummary } from './drafting-schedule-utils';

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
          buildRootSheetTemplateRecord(
            'root-template-1',
            'Current QA template',
            currentTemplate,
            '2',
          ),
        ],
      ]),
      lockedRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord(
            'root-template-1',
            'Locked QA template',
            lockedTemplate,
            '1',
          ),
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
          buildRootSheetTemplateRecord(
            'root-template-1',
            'Current QA template',
            currentTemplate,
            '2',
          ),
        ],
      ]),
      lockedRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord(
            'root-template-1',
            'Locked QA template',
            lockedTemplate,
            '1',
          ),
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
        buildRootSheetTemplateRecord(
          'root-template-1',
          'Current QA template',
          currentTemplate,
          '2',
        ),
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
    mixedDriftModel.objects = [
      ...mixedDriftModel.objects,
      buildAnchorObject(mixedDriftModel, 'A2'),
    ];
    const mixedDrift = buildDraftingSchedulePackIssueDetail({
      issue: base.issue,
      model: mixedDriftModel,
      rootTemplatesById: currentRootTemplatesById,
    });
    expect(mixedDrift.comparison.driftState).toBe('mixed_drift');
  });

  it('derives stable row keys from semantic ids before deterministic fallbacks', () => {
    const semantic = {
      id: 'object-1',
      sourceObjectId: 'object-1',
      objectType: 'anchor_tieback' as const,
      cells: {
        anchorId: 'A-101',
      },
    };
    const fallback = {
      id: '',
      sourceObjectId: '',
      objectType: 'leader_note' as const,
      cells: {
        titleOrText: 'Temporary note',
      },
    };

    expect(
      deriveDraftingScheduleRowKey({
        groupKey: 'anchors',
        index: 0,
        row: semantic,
      }),
    ).toEqual({
      keySource: 'semantic_id',
      label: 'A-101',
      rowKey: 'anchors:anchor_tieback:a-101',
    });
    expect(
      deriveDraftingScheduleRowKey({
        groupKey: 'annotations_references',
        index: 2,
        row: fallback,
      }),
    ).toEqual({
      keySource: 'deterministic_fallback',
      label: 'Temporary note',
      rowKey: 'annotations_references:leader_note:leader_note:temporary note:3:2',
    });
  });

  it('derives group row diffs for added, removed, changed, and unchanged rows', () => {
    const issuedModel = createEmptyDraftingModel('drawing-row-diff');
    const unchangedAnchor = buildAnchorObject(issuedModel, 'A1');
    unchangedAnchor.parameters.designLoadKn = 350;
    const changedAnchor = buildAnchorObject(issuedModel, 'A2');
    changedAnchor.parameters.designLoadKn = 400;
    const removedPile = buildPileObject(issuedModel, 'P1');
    const issuedNote = buildLeaderNoteObject(issuedModel, 'note-1', 'Issued reference note');
    issuedModel.objects = [unchangedAnchor, changedAnchor, removedPile, issuedNote].map(
      (object) => ({
        ...object,
        provenance: {
          createdAt: '2026-04-23T00:00:00.000Z',
          createdBy: 'Issue Drafter',
          updatedAt: '2026-04-23T00:00:00.000Z',
          updatedBy: 'Issue Drafter',
          lastAction: 'created' as const,
        },
      }),
    );

    const liveModel = cloneModel(issuedModel);
    const liveChangedAnchor = liveModel.objects.find(
      (object) => object.type === 'anchor_tieback' && object.parameters.anchorId === 'A2',
    );
    if (!liveChangedAnchor || liveChangedAnchor.type !== 'anchor_tieback') {
      throw new Error('Expected changed anchor');
    }
    liveChangedAnchor.parameters.designLoadKn = 425;
    liveChangedAnchor.provenance = {
      ...liveChangedAnchor.provenance,
      updatedAt: '2026-04-24T00:00:00.000Z',
      updatedBy: 'Avery Drafter',
      lastAction: 'updated',
    };
    liveModel.objects = liveModel.objects.filter(
      (object) => !(object.type === 'pile' && object.metadata.pileId === 'P1'),
    );
    liveModel.objectChangeEvents = [
      {
        id: 'event-delete-p1',
        objectId: removedPile.id,
        objectType: 'pile',
        action: 'deleted',
        at: '2026-04-24T01:00:00.000Z',
        by: 'Avery Drafter',
        summary: 'Deleted pile P1',
        source: 'drafting-editor',
      },
    ];
    liveModel.objects.push({
      ...buildAnchorObject(liveModel, 'A3'),
      provenance: {
        createdAt: '2026-04-24T02:00:00.000Z',
        createdBy: 'Avery Drafter',
        updatedAt: '2026-04-24T02:00:00.000Z',
        updatedBy: 'Avery Drafter',
        lastAction: 'created',
      },
    });

    const rowComparison = buildDraftingSchedulePackIssueRowComparison({
      issue: {
        issuedAt: '2026-04-23T12:00:00.000Z',
        lockedScheduleSummary: cloneScheduleSummary(buildDraftingScheduleSummary(issuedModel)),
      },
      liveModel,
      liveSummary: buildDraftingScheduleSummary(liveModel),
      relevantGroupKeys: ['shoring_piles', 'anchors', 'annotations_references'],
    });
    const anchors = rowComparison.groups.find((group) => group.groupKey === 'anchors');
    const shoring = rowComparison.groups.find((group) => group.groupKey === 'shoring_piles');
    const annotations = rowComparison.groups.find(
      (group) => group.groupKey === 'annotations_references',
    );

    expect(rowComparison).toEqual(
      expect.objectContaining({
        addedRowCount: 1,
        changedRowCount: 1,
        removedRowCount: 1,
        unchangedRowCount: 2,
        knownProvenanceRowCount: 5,
        unknownProvenanceRowCount: 0,
      }),
    );
    expect(anchors?.addedRows[0]).toEqual(
      expect.objectContaining({
        label: 'A3',
        rowKey: 'anchors:anchor_tieback:a3',
        status: 'added',
      }),
    );
    expect(anchors?.addedRows[0]?.provenance).toEqual(
      expect.objectContaining({
        action: 'created_after_issue',
        fallbackMessage: null,
        known: true,
        liveObjectProvenance: expect.objectContaining({
          by: 'Avery Drafter',
          source: 'live_object',
        }),
      }),
    );
    expect(anchors?.changedRows[0]).toEqual(
      expect.objectContaining({
        label: 'A2',
        status: 'changed',
        changedFields: [
          {
            fieldKey: 'designLoad',
            issuedValue: '400 kN',
            label: 'Design Load',
            liveValue: '425 kN',
          },
        ],
      }),
    );
    expect(anchors?.changedRows[0]?.provenance).toEqual(
      expect.objectContaining({
        action: 'changed_after_issue',
        issuedSnapshotProvenance: expect.objectContaining({
          by: 'Issue Drafter',
          source: 'issued_snapshot',
        }),
        liveObjectProvenance: expect.objectContaining({
          by: 'Avery Drafter',
          source: 'live_object',
        }),
      }),
    );
    expect(shoring?.removedRows[0]).toEqual(
      expect.objectContaining({
        label: 'P1',
        status: 'removed',
      }),
    );
    expect(shoring?.removedRows[0]?.provenance).toEqual(
      expect.objectContaining({
        action: 'removed_after_issue',
        removalProvenance: expect.objectContaining({
          by: 'Avery Drafter',
          source: 'object_change_log',
        }),
      }),
    );
    expect(annotations?.unchangedRowCount).toBe(1);
  });

  it('reports legacy and empty locked row states without fabricating row diffs', () => {
    const liveModel = createEmptyDraftingModel('drawing-row-legacy');
    liveModel.objects = [buildAnchorObject(liveModel, 'A-live')];

    const legacy = buildDraftingSchedulePackIssueRowComparison({
      issue: {
        lockedScheduleSummary: {
          counts: { anchors: 1 },
          drawingId: liveModel.drawingId,
          groups: [],
          units: 'mm',
        },
      },
      liveSummary: buildDraftingScheduleSummary(liveModel),
      relevantGroupKeys: ['anchors'],
    });
    const empty = buildDraftingSchedulePackIssueRowComparison({
      issue: {
        lockedScheduleSummary: {
          counts: { anchors: 0 },
          drawingId: liveModel.drawingId,
          groups: [],
          units: 'mm',
        },
      },
      liveSummary: {
        ...buildDraftingScheduleSummary(liveModel),
        counts: { ...buildDraftingScheduleSummary(liveModel).counts, anchors: 0 },
        groups: buildDraftingScheduleSummary(liveModel).groups.map((group) =>
          group.key === 'anchors' ? { ...group, rows: [] } : group,
        ),
      },
      relevantGroupKeys: ['anchors'],
    });

    expect(legacy.emptyState).toBe('Legacy snapshot does not contain row-level schedule data');
    expect(legacy.addedRowCount).toBe(0);
    expect(legacy.groups[0]?.legacySnapshotMissingRowData).toBe(true);
    expect(legacy.unknownProvenanceRowCount).toBe(0);
    expect(empty.emptyState).toBe('No locked schedule rows in this snapshot');
  });

  it('labels removed rows with an unavailable deletion author when no change log is available', () => {
    const issuedModel = createEmptyDraftingModel('drawing-row-removed-fallback');
    const removedPile = buildPileObject(issuedModel, 'P1');
    issuedModel.objects = [removedPile];

    const rowComparison = buildDraftingSchedulePackIssueRowComparison({
      issue: {
        lockedScheduleSummary: cloneScheduleSummary(buildDraftingScheduleSummary(issuedModel)),
      },
      liveModel: createEmptyDraftingModel('drawing-row-removed-fallback'),
      liveSummary: buildDraftingScheduleSummary(
        createEmptyDraftingModel('drawing-row-removed-fallback'),
      ),
      relevantGroupKeys: ['shoring_piles'],
    });

    expect(rowComparison.groups[0]?.removedRows[0]?.provenance).toEqual(
      expect.objectContaining({
        action: 'removed_after_issue',
        fallbackMessage: 'Removed from live model; deletion author unavailable',
      }),
    );
  });

  it('carries moved object provenance in row details and manifest export', () => {
    const issuedModel = createEmptyDraftingModel('drawing-row-moved');
    const issuedAnchor = buildAnchorObject(issuedModel, 'A1');
    issuedAnchor.provenance = {
      createdAt: '2026-04-23T00:00:00.000Z',
      createdBy: 'Issue Drafter',
      updatedAt: '2026-04-23T00:00:00.000Z',
      updatedBy: 'Issue Drafter',
      lastAction: 'created',
    };
    issuedModel.objects = [issuedAnchor];

    const movedAnchor = translateDraftingObject(issuedAnchor, 500, 0, {
      by: 'Avery Drafter',
    });
    const liveModel = recordDraftingObjectChangeEvent(
      {
        ...cloneModel(issuedModel),
        objects: [movedAnchor],
      },
      movedAnchor,
      {
        action: 'moved',
        at: '2026-04-24T00:00:00.000Z',
        by: 'Avery Drafter',
      },
    );

    const rowComparison = buildDraftingSchedulePackIssueRowComparison({
      issue: {
        lockedScheduleSummary: cloneScheduleSummary(buildDraftingScheduleSummary(issuedModel)),
      },
      liveModel,
      liveSummary: buildDraftingScheduleSummary(liveModel),
      relevantGroupKeys: ['anchors'],
    });
    const unchangedRow = rowComparison.groups[0]?.unchangedRows[0];

    expect(unchangedRow?.provenance.liveObjectProvenance).toEqual(
      expect.objectContaining({
        by: 'Avery Drafter',
        lastAction: 'moved',
        source: 'live_object',
      }),
    );
    expect(
      JSON.parse(
        serializeDraftingSchedulePackIssueManifestJson({
          comparison: {
            driftMessages: [],
            driftState: 'row_summary_drift',
            groupCounts: [],
            hasRowSummaryDrift: true,
            hasSheetDefinitionDrift: false,
            hasTemplateDrift: false,
            pageCount: { difference: 0, issued: 0, live: 0 },
            rowComparison,
            rowCount: { difference: 0, issued: 1, live: 1 },
            sheetCount: { difference: 0, issued: 0, live: 0 },
          },
          drawingMetadata: {
            clientName: null,
            currentRevision: null,
            currentRevisionRow: null,
            drawingNumber: null,
            drawingTitle: null,
            titleBlock: {},
          },
          driftStatus: 'row_summary_drift',
          issueId: 'issue-moved',
          issueName: 'Moved Issue',
          issuePurpose: 'For review',
          issueStatus: 'issued',
          issuedAt: null,
          issuedBy: null,
          legacy: false,
          lockedScheduleGroupCounts: [],
          notes: null,
          pageCount: 0,
          revisionLabel: 'A',
          selectedSheetDefinitions: [],
          snapshotStatus: 'locked_template_snapshot',
        }),
      ).comparison.rowComparison.groups[0].unchangedRows[0].provenance.liveObjectProvenance,
    ).toEqual(
      expect.objectContaining({
        lastAction: 'moved',
        source: 'live_object',
      }),
    );
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
    expect(detail.legacyWarning).toContain(
      'Legacy issue snapshot created before template snapshot locking',
    );
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
          buildRootSheetTemplateRecord(
            'root-template-1',
            'Locked QA template',
            lockedTemplate,
            '1',
          ),
        ],
      ]),
      lockedRootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord(
            'root-template-1',
            'Locked QA template',
            lockedTemplate,
            '1',
          ),
        ],
      ]),
    });
    base.model.titleBlock = {
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Wall General Arrangement',
    };
    base.model.revisionBlock = {
      currentRevision: 'B',
      revisions: [
        {
          approvedBy: 'Approver',
          checkedBy: 'Checker',
          date: '2026-04-24',
          description: 'Drawing metadata revision',
          drawnBy: 'Drafter',
          id: 'revision-b',
          issuedFor: 'Review',
          revision: 'B',
          status: 'for_review',
        },
      ],
    };

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
        drawingMetadata: expect.objectContaining({
          currentRevision: 'B',
          drawingNumber: 'S-1001',
          drawingTitle: 'Retention Wall General Arrangement',
        }),
        pageCount: 1,
        revisionLabel: 'A',
        snapshotStatus: 'locked_template_snapshot',
      }),
    );
    expect(exported).toContain('"selectedSheetDefinitions"');
    expect(exported).toContain('"lockedScheduleGroupCounts"');
    expect(exported).toContain('"rowComparison"');
    expect(JSON.parse(exported).comparison.rowComparison.groups[0]).toEqual(
      expect.objectContaining({
        groupKey: 'anchors',
        knownProvenanceRowCount: 1,
        unchangedRowCount: 1,
      }),
    );
    expect(JSON.parse(exported).comparison.rowComparison.groups[0].rows[0].provenance).toEqual(
      expect.objectContaining({
        action: 'unchanged_since_issue',
        issuedSnapshotProvenance: expect.objectContaining({
          source: 'issued_snapshot',
        }),
        liveObjectProvenance: expect.objectContaining({
          source: 'live_object',
        }),
      }),
    );
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

function buildPileObject(model: DraftingModel, pileId: string) {
  const pile = createDraftingObject('pile', { x: 500, y: 800 }, model);
  if (pile.type !== 'pile') {
    throw new Error('Expected pile');
  }
  pile.metadata.pileId = pileId;
  return pile;
}

function buildLeaderNoteObject(model: DraftingModel, id: string, text: string) {
  const note = createDraftingObject('leader_note', { x: 1200, y: 2200 }, model);
  if (note.type !== 'leader_note') {
    throw new Error('Expected leader note');
  }
  note.id = id;
  note.metadata.text = text;
  return note;
}

function cloneScheduleSummary(
  summary: ReturnType<typeof buildDraftingScheduleSummary>,
): DraftingSchedulePackIssue['lockedScheduleSummary'] {
  return {
    counts: { ...summary.counts },
    drawingId: summary.drawingId,
    groups: summary.groups.map((group) => ({
      columns: group.columns.map((column) => ({ ...column })),
      description: group.description,
      key: group.key,
      rows: group.rows.map((row) => ({
        cells: { ...row.cells },
        id: row.id,
        objectType: row.objectType,
        provenance: row.provenance ? { ...row.provenance } : undefined,
        sourceObjectId: row.sourceObjectId,
      })),
      title: group.title,
    })),
    units: summary.units,
  };
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
