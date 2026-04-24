'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import type { DraftingDrawing, DraftingDrawingSheetDefinition, Project } from '@eng/shared';
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
import { getTemplatePageLayout } from '@/features/templates/core/template-page';
import type { GenericTemplateDocument } from '@/features/templates/core/generic-template-document';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import { createGridAxisValues } from '../geometry-utils';
import {
  formatDrawingRevision,
  getDraftingCurrentRevisionLabel,
  getDraftingDrawingTitle,
  getLayerById,
} from '../model-utils';
import { DraftingPdfUnderlay } from '../components/drafting-pdf-underlay';
import { renderDraftingObject } from '../renderers/render-drafting-object';
import {
  DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_HEIGHT_MM,
  DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_WIDTH_MM,
  getDrawingSheetDefinitions,
  getDrawingSheetVisibleObjects,
  getDrawingSheetVisibleUnderlays,
} from './drafting-drawing-sheet-utils';

export type DraftingDrawingSheetPreviewMode = 'all' | 'sheet';

export function DraftingDrawingSheetPreviewPage({
  drawingId,
  initialMode = 'sheet',
  initialSheetId,
  project,
  projectId,
}: {
  drawingId: string;
  initialMode?: DraftingDrawingSheetPreviewMode;
  initialSheetId?: string;
  project: Project;
  projectId: string;
}) {
  const { data: drawing, isLoading: drawingLoading } = useDraftingDrawing(projectId, drawingId);
  const { data: rootTemplates = [], isLoading: templatesLoading } = useRootSheetTemplates();
  const [previewMode, setPreviewMode] =
    React.useState<DraftingDrawingSheetPreviewMode>(initialMode);
  const [selectedSheetId, setSelectedSheetId] = React.useState(initialSheetId ?? '');

  if (drawingLoading || templatesLoading || !drawing) {
    return <PageLoading />;
  }

  return (
    <DraftingDrawingSheetPreview
      drawing={drawing}
      onModeChange={setPreviewMode}
      onSelectedSheetIdChange={setSelectedSheetId}
      previewMode={previewMode}
      project={project}
      projectId={projectId}
      rootTemplates={rootTemplates}
      selectedSheetId={selectedSheetId}
    />
  );
}

export function DraftingDrawingSheetPreview({
  drawing,
  onModeChange,
  onSelectedSheetIdChange,
  previewMode,
  project,
  projectId,
  rootTemplates,
  selectedSheetId,
}: {
  drawing: DraftingDrawing;
  onModeChange: (mode: DraftingDrawingSheetPreviewMode) => void;
  onSelectedSheetIdChange: (sheetId: string) => void;
  previewMode: DraftingDrawingSheetPreviewMode;
  project: Project;
  projectId: string;
  rootTemplates: RootSheetTemplate[];
  selectedSheetId: string;
}) {
  const sheets = React.useMemo(() => getDrawingSheetDefinitions(drawing.model), [drawing.model]);
  const selectedSheet = sheets.find((sheet) => sheet.id === selectedSheetId) ?? sheets[0] ?? null;
  const sheetsToRender = previewMode === 'all' ? sheets : selectedSheet ? [selectedSheet] : [];
  const rootTemplatesById = React.useMemo(
    () => new Map(rootTemplates.map((template) => [template.id, template] as const)),
    [rootTemplates],
  );
  const drawingRevision =
    getDraftingCurrentRevisionLabel(drawing.model) ?? formatDrawingRevision(drawing);
  const currentRevisionRow =
    drawing.model.revisionBlock?.revisions.find((row) => row.revision === drawingRevision) ??
    drawing.model.revisionBlock?.revisions.at(-1) ??
    null;
  const drawingTitle = getDraftingDrawingTitle(drawing.model, drawing.title);

  React.useEffect(() => {
    if (selectedSheetId || !selectedSheet) {
      return;
    }

    onSelectedSheetIdChange(selectedSheet.id);
  }, [onSelectedSheetIdChange, selectedSheet, selectedSheetId]);

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
              <h1 className="text-2xl font-bold tracking-tight">Drawing Sheet Preview</h1>
              {selectedSheet ? (
                <>
                  <Badge variant="secondary">{selectedSheet.pageSize.toUpperCase()}</Badge>
                  <Badge variant="outline">{selectedSheet.orientation}</Badge>
                  <Badge variant="outline">{selectedSheet.scaleLabel}</Badge>
                </>
              ) : null}
              {drawingRevision ? <Badge variant="secondary">Rev {drawingRevision}</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {project.code} - {drawingTitle} - {selectedSheet?.name ?? 'No drawing sheets'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={previewMode}
            onValueChange={(value) => onModeChange(value as DraftingDrawingSheetPreviewMode)}
          >
            <SelectTrigger className="w-[150px]" aria-label="Preview mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sheet">One sheet</SelectItem>
              <SelectItem value="all">All sheets</SelectItem>
            </SelectContent>
          </Select>

          <Select
            disabled={sheets.length === 0 || previewMode === 'all'}
            value={selectedSheet?.id ?? ''}
            onValueChange={onSelectedSheetIdChange}
          >
            <SelectTrigger className="w-[260px]" aria-label="Drawing sheet definition">
              <SelectValue placeholder="No saved drawing sheets" />
            </SelectTrigger>
            <SelectContent>
              {sheets.map((sheet) => (
                <SelectItem key={sheet.id} value={sheet.id}>
                  {sheet.sheetNumber} - {sheet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link
            href={`/projects/${projectId}/drafting/${drawing.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Editor
          </Link>
          <Button
            disabled={sheetsToRender.length === 0}
            type="button"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {sheetsToRender.length === 0 ? (
        <div className="rounded-md border border-dashed bg-white px-6 py-12 text-center text-sm text-muted-foreground print:hidden">
          No saved drawing sheet definitions are available for this preview.
        </div>
      ) : (
        <div
          className="space-y-6 overflow-auto rounded-md border bg-slate-100 p-6 print:space-y-0 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0"
          data-testid="drafting-drawing-sheet-pack-preview"
        >
          {sheetsToRender.map((sheet) => (
            <DraftingDrawingSheetPage
              currentRevisionRow={currentRevisionRow}
              drawing={drawing}
              drawingRevision={drawingRevision}
              drawingTitle={drawingTitle}
              key={sheet.id}
              project={project}
              rootTemplate={
                sheet.rootSheetTemplateId ? rootTemplatesById.get(sheet.rootSheetTemplateId) : null
              }
              sheet={sheet}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DraftingDrawingSheetPage({
  currentRevisionRow,
  drawing,
  drawingRevision,
  drawingTitle,
  project,
  rootTemplate,
  sheet,
}: {
  currentRevisionRow:
    | NonNullable<DraftingDrawing['model']['revisionBlock']>['revisions'][number]
    | null;
  drawing: DraftingDrawing;
  drawingRevision: string;
  drawingTitle: string;
  project: Project;
  rootTemplate: RootSheetTemplate | null | undefined;
  sheet: DraftingDrawingSheetDefinition;
}) {
  const rootTemplateDocument = coerceRootSheetTemplateDocument(rootTemplate);
  const layout = getTemplatePageLayout(
    rootTemplateDocument?.paperSize ?? sheet.pageSize,
    rootTemplateDocument?.orientation ?? sheet.orientation,
  );
  const sheetLayout = resolveDrawingSheetLayout(sheet, rootTemplateDocument);
  const visibleObjects = getDrawingSheetVisibleObjects(drawing.model, sheet);
  const visibleUnderlays = getDrawingSheetVisibleUnderlays(drawing.model, sheet);
  const viewport = {
    ...sheet.viewport,
    heightMm: sheet.viewport.heightMm ?? sheetLayout.viewport.height,
    widthMm: sheet.viewport.widthMm ?? sheetLayout.viewport.width,
  };
  const transform = buildViewportTransform({
    centerX: viewport.center.x,
    centerY: viewport.center.y,
    frameHeightMm: sheetLayout.viewport.height,
    frameWidthMm: sheetLayout.viewport.width,
    rotationDeg: viewport.rotationDeg ?? 0,
    scale: viewport.scale,
  });

  return (
    <article
      className="package-print-page bg-white shadow-sm print:shadow-none"
      data-print-orientation={layout.orientation}
      data-print-page-size={layout.paperSize}
      data-testid="drafting-drawing-sheet-page"
      style={{
        height: `${layout.heightMm}mm`,
        position: 'relative',
        width: `${layout.widthMm}mm`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute border-2 border-slate-950"
        style={{
          inset: layout.paperSize === 'a0' || layout.paperSize === 'a1' ? '20mm' : '10mm',
        }}
      />

      <section
        className="absolute overflow-hidden border border-slate-900 bg-white"
        data-testid="drafting-geometry-viewport"
        style={{
          height: `${sheetLayout.viewport.height}mm`,
          left: `${sheetLayout.viewport.x}mm`,
          top: `${sheetLayout.viewport.y}mm`,
          width: `${sheetLayout.viewport.width}mm`,
        }}
      >
        <svg
          className={sheet.includeObjectLabels ? '' : 'drafting-sheet-hide-labels'}
          height="100%"
          preserveAspectRatio="none"
          viewBox={`0 0 ${sheetLayout.viewport.width} ${sheetLayout.viewport.height}`}
          width="100%"
        >
          <style>{'.drafting-sheet-hide-labels text{display:none}'}</style>
          <rect
            fill="#f8fafc"
            height={sheetLayout.viewport.height}
            width={sheetLayout.viewport.width}
            x={0}
            y={0}
          />
          {sheet.includeGrid ? (
            <DrawingSheetGrid
              frameHeightMm={sheetLayout.viewport.height}
              frameWidthMm={sheetLayout.viewport.width}
              viewport={viewport}
            />
          ) : null}

          <g transform={transform}>
            {visibleUnderlays.map((underlay) => (
              <DraftingPdfUnderlay
                calibrationPoints={null}
                cropPreview={null}
                interactionEnabled={false}
                isSelected={false}
                key={underlay.id}
                underlay={underlay}
              />
            ))}

            {visibleObjects.map((object) => (
              <React.Fragment key={object.id}>
                {renderDraftingObject({
                  isSelected: false,
                  layer: getLayerById(drawing.model, object.layerId),
                  object,
                  onPointerDown: () => {},
                })}
              </React.Fragment>
            ))}
          </g>

          {sheet.includeUnderlays && visibleUnderlays.length > 0 ? (
            <UnderlayMetadataPlaceholders underlays={visibleUnderlays} />
          ) : null}
        </svg>
      </section>

      <TitleBlock
        currentRevisionRow={currentRevisionRow}
        drawing={drawing}
        drawingRevision={drawingRevision}
        drawingTitle={drawingTitle}
        layout={sheetLayout.titleBlock}
        project={project}
        rootTemplateDocument={rootTemplateDocument}
        sheet={sheet}
      />
    </article>
  );
}

function DrawingSheetGrid({
  frameHeightMm,
  frameWidthMm,
  viewport,
}: {
  frameHeightMm: number;
  frameWidthMm: number;
  viewport: DraftingDrawingSheetDefinition['viewport'];
}) {
  const worldWidth = frameWidthMm / viewport.scale;
  const worldHeight = frameHeightMm / viewport.scale;
  const minX = viewport.center.x - worldWidth / 2;
  const maxX = viewport.center.x + worldWidth / 2;
  const minY = viewport.center.y - worldHeight / 2;
  const maxY = viewport.center.y + worldHeight / 2;
  const step =
    [1000, 2000, 5000, 10000, 20000].find((candidate) => candidate * viewport.scale >= 8) ?? 20000;
  const xValues = createGridAxisValues(minX, maxX, step);
  const yValues = createGridAxisValues(minY, maxY, step);

  return (
    <g stroke="#e2e8f0" strokeWidth={0.25}>
      {xValues.map((x) => (
        <line
          key={`grid-x-${x}`}
          x1={frameWidthMm / 2 + (x - viewport.center.x) * viewport.scale}
          x2={frameWidthMm / 2 + (x - viewport.center.x) * viewport.scale}
          y1={0}
          y2={frameHeightMm}
        />
      ))}
      {yValues.map((y) => (
        <line
          key={`grid-y-${y}`}
          x1={0}
          x2={frameWidthMm}
          y1={frameHeightMm / 2 + (y - viewport.center.y) * viewport.scale}
          y2={frameHeightMm / 2 + (y - viewport.center.y) * viewport.scale}
        />
      ))}
    </g>
  );
}

function UnderlayMetadataPlaceholders({
  underlays,
}: {
  underlays: Array<{ fileName: string; id: string; pageNumber: number }>;
}) {
  return (
    <g data-testid="drafting-sheet-underlay-metadata">
      {underlays.map((underlay, index) => (
        <text fill="#64748b" fontSize={3.2} key={underlay.id} x={4} y={6 + index * 5}>
          PDF underlay: {underlay.fileName} p{underlay.pageNumber}
        </text>
      ))}
    </g>
  );
}

function TitleBlock({
  currentRevisionRow,
  drawing,
  drawingRevision,
  drawingTitle,
  layout,
  project,
  rootTemplateDocument,
  sheet,
}: {
  currentRevisionRow:
    | NonNullable<DraftingDrawing['model']['revisionBlock']>['revisions'][number]
    | null;
  drawing: DraftingDrawing;
  drawingRevision: string;
  drawingTitle: string;
  layout: SheetRect;
  project: Project;
  rootTemplateDocument: GenericTemplateDocument | null;
  sheet: DraftingDrawingSheetDefinition;
}) {
  const titleBlock = drawing.model.titleBlock ?? {};
  const metadataRows = [
    ['Project', titleBlock.projectName ?? project.name],
    ['Drawing No.', titleBlock.drawingNumber ?? '-'],
    ['Sheet', sheet.sheetNumber || titleBlock.sheetNumber || '-'],
    ['Scale', sheet.scaleLabel || titleBlock.scale || '-'],
    ['Revision', drawingRevision || '-'],
    ['Status', currentRevisionRow?.status || titleBlock.status || '-'],
    ['Drawn', currentRevisionRow?.drawnBy || titleBlock.drawnBy || '-'],
    ['Checked', currentRevisionRow?.checkedBy || titleBlock.checkedBy || '-'],
    ['Approved', currentRevisionRow?.approvedBy || titleBlock.approvedBy || '-'],
  ];

  return (
    <section
      className="absolute grid grid-rows-[1fr_auto] border border-slate-950 bg-white text-slate-950"
      data-testid="drafting-sheet-title-block"
      style={{
        height: `${layout.height}mm`,
        left: `${layout.x}mm`,
        top: `${layout.y}mm`,
        width: `${layout.width}mm`,
      }}
    >
      <div className="grid grid-cols-[1fr_46mm]">
        <div className="min-w-0 border-r border-slate-950 p-[3mm]">
          <div className="text-[8px] font-semibold uppercase leading-tight text-slate-600">
            {rootTemplateDocument
              ? formatOperatorFacingSheetLabel(rootTemplateDocument.name)
              : 'Default drafting drawing sheet'}
          </div>
          <div className="mt-[2mm] text-[16px] font-semibold leading-tight">{sheet.title}</div>
          <div className="mt-[1mm] text-[11px] leading-tight text-slate-700">{drawingTitle}</div>
          {titleBlock.clientName ? (
            <div className="mt-[1mm] text-[10px] leading-tight text-slate-600">
              Client: {titleBlock.clientName}
            </div>
          ) : null}
        </div>
        <div className="grid grid-rows-3 text-[9px] leading-tight">
          <TitleCell label="Drawn" value={currentRevisionRow?.drawnBy || titleBlock.drawnBy} />
          <TitleCell
            label="Checked"
            value={currentRevisionRow?.checkedBy || titleBlock.checkedBy}
          />
          <TitleCell
            label="Approved"
            value={currentRevisionRow?.approvedBy || titleBlock.approvedBy}
            isLast
          />
        </div>
      </div>
      <div className="grid grid-cols-3 border-t border-slate-950 text-[8px] leading-tight">
        {metadataRows.map(([label, value], index) => (
          <div
            className={`grid grid-cols-[20mm_minmax(0,1fr)] ${index < metadataRows.length - 1 ? 'border-r border-slate-950' : ''}`}
            key={label}
          >
            <div className="border-r border-slate-300 px-[1.5mm] py-[1mm] font-semibold uppercase text-slate-500">
              {label}
            </div>
            <div className="truncate px-[1.5mm] py-[1mm]">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TitleCell({
  isLast = false,
  label,
  value,
}: {
  isLast?: boolean;
  label: string;
  value?: string;
}) {
  return (
    <div className={`px-[2mm] py-[1.5mm] ${isLast ? '' : 'border-b border-slate-950'}`}>
      <div className="font-semibold uppercase text-slate-500">{label}</div>
      <div>{value || '-'}</div>
    </div>
  );
}

type SheetRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function resolveDrawingSheetLayout(
  sheet: DraftingDrawingSheetDefinition,
  rootTemplateDocument: GenericTemplateDocument | null,
): { titleBlock: SheetRect; viewport: SheetRect } {
  const layout = getTemplatePageLayout(
    rootTemplateDocument?.paperSize ?? sheet.pageSize,
    rootTemplateDocument?.orientation ?? sheet.orientation,
  );
  const titleBlockObject = rootTemplateDocument?.objects.find(
    (object) => object.type === 'titleBlock',
  );
  const viewportObject = rootTemplateDocument?.objects.find(
    (object) => object.type === 'mapFrame' || object.type === 'imageFrame',
  );
  const margin = layout.paperSize === 'a0' || layout.paperSize === 'a1' ? 20 : 10;
  const defaultTitleBlock = {
    height: 56,
    width: Math.min(185, layout.widthMm - margin * 2),
    x: layout.widthMm - margin - Math.min(185, layout.widthMm - margin * 2),
    y: layout.heightMm - margin - 56,
  };
  const titleBlock = titleBlockObject ? toSheetRect(titleBlockObject) : defaultTitleBlock;
  const viewport = viewportObject
    ? toSheetRect(viewportObject)
    : {
        height: Math.max(
          80,
          Math.min(
            sheet.viewport.heightMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_HEIGHT_MM,
            titleBlock.y - margin * 1.5,
          ),
        ),
        width: Math.max(
          120,
          Math.min(
            sheet.viewport.widthMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_WIDTH_MM,
            layout.widthMm - margin * 2,
          ),
        ),
        x: margin,
        y: margin,
      };

  return { titleBlock, viewport };
}

function toSheetRect(rect: SheetRect): SheetRect {
  return {
    height: rect.height,
    width: rect.width,
    x: rect.x,
    y: rect.y,
  };
}

function buildViewportTransform({
  centerX,
  centerY,
  frameHeightMm,
  frameWidthMm,
  rotationDeg,
  scale,
}: {
  centerX: number;
  centerY: number;
  frameHeightMm: number;
  frameWidthMm: number;
  rotationDeg: number;
  scale: number;
}) {
  return [
    `translate(${frameWidthMm / 2} ${frameHeightMm / 2})`,
    rotationDeg ? `rotate(${-rotationDeg})` : '',
    `scale(${scale})`,
    `translate(${-centerX} ${-centerY})`,
  ]
    .filter(Boolean)
    .join(' ');
}
