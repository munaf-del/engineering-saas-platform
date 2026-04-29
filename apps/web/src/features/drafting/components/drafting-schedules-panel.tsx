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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { downloadDraftingSchedulePackIssueManifestJson } from '@/features/drafting/export-utils';
import { coerceRootSheetTemplateDocument } from '@/features/templates/root-sheet-template-types';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import type { DraftingScheduleGroupKey } from '../schedules/drafting-schedule-types';
import {
  buildDraftingSchedulePackIssueDetail,
  buildDraftingSchedulePackIssueHistoryRows,
  formatDraftingSchedulePackIssueDriftState,
  formatDraftingSchedulePackIssueSnapshotStatus,
  type DraftingSchedulePackIssueComparisonSummary,
  type DraftingSchedulePackIssueGroupRowComparison,
  type DraftingSchedulePackIssueRowComparison,
  type DraftingSchedulePackIssueSheetDetail,
  type DraftingSchedulePackIssueSnapshotStatus,
} from '../schedules/drafting-schedule-pack-issue-provenance';
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
  resolveDraftingScheduleSheetTemplateState,
} from '../schedules/drafting-schedule-template-snapshot';

const DEFAULT_TEMPLATE_VALUE = 'default';

export function DraftingSchedulesPanel({
  currentUserName,
  drawingTitle,
  model,
  metadata,
  onExportAllJson,
  onExportGroupCsv,
  onExportPackJson,
  onModelChange,
  projectId,
}: {
  currentUserName: string | null;
  drawingTitle: string;
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
    model.schedulePackIssues?.[model.schedulePackIssues.length - 1]?.id ?? null,
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
  const issueHistoryRows = React.useMemo(
    () =>
      buildDraftingSchedulePackIssueHistoryRows({
        issues: orderedIssues,
        model,
        rootTemplatesById: templateRecordsById,
      }),
    [model, orderedIssues, templateRecordsById],
  );
  const activeIssueDetail = React.useMemo(
    () =>
      activeIssue
        ? buildDraftingSchedulePackIssueDetail({
            issue: activeIssue,
            model,
            rootTemplatesById: templateRecordsById,
          })
        : null,
    [activeIssue, model, templateRecordsById],
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

    setActiveIssueId(orderedIssues[orderedIssues.length - 1]?.id ?? null);
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
        issuedBy: currentUserName ?? undefined,
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

  function handleExportIssueManifest(issue: DraftingSchedulePackIssue) {
    downloadDraftingSchedulePackIssueManifestJson({
      issue,
      model,
      rootTemplatesById: templateRecordsById,
      title: drawingTitle,
    });
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

        {activeIssue && activeIssueDetail ? (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table
                className="min-w-[1120px] text-xs"
                data-testid="drafting-schedule-issue-history-table"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Revision</TableHead>
                    <TableHead className="whitespace-nowrap">Issue Purpose</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Issued At</TableHead>
                    <TableHead className="whitespace-nowrap">Issued By</TableHead>
                    <TableHead className="whitespace-nowrap">Pages</TableHead>
                    <TableHead className="whitespace-nowrap">Sheets</TableHead>
                    <TableHead className="whitespace-nowrap">Snapshot</TableHead>
                    <TableHead className="whitespace-nowrap">Drift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issueHistoryRows.map((row) => (
                    <TableRow
                      aria-selected={row.id === activeIssue.id}
                      className={row.id === activeIssue.id ? 'bg-muted/40' : 'cursor-pointer'}
                      key={row.id}
                      onClick={() => setActiveIssueId(row.id)}
                    >
                      <TableCell className="font-medium">{row.issueName}</TableCell>
                      <TableCell>{row.revisionLabel}</TableCell>
                      <TableCell>{row.issuePurpose}</TableCell>
                      <TableCell>
                        <Badge variant={row.issueStatus === 'issued' ? 'default' : 'outline'}>
                          {row.issueStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatOptionalDate(row.issuedAt)}</TableCell>
                      <TableCell>{row.issuedBy ?? 'Not recorded'}</TableCell>
                      <TableCell>{row.pageCount}</TableCell>
                      <TableCell>{row.selectedSheetCount}</TableCell>
                      <TableCell>
                        <Badge variant={snapshotStatusBadgeVariant(row.snapshotStatus)}>
                          {formatDraftingSchedulePackIssueSnapshotStatus(row.snapshotStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={driftStateBadgeVariant(row.driftState)}>
                          {formatDraftingSchedulePackIssueDriftState(row.driftState)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div
              className="space-y-4 rounded-md border p-3"
              data-testid="drafting-schedule-issue-detail"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">
                      {activeIssueDetail.issueName} · Rev {activeIssueDetail.revisionLabel}
                    </h4>
                    <Badge
                      variant={activeIssueDetail.issueStatus === 'issued' ? 'default' : 'outline'}
                    >
                      {activeIssueDetail.issueStatus}
                    </Badge>
                    <Badge variant={snapshotStatusBadgeVariant(activeIssueDetail.snapshotStatus)}>
                      {formatDraftingSchedulePackIssueSnapshotStatus(
                        activeIssueDetail.snapshotStatus,
                      )}
                    </Badge>
                    <Badge
                      variant={driftStateBadgeVariant(activeIssueDetail.comparison.driftState)}
                    >
                      {formatDraftingSchedulePackIssueDriftState(
                        activeIssueDetail.comparison.driftState,
                      )}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{activeIssueDetail.issuePurpose}</p>
                  {activeIssueDetail.notes ? (
                    <p className="text-xs text-muted-foreground">{activeIssueDetail.notes}</p>
                  ) : null}
                </div>

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
                  <Button
                    className="gap-2"
                    onClick={() => handleExportIssueManifest(activeIssue)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    Manifest JSON
                  </Button>
                  <Link
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    href={`/projects/${projectId}/drafting/${model.drawingId}/schedules/preview?issueId=${activeIssue.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Issued Preview
                  </Link>
                </div>
              </div>

              {activeIssueDetail.legacyWarning ? (
                <Alert>
                  <AlertDescription>{activeIssueDetail.legacyWarning}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailStat
                  label="Issued At"
                  value={formatOptionalDate(activeIssueDetail.issuedAt)}
                />
                <DetailStat
                  label="Issued By"
                  value={activeIssueDetail.issuedBy ?? 'Not recorded'}
                />
                <DetailStat label="Locked Pages" value={`${activeIssueDetail.pageCount}`} />
                <DetailStat
                  label="Locked Sheets"
                  value={`${activeIssueDetail.includedSheetCount}`}
                />
              </div>

              <IssueComparisonSummary comparison={activeIssueDetail.comparison} />

              <IssueRowDiffDrillDown comparison={activeIssueDetail.comparison} />

              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">Issued Pack Manifest</div>
                      <p className="text-xs text-muted-foreground">
                        Derived from the stored issue snapshot without changing the print/PDF path.
                      </p>
                    </div>
                    <Badge variant={snapshotStatusBadgeVariant(activeIssueDetail.snapshotStatus)}>
                      {formatDraftingSchedulePackIssueSnapshotStatus(
                        activeIssueDetail.snapshotStatus,
                      )}
                    </Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailStat label="Issue ID" value={activeIssueDetail.issueId} />
                    <DetailStat label="Revision" value={activeIssueDetail.revisionLabel} />
                    <DetailStat label="Issue Purpose" value={activeIssueDetail.issuePurpose} />
                    <DetailStat
                      label="Drift State"
                      value={formatDraftingSchedulePackIssueDriftState(
                        activeIssueDetail.comparison.driftState,
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      Locked Schedule Group Counts
                    </div>
                    <div className="rounded-md border">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Group</TableHead>
                            <TableHead className="text-right">Rows</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeIssueDetail.lockedScheduleGroupCounts.map((group) => (
                            <TableRow key={group.groupKey}>
                              <TableCell>{group.title}</TableCell>
                              <TableCell className="text-right">{group.rowCount}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className="font-medium">Total</TableCell>
                            <TableCell className="text-right font-medium">
                              {activeIssueDetail.lockedTotalRowCount}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Sheet Provenance</div>
                    <p className="text-xs text-muted-foreground">
                      Locked sheet definitions, template/version metadata, fallback provenance, and
                      live-pack drift for each issued sheet.
                    </p>
                  </div>

                  {activeIssueDetail.selectedSheetDefinitions.map((sheet) => (
                    <IssueSheetDetailCard key={sheet.id} sheet={sheet} />
                  ))}
                </div>
              </div>
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

function DetailStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function IssueComparisonSummary({
  comparison,
}: {
  comparison: DraftingSchedulePackIssueComparisonSummary;
}) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">Live vs Issued Comparison</div>
          <p className="text-xs text-muted-foreground">
            Compact comparison of the current live pack against the selected issued snapshot.
          </p>
        </div>
        <Badge variant={driftStateBadgeVariant(comparison.driftState)}>
          {formatDraftingSchedulePackIssueDriftState(comparison.driftState)}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DetailStat
          label="Sheets"
          value={`${comparison.sheetCount.live} live / ${comparison.sheetCount.issued} issued (${formatSignedDelta(
            comparison.sheetCount.difference,
          )})`}
        />
        <DetailStat
          label="Pages"
          value={`${comparison.pageCount.live} live / ${comparison.pageCount.issued} issued (${formatSignedDelta(
            comparison.pageCount.difference,
          )})`}
        />
        <DetailStat
          label="Rows"
          value={`${comparison.rowCount.live} live / ${comparison.rowCount.issued} issued (${formatSignedDelta(
            comparison.rowCount.difference,
          )})`}
        />
      </div>

      <div className="rounded-md border">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Issued</TableHead>
              <TableHead className="text-right">Live</TableHead>
              <TableHead className="text-right">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.groupCounts.map((group) => (
              <TableRow key={group.groupKey}>
                <TableCell>{group.title}</TableCell>
                <TableCell className="text-right">{group.issuedRowCount}</TableCell>
                <TableCell className="text-right">{group.liveRowCount}</TableCell>
                <TableCell className="text-right">{formatSignedDelta(group.difference)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {comparison.driftMessages.length > 0 ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          {comparison.driftMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IssueRowDiffDrillDown({
  comparison,
}: {
  comparison: DraftingSchedulePackIssueComparisonSummary;
}) {
  const rowComparison = comparison.rowComparison;

  return (
    <div className="space-y-3 rounded-md border p-3" data-testid="drafting-schedule-row-diff">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">Row-Level Drill-Down</div>
          <p className="text-xs text-muted-foreground">
            Added, removed, and changed rows grouped by schedule section.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={rowComparison.addedRowCount > 0 ? 'outline' : 'secondary'}>
            +{rowComparison.addedRowCount} added
          </Badge>
          <Badge variant={rowComparison.removedRowCount > 0 ? 'outline' : 'secondary'}>
            -{rowComparison.removedRowCount} removed
          </Badge>
          <Badge variant={rowComparison.changedRowCount > 0 ? 'outline' : 'secondary'}>
            {rowComparison.changedRowCount} changed
          </Badge>
          <Badge variant={rowComparison.knownProvenanceRowCount > 0 ? 'secondary' : 'outline'}>
            {rowComparison.knownProvenanceRowCount} known provenance
          </Badge>
          <Badge variant={rowComparison.unknownProvenanceRowCount > 0 ? 'outline' : 'secondary'}>
            {rowComparison.unknownProvenanceRowCount} legacy/unknown
          </Badge>
        </div>
      </div>

      {rowComparison.emptyState ? (
        <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          {rowComparison.emptyState}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rowComparison.groups.map((group) => (
          <div className="rounded-md border px-3 py-2" key={group.groupKey}>
            <div className="text-xs uppercase text-muted-foreground">{group.title}</div>
            <div className="mt-1 text-sm font-medium">
              {group.liveRowCount} live / {group.issuedRowCount} issued
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant={group.addedRows.length > 0 ? 'outline' : 'secondary'}>
                +{group.addedRows.length}
              </Badge>
              <Badge variant={group.removedRows.length > 0 ? 'outline' : 'secondary'}>
                -{group.removedRows.length}
              </Badge>
              <Badge variant={group.changedRows.length > 0 ? 'outline' : 'secondary'}>
                {group.changedRows.length} changed
              </Badge>
              <Badge variant="secondary">{group.unchangedRowCount} unchanged</Badge>
              <Badge variant={group.knownProvenanceRowCount > 0 ? 'secondary' : 'outline'}>
                {group.knownProvenanceRowCount} known
              </Badge>
              <Badge variant={group.unknownProvenanceRowCount > 0 ? 'outline' : 'secondary'}>
                {group.unknownProvenanceRowCount} unknown
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {rowComparison.groups.map((group) => (
          <IssueRowDiffGroup key={group.groupKey} group={group} />
        ))}
      </div>
    </div>
  );
}

function IssueRowDiffGroup({ group }: { group: DraftingSchedulePackIssueGroupRowComparison }) {
  const rows = [
    ...group.addedRows,
    ...group.removedRows,
    ...group.changedRows,
    ...group.unchangedRows,
  ];

  return (
    <details className="rounded-md border px-3 py-2" open={rows.length > 0}>
      <summary className="cursor-pointer text-sm font-medium">
        {group.title} · {group.liveRowCount} live / {group.issuedRowCount} issued ·{' '}
        {group.addedRows.length} added · {group.removedRows.length} removed ·{' '}
        {group.changedRows.length} changed · {group.unchangedRowCount} unchanged ·{' '}
        {group.knownProvenanceRowCount} known provenance
      </summary>

      {group.emptyState ? (
        <div className="mt-3 rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">
          {group.emptyState}
        </div>
      ) : rows.length > 0 ? (
        <div className="mt-3 space-y-3">
          {group.addedRows.length > 0 ? (
            <IssueRowDiffList label="Added Rows" rows={group.addedRows} />
          ) : null}
          {group.removedRows.length > 0 ? (
            <IssueRowDiffList label="Removed Rows" rows={group.removedRows} />
          ) : null}
          {group.changedRows.length > 0 ? (
            <IssueRowDiffList label="Changed Rows" rows={group.changedRows} />
          ) : null}
          {group.unchangedRows.length > 0 ? (
            <IssueRowDiffList label="Unchanged Rows" rows={group.unchangedRows} />
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No row-level drift in this group.</p>
      )}
    </details>
  );
}

function IssueRowDiffList({
  label,
  rows,
}: {
  label: string;
  rows: DraftingSchedulePackIssueRowComparison[];
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="rounded-md border">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stable Key</TableHead>
              <TableHead>Changed Fields</TableHead>
              <TableHead>Provenance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.rowKey}>
                <TableCell className="align-top">
                  <div className="font-medium">{row.label}</div>
                  <div className="text-muted-foreground">{row.objectType}</div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={row.status === 'unchanged' ? 'secondary' : 'outline'}>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[240px] break-all align-top text-muted-foreground">
                  {row.rowKey}
                </TableCell>
                <TableCell className="align-top">
                  {row.changedFields.length > 0 ? (
                    <div className="space-y-1">
                      {row.changedFields.map((field) => (
                        <div key={field.fieldKey}>
                          <span className="font-medium text-foreground">{field.label}:</span>{' '}
                          <span className="text-muted-foreground">
                            {field.issuedValue || 'blank'} -&gt; {field.liveValue || 'blank'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {row.status === 'added'
                        ? summarizeRowCells(row.liveRow)
                        : summarizeRowCells(row.issuedRow)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="min-w-[260px] align-top">
                  <RowProvenanceSummary row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RowProvenanceSummary({ row }: { row: DraftingSchedulePackIssueRowComparison }) {
  const provenance = row.provenance;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Badge variant={provenance.known ? 'secondary' : 'outline'}>
          {formatRowProvenanceAction(provenance.action)}
        </Badge>
        {provenance.fallbackMessage ? (
          <Badge variant="outline">{provenance.fallbackMessage}</Badge>
        ) : null}
      </div>
      <div className="text-muted-foreground">
        Source {provenance.sourceObjectType} · {provenance.sourceObjectId ?? 'No source object id'}
      </div>
      <div className="space-y-1">
        {provenance.liveObjectProvenance ? (
          <ProvenanceDetailLine label="Live" provenance={provenance.liveObjectProvenance} />
        ) : null}
        {provenance.issuedSnapshotProvenance ? (
          <ProvenanceDetailLine label="Issued" provenance={provenance.issuedSnapshotProvenance} />
        ) : null}
        {provenance.removalProvenance ? (
          <ProvenanceDetailLine label="Removal" provenance={provenance.removalProvenance} />
        ) : null}
      </div>
    </div>
  );
}

function ProvenanceDetailLine({
  label,
  provenance,
}: {
  label: string;
  provenance: DraftingSchedulePackIssueRowComparison['provenance']['liveObjectProvenance'];
}) {
  if (!provenance) {
    return null;
  }

  return (
    <div>
      <span className="font-medium text-foreground">{label}:</span>{' '}
      <span className="text-muted-foreground">
        {provenance.by ?? provenance.fallbackReason ?? 'Editor unavailable'} ·{' '}
        {formatOptionalDate(provenance.at)}
      </span>
      <span className="ml-1 text-muted-foreground">
        ({formatProvenanceSource(provenance.source)})
      </span>
    </div>
  );
}

function formatRowProvenanceAction(
  action: DraftingSchedulePackIssueRowComparison['provenance']['action'],
) {
  switch (action) {
    case 'created_after_issue':
      return 'created after issue';
    case 'changed_after_issue':
      return 'changed after issue';
    case 'removed_after_issue':
      return 'removed after issue';
    case 'unchanged_since_issue':
      return 'unchanged since issue';
    default:
      return 'unknown provenance';
  }
}

function formatProvenanceSource(
  source: NonNullable<
    DraftingSchedulePackIssueRowComparison['provenance']['liveObjectProvenance']
  >['source'],
) {
  switch (source) {
    case 'live_object':
      return 'live object';
    case 'issued_snapshot':
      return 'issued snapshot';
    case 'object_change_log':
      return 'change log';
    default:
      return 'legacy unavailable';
  }
}

function IssueSheetDetailCard({ sheet }: { sheet: DraftingSchedulePackIssueSheetDetail }) {
  return (
    <div className="space-y-3 rounded-md border p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium">
          {sheet.pageOrder}. {sheet.name}
        </div>
        <Badge variant={snapshotStatusBadgeVariant(sheet.snapshotStatus)}>
          {formatDraftingSchedulePackIssueSnapshotStatus(sheet.snapshotStatus)}
        </Badge>
        {sheet.hasTemplateDrift ? <Badge variant="outline">Template drift</Badge> : null}
        {sheet.hasSheetDefinitionDrift ? (
          <Badge variant="outline">Sheet-definition drift</Badge>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <DetailStat label="Issued Title" value={sheet.sheetTitle} />
        <DetailStat label="Issued Layout" value={sheet.issuedLayoutSummary} />
        <DetailStat label="Included Groups" value={sheet.includedGroupLabels.join(', ')} />
        <DetailStat label="Issued Revision" value={sheet.revisionLabel ?? 'Not recorded'} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border px-3 py-2">
          <div className="text-xs uppercase text-muted-foreground">Issued Template Snapshot</div>
          <div className="mt-1 text-sm font-medium">
            {sheet.templateSnapshotInfo.label ?? 'Legacy snapshot without stored template label'}
          </div>
          <div className="mt-1 text-muted-foreground">
            {renderTemplateIdentity({
              label: sheet.templateSnapshotInfo.rootSheetTemplateName,
              templateId: sheet.templateSnapshotInfo.rootSheetTemplateId,
              versionId: sheet.templateSnapshotInfo.rootSheetTemplateVersionId,
            })}
          </div>
          <p className="mt-2 text-muted-foreground">
            {sheet.templateSnapshotInfo.fallbackProvenance}
          </p>
        </div>

        <div className="rounded-md border px-3 py-2">
          <div className="text-xs uppercase text-muted-foreground">Current Live Template</div>
          <div className="mt-1 text-sm font-medium">
            {sheet.currentLiveTemplate?.label ?? 'Sheet definition missing from live pack'}
          </div>
          <div className="mt-1 text-muted-foreground">
            {sheet.currentLiveTemplate
              ? renderTemplateIdentity({
                  label: sheet.currentLiveTemplate.rootSheetTemplateName,
                  templateId: sheet.currentLiveTemplate.rootSheetTemplateId,
                  versionId: sheet.currentLiveTemplate.rootSheetTemplateVersionId,
                })
              : 'No live template metadata available.'}
          </div>
          <p className="mt-2 text-muted-foreground">
            {sheet.currentLiveLayoutSummary ?? 'No live layout metadata available.'}
          </p>
        </div>
      </div>

      {sheet.subtitle ? (
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Issued subtitle:</span> {sheet.subtitle}
        </p>
      ) : null}

      {sheet.currentLiveTemplateDiffers ? (
        <p className="text-amber-700">
          Current live template id/version no longer matches the issued snapshot binding.
        </p>
      ) : null}

      {sheet.driftMessages.length > 0 ? (
        <div className="space-y-1 text-muted-foreground">
          {sheet.driftMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Live pack remains aligned with this issued sheet.</p>
      )}
    </div>
  );
}

function snapshotStatusBadgeVariant(status: DraftingSchedulePackIssueSnapshotStatus) {
  return status === 'locked_template_snapshot' ? 'secondary' : 'outline';
}

function driftStateBadgeVariant(
  driftState: DraftingSchedulePackIssueComparisonSummary['driftState'],
) {
  return driftState === 'in_sync' ? 'secondary' : 'outline';
}

function formatOptionalDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : 'Not issued';
}

function formatSignedDelta(value: number) {
  if (value === 0) {
    return '0';
  }

  return value > 0 ? `+${value}` : String(value);
}

function summarizeRowCells(row: DraftingSchedulePackIssueRowComparison['issuedRow']) {
  if (!row) {
    return 'No row values available.';
  }

  const values = Object.values(row.cells).filter((value) => value.trim().length > 0);
  return values.slice(0, 4).join(' / ') || 'No populated fields.';
}

function renderTemplateIdentity(args: {
  label: string | null;
  templateId: string | null;
  versionId: string | null;
}) {
  const parts = [args.label, args.templateId, args.versionId].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'No root template id/version recorded.';
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
