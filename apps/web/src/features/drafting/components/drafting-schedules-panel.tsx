import * as React from 'react';
import Link from 'next/link';
import type {
  DraftingModel,
  DraftingSchedulePackIssue,
  DraftingScheduleSheetDefinition,
} from '@eng/shared';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import { coerceRootSheetTemplateDocument } from '@/features/templates/root-sheet-template-types';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import type { DraftingScheduleGroupKey } from '../schedules/drafting-schedule-types';
import {
  DRAFTING_SCHEDULE_GROUP_DEFINITIONS,
  buildDraftingScheduleSummary,
  getDraftingScheduleGroup,
} from '../schedules/drafting-schedule-utils';
import {
  addScheduleSheetDefinition,
  createDraftingScheduleSheetDefinition,
  deleteScheduleSheetDefinition,
  duplicateScheduleSheetDefinition,
  getOrderedScheduleSheetDefinitions,
  getScheduleSheetRootTemplateId,
  reorderScheduleSheetDefinition,
  setScheduleSheetGroupIncluded,
  updateScheduleSheetDefinition,
} from '../schedules/drafting-schedule-sheet-definition-utils';
import {
  addSchedulePackIssue,
  createDraftingSchedulePackIssueSnapshot,
  duplicateSchedulePackIssueSnapshot,
  getOrderedSchedulePackIssues,
  markSchedulePackIssueIssued,
  nextRevisionLabel,
  supersedeSchedulePackIssue,
} from '../schedules/drafting-schedule-pack-issue-utils';
import type { DraftingScheduleSheetMetadata } from '../schedules/drafting-schedule-sheet';
import {
  buildDraftingScheduleSheetTemplateSnapshotMap,
  formatSheetLayoutSummary,
  resolveDraftingScheduleSheetTemplateDrift,
  resolveDraftingScheduleSheetTemplateState,
} from '../schedules/drafting-schedule-template-snapshot';

const DEFAULT_TEMPLATE_VALUE = 'default';

export function DraftingSchedulesPanel({
  model,
  metadata,
  onExportAllJson,
  onExportGroupCsv,
  onExportPackJson,
  onModelChange,
  projectId,
}: {
  model: DraftingModel;
  metadata: DraftingScheduleSheetMetadata;
  onExportAllJson: () => void;
  onExportGroupCsv: (groupKey: DraftingScheduleGroupKey) => void;
  onExportPackJson: () => void;
  onModelChange: (model: DraftingModel) => void;
  projectId: string;
}) {
  const [activeGroupKey, setActiveGroupKey] =
    React.useState<DraftingScheduleGroupKey>('shoring_piles');
  const [activeSheetId, setActiveSheetId] = React.useState<string | null>(
    model.scheduleSheets?.[0]?.id ?? null,
  );
  const [activeIssueId, setActiveIssueId] = React.useState<string | null>(
    model.schedulePackIssues?.[0]?.id ?? null,
  );
  const [issueName, setIssueName] = React.useState('Schedule Pack Issue');
  const [issueRevisionLabel, setIssueRevisionLabel] = React.useState('A');
  const [issuePurpose, setIssuePurpose] = React.useState('For review');
  const [issueNotes, setIssueNotes] = React.useState('');
  const summary = React.useMemo(() => buildDraftingScheduleSummary(model), [model]);
  const activeGroup = getDraftingScheduleGroup(summary, activeGroupKey);
  const orderedSheets = React.useMemo(() => getOrderedScheduleSheetDefinitions(model), [model]);
  const orderedIssues = React.useMemo(() => getOrderedSchedulePackIssues(model), [model]);
  const activeSheet =
    orderedSheets.find((sheet) => sheet.id === activeSheetId) ?? orderedSheets[0] ?? null;
  const activeIssue =
    orderedIssues.find((issue) => issue.id === activeIssueId) ?? orderedIssues[0] ?? null;
  const activeSheetIndex = activeSheet
    ? orderedSheets.findIndex((sheet) => sheet.id === activeSheet.id)
    : -1;
  const { data: rootTemplates = [] } = useRootSheetTemplates();
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
            value: template.id,
          };
        })
        .filter((option): option is NonNullable<typeof option> => option !== null),
    [rootTemplates],
  );
  const templateRecordsById = React.useMemo(
    () => new Map(rootTemplates.map((template) => [template.id, template] as const)),
    [rootTemplates],
  );
  const activeTemplateBindingState = activeSheet
    ? resolveDraftingScheduleSheetTemplateState(activeSheet, templateRecordsById)
    : null;
  const activeIssueTemplateStates = React.useMemo(
    () =>
      activeIssue
        ? activeIssue.lockedSheetDefinitions.map((lockedDefinition) => {
            const liveDefinition =
              orderedSheets.find((sheet) => sheet.id === lockedDefinition.id) ?? null;

            return {
              drift: resolveDraftingScheduleSheetTemplateDrift({
                liveDefinition,
                lockedDefinition,
                rootTemplatesById: templateRecordsById,
              }),
              liveDefinition,
              liveTemplateState: liveDefinition
                ? resolveDraftingScheduleSheetTemplateState(liveDefinition, templateRecordsById)
                : null,
              lockedDefinition,
            };
          })
        : [],
    [activeIssue, orderedSheets, templateRecordsById],
  );

  React.useEffect(() => {
    if (activeSheetId && orderedSheets.some((sheet) => sheet.id === activeSheetId)) {
      return;
    }

    setActiveSheetId(orderedSheets[0]?.id ?? null);
  }, [activeSheetId, orderedSheets]);

  React.useEffect(() => {
    if (activeIssueId && orderedIssues.some((issue) => issue.id === activeIssueId)) {
      return;
    }

    setActiveIssueId(orderedIssues[0]?.id ?? null);
  }, [activeIssueId, orderedIssues]);

  function handleCreateSheet() {
    const nextName = `Schedule Sheet ${orderedSheets.length + 1}`;
    const definition = createDraftingScheduleSheetDefinition({
      id: crypto.randomUUID(),
      name: nextName,
      pageOrder: orderedSheets.length + 1,
      title: nextName,
    });

    setActiveSheetId(definition.id);
    onModelChange(addScheduleSheetDefinition(model, definition));
  }

  function handleDuplicateSheet() {
    if (!activeSheet) {
      return;
    }

    const nextId = crypto.randomUUID();
    setActiveSheetId(nextId);
    onModelChange(duplicateScheduleSheetDefinition(model, activeSheet.id, nextId));
  }

  function handleDeleteSheet() {
    if (!activeSheet) {
      return;
    }

    const nextModel = deleteScheduleSheetDefinition(model, activeSheet.id);
    setActiveSheetId(nextModel.scheduleSheets[0]?.id ?? null);
    onModelChange(nextModel);
  }

  function handleReorderSheet(direction: 'down' | 'up') {
    if (!activeSheet) {
      return;
    }

    onModelChange(reorderScheduleSheetDefinition(model, activeSheet.id, direction));
  }

  function handleUpdateSheet(patch: Partial<DraftingScheduleSheetDefinition>) {
    if (!activeSheet) {
      return;
    }

    onModelChange(updateScheduleSheetDefinition(model, activeSheet.id, patch));
  }

  function handleBindTemplate(value: string) {
    if (!activeSheet) {
      return;
    }

    if (value === DEFAULT_TEMPLATE_VALUE) {
      handleUpdateSheet({
        rootSheetTemplateId: null,
        templateId: null,
      });
      return;
    }

    const template = rootTemplates.find((candidate) => candidate.id === value);
    const document = coerceRootSheetTemplateDocument(template);

    handleUpdateSheet({
      orientation: document?.orientation ?? activeSheet.orientation,
      pageSize: document?.paperSize ?? activeSheet.pageSize,
      rootSheetTemplateId: value,
      templateId: value,
    });
  }

  function handleCreateIssueSnapshot() {
    if (orderedSheets.length === 0) {
      return;
    }

    const issue = createDraftingSchedulePackIssueSnapshot(model, {
      id: crypto.randomUUID(),
      issuePurpose: issuePurpose.trim() || 'For review',
      metadata,
      name: issueName.trim() || 'Schedule Pack Issue',
      notes: issueNotes.trim() || undefined,
      revisionLabel: issueRevisionLabel.trim() || 'A',
      templateSnapshotsBySheetId: buildDraftingScheduleSheetTemplateSnapshotMap(
        orderedSheets,
        templateRecordsById,
      ),
    });

    setActiveIssueId(issue.id);
    onModelChange(addSchedulePackIssue(model, issue));
  }

  function handleMarkIssueIssued(issue: DraftingSchedulePackIssue) {
    onModelChange(
      markSchedulePackIssueIssued(model, issue.id, {
        issuedAt: new Date().toISOString(),
      }),
    );
  }

  function handleDuplicateIssue(issue: DraftingSchedulePackIssue) {
    const nextId = crypto.randomUUID();
    const revisionLabel = nextRevisionLabel(issue.revisionLabel);

    setActiveIssueId(nextId);
    setIssueRevisionLabel(revisionLabel);
    setIssuePurpose(issue.issuePurpose);
    onModelChange(
      duplicateSchedulePackIssueSnapshot(model, issue.id, {
        id: nextId,
        issuePurpose: issue.issuePurpose,
        name: `${issue.name} ${revisionLabel}`,
        revisionLabel,
      }),
    );
  }

  function handleSupersedeIssue(issue: DraftingSchedulePackIssue) {
    onModelChange(supersedeSchedulePackIssue(model, issue.id));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {summary.groups.map((group) => (
            <Badge key={group.key} variant={group.rows.length ? 'secondary' : 'outline'}>
              {group.title.replace(' Schedule', '')}: {group.rows.length}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Sheet Definitions</h3>
            <p className="text-xs text-muted-foreground">
              {orderedSheets.length} saved schedule sheet{orderedSheets.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreateSheet} size="sm" type="button">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {activeSheet ? (
          <div className="space-y-3">
            <Select value={activeSheet.id} onValueChange={setActiveSheetId}>
              <SelectTrigger aria-label="Saved schedule sheet definition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderedSheets.map((sheet) => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    {sheet.pageOrder}. {sheet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2">
              <Button
                aria-label="Move sheet definition up"
                disabled={activeSheetIndex <= 0}
                onClick={() => handleReorderSheet('up')}
                size="icon"
                type="button"
                variant="outline"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Move sheet definition down"
                disabled={activeSheetIndex === -1 || activeSheetIndex >= orderedSheets.length - 1}
                onClick={() => handleReorderSheet('down')}
                size="icon"
                type="button"
                variant="outline"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Duplicate sheet definition"
                onClick={handleDuplicateSheet}
                size="icon"
                type="button"
                variant="outline"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Delete sheet definition"
                onClick={handleDeleteSheet}
                size="icon"
                type="button"
                variant="outline"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3">
              <LabeledInput
                id="schedule-sheet-name"
                label="Name"
                onChange={(value) =>
                  handleUpdateSheet({
                    name: value,
                    title: activeSheet.title || value,
                  })
                }
                value={activeSheet.name}
              />
              <LabeledInput
                id="schedule-sheet-title"
                label="Title"
                onChange={(value) => handleUpdateSheet({ title: value || activeSheet.name })}
                value={activeSheet.title}
              />
              <LabeledInput
                id="schedule-sheet-subtitle"
                label="Subtitle"
                onChange={(value) => handleUpdateSheet({ subtitle: value || undefined })}
                value={activeSheet.subtitle ?? ''}
              />
              <div className="grid grid-cols-2 gap-2">
                <LabeledInput
                  id="schedule-sheet-revision"
                  label="Revision"
                  onChange={(value) => handleUpdateSheet({ revisionLabel: value || undefined })}
                  value={activeSheet.revisionLabel ?? ''}
                />
                <LabeledInput
                  id="schedule-sheet-purpose"
                  label="Issue Purpose"
                  onChange={(value) => handleUpdateSheet({ issuePurpose: value || undefined })}
                  value={activeSheet.issuePurpose ?? ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <LabeledSelect
                label="Template"
                onValueChange={handleBindTemplate}
                value={getScheduleSheetRootTemplateId(activeSheet) ?? DEFAULT_TEMPLATE_VALUE}
              >
                <SelectItem value={DEFAULT_TEMPLATE_VALUE}>Default layout</SelectItem>
                {templateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </LabeledSelect>

              <LabeledSelect
                label="Page Size"
                onValueChange={(value) =>
                  handleUpdateSheet({
                    pageSize: value as DraftingScheduleSheetDefinition['pageSize'],
                  })
                }
                value={activeSheet.pageSize}
              >
                {(['a4', 'a3', 'a2', 'a1', 'a0'] as const).map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize}>
                    {pageSize.toUpperCase()}
                  </SelectItem>
                ))}
              </LabeledSelect>

              <LabeledSelect
                label="Orientation"
                onValueChange={(value) =>
                  handleUpdateSheet({
                    orientation: value as DraftingScheduleSheetDefinition['orientation'],
                  })
                }
                value={activeSheet.orientation}
              >
                <SelectItem value="landscape">Landscape</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
              </LabeledSelect>

              <LabeledSelect
                label="Density"
                onValueChange={(value) =>
                  handleUpdateSheet({
                    tableDensity: value as DraftingScheduleSheetDefinition['tableDensity'],
                  })
                }
                value={activeSheet.tableDensity}
              >
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </LabeledSelect>
            </div>

            {activeTemplateBindingState ? (
              <div className="rounded-md border px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Binding</span>
                  <Badge variant={activeTemplateBindingState.warning ? 'outline' : 'secondary'}>
                    {activeTemplateBindingState.snapshot.source === 'root_template'
                      ? 'Bound template'
                      : activeTemplateBindingState.snapshot.source === 'default_layout'
                        ? 'Default layout'
                        : 'Fallback'}
                  </Badge>
                </div>
                {activeTemplateBindingState.warning ? (
                  <p className="mt-1 text-amber-700">{activeTemplateBindingState.warning}</p>
                ) : (
                  <p className="mt-1 text-muted-foreground">
                    {describeTemplateSnapshot(activeTemplateBindingState.snapshot)} -{' '}
                    {formatSheetLayoutSummary(activeSheet)}
                  </p>
                )}
                {getScheduleSheetRootTemplateId(activeSheet) ? (
                  <Button
                    className="mt-2"
                    onClick={() => handleBindTemplate(DEFAULT_TEMPLATE_VALUE)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Clear Binding
                  </Button>
                ) : null}
              </div>
            ) : null}

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase text-muted-foreground">
                Included Groups
              </legend>
              <div className="grid gap-2">
                {DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => {
                  const inputId = `schedule-sheet-${activeSheet.id}-${group.key}`;

                  return (
                    <label
                      key={group.key}
                      className="flex items-start gap-2 rounded border px-2 py-1.5 text-xs"
                      htmlFor={inputId}
                    >
                      <input
                        checked={activeSheet.includedScheduleGroups.includes(group.key)}
                        className="mt-0.5"
                        id={inputId}
                        onChange={(event) =>
                          onModelChange(
                            setScheduleSheetGroupIncluded(
                              model,
                              activeSheet.id,
                              group.key,
                              event.target.checked,
                            ),
                          )
                        }
                        type="checkbox"
                      />
                      <span>
                        <span className="font-medium">{group.title}</span>
                        <span className="ml-1 text-muted-foreground">
                          ({summary.counts[group.key]})
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <Link
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                href={`/projects/${projectId}/drafting/${model.drawingId}/schedules/preview?sheetId=${activeSheet.id}`}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Sheet
              </Link>
              <Link
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                href={`/projects/${projectId}/drafting/${model.drawingId}/schedules/preview?mode=pack`}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Pack
              </Link>
              <Button
                className="gap-2"
                disabled={orderedSheets.length === 0}
                onClick={onExportPackJson}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Pack JSON
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No saved schedule sheet definitions.
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Issue / Revision Snapshots</h3>
            <p className="text-xs text-muted-foreground">
              {orderedIssues.length} schedule pack issue{orderedIssues.length === 1 ? '' : 's'}
            </p>
          </div>
          <Link
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            href={`/projects/${projectId}/drafting/${model.drawingId}/schedules/preview?mode=pack`}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Live Pack
          </Link>
        </div>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <div className="font-medium">Live pack = current model + current template binding</div>
          <div className="text-muted-foreground">
            Issued pack = locked rows + locked sheet definitions + locked template snapshot
          </div>
        </div>

        <div className="grid gap-3">
          <LabeledInput
            id="schedule-issue-name"
            label="Issue Name"
            onChange={setIssueName}
            value={issueName}
          />
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput
              id="schedule-issue-revision"
              label="Revision"
              onChange={setIssueRevisionLabel}
              value={issueRevisionLabel}
            />
            <LabeledInput
              id="schedule-issue-purpose"
              label="Issue Purpose"
              onChange={setIssuePurpose}
              value={issuePurpose}
            />
          </div>
          <LabeledInput
            id="schedule-issue-notes"
            label="Notes"
            onChange={setIssueNotes}
            value={issueNotes}
          />
          <Button
            className="gap-2"
            disabled={orderedSheets.length === 0}
            onClick={handleCreateIssueSnapshot}
            size="sm"
            type="button"
          >
            <FileText className="h-4 w-4" />
            Create Snapshot
          </Button>
        </div>

        {activeIssue ? (
          <div className="space-y-3">
            <Select value={activeIssue.id} onValueChange={setActiveIssueId}>
              <SelectTrigger aria-label="Schedule pack issue snapshot">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderedIssues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    {issue.revisionLabel}. {issue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-md border px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={activeIssue.issueStatus === 'issued' ? 'default' : 'outline'}>
                  {activeIssue.issueStatus}
                </Badge>
                <Badge variant="secondary">Rev {activeIssue.revisionLabel}</Badge>
                <Badge variant="outline">{activeIssue.pageCount} page(s)</Badge>
              </div>
              <p className="mt-2 font-medium">{activeIssue.issuePurpose}</p>
              {activeIssue.issuedAt ? (
                <p className="text-muted-foreground">
                  Issued {new Date(activeIssue.issuedAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            {activeIssueTemplateStates.length > 0 ? (
              <div className="space-y-2 rounded-md border px-3 py-3 text-xs">
                <div className="font-medium">Locked template snapshots</div>
                {activeIssueTemplateStates.map((state) => (
                  <div key={state.lockedDefinition.id} className="rounded-md border px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{state.lockedDefinition.name}</span>
                      <Badge variant="secondary">Issued</Badge>
                      {state.drift.hasDrift ? (
                        <Badge variant="outline">Template drift</Badge>
                      ) : null}
                      {state.drift.isLegacySnapshot ? (
                        <Badge variant="outline">Legacy snapshot</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Issued: {describeTemplateSnapshot(state.lockedDefinition.templateSnapshot)} -{' '}
                      {formatSheetLayoutSummary(state.lockedDefinition)}
                    </p>
                    <p className="text-muted-foreground">
                      Live:{' '}
                      {state.liveDefinition && state.liveTemplateState
                        ? `${describeTemplateSnapshot(state.liveTemplateState.snapshot)} - ${formatSheetLayoutSummary(state.liveDefinition)}`
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

            <div className="flex flex-wrap gap-2">
              <Button
                className="gap-2"
                disabled={activeIssue.issueStatus === 'issued'}
                onClick={() => handleMarkIssueIssued(activeIssue)}
                size="sm"
                type="button"
                variant="outline"
              >
                <CheckCircle2 className="h-4 w-4" />
                Issue
              </Button>
              <Button
                aria-label="Duplicate schedule pack issue"
                onClick={() => handleDuplicateIssue(activeIssue)}
                size="icon"
                type="button"
                variant="outline"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                className="gap-2"
                disabled={activeIssue.issueStatus === 'superseded'}
                onClick={() => handleSupersedeIssue(activeIssue)}
                size="sm"
                type="button"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4" />
                Supersede
              </Button>
              <Link
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                href={`/projects/${projectId}/drafting/${model.drawingId}/schedules/preview?issueId=${activeIssue.id}`}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Issue Pack
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No schedule pack issue snapshots.
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="space-y-2">
          <Select
            value={activeGroupKey}
            onValueChange={(value) => setActiveGroupKey(value as DraftingScheduleGroupKey)}
          >
            <SelectTrigger aria-label="Schedule group">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => (
                <SelectItem key={group.key} value={group.key}>
                  {group.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2"
              onClick={() => onExportGroupCsv(activeGroup.key)}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button className="gap-2" onClick={onExportAllJson} size="sm" variant="outline">
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table className="min-w-[920px] text-xs">
            <TableHeader>
              <TableRow>
                {activeGroup.columns.map((column) => (
                  <TableHead key={column.key} className="h-9 whitespace-nowrap px-3 py-2">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeGroup.rows.length > 0 ? (
                activeGroup.rows.map((row) => (
                  <TableRow key={`${activeGroup.key}-${row.sourceObjectId}`}>
                    {activeGroup.columns.map((column) => (
                      <TableCell
                        key={`${row.sourceObjectId}-${column.key}`}
                        className="max-w-[220px] whitespace-normal px-3 py-2 align-top"
                      >
                        {row.cells[column.key] || ' '}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={activeGroup.columns.length}
                  >
                    No rows
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs" htmlFor={id}>
        {label}
      </Label>
      <Input id={id} onChange={(event) => onChange(event.target.value)} value={value} />
    </div>
  );
}

function LabeledSelect({
  children,
  label,
  onValueChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function describeTemplateSnapshot(
  snapshot:
    | ReturnType<typeof resolveDraftingScheduleSheetTemplateState>['snapshot']
    | DraftingSchedulePackIssue['lockedSheetDefinitions'][number]['templateSnapshot']
    | undefined,
) {
  if (!snapshot) {
    return 'Legacy snapshot without a locked template snapshot';
  }

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
