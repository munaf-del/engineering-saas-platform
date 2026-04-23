import type {
  DraftingLockedScheduleSheetDefinition,
  DraftingScheduleSheetDefinition,
  DraftingScheduleSheetTemplateSnapshot,
} from '@eng/shared';
import { adaptGenericTemplateToSharedDefinition } from '@/features/templates/adapters/generic-template-render-model';
import type { GenericTemplateDocument } from '@/features/templates/core/generic-template-document';
import type { SharedSheetDefinition } from '@/features/templates/core/shared-sheet-schema';
import {
  coerceRootSheetTemplateDocument,
  type RootSheetTemplate,
} from '@/features/templates/root-sheet-template-types';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import { getScheduleSheetRootTemplateId } from './drafting-schedule-sheet-definition-utils';
import {
  buildDefaultDraftingScheduleSheetBaseDefinition,
  buildDraftingScheduleSafeAreaSnapshot,
  resolveDraftingScheduleRegion,
  toTemplateRectSnapshot,
} from './drafting-schedule-sheet-layout';

export type DraftingResolvedScheduleSheetTemplateSource = {
  definition: SharedSheetDefinition;
  label: string;
  template: GenericTemplateDocument | null;
};

export type DraftingResolvedScheduleSheetTemplateState = {
  snapshot: DraftingScheduleSheetTemplateSnapshot;
  templateSource: DraftingResolvedScheduleSheetTemplateSource;
  warning: string | null;
};

export type DraftingScheduleSheetTemplateDrift = {
  hasDrift: boolean;
  isLegacySnapshot: boolean;
  liveSnapshot: DraftingScheduleSheetTemplateSnapshot | null;
  messages: string[];
};

export function resolveDraftingScheduleSheetTemplateState(
  definition: DraftingScheduleSheetDefinition,
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>,
): DraftingResolvedScheduleSheetTemplateState {
  const rootSheetTemplateId = getScheduleSheetRootTemplateId(definition);
  if (!rootSheetTemplateId) {
    return buildResolvedTemplateState({
      definition,
      effectiveLabel: 'Default drafting schedule sheet',
      renderDefinition: buildDefaultDraftingScheduleSheetBaseDefinition(definition),
      source: 'default_layout',
      template: null,
      warning: null,
    });
  }

  const rootTemplate = rootTemplatesById.get(rootSheetTemplateId);
  if (!rootTemplate) {
    return buildResolvedTemplateState({
      definition,
      effectiveLabel: 'Default drafting schedule sheet',
      renderDefinition: buildDefaultDraftingScheduleSheetBaseDefinition(definition),
      rootSheetTemplateId,
      source: 'missing_template_fallback',
      template: null,
      warning:
        'The bound root sheet template is missing. The preview will use the internal default layout.',
    });
  }

  const rootSheetTemplateName = formatOperatorFacingSheetLabel(rootTemplate.label);
  if (!rootTemplate.currentVersion) {
    return buildResolvedTemplateState({
      definition,
      effectiveLabel: 'Default drafting schedule sheet',
      renderDefinition: buildDefaultDraftingScheduleSheetBaseDefinition(definition),
      rootSheetTemplateId,
      rootSheetTemplateName,
      source: 'incompatible_template_fallback',
      template: null,
      warning:
        'The bound root sheet template has no current version. The preview will use the internal default layout.',
    });
  }

  const document = coerceRootSheetTemplateDocument(rootTemplate);
  if (!document) {
    return buildResolvedTemplateState({
      definition,
      effectiveLabel: 'Default drafting schedule sheet',
      renderDefinition: buildDefaultDraftingScheduleSheetBaseDefinition(definition),
      rootSheetTemplateId,
      rootSheetTemplateName,
      rootSheetTemplateVersionId: rootTemplate.currentVersion.id,
      source: 'incompatible_template_fallback',
      template: null,
      warning:
        'The bound root sheet template definition is incompatible. The preview will use the internal default layout.',
    });
  }

  return buildResolvedTemplateState({
    definition,
    effectiveLabel: rootSheetTemplateName,
    renderDefinition: adaptGenericTemplateToSharedDefinition(document),
    rootSheetTemplateId,
    rootSheetTemplateName,
    rootSheetTemplateVersionId: rootTemplate.currentVersion.id,
    source: 'root_template',
    template: document,
    warning: null,
  });
}

export function buildDraftingScheduleSheetTemplateSnapshotMap(
  definitions: DraftingScheduleSheetDefinition[],
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>,
): Record<string, DraftingScheduleSheetTemplateSnapshot> {
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.id,
      resolveDraftingScheduleSheetTemplateState(definition, rootTemplatesById).snapshot,
    ]),
  );
}

export function buildDraftingLockedTemplateSource(
  snapshot: DraftingScheduleSheetTemplateSnapshot | null | undefined,
): DraftingResolvedScheduleSheetTemplateSource | null {
  if (!snapshot) {
    return null;
  }

  const definition = coerceSharedSheetDefinition(snapshot.renderDefinition);
  if (!definition) {
    return null;
  }

  return {
    definition,
    label: snapshot.label,
    template: null,
  };
}

export function resolveDraftingScheduleSheetTemplateDrift({
  lockedDefinition,
  liveDefinition,
  rootTemplatesById,
}: {
  lockedDefinition: DraftingLockedScheduleSheetDefinition;
  liveDefinition: DraftingScheduleSheetDefinition | null;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
}): DraftingScheduleSheetTemplateDrift {
  const lockedSnapshot = lockedDefinition.templateSnapshot ?? null;
  if (!lockedSnapshot) {
    return {
      hasDrift: false,
      isLegacySnapshot: true,
      liveSnapshot: liveDefinition
        ? resolveDraftingScheduleSheetTemplateState(liveDefinition, rootTemplatesById).snapshot
        : null,
      messages: ['Legacy issued pack without a locked template snapshot.'],
    };
  }

  if (!liveDefinition) {
    return {
      hasDrift: true,
      isLegacySnapshot: false,
      liveSnapshot: null,
      messages: ['Live sheet definition is no longer available.'],
    };
  }

  const liveState = resolveDraftingScheduleSheetTemplateState(liveDefinition, rootTemplatesById);
  const liveSnapshot = liveState.snapshot;
  const messages: string[] = [];
  const lockedBindingLabel = getTemplateBindingLabel(lockedSnapshot);
  const liveBindingLabel = getTemplateBindingLabel(liveSnapshot);

  if (
    (getScheduleSheetRootTemplateId(liveDefinition) ?? null) !==
      (lockedSnapshot.rootSheetTemplateId ?? null) ||
    liveSnapshot.source !== lockedSnapshot.source
  ) {
    messages.push(
      `Live pack now resolves ${liveBindingLabel} instead of issued ${lockedBindingLabel}.`,
    );
  }

  if (
    liveSnapshot.source === 'root_template' &&
    lockedSnapshot.source === 'root_template' &&
    (liveSnapshot.rootSheetTemplateVersionId ?? null) !==
      (lockedSnapshot.rootSheetTemplateVersionId ?? null)
  ) {
    messages.push('Live pack now resolves a different root sheet template version.');
  }

  if (
    liveDefinition.pageSize !== lockedDefinition.pageSize ||
    liveDefinition.orientation !== lockedDefinition.orientation ||
    liveDefinition.tableDensity !== lockedDefinition.tableDensity
  ) {
    messages.push(
      `Live pack now uses ${formatSheetLayoutSummary(liveDefinition)} instead of issued ${formatSheetLayoutSummary(lockedDefinition)}.`,
    );
  }

  if (
    liveSnapshot.templateFingerprint !== lockedSnapshot.templateFingerprint &&
    messages.length === 0
  ) {
    messages.push('Live pack render configuration differs from the issued template snapshot.');
  }

  return {
    hasDrift: messages.length > 0,
    isLegacySnapshot: false,
    liveSnapshot,
    messages,
  };
}

export function formatSheetLayoutSummary(
  definition: Pick<DraftingScheduleSheetDefinition, 'orientation' | 'pageSize' | 'tableDensity'>,
) {
  return `${definition.pageSize.toUpperCase()} ${definition.orientation} / ${definition.tableDensity}`;
}

function buildResolvedTemplateState(args: {
  definition: DraftingScheduleSheetDefinition;
  effectiveLabel: string;
  renderDefinition: SharedSheetDefinition;
  rootSheetTemplateId?: string | null;
  rootSheetTemplateName?: string | null;
  rootSheetTemplateVersionId?: string | null;
  source: DraftingScheduleSheetTemplateSnapshot['source'];
  template: GenericTemplateDocument | null;
  warning: string | null;
}) {
  const scheduleRegion = resolveDraftingScheduleRegion(args.renderDefinition);
  const snapshot: DraftingScheduleSheetTemplateSnapshot = {
    label: args.effectiveLabel,
    ...(args.rootSheetTemplateId ? { rootSheetTemplateId: args.rootSheetTemplateId } : {}),
    ...(args.rootSheetTemplateName ? { rootSheetTemplateName: args.rootSheetTemplateName } : {}),
    ...(args.rootSheetTemplateVersionId
      ? { rootSheetTemplateVersionId: args.rootSheetTemplateVersionId }
      : {}),
    renderDefinition: args.renderDefinition as unknown as Record<string, unknown>,
    safeArea: buildDraftingScheduleSafeAreaSnapshot(args.renderDefinition),
    scheduleRegion: {
      ...toTemplateRectSnapshot(scheduleRegion),
      ...(scheduleRegion.sourceBlockId ? { sourceBlockId: scheduleRegion.sourceBlockId } : {}),
    },
    source: args.source,
    templateFingerprint: computeTemplateFingerprint({
      pageSize: args.definition.pageSize,
      orientation: args.definition.orientation,
      renderDefinition: args.renderDefinition,
      rootSheetTemplateId: args.rootSheetTemplateId ?? null,
      rootSheetTemplateVersionId: args.rootSheetTemplateVersionId ?? null,
      source: args.source,
      tableDensity: args.definition.tableDensity,
    }),
  };

  return {
    snapshot,
    templateSource: {
      definition: args.renderDefinition,
      label: args.effectiveLabel,
      template: args.template,
    },
    warning: args.warning,
  };
}

function getTemplateBindingLabel(snapshot: DraftingScheduleSheetTemplateSnapshot) {
  return snapshot.rootSheetTemplateName ?? snapshot.label;
}

function computeTemplateFingerprint(value: {
  orientation: DraftingScheduleSheetDefinition['orientation'];
  pageSize: DraftingScheduleSheetDefinition['pageSize'];
  renderDefinition: SharedSheetDefinition;
  rootSheetTemplateId: string | null;
  rootSheetTemplateVersionId: string | null;
  source: DraftingScheduleSheetTemplateSnapshot['source'];
  tableDensity: DraftingScheduleSheetDefinition['tableDensity'];
}) {
  const serialized = stableSerialize(value);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function coerceSharedSheetDefinition(value: Record<string, unknown>) {
  const candidate = value as Partial<SharedSheetDefinition>;

  if (
    candidate.kind !== 'shared_sheet' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    !Array.isArray(candidate.objects) ||
    typeof candidate.paperSize !== 'string' ||
    typeof candidate.orientation !== 'string' ||
    typeof candidate.presetId !== 'string' ||
    typeof candidate.source !== 'string' ||
    !candidate.chromeStyle ||
    typeof candidate.chromeStyle !== 'object'
  ) {
    return null;
  }

  return candidate as SharedSheetDefinition;
}
