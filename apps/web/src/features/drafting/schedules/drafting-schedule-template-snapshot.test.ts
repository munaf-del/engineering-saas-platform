import { describe, expect, it } from 'vitest';
import { createGenericTemplateDocument } from '@/features/templates/core/generic-template-document';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import { createDraftingScheduleSheetDefinition } from './drafting-schedule-sheet-definition-utils';
import {
  buildDraftingScheduleSheetTemplateSnapshotMap,
  resolveDraftingScheduleSheetTemplateDrift,
  resolveDraftingScheduleSheetTemplateState,
} from './drafting-schedule-template-snapshot';

describe('drafting schedule template snapshots', () => {
  it('builds a locked snapshot from the current bound root sheet template version', () => {
    const template = createGenericTemplateDocument({
      name: 'QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const definition = {
      ...createDraftingScheduleSheetDefinition({
        id: 'sheet-1',
        includedScheduleGroups: ['anchors'],
        name: 'Sheet 1',
      }),
      orientation: 'portrait' as const,
      pageSize: 'a4' as const,
      rootSheetTemplateId: 'root-template-1',
      templateId: 'root-template-1',
    };

    const state = resolveDraftingScheduleSheetTemplateState(
      definition,
      new Map([
        ['root-template-1', buildRootSheetTemplateRecord('root-template-1', 'QA template', template)],
      ]),
    );

    expect(state.warning).toBeNull();
    expect(state.snapshot).toMatchObject({
      label: 'QA template',
      rootSheetTemplateId: 'root-template-1',
      rootSheetTemplateVersionId: 'root-template-1-version-1',
      source: 'root_template',
    });
    expect(state.snapshot.templateFingerprint).toMatch(/^fnv1a-/);
    expect(state.snapshot.safeArea.width).toBeGreaterThan(0);
    expect(state.snapshot.scheduleRegion.height).toBeGreaterThan(0);
  });

  it('builds a snapshot map for all saved sheet definitions', () => {
    const template = createGenericTemplateDocument({
      name: 'QA template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const definitions = [
      {
        ...createDraftingScheduleSheetDefinition({
          id: 'sheet-live',
          includedScheduleGroups: ['anchors'],
          name: 'Bound Sheet',
        }),
        rootSheetTemplateId: 'root-template-1',
        templateId: 'root-template-1',
      },
      createDraftingScheduleSheetDefinition({
        id: 'sheet-default',
        includedScheduleGroups: ['boreholes'],
        name: 'Default Sheet',
      }),
    ];

    const snapshotMap = buildDraftingScheduleSheetTemplateSnapshotMap(
      definitions,
      new Map([
        ['root-template-1', buildRootSheetTemplateRecord('root-template-1', 'QA template', template)],
      ]),
    );

    expect(snapshotMap['sheet-live']).toMatchObject({
      rootSheetTemplateId: 'root-template-1',
      source: 'root_template',
    });
    expect(snapshotMap['sheet-default']).toMatchObject({
      label: 'Default drafting schedule sheet',
      source: 'default_layout',
    });
  });

  it('detects drift when the live template binding changes after issue', () => {
    const lockedTemplate = createGenericTemplateDocument({
      name: 'Locked template',
      orientation: 'portrait',
      paperSize: 'a4',
      presetId: 'as1100_inspired',
    });
    const currentTemplate = createGenericTemplateDocument({
      name: 'Current template',
      orientation: 'landscape',
      paperSize: 'a2',
      presetId: 'as1100_inspired',
    });
    const lockedDefinition = {
      ...createDraftingScheduleSheetDefinition({
        id: 'sheet-1',
        includedScheduleGroups: ['anchors'],
        name: 'Sheet 1',
      }),
      orientation: 'portrait' as const,
      pageSize: 'a4' as const,
      rootSheetTemplateId: 'root-template-1',
      templateId: 'root-template-1',
      templateSnapshot: resolveDraftingScheduleSheetTemplateState(
        {
          ...createDraftingScheduleSheetDefinition({
            id: 'sheet-1',
            includedScheduleGroups: ['anchors'],
            name: 'Sheet 1',
          }),
          orientation: 'portrait' as const,
          pageSize: 'a4' as const,
          rootSheetTemplateId: 'root-template-1',
          templateId: 'root-template-1',
        },
        new Map([
          [
            'root-template-1',
            buildRootSheetTemplateRecord('root-template-1', 'Locked template', lockedTemplate),
          ],
        ]),
      ).snapshot,
    };
    const liveDefinition = {
      ...createDraftingScheduleSheetDefinition({
        id: 'sheet-1',
        includedScheduleGroups: ['anchors'],
        name: 'Sheet 1',
      }),
      orientation: 'landscape' as const,
      pageSize: 'a2' as const,
      rootSheetTemplateId: 'root-template-1',
      templateId: 'root-template-1',
    };

    const drift = resolveDraftingScheduleSheetTemplateDrift({
      liveDefinition,
      lockedDefinition,
      rootTemplatesById: new Map([
        [
          'root-template-1',
          buildRootSheetTemplateRecord('root-template-1', 'Current template', currentTemplate),
        ],
      ]),
    });

    expect(drift.hasDrift).toBe(true);
    expect(drift.messages.join(' ')).toContain('A2 landscape / compact');
  });

  it('treats missing locked template snapshots as legacy-compatible', () => {
    const drift = resolveDraftingScheduleSheetTemplateDrift({
      liveDefinition: null,
      lockedDefinition: createDraftingScheduleSheetDefinition({
        id: 'sheet-legacy',
        includedScheduleGroups: ['anchors'],
        name: 'Legacy sheet',
      }),
      rootTemplatesById: new Map(),
    });

    expect(drift.hasDrift).toBe(false);
    expect(drift.isLegacySnapshot).toBe(true);
    expect(drift.messages[0]).toContain('Legacy issued pack');
  });
});

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
