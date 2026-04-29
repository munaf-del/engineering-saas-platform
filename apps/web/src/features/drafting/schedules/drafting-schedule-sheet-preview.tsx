'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import type { DraftingDrawing, Project } from '@eng/shared';
import { PageLoading } from '@/components/loading';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDraftingDrawing } from '@/hooks/use-drafting';
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import {
  coerceRootSheetTemplateDocument,
  type RootSheetTemplate,
} from '@/features/templates/root-sheet-template-types';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import { SharedSheetRenderer } from '@/features/templates/components/shared-sheet-renderer';
import {
  DRAFTING_SCHEDULE_ALL_GROUPS,
  buildDraftingScheduleSheetPackFromSnapshot,
  buildDraftingScheduleSheetPack,
  buildDraftingScheduleSheetRenderModel,
  getDraftingScheduleSheetPaper,
  type DraftingScheduleSheetGroupSelection,
  type DraftingScheduleSheetMetadata,
  type DraftingScheduleSheetPack,
  type DraftingScheduleSheetTemplateSource,
} from './drafting-schedule-sheet';
import {
  createDraftingScheduleSheetDefinition,
  getOrderedScheduleSheetDefinitions,
  getScheduleSheetRootTemplateId,
} from './drafting-schedule-sheet-definition-utils';
import { getOrderedSchedulePackIssues } from './drafting-schedule-pack-issue-utils';
import {
  formatSheetLayoutSummary,
  resolveDraftingScheduleSheetTemplateDrift,
  resolveDraftingScheduleSheetTemplateState,
} from './drafting-schedule-template-snapshot';
import { DRAFTING_SCHEDULE_GROUP_DEFINITIONS } from './drafting-schedule-utils';
import {
  formatDrawingRevision,
  formatDraftingTimestamp,
  getDraftingCurrentRevisionLabel,
  getDraftingDrawingTitle,
} from '../model-utils';

const DEFAULT_TEMPLATE_VALUE = 'default';

export type DraftingSchedulePreviewMode = 'issue' | 'legacy' | 'pack' | 'sheet';

export function DraftingScheduleSheetPreviewPage({
  drawingId,
  initialMode = 'legacy',
  initialIssueId,
  initialSheetId,
  project,
  projectId,
}: {
  drawingId: string;
  initialMode?: DraftingSchedulePreviewMode;
  initialIssueId?: string;
  initialSheetId?: string;
  project: Project;
  projectId: string;
}) {
  const { data: drawing, isLoading: drawingLoading } = useDraftingDrawing(projectId, drawingId);
  const { data: rootTemplates = [], isLoading: templatesLoading } = useRootSheetTemplates();
  const [groupSelection, setGroupSelection] = React.useState<DraftingScheduleSheetGroupSelection>(
    DRAFTING_SCHEDULE_ALL_GROUPS,
  );
  const [templateValue, setTemplateValue] = React.useState(DEFAULT_TEMPLATE_VALUE);
  const [previewMode, setPreviewMode] = React.useState<DraftingSchedulePreviewMode>(initialMode);
  const [selectedIssueId, setSelectedIssueId] = React.useState(initialIssueId ?? '');
  const [selectedSheetId, setSelectedSheetId] = React.useState(initialSheetId ?? '');
  const rootTemplatesById = React.useMemo(
    () => new Map(rootTemplates.map((template) => [template.id, template] as const)),
    [rootTemplates],
  );
  const templateOptions = React.useMemo(
    () =>
      rootTemplates
        .map((template) => {
          const document = coerceRootSheetTemplateDocument(template);
          if (!document || !template.currentVersion) {
            return null;
          }

          return {
            label: `${formatOperatorFacingSheetLabel(template.label)} - ${document.paperSize.toUpperCase()} ${document.orientation}`,
            source: {
              label: formatOperatorFacingSheetLabel(template.label),
              template: document,
            } satisfies DraftingScheduleSheetTemplateSource,
            value: template.id,
          };
        })
        .filter((option): option is NonNullable<typeof option> => option !== null),
    [rootTemplates],
  );
  const templateBindingWarningsById = React.useMemo(
    () =>
      Object.fromEntries(
        rootTemplates.flatMap((template) => {
          if (!template.currentVersion) {
            return [[template.id, 'The bound root sheet template has no current version.']];
          }

          if (!coerceRootSheetTemplateDocument(template)) {
            return [[template.id, 'The bound root sheet template definition is incompatible.']];
          }

          return [];
        }),
      ) as Record<string, string>,
    [rootTemplates],
  );
  const selectedTemplateSource = React.useMemo(() => {
    if (templateValue === DEFAULT_TEMPLATE_VALUE) {
      return {
        label: 'Default drafting schedule sheet',
        template: null,
      } satisfies DraftingScheduleSheetTemplateSource;
    }

    return (
      templateOptions.find((option) => option.value === templateValue)?.source ?? {
        label: 'Default drafting schedule sheet',
        template: null,
      }
    );
  }, [templateOptions, templateValue]);

  if (drawingLoading || templatesLoading || !drawing) {
    return <PageLoading />;
  }

  return (
    <DraftingScheduleSheetPreview
      drawing={drawing}
      groupSelection={groupSelection}
      onGroupSelectionChange={setGroupSelection}
      onModeChange={setPreviewMode}
      onSelectedIssueIdChange={setSelectedIssueId}
      onSelectedSheetIdChange={setSelectedSheetId}
      onTemplateValueChange={setTemplateValue}
      previewMode={previewMode}
      project={project}
      projectId={projectId}
      rootTemplatesById={rootTemplatesById}
      selectedIssueId={selectedIssueId}
      selectedSheetId={selectedSheetId}
      selectedTemplateSource={selectedTemplateSource}
      templateBindingWarningsById={templateBindingWarningsById}
      templateOptions={templateOptions}
      templateValue={templateValue}
    />
  );
}

export function DraftingScheduleSheetPreview({
  drawing,
  groupSelection,
  onGroupSelectionChange,
  onModeChange,
  onSelectedIssueIdChange,
  onSelectedSheetIdChange,
  onTemplateValueChange,
  previewMode,
  project,
  projectId,
  rootTemplatesById,
  selectedIssueId,
  selectedSheetId,
  selectedTemplateSource,
  templateBindingWarningsById,
  templateOptions,
  templateValue,
}: {
  drawing: DraftingDrawing;
  groupSelection: DraftingScheduleSheetGroupSelection;
  onGroupSelectionChange: (selection: DraftingScheduleSheetGroupSelection) => void;
  onModeChange: (mode: DraftingSchedulePreviewMode) => void;
  onSelectedIssueIdChange: (issueId: string) => void;
  onSelectedSheetIdChange: (sheetId: string) => void;
  onTemplateValueChange: (value: string) => void;
  previewMode: DraftingSchedulePreviewMode;
  project: Project;
  projectId: string;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
  selectedIssueId: string;
  selectedSheetId: string;
  selectedTemplateSource: DraftingScheduleSheetTemplateSource;
  templateBindingWarningsById: Record<string, string>;
  templateOptions: Array<{
    label: string;
    source: DraftingScheduleSheetTemplateSource;
    value: string;
  }>;
  templateValue: string;
}) {
  const savedDefinitions = React.useMemo(
    () => getOrderedScheduleSheetDefinitions(drawing.model),
    [drawing.model],
  );
  const savedIssues = React.useMemo(
    () => getOrderedSchedulePackIssues(drawing.model),
    [drawing.model],
  );
  const selectedDefinition =
    savedDefinitions.find((definition) => definition.id === selectedSheetId) ??
    savedDefinitions[0] ??
    null;
  const selectedIssue =
    savedIssues.find((issue) => issue.id === selectedIssueId) ?? savedIssues[0] ?? null;
  const templateSourcesById = React.useMemo(
    () =>
      Object.fromEntries(
        templateOptions.map((option) => [option.value, option.source] as const),
      ) as Record<string, DraftingScheduleSheetTemplateSource>,
    [templateOptions],
  );
  const metadata = React.useMemo<DraftingScheduleSheetMetadata>(() => {
    const drawingRevision =
      getDraftingCurrentRevisionLabel(drawing.model) ?? formatDrawingRevision(drawing);

    return {
      checkedBy: drawing.model.titleBlock?.checkedBy,
      clientName: drawing.model.titleBlock?.clientName,
      drawingId: drawing.id,
      drawingNumber: drawing.model.titleBlock?.drawingNumber,
      drawingRevision,
      drawingStatus: drawing.status,
      drawingTitle: getDraftingDrawingTitle(drawing.model, drawing.title),
      generatedAtLabel: `Updated ${formatDraftingTimestamp(drawing.updatedAt)}`,
      projectCode: project.code,
      projectName: drawing.model.titleBlock?.projectName ?? project.name,
      revision: drawingRevision,
    };
  }, [drawing, project.code, project.name]);
  const pack = React.useMemo(() => {
    if (previewMode === 'issue' && selectedIssue) {
      const issuedAtLabel = selectedIssue.issuedAt
        ? formatDraftingTimestamp(selectedIssue.issuedAt)
        : undefined;

      return buildDraftingScheduleSheetPackFromSnapshot({
        issue: selectedIssue,
        metadata: {
          ...metadata,
          drawingStatus: selectedIssue.issueStatus,
          generatedAtLabel: issuedAtLabel ? `Issued ${issuedAtLabel}` : metadata.generatedAtLabel,
          issueDateLabel: issuedAtLabel,
        },
        templateSourcesById,
      });
    }

    return buildDraftingScheduleSheetPack({
      definitions: resolvePreviewDefinitions({
        drawing,
        groupSelection,
        previewMode,
        selectedDefinition,
        selectedTemplateSource,
        templateValue,
      }),
      metadata,
      model: drawing.model,
      templateSourcesById,
    });
  }, [
    drawing,
    groupSelection,
    metadata,
    previewMode,
    selectedDefinition,
    selectedIssue,
    selectedTemplateSource,
    templateSourcesById,
    templateValue,
  ]);
  const firstPaper = pack.pages[0]
    ? getDraftingScheduleSheetPaper(pack.pages[0].renderModel)
    : null;
  const activeGroupCount =
    previewMode === 'legacy'
      ? groupSelection === DRAFTING_SCHEDULE_ALL_GROUPS
        ? DRAFTING_SCHEDULE_GROUP_DEFINITIONS.length
        : 1
      : pack.definitions.reduce(
          (total, definition) => total + definition.includedScheduleGroups.length,
          0,
        );

  React.useEffect(() => {
    if (previewMode !== 'sheet' || selectedSheetId || !selectedDefinition) {
      return;
    }

    onSelectedSheetIdChange(selectedDefinition.id);
  }, [onSelectedSheetIdChange, previewMode, selectedDefinition, selectedSheetId]);

  React.useEffect(() => {
    if (previewMode !== 'issue' || selectedIssueId || !selectedIssue) {
      return;
    }

    onSelectedIssueIdChange(selectedIssue.id);
  }, [onSelectedIssueIdChange, previewMode, selectedIssue, selectedIssueId]);

  const issueTemplateStates = React.useMemo(
    () =>
      selectedIssue
        ? selectedIssue.lockedSheetDefinitions.map((lockedDefinition) => {
            const liveDefinition =
              savedDefinitions.find((definition) => definition.id === lockedDefinition.id) ?? null;

            return {
              drift: resolveDraftingScheduleSheetTemplateDrift({
                liveDefinition,
                lockedDefinition,
                rootTemplatesById,
              }),
              liveDefinition,
              liveTemplateState: liveDefinition
                ? resolveDraftingScheduleSheetTemplateState(liveDefinition, rootTemplatesById)
                : null,
              lockedDefinition,
            };
          })
        : [],
    [rootTemplatesById, savedDefinitions, selectedIssue],
  );

  const fallbackWarnings = React.useMemo(
    () =>
      buildTemplateFallbackWarnings({
        definitions: pack.definitions,
        previewMode,
        templateBindingWarningsById,
        templateOptions,
      }),
    [pack.definitions, previewMode, templateBindingWarningsById, templateOptions],
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 print:max-w-none print:space-y-0">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="space-y-2">
          <Link
            href={`/projects/${projectId}/drafting/${drawing.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Drafting editor
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Schedule Sheet Preview</h1>
              {firstPaper ? (
                <>
                  <Badge variant="secondary">{firstPaper.paperSize.toUpperCase()}</Badge>
                  <Badge variant="outline">{firstPaper.orientation}</Badge>
                </>
              ) : null}
              <Badge variant="outline">{activeGroupCount} group(s)</Badge>
              <Badge variant="outline">{pack.pages.length} page(s)</Badge>
              {metadata.drawingRevision ? (
                <Badge variant="secondary">Drawing rev {metadata.drawingRevision}</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {project.code} - {metadata.drawingTitle} -{' '}
              {previewLabel(previewMode, selectedDefinition)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={previewMode}
            onValueChange={(value) => onModeChange(value as DraftingSchedulePreviewMode)}
          >
            <SelectTrigger className="w-[180px]" aria-label="Preview mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="legacy">Ad hoc</SelectItem>
              <SelectItem value="sheet">Saved sheet</SelectItem>
              <SelectItem value="pack">Saved pack</SelectItem>
              <SelectItem value="issue">Issued pack</SelectItem>
            </SelectContent>
          </Select>

          {previewMode === 'legacy' ? (
            <>
              <Select
                value={groupSelection}
                onValueChange={(value) =>
                  onGroupSelectionChange(value as DraftingScheduleSheetGroupSelection)
                }
              >
                <SelectTrigger className="w-[240px]" aria-label="Schedule group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DRAFTING_SCHEDULE_ALL_GROUPS}>All schedule groups</SelectItem>
                  {DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => (
                    <SelectItem key={group.key} value={group.key}>
                      {group.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={templateValue} onValueChange={onTemplateValueChange}>
                <SelectTrigger className="w-[280px]" aria-label="Sheet template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_TEMPLATE_VALUE}>Default A3 schedule sheet</SelectItem>
                  {templateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null}

          {previewMode === 'sheet' ? (
            <Select
              disabled={savedDefinitions.length === 0}
              value={selectedDefinition?.id ?? ''}
              onValueChange={onSelectedSheetIdChange}
            >
              <SelectTrigger className="w-[260px]" aria-label="Saved sheet definition">
                <SelectValue placeholder="No saved definitions" />
              </SelectTrigger>
              <SelectContent>
                {savedDefinitions.map((definition) => (
                  <SelectItem key={definition.id} value={definition.id}>
                    {definition.pageOrder}. {definition.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {previewMode === 'issue' ? (
            <Select
              disabled={savedIssues.length === 0}
              value={selectedIssue?.id ?? ''}
              onValueChange={onSelectedIssueIdChange}
            >
              <SelectTrigger className="w-[280px]" aria-label="Issued schedule pack snapshot">
                <SelectValue placeholder="No issued pack snapshots" />
              </SelectTrigger>
              <SelectContent>
                {savedIssues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    {issue.revisionLabel} - {issue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Link
            href={`/projects/${projectId}/drafting/${drawing.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Editor
          </Link>
          <Button disabled={pack.pages.length === 0} type="button" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {selectedIssue && previewMode === 'issue' ? (
        <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
          <Badge variant="secondary">Issue revision {selectedIssue.revisionLabel}</Badge>
          {metadata.drawingRevision && metadata.drawingRevision !== selectedIssue.revisionLabel ? (
            <Badge variant="outline">Drawing revision {metadata.drawingRevision}</Badge>
          ) : null}
          <Badge variant={selectedIssue.issueStatus === 'issued' ? 'default' : 'outline'}>
            {selectedIssue.issueStatus}
          </Badge>
          <span className="text-muted-foreground">{selectedIssue.issuePurpose}</span>
          {selectedIssue.issuedAt ? (
            <span className="text-muted-foreground">
              Issued {formatDraftingTimestamp(selectedIssue.issuedAt)}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm print:hidden">
        <div className="font-medium">Live pack = current model + current template binding</div>
        <div className="text-muted-foreground">
          Issued pack = locked rows + locked sheet definitions + locked template snapshot
        </div>
      </div>

      {selectedIssue && previewMode === 'issue' && issueTemplateStates.length > 0 ? (
        <div className="space-y-2 rounded-md border px-3 py-3 text-sm print:hidden">
          <div className="font-medium">Locked template snapshots</div>
          {issueTemplateStates.map((state) => (
            <div key={state.lockedDefinition.id} className="rounded-md border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{state.lockedDefinition.name}</span>
                <Badge variant="secondary">Issued</Badge>
                {state.drift.hasDrift ? <Badge variant="outline">Template drift</Badge> : null}
                {state.drift.isLegacySnapshot ? (
                  <Badge variant="outline">Legacy snapshot</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-muted-foreground">
                Issued: {describeLockedTemplateState(state.lockedDefinition)} -{' '}
                {formatSheetLayoutSummary(state.lockedDefinition)}
              </p>
              <p className="text-muted-foreground">
                Live:{' '}
                {state.liveDefinition && state.liveTemplateState
                  ? `${describeLiveTemplateState(state.liveTemplateState.snapshot)} - ${formatSheetLayoutSummary(state.liveDefinition)}`
                  : 'Sheet definition missing'}
              </p>
              {state.drift.messages.map((message) => (
                <p key={message} className="mt-1 text-amber-700">
                  {message}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {fallbackWarnings.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          {fallbackWarnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}

      <div className="overflow-auto rounded-md border bg-slate-100 p-6 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0">
        {pack.pages.length > 0 ? (
          <DraftingScheduleSheetPackPreview pack={pack} />
        ) : (
          <div className="rounded-md border border-dashed bg-white px-6 py-12 text-center text-sm text-muted-foreground print:hidden">
            No saved schedule sheet definitions are available for this preview mode.
          </div>
        )}
      </div>
    </div>
  );
}

export function DraftingScheduleSheetPackPreview({ pack }: { pack: DraftingScheduleSheetPack }) {
  return (
    <div className="space-y-6 print:space-y-0" data-testid="drafting-schedule-pack-preview">
      {pack.pages.map((page) => {
        const paper = getDraftingScheduleSheetPaper(page.renderModel);

        return (
          <div
            className="package-print-page"
            data-definition-id={page.definition.id}
            data-page-number={page.pageNumber}
            data-print-orientation={paper.orientation}
            data-print-page-size={paper.paperSize}
            key={page.id}
          >
            <DraftingScheduleSheet renderModel={page.renderModel} />
          </div>
        );
      })}
    </div>
  );
}

export function DraftingScheduleSheet({
  renderModel,
}: {
  renderModel: ReturnType<typeof buildDraftingScheduleSheetRenderModel>;
}) {
  return <SharedSheetRenderer model={renderModel} previewMode showDesignerChrome={false} />;
}

function resolvePreviewDefinitions({
  drawing,
  groupSelection,
  previewMode,
  selectedDefinition,
  selectedTemplateSource,
  templateValue,
}: {
  drawing: DraftingDrawing;
  groupSelection: DraftingScheduleSheetGroupSelection;
  previewMode: DraftingSchedulePreviewMode;
  selectedDefinition: DraftingScheduleSheetPack['definitions'][number] | null;
  selectedTemplateSource: DraftingScheduleSheetTemplateSource;
  templateValue: string;
}) {
  if (previewMode === 'pack') {
    return getOrderedScheduleSheetDefinitions(drawing.model);
  }

  if (previewMode === 'sheet') {
    return selectedDefinition ? [selectedDefinition] : [];
  }

  if (previewMode === 'issue') {
    return [];
  }

  const includedScheduleGroups =
    groupSelection === DRAFTING_SCHEDULE_ALL_GROUPS
      ? DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => group.key)
      : [groupSelection];
  const template = selectedTemplateSource.template;

  return [
    {
      ...createDraftingScheduleSheetDefinition({
        id: 'ad-hoc-schedule-preview',
        includedScheduleGroups,
        name: 'Ad hoc schedule preview',
        title: `${drawing.title} Schedules`,
      }),
      orientation: template?.orientation ?? 'landscape',
      pageSize: template?.paperSize ?? 'a3',
      rootSheetTemplateId: templateValue === DEFAULT_TEMPLATE_VALUE ? null : templateValue,
      templateId: templateValue === DEFAULT_TEMPLATE_VALUE ? null : templateValue,
    },
  ];
}

function previewLabel(
  previewMode: DraftingSchedulePreviewMode,
  selectedDefinition: DraftingScheduleSheetPack['definitions'][number] | null,
) {
  if (previewMode === 'pack') {
    return 'Saved schedule pack';
  }

  if (previewMode === 'issue') {
    return 'Issued schedule pack';
  }

  if (previewMode === 'sheet') {
    return selectedDefinition?.name ?? 'Saved schedule sheet';
  }

  return 'Ad hoc schedule sheet';
}

function buildTemplateFallbackWarnings({
  definitions,
  previewMode,
  templateBindingWarningsById,
  templateOptions,
}: {
  definitions: DraftingScheduleSheetPack['definitions'];
  previewMode: DraftingSchedulePreviewMode;
  templateBindingWarningsById: Record<string, string>;
  templateOptions: Array<{
    label: string;
    source: DraftingScheduleSheetTemplateSource;
    value: string;
  }>;
}) {
  const compatibleTemplateIds = new Set(templateOptions.map((option) => option.value));

  return definitions.flatMap((definition) => {
    if (previewMode === 'issue' && definition.templateSnapshot) {
      if (definition.templateSnapshot.source === 'missing_template_fallback') {
        return [
          `${definition.name}: Issued snapshot was locked against the internal schedule layout because the bound root sheet template was missing at issue time.`,
        ];
      }

      if (definition.templateSnapshot.source === 'incompatible_template_fallback') {
        return [
          `${definition.name}: Issued snapshot was locked against the internal schedule layout because the bound root sheet template was incompatible at issue time.`,
        ];
      }

      return [];
    }

    const rootTemplateId = getScheduleSheetRootTemplateId(definition);
    if (!rootTemplateId || compatibleTemplateIds.has(rootTemplateId)) {
      return [];
    }

    const warning =
      templateBindingWarningsById[rootTemplateId] ??
      'The bound root sheet template is missing or no longer available.';

    return [`${definition.name}: ${warning} Falling back to the internal schedule layout.`];
  });
}

function describeLockedTemplateState(definition: DraftingScheduleSheetPack['definitions'][number]) {
  const snapshot = definition.templateSnapshot;
  if (!snapshot) {
    return 'Legacy snapshot without a locked template snapshot';
  }

  if (snapshot.source === 'default_layout') {
    return 'Default drafting schedule sheet';
  }

  if (snapshot.source === 'missing_template_fallback') {
    return `Default drafting schedule sheet (bound template missing at issue: ${snapshot.rootSheetTemplateId ?? 'unknown'})`;
  }

  if (snapshot.source === 'incompatible_template_fallback') {
    return `Default drafting schedule sheet (bound template incompatible at issue: ${snapshot.rootSheetTemplateName ?? snapshot.rootSheetTemplateId ?? 'unknown'})`;
  }

  return snapshot.rootSheetTemplateName ?? snapshot.label;
}

function describeLiveTemplateState(
  snapshot: ReturnType<typeof resolveDraftingScheduleSheetTemplateState>['snapshot'],
) {
  if (snapshot.source === 'default_layout') {
    return 'Default drafting schedule sheet';
  }

  if (snapshot.source === 'missing_template_fallback') {
    return `Default drafting schedule sheet (bound template missing: ${snapshot.rootSheetTemplateId ?? 'unknown'})`;
  }

  if (snapshot.source === 'incompatible_template_fallback') {
    return `Default drafting schedule sheet (bound template incompatible: ${snapshot.rootSheetTemplateName ?? snapshot.rootSheetTemplateId ?? 'unknown'})`;
  }

  return snapshot.rootSheetTemplateName ?? snapshot.label;
}
