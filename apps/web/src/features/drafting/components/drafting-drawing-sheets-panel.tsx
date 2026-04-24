import * as React from 'react';
import Link from 'next/link';
import type { DraftingDrawingSheetDefinition, DraftingModel } from '@eng/shared';
import { Copy, ExternalLink, Plus, Target, Trash2 } from 'lucide-react';
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
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import { coerceRootSheetTemplateDocument } from '@/features/templates/root-sheet-template-types';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import {
  addDrawingSheetDefinition,
  createDraftingDrawingSheetDefinition,
  deleteDrawingSheetDefinition,
  duplicateDrawingSheetDefinition,
  fitDrawingSheetDefinitionToModel,
  getDrawingSheetDefinitions,
  updateDrawingSheetDefinition,
} from '../sheets/drafting-drawing-sheet-utils';

const DEFAULT_TEMPLATE_VALUE = 'default';

export function DraftingDrawingSheetsPanel({
  drawingTitle,
  model,
  onModelChange,
  projectId,
}: {
  drawingTitle: string;
  model: DraftingModel;
  onModelChange: (model: DraftingModel) => void;
  projectId: string;
}) {
  const sheets = React.useMemo(() => getDrawingSheetDefinitions(model), [model]);
  const [activeSheetId, setActiveSheetId] = React.useState<string | null>(sheets[0]?.id ?? null);
  const activeSheet = sheets.find((sheet) => sheet.id === activeSheetId) ?? sheets[0] ?? null;
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

    setActiveSheetId(sheets[0]?.id ?? null);
  }, [activeSheetId, sheets]);

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

    setActiveSheetId(definition.id);
    onModelChange(addDrawingSheetDefinition(model, definition));
  }

  function handleDuplicateSheet() {
    if (!activeSheet) {
      return;
    }

    const nextId = crypto.randomUUID();
    setActiveSheetId(nextId);
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
        <Select value={activeSheet?.id ?? ''} onValueChange={setActiveSheetId}>
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
                onChange={(value) => patchViewport({ scale: Math.max(0.0001, value) })}
              />
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
