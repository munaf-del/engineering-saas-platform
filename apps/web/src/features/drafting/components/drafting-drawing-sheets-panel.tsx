import * as React from 'react';
import Link from 'next/link';
import type { DraftingDrawingSheetDefinition, DraftingLayerId, DraftingModel } from '@eng/shared';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Crosshair,
  ExternalLink,
  FileJson,
  GitCompare,
  History,
  Lock,
  Maximize2,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { downloadDraftingDrawingSheetIssueManifestJson } from '../export-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import { coerceRootSheetTemplateDocument } from '@/features/templates/root-sheet-template-types';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import {
  addDrawingSheetDefinition,
  createDraftingDrawingSheetDefinition,
  deleteDrawingSheetDefinition,
  duplicateDrawingSheetDefinition,
  fitDrawingSheetDefinitionToModel,
  fitDrawingSheetDefinitionToSelectedObjects,
  fitDrawingSheetViewportToCurrentCanvasView,
  getDrawingSheetDefinitions,
  nudgeDrawingSheetViewport,
  resetDrawingSheetViewport,
  updateDrawingSheetDefinition,
  zoomDrawingSheetViewport,
} from '../sheets/drafting-drawing-sheet-utils';
import {
  addDrawingSheetIssue,
  compareDraftingDrawingSheetIssue,
  createDraftingDrawingSheetIssueSnapshot,
  getDrawingSheetIssues,
} from '../sheets/drafting-drawing-sheet-issue-utils';

const DEFAULT_TEMPLATE_VALUE = 'default';

export function DraftingDrawingSheetsPanel({
  activeSheetId,
  canvasSize,
  currentUserName,
  currentView,
  drawingTitle,
  model,
  onActiveSheetChange,
  onModelChange,
  onViewportOverlayEnabledChange,
  selectedObjectIds = [],
  viewportOverlayEnabled,
  projectId,
}: {
  activeSheetId: string | null;
  canvasSize: { height: number; width: number };
  currentUserName: string | null;
  currentView: DraftingModel['view'];
  drawingTitle: string;
  model: DraftingModel;
  onActiveSheetChange: (sheetId: string | null) => void;
  onModelChange: (model: DraftingModel) => void;
  onViewportOverlayEnabledChange: (enabled: boolean) => void;
  selectedObjectIds?: string[];
  viewportOverlayEnabled: boolean;
  projectId: string;
}) {
  const sheets = React.useMemo(() => getDrawingSheetDefinitions(model), [model]);
  const issues = React.useMemo(() => getDrawingSheetIssues(model), [model]);
  const activeSheet = sheets.find((sheet) => sheet.id === activeSheetId) ?? sheets[0] ?? null;
  const { data: rootTemplates = [] } = useRootSheetTemplates();
  const rootTemplatesById = React.useMemo(
    () => new Map(rootTemplates.map((template) => [template.id, template] as const)),
    [rootTemplates],
  );
  const [issueNumber, setIssueNumber] = React.useState('ISS-001');
  const [issueRevision, setIssueRevision] = React.useState('A');
  const [issuePurpose, setIssuePurpose] = React.useState('For review');
  const [issueStatus, setIssueStatus] = React.useState<'draft' | 'issued' | 'superseded'>('issued');
  const [issueNotes, setIssueNotes] = React.useState('');
  const [selectedIssueSheetIds, setSelectedIssueSheetIds] = React.useState<string[]>([]);
  const [selectedIssueId, setSelectedIssueId] = React.useState('');
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
            orientation: document.orientation,
            pageSize: document.paperSize,
            value: template.id,
          };
        })
        .filter((option): option is NonNullable<typeof option> => option !== null),
    [rootTemplates],
  );

  React.useEffect(() => {
    if (activeSheetId && sheets.some((sheet) => sheet.id === activeSheetId)) {
      return;
    }

    onActiveSheetChange(sheets[0]?.id ?? null);
  }, [activeSheetId, onActiveSheetChange, sheets]);

  React.useEffect(() => {
    if (selectedIssueSheetIds.length > 0) {
      return;
    }
    setSelectedIssueSheetIds(activeSheet ? [activeSheet.id] : sheets[0] ? [sheets[0].id] : []);
  }, [activeSheet, selectedIssueSheetIds.length, sheets]);

  React.useEffect(() => {
    if (selectedIssueId && issues.some((issue) => issue.id === selectedIssueId)) {
      return;
    }
    setSelectedIssueId(issues.at(-1)?.id ?? '');
  }, [issues, selectedIssueId]);

  function handleCreateSheet() {
    const nextName = `Drawing Sheet ${sheets.length + 1}`;
    const definition = fitDrawingSheetDefinitionToModel(
      model,
      createDraftingDrawingSheetDefinition({
        id: crypto.randomUUID(),
        name: nextName,
        sheetNumber: `S-${String(sheets.length + 1).padStart(3, '0')}`,
        title: model.titleBlock?.drawingTitle || drawingTitle,
      }),
    );

    onActiveSheetChange(definition.id);
    onModelChange(addDrawingSheetDefinition(model, definition));
  }

  function handleDuplicateSheet() {
    if (!activeSheet) {
      return;
    }

    const nextId = crypto.randomUUID();
    onActiveSheetChange(nextId);
    onModelChange(duplicateDrawingSheetDefinition(model, activeSheet.id, nextId));
  }

  function handleDeleteSheet() {
    if (!activeSheet) {
      return;
    }

    onModelChange(deleteDrawingSheetDefinition(model, activeSheet.id));
  }

  function patchActiveSheet(patch: Partial<DraftingDrawingSheetDefinition>) {
    if (!activeSheet) {
      return;
    }

    onModelChange(updateDrawingSheetDefinition(model, activeSheet.id, patch));
  }

  function patchViewport(patch: Partial<DraftingDrawingSheetDefinition['viewport']>) {
    if (!activeSheet) {
      return;
    }

    patchActiveSheet({
      viewport: {
        ...activeSheet.viewport,
        ...patch,
      },
    });
  }

  function replaceViewport(viewport: DraftingDrawingSheetDefinition['viewport']) {
    if (!activeSheet) {
      return;
    }

    patchActiveSheet({ viewport });
  }

  function handleFitModelExtents() {
    if (!activeSheet) {
      return;
    }

    onModelChange(
      updateDrawingSheetDefinition(
        model,
        activeSheet.id,
        fitDrawingSheetDefinitionToModel(model, {
          ...activeSheet,
          viewport: { ...activeSheet.viewport, fitMode: 'model_extents' },
        }),
      ),
    );
  }

  function handleFitSelectedObjects() {
    if (!activeSheet || selectedObjectIds.length === 0) {
      return;
    }

    onModelChange(
      updateDrawingSheetDefinition(
        model,
        activeSheet.id,
        fitDrawingSheetDefinitionToSelectedObjects(model, activeSheet, selectedObjectIds),
      ),
    );
  }

  function handleUseCurrentCanvasView() {
    if (!activeSheet) {
      return;
    }

    replaceViewport(
      fitDrawingSheetViewportToCurrentCanvasView({
        canvasHeightPx: canvasSize.height,
        canvasWidthPx: canvasSize.width,
        frameHeightMm: activeSheet.viewport.heightMm ?? 220,
        frameWidthMm: activeSheet.viewport.widthMm ?? 360,
        view: currentView,
      }),
    );
  }

  function handleNudge(direction: 'left' | 'right' | 'up' | 'down') {
    if (!activeSheet) {
      return;
    }

    replaceViewport(nudgeDrawingSheetViewport(activeSheet.viewport, direction));
  }

  function handleZoom(direction: 'in' | 'out') {
    if (!activeSheet) {
      return;
    }

    replaceViewport(zoomDrawingSheetViewport(activeSheet.viewport, direction));
  }

  function handleResetViewport() {
    if (!activeSheet) {
      return;
    }

    replaceViewport(
      resetDrawingSheetViewport(activeSheet.viewport.widthMm, activeSheet.viewport.heightMm),
    );
  }

  function handleLayerVisibilityChange(layerId: DraftingLayerId, checked: boolean) {
    if (!activeSheet) {
      return;
    }

    const currentHidden = activeSheet.layerFilter?.hiddenLayerIds ?? [];
    const nextHidden = checked
      ? currentHidden.filter((candidate) => candidate !== layerId)
      : [...new Set([...currentHidden, layerId])];
    const nextLayerFilter = {
      ...(activeSheet.layerFilter ?? {}),
      hiddenLayerIds: nextHidden,
    };

    patchActiveSheet({
      layerFilter:
        (nextLayerFilter.visibleLayerIds?.length ?? 0) > 0 || nextHidden.length > 0
          ? nextLayerFilter
          : undefined,
    });
  }

  function handleIssueSheetSelection(sheetId: string, checked: boolean) {
    setSelectedIssueSheetIds((current) =>
      checked
        ? [...new Set([...current, sheetId])]
        : current.filter((candidate) => candidate !== sheetId),
    );
  }

  function handleCreateIssue() {
    const issue = createDraftingDrawingSheetIssueSnapshot(model, {
      id: crypto.randomUUID(),
      issueNumber: issueNumber.trim() || `ISS-${String(issues.length + 1).padStart(3, '0')}`,
      issuedBy: currentUserName,
      notes: issueNotes.trim() || undefined,
      purpose: issuePurpose.trim() || 'For review',
      revision: issueRevision.trim() || 'A',
      rootTemplatesById,
      sheetIds: selectedIssueSheetIds,
      status: issueStatus,
    });
    onModelChange(addDrawingSheetIssue(model, issue));
    setSelectedIssueId(issue.id);
    setIssueNumber(nextIssueNumber(issue.issueNumber, issues.length + 2));
  }

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) ?? issues.at(-1);
  const selectedIssueComparison = selectedIssue
    ? compareDraftingDrawingSheetIssue(model, selectedIssue, rootTemplatesById)
    : null;

  function handleTemplateChange(value: string) {
    if (!activeSheet) {
      return;
    }

    if (value === DEFAULT_TEMPLATE_VALUE) {
      patchActiveSheet({ rootSheetTemplateId: null });
      return;
    }

    const option = templateOptions.find((candidate) => candidate.value === value);
    patchActiveSheet({
      orientation: option?.orientation ?? activeSheet.orientation,
      pageSize: option?.pageSize ?? activeSheet.pageSize,
      rootSheetTemplateId: value,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Drawing Sheets</div>
          <div className="text-xs text-muted-foreground">
            {sheets.length} saved drawing sheet{sheets.length === 1 ? '' : 's'}
          </div>
        </div>
        <Button size="sm" type="button" onClick={handleCreateSheet}>
          <Plus className="mr-2 h-4 w-4" />
          Create
        </Button>
      </div>

      {sheets.length > 0 ? (
        <Select value={activeSheet?.id ?? ''} onValueChange={onActiveSheetChange}>
          <SelectTrigger aria-label="Saved drawing sheet definition">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sheets.map((sheet) => (
              <SelectItem key={sheet.id} value={sheet.id}>
                {sheet.sheetNumber} - {sheet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {activeSheet ? (
        <div className="space-y-4 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" type="button" variant="outline" onClick={handleDuplicateSheet}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={handleFitModelExtents}>
              <Target className="mr-2 h-4 w-4" />
              Fit
            </Button>
            <Button size="sm" type="button" variant="destructive" onClick={handleDeleteSheet}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>

          <div className="grid gap-3">
            <LabeledInput
              id="drawing-sheet-name"
              label="Name"
              value={activeSheet.name}
              onChange={(value) => patchActiveSheet({ name: value })}
            />
            <LabeledInput
              id="drawing-sheet-title"
              label="Sheet title"
              value={activeSheet.title}
              onChange={(value) => patchActiveSheet({ title: value })}
            />
            <LabeledInput
              id="drawing-sheet-number"
              label="Sheet number"
              value={activeSheet.sheetNumber}
              onChange={(value) => patchActiveSheet({ sheetNumber: value })}
            />
            <LabeledInput
              id="drawing-sheet-scale"
              label="Scale label"
              value={activeSheet.scaleLabel}
              onChange={(value) => patchActiveSheet({ scaleLabel: value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="drawing-sheet-page-size">Page size</Label>
              <Select
                value={activeSheet.pageSize}
                onValueChange={(value) =>
                  patchActiveSheet({
                    pageSize: value as DraftingDrawingSheetDefinition['pageSize'],
                  })
                }
              >
                <SelectTrigger id="drawing-sheet-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['a4', 'a3', 'a2', 'a1', 'a0'] as const).map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize}>
                      {pageSize.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="drawing-sheet-orientation">Orientation</Label>
              <Select
                value={activeSheet.orientation}
                onValueChange={(value) =>
                  patchActiveSheet({
                    orientation: value as DraftingDrawingSheetDefinition['orientation'],
                  })
                }
              >
                <SelectTrigger id="drawing-sheet-orientation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Landscape</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="drawing-sheet-template">Root sheet template</Label>
            <Select
              value={activeSheet.rootSheetTemplateId ?? DEFAULT_TEMPLATE_VALUE}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger id="drawing-sheet-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_TEMPLATE_VALUE}>Default layout</SelectItem>
                {templateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="text-sm font-medium">Viewport</div>
            <CheckboxRow
              checked={viewportOverlayEnabled}
              id="drawing-sheet-show-viewport-overlay"
              label="Show viewport overlay"
              onChange={onViewportOverlayEnabledChange}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" type="button" variant="outline" onClick={handleFitModelExtents}>
                <Target className="mr-2 h-4 w-4" />
                Fit model
              </Button>
              <Button
                disabled={selectedObjectIds.length === 0}
                size="sm"
                type="button"
                variant="outline"
                onClick={handleFitSelectedObjects}
              >
                <Crosshair className="mr-2 h-4 w-4" />
                Fit selected
              </Button>
              <Button
                className="col-span-2"
                size="sm"
                type="button"
                variant="outline"
                onClick={handleUseCurrentCanvasView}
              >
                <Maximize2 className="mr-2 h-4 w-4" />
                Use current canvas view
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="drawing-sheet-fit-mode">Fit mode</Label>
              <Select
                value={activeSheet.viewport.fitMode}
                onValueChange={(value) =>
                  patchViewport({
                    fitMode: value as DraftingDrawingSheetDefinition['viewport']['fitMode'],
                  })
                }
              >
                <SelectTrigger id="drawing-sheet-fit-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="model_extents">Model extents</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <NumberInput
                id="drawing-sheet-center-x"
                label="Centre X"
                value={activeSheet.viewport.center.x}
                onChange={(value) =>
                  patchViewport({ center: { ...activeSheet.viewport.center, x: value } })
                }
              />
              <NumberInput
                id="drawing-sheet-center-y"
                label="Centre Y"
                value={activeSheet.viewport.center.y}
                onChange={(value) =>
                  patchViewport({ center: { ...activeSheet.viewport.center, y: value } })
                }
              />
              <NumberInput
                id="drawing-sheet-viewport-scale"
                label="Scale"
                step="0.001"
                value={activeSheet.viewport.scale}
                onChange={(value) =>
                  patchViewport({ fitMode: 'manual', scale: Math.max(0.0001, value) })
                }
              />
              <NumberInput
                id="drawing-sheet-viewport-rotation"
                label="Rotation"
                step="1"
                value={activeSheet.viewport.rotationDeg ?? 0}
                onChange={(value) => patchViewport({ fitMode: 'manual', rotationDeg: value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                aria-label="Nudge viewport up"
                className="col-start-2"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => handleNudge('up')}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Nudge viewport left"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => handleNudge('left')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Reset viewport"
                size="icon"
                type="button"
                variant="outline"
                onClick={handleResetViewport}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Nudge viewport right"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => handleNudge('right')}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Zoom viewport in"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => handleZoom('in')}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Nudge viewport down"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => handleNudge('down')}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Zoom viewport out"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => handleZoom('out')}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              Centre {activeSheet.viewport.center.x.toFixed(0)},{' '}
              {activeSheet.viewport.center.y.toFixed(0)} mm - scale{' '}
              {activeSheet.viewport.scale.toFixed(4)}
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <CheckboxRow
              checked={activeSheet.includeUnderlays}
              id="drawing-sheet-include-underlays"
              label="Include PDF underlays"
              onChange={(checked) => patchActiveSheet({ includeUnderlays: checked })}
            />
            <CheckboxRow
              checked={activeSheet.includeGrid}
              id="drawing-sheet-include-grid"
              label="Include grid"
              onChange={(checked) => patchActiveSheet({ includeGrid: checked })}
            />
            <CheckboxRow
              checked={activeSheet.includeObjectLabels}
              id="drawing-sheet-include-labels"
              label="Include object labels"
              onChange={(checked) => patchActiveSheet({ includeObjectLabels: checked })}
            />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="text-sm font-medium">Sheet layers</div>
            <div className="grid gap-2 text-sm">
              {model.layers.map((layer) => (
                <CheckboxRow
                  checked={!(activeSheet.layerFilter?.hiddenLayerIds ?? []).includes(layer.id)}
                  id={`drawing-sheet-layer-${layer.id}`}
                  key={layer.id}
                  label={layer.name}
                  onChange={(checked) => handleLayerVisibilityChange(layer.id, checked)}
                />
              ))}
            </div>
          </div>

          <Link
            className={buttonVariants({ className: 'w-full', variant: 'outline' })}
            href={`/projects/${projectId}/drafting/${model.drawingId}/sheets/preview?sheetId=${activeSheet.id}`}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open sheet preview
          </Link>
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No drawing sheet definitions.
        </div>
      )}

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" />
              Drawing Sheet Issues
            </div>
            <div className="text-xs text-muted-foreground">
              {issues.length} frozen issue snapshot{issues.length === 1 ? '' : 's'}
            </div>
          </div>
          <Button
            disabled={selectedIssueSheetIds.length === 0}
            size="sm"
            type="button"
            onClick={handleCreateIssue}
          >
            <Plus className="mr-2 h-4 w-4" />
            Issue
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <LabeledInput
            id="drawing-sheet-issue-number"
            label="Issue number"
            value={issueNumber}
            onChange={setIssueNumber}
          />
          <LabeledInput
            id="drawing-sheet-issue-revision"
            label="Revision"
            value={issueRevision}
            onChange={setIssueRevision}
          />
        </div>
        <LabeledInput
          id="drawing-sheet-issue-purpose"
          label="Purpose"
          value={issuePurpose}
          onChange={setIssuePurpose}
        />
        <div className="space-y-1">
          <Label htmlFor="drawing-sheet-issue-status">Status</Label>
          <Select
            value={issueStatus}
            onValueChange={(value) => setIssueStatus(value as 'draft' | 'issued' | 'superseded')}
          >
            <SelectTrigger id="drawing-sheet-issue-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="superseded">Superseded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="drawing-sheet-issue-notes">Notes</Label>
          <Textarea
            id="drawing-sheet-issue-notes"
            value={issueNotes}
            onChange={(event) => setIssueNotes(event.target.value)}
          />
        </div>
        <div className="space-y-2 rounded-md border p-2">
          <div className="text-xs font-medium uppercase text-muted-foreground">Sheets to issue</div>
          {sheets.map((sheet) => (
            <CheckboxRow
              checked={selectedIssueSheetIds.includes(sheet.id)}
              id={`drawing-sheet-issue-include-${sheet.id}`}
              key={sheet.id}
              label={`${sheet.sheetNumber} - ${sheet.name}`}
              onChange={(checked) => handleIssueSheetSelection(sheet.id, checked)}
            />
          ))}
        </div>

        {issues.length > 0 ? (
          <div className="space-y-3 rounded-md border p-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4" />
              Issued history
            </div>
            <Select value={selectedIssue?.id ?? ''} onValueChange={setSelectedIssueId}>
              <SelectTrigger aria-label="Drawing sheet issue history">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {issues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    {issue.issueNumber} - Rev {issue.revision} - {issue.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedIssue ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  Issued {formatIssueDate(selectedIssue.issueDate)}
                  {selectedIssue.issuedBy ? ` by ${selectedIssue.issuedBy}` : ''}
                </div>
                <div>{selectedIssue.lockedDrawingSheets.length} locked sheet(s)</div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                    href={`/projects/${projectId}/drafting/${model.drawingId}/sheets/preview?issueId=${selectedIssue.id}`}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open issued preview
                  </Link>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadDraftingDrawingSheetIssueManifestJson({
                        issue: selectedIssue,
                        model,
                        rootTemplatesById,
                        title: drawingTitle,
                      })
                    }
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    Manifest JSON
                  </Button>
                </div>
                {selectedIssueComparison ? (
                  <IssueComparisonSummary comparison={selectedIssueComparison} />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IssueComparisonSummary({
  comparison,
}: {
  comparison: ReturnType<typeof compareDraftingDrawingSheetIssue>;
}) {
  const objectDriftCount =
    comparison.objects.added.length +
    comparison.objects.changed.length +
    comparison.objects.removed.length;
  const underlayDriftCount =
    comparison.underlays.added.length +
    comparison.underlays.changed.length +
    comparison.underlays.removed.length;

  return (
    <div className="space-y-2 rounded-md bg-muted p-2">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <GitCompare className="h-4 w-4" />
        Live vs issued comparison
      </div>
      <ComparisonLine
        label="Title / revision"
        value={
          comparison.titleRevision.hasDrift
            ? comparison.titleRevision.messages.join(' ')
            : 'No title or revision drift.'
        }
      />
      <ComparisonLine
        label="Viewport / sheets"
        value={
          comparison.sheets.some((sheet) => sheet.hasDrift)
            ? comparison.sheets
                .flatMap((sheet) =>
                  sheet.messages.length
                    ? sheet.messages.map((message) => `${sheet.issuedSheetLabel}: ${message}`)
                    : [`${sheet.issuedSheetLabel}: changed`],
                )
                .join(' ')
            : 'No sheet definition or viewport drift.'
        }
      />
      <ComparisonLine
        label="Objects"
        value={
          objectDriftCount
            ? `${comparison.objects.added.length} added, ${comparison.objects.removed.length} removed, ${comparison.objects.changed.length} changed.`
            : 'No object drift.'
        }
      />
      <ComparisonLine
        label="Underlays"
        value={
          underlayDriftCount
            ? `${comparison.underlays.added.length} added, ${comparison.underlays.removed.length} removed, ${comparison.underlays.changed.length} changed.`
            : 'No underlay metadata drift.'
        }
      />
    </div>
  );
}

function ComparisonLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}: </span>
      {value}
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
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function NumberInput({
  id,
  label,
  onChange,
  step = '1',
  value,
}: {
  id: string;
  label: string;
  onChange: (value: number) => void;
  step?: string;
  value: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        step={step}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function CheckboxRow({
  checked,
  id,
  label,
  onChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2" htmlFor={id}>
      <input
        checked={checked}
        className="h-4 w-4 rounded border-border"
        id={id}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function nextIssueNumber(current: string, fallbackIndex: number) {
  const numericMatch = /^(.*?)(\d+)$/.exec(current.trim());
  if (!numericMatch) {
    return `ISS-${String(fallbackIndex).padStart(3, '0')}`;
  }

  const prefix = numericMatch[1] ?? '';
  const next = Number(numericMatch[2]) + 1;
  return `${prefix}${String(next).padStart(numericMatch[2]!.length, '0')}`;
}

function formatIssueDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
