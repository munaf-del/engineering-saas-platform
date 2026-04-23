'use client';

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, ReactNode } from 'react';
import { FileImage } from 'lucide-react';
import {
  DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
  DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY,
  getGenericTemplateFontFamilyStack,
  type GenericTemplateLineStyle,
  type GenericTemplateTypography,
  type GenericTemplateTypographyRoleStyle,
} from '../core/generic-template-document';
import { getTemplatePageLayout } from '../core/template-page';
import {
  getSharedSheetBlockLabel,
  type SharedSheetBlockContent,
  type SharedSheetBlockDefinition,
  type SharedSheetDensity,
  type SharedSheetDetailsBlockDefinition,
  type SharedSheetRenderModel,
  type SharedSheetTitleBlockContent,
} from '../core/shared-sheet-schema';
import { TemplateCanvas } from './template-canvas';
import { SimpleTemplatePageChrome } from './simple-template-page-chrome';
import { As1100SheetChrome } from '../presets/as1100-101/as1100-sheet-chrome';
import { As1100DrawingTitleBlock } from '../presets/as1100-101/as1100-title-block';
import {
  ProjectSpatialLegend,
  type ProjectSpatialLegendFeatureEntry,
} from '@/features/spatial/project-spatial-legend';

type SharedSheetRendererProps = {
  model: SharedSheetRenderModel;
  onBlockGeometryChange?: (
    blockId: string,
    geometry: Pick<SharedSheetBlockDefinition, 'height' | 'width' | 'x' | 'y'>,
  ) => void;
  onResolveInteraction?: (args: {
    block: SharedSheetBlockDefinition;
    deltaX: number;
    deltaY: number;
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se';
  }) => Pick<SharedSheetBlockDefinition, 'height' | 'width' | 'x' | 'y'>;
  onSelectBlock?: (blockId: string) => void;
  previewMode?: boolean;
  selectedBlockId?: string | null;
  selectionChromeVariant?: 'default' | 'subtle';
  showDesignerChrome?: boolean;
};

export function SharedSheetRenderer({
  model,
  onBlockGeometryChange,
  onResolveInteraction,
  onSelectBlock,
  previewMode = false,
  selectedBlockId,
  selectionChromeVariant = 'default',
  showDesignerChrome = true,
}: SharedSheetRendererProps) {
  const pageLayout = getTemplatePageLayout(
    model.definition.paperSize,
    model.definition.orientation,
  );

  return (
    <TemplateCanvas
      getObjectLabel={(block) => block.name || getSharedSheetBlockLabel(block.type)}
      objects={model.definition.objects}
      onObjectGeometryChange={onBlockGeometryChange}
      onResolveInteraction={
        onResolveInteraction
          ? ({ deltaX, deltaY, mode, object }) =>
              onResolveInteraction({
                block: object,
                deltaX,
                deltaY,
                mode,
              })
          : undefined
      }
      onSelectObject={onSelectBlock}
      pageChrome={
        model.definition.presetId === 'as1100_inspired' ? (
          <As1100SheetChrome
            lineStyle={model.definition.chromeStyle}
            orientation={model.definition.orientation}
            paperSize={model.definition.paperSize}
          />
        ) : (
          <SimpleTemplatePageChrome lineStyle={model.definition.chromeStyle} />
        )
      }
      pageLayout={pageLayout}
      renderObject={(block) => (
        <SharedSheetBlockBody
          block={block}
          content={model.contentByBlockId[block.id]}
          definition={model.definition}
          showDesignerChrome={showDesignerChrome}
        />
      )}
      selectedObjectId={previewMode ? null : selectedBlockId}
      selectionChromeVariant={selectionChromeVariant}
      showDesignerChrome={showDesignerChrome && !previewMode}
    />
  );
}

function SharedSheetBlockBody({
  block,
  content,
  definition,
  showDesignerChrome,
}: {
  block: SharedSheetBlockDefinition;
  content: SharedSheetBlockContent | undefined;
  definition: SharedSheetRenderModel['definition'];
  showDesignerChrome: boolean;
}) {
  switch (block.type) {
    case 'titleBlock': {
      const titleBlockContent = resolveTitleBlockContent(block, content, definition);
      const lineStyle = resolveLineStyle(block.lineStyle, 'solid');

      if (block.variant === 'as1100_drawing') {
        return (
          <div className="h-full bg-white">
            <As1100DrawingTitleBlock
              contentScale={block.contentScale}
              density={block.density}
              lineStyle={lineStyle}
              objectWidthMm={block.width}
              orientation={definition.orientation}
              paddingScale={block.paddingScale}
              paperSize={definition.paperSize}
              showDesignerChrome={showDesignerChrome}
              titleBlockData={{
                checkedBy: titleBlockContent.checkedBy,
                generatedAtLabel: titleBlockContent.generatedAtLabel,
                paperLabel: titleBlockContent.paperLabel,
                preparedBy: titleBlockContent.preparedBy,
                projectAddress: titleBlockContent.projectAddress,
                projectCode: titleBlockContent.projectCode,
                projectName: titleBlockContent.projectName,
                revision: titleBlockContent.revision,
                scaleLabel: titleBlockContent.scaleLabel,
                sheetNumber: titleBlockContent.sheetNumber,
                sheetTitle: titleBlockContent.sheetTitle,
                subtitle: titleBlockContent.subtitle,
              }}
              typography={block.typography ?? DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY}
            />
          </div>
        );
      }

      const typography = block.typography ?? DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY;

      return (
        <section
          className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-white"
          style={getOuterBorderStyle(lineStyle)}
        >
          <div className="px-4 py-2" style={getEdgeBorderStyle(lineStyle, 'bottom', 0.75)}>
            <div
              style={getTypographyStyle(typography.label, {
                color: '#475569',
                textTransform: 'uppercase',
              })}
            >
              Title Block
            </div>
          </div>
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_124px]">
            <div className="min-h-0 px-4 py-3" style={getEdgeBorderStyle(lineStyle, 'right', 0.75)}>
              <div
                style={getTypographyStyle(typography.title, {
                  color: '#0f172a',
                  ...getMultilineClampStyle(2),
                  textWrap: 'balance',
                })}
              >
                {titleBlockContent.sheetTitle || definition.name}
              </div>
              <div
                className="mt-2 whitespace-pre-wrap"
                style={getTypographyStyle(typography.body, {
                  color: '#475569',
                  ...getMultilineClampStyle(3),
                })}
              >
                {titleBlockContent.subtitle || 'Reusable title block content for future documents.'}
              </div>
            </div>
            <div className="grid grid-rows-3">
              <GenericMetadataCell
                isLast={false}
                label="Project"
                labelStyle={typography.label}
                lineStyle={lineStyle}
                value={titleBlockContent.projectName || definition.name}
                valueStyle={typography.body}
              />
              <GenericMetadataCell
                isLast={false}
                label="Code"
                labelStyle={typography.label}
                lineStyle={lineStyle}
                value={titleBlockContent.projectCode || 'TMP-001'}
                valueStyle={typography.body}
              />
              <GenericMetadataCell
                isLast
                label="Sheet"
                labelStyle={typography.label}
                lineStyle={lineStyle}
                value={titleBlockContent.sheetNumber || '001'}
                valueStyle={typography.body}
              />
            </div>
          </div>
          <div className="grid grid-cols-3" style={getEdgeBorderStyle(lineStyle, 'top', 0.75)}>
            <GenericMetadataCell
              isLast={false}
              label="Preset"
              labelStyle={typography.label}
              lineStyle={lineStyle}
              value={definition.presetId.replace('_', ' ')}
              valueStyle={typography.body}
            />
            <GenericMetadataCell
              isLast={false}
              label="Paper"
              labelStyle={typography.label}
              lineStyle={lineStyle}
              value={titleBlockContent.paperLabel || pageLabel(definition.paperSize)}
              valueStyle={typography.body}
            />
            <GenericMetadataCell
              isLast
              label="Mode"
              labelStyle={typography.label}
              lineStyle={lineStyle}
              value={titleBlockContent.sheetModeLabel || titleCase(definition.orientation)}
              valueStyle={typography.body}
            />
          </div>
        </section>
      );
    }

    case 'detailsBlock': {
      const detailsTitle = content?.type === 'detailsBlock' ? content.title : undefined;
      const rows = content?.type === 'detailsBlock' ? (content.rows ?? []) : (block.rows ?? []);

      if (block.variant === 'sheetContext') {
        return (
          <SheetPanel
            contentScale={block.contentScale ?? 1}
            density={block.density ?? 'normal'}
            paddingScale={block.paddingScale ?? 1}
            title={detailsTitle || block.title || 'Sheet Context'}
          >
            <SheetContextRows rows={rows} />
          </SheetPanel>
        );
      }

      const lineStyle = resolveLineStyle(block.lineStyle, 'solid');

      return (
        <GenericPanel lineStyle={lineStyle} title={detailsTitle || block.title || 'Details'}>
          <div className="overflow-hidden rounded" style={getOuterBorderStyle(lineStyle, 0.75)}>
            {rows.map((row, index) => (
              <GenericDetailRow
                key={row.id}
                isLast={index === rows.length - 1}
                lineStyle={lineStyle}
                row={row}
              />
            ))}
          </div>
        </GenericPanel>
      );
    }

    case 'textBlock': {
      const textContent = content?.type === 'textBlock' ? content : undefined;
      const lineStyle = resolveLineStyle(block.lineStyle, 'solid');

      return (
        <GenericPanel lineStyle={lineStyle} title={textContent?.title || block.title || 'Text'}>
          <div className="space-y-2 text-sm text-slate-800">
            {textContent?.subtitle || block.subtitle ? (
              <div className="font-medium text-slate-600">
                {textContent?.subtitle || block.subtitle}
              </div>
            ) : null}
            {textContent?.body || block.body ? (
              <div className="whitespace-pre-wrap leading-6">{textContent?.body || block.body}</div>
            ) : null}
          </div>
        </GenericPanel>
      );
    }

    case 'imageBlock': {
      const imageContent = content?.type === 'imageBlock' ? content : undefined;
      const lineStyle = resolveLineStyle(block.lineStyle, 'dashed');
      const fitMode = imageContent?.fitMode ?? block.fitMode ?? 'contain';

      return (
        <GenericPanel lineStyle={lineStyle} title={imageContent?.title || block.title || 'Image'}>
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded bg-slate-50"
              style={getInnerFrameBorderStyle(lineStyle)}
            >
              {imageContent?.imageUrl || block.imageUrl ? (
                <img
                  src={imageContent?.imageUrl || block.imageUrl || ''}
                  alt={imageContent?.caption || block.caption || block.title || 'Sheet image'}
                  className={`h-full w-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center text-slate-500">
                  <FileImage className="h-8 w-8" />
                  <div className="text-xs uppercase tracking-[0.18em]">Placeholder Frame</div>
                </div>
              )}
            </div>
            {imageContent?.caption || block.caption ? (
              <div className="text-xs text-slate-500">{imageContent?.caption || block.caption}</div>
            ) : null}
          </div>
        </GenericPanel>
      );
    }

    case 'tableBlock': {
      const tableContent = content?.type === 'tableBlock' ? content : undefined;
      const columns = tableContent?.columns ?? block.columns ?? [];
      const rows = tableContent?.rows ?? [];
      const contentScale = block.contentScale ?? 1;
      const density = block.density ?? 'normal';
      const cellPaddingX = density === 'compact' ? 4 : 8;
      const cellPaddingY = density === 'compact' ? 3 : 6;

      return (
        <GenericPanel
          lineStyle={resolveLineStyle(block.lineStyle, 'solid')}
          title={tableContent?.title || block.title || 'Table'}
        >
          {columns.length === 0 || rows.length === 0 ? (
            <div
              className="rounded-md border border-dashed text-muted-foreground"
              style={{
                fontSize: `${10 * contentScale}px`,
                lineHeight: 1.35,
                padding: `${cellPaddingY * 2}px ${cellPaddingX * 1.5}px`,
              }}
            >
              {tableContent?.placeholder || 'Table block placeholder.'}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <div
                className="grid border-b bg-slate-50"
                style={{ gridTemplateColumns: buildTableGridTemplate(columns) }}
              >
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="font-semibold uppercase text-slate-600"
                    style={{
                      fontSize: `${9 * contentScale}px`,
                      letterSpacing: 0,
                      lineHeight: 1.2,
                      padding: `${cellPaddingY}px ${cellPaddingX}px`,
                    }}
                  >
                    {column.label}
                  </div>
                ))}
              </div>
              <div className="grid">
                {rows.map((row, rowIndex) => (
                  <div
                    key={`table-row-${rowIndex + 1}`}
                    className={`grid ${rowIndex < rows.length - 1 ? 'border-b' : ''}`}
                    style={{ gridTemplateColumns: buildTableGridTemplate(columns) }}
                  >
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        className="overflow-hidden text-slate-800"
                        style={{
                          fontSize: `${10 * contentScale}px`,
                          lineHeight: 1.25,
                          overflowWrap: 'anywhere',
                          padding: `${cellPaddingY}px ${cellPaddingX}px`,
                        }}
                      >
                        {formatTableCellValue(row[column.id])}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </GenericPanel>
      );
    }

    case 'mapFrame': {
      const mapContent = content?.type === 'mapFrame' ? content : undefined;

      return (
        <MapFrameObject
          fitMode={mapContent?.fitMode ?? block.fitMode ?? 'fit'}
          mapImageDataUrl={mapContent?.imageDataUrl ?? ''}
          mapImageHeight={mapContent?.imageHeight ?? 1}
          mapImageWidth={mapContent?.imageWidth ?? 1}
          showDesignerChrome={showDesignerChrome}
          sourceLabel={mapContent?.sourceLabel ?? null}
        />
      );
    }

    case 'legend': {
      const legendContent = content?.type === 'legend' ? content : undefined;

      return (
        <SheetPanel
          contentScale={block.contentScale ?? 1}
          density={block.density ?? 'normal'}
          paddingScale={block.paddingScale ?? 1}
          title={block.title || 'Legend'}
        >
          <ProjectSpatialLegend
            columnCount={block.columnCount ?? 1}
            contentScale={block.contentScale ?? 1}
            density={block.density ?? 'normal'}
            entries={legendContent?.entries ?? []}
            geologyQueryLocation={legendContent?.geologyQueryLocation ?? null}
            paddingScale={block.paddingScale ?? 1}
            showCounts={false}
            showGeologyOverlay={legendContent?.showGeologyOverlay ?? false}
            showMapContext={block.showMapContext ?? true}
            symbolScale={block.symbolScale ?? 1}
            variant="sheet"
          />
        </SheetPanel>
      );
    }

    case 'notesBlock': {
      const notesContent = content?.type === 'notesBlock' ? content : undefined;

      return (
        <SheetPanel
          contentScale={block.contentScale ?? 1}
          density={block.density ?? 'normal'}
          paddingScale={block.paddingScale ?? 1}
          title={notesContent?.title || block.title || 'Notes'}
        >
          <NotesBlockBody
            body={notesContent?.body || block.body || ''}
            contentScale={block.contentScale ?? 1}
            density={block.density ?? 'normal'}
          />
        </SheetPanel>
      );
    }

    case 'northArrow':
      return (
        <div className="flex h-full items-center justify-center border-[2px] border-slate-900 bg-white">
          <NorthArrow symbolScale={block.symbolScale ?? block.contentScale ?? 1} />
        </div>
      );

    case 'scaleBar': {
      const scaleBarContent = content?.type === 'scaleBar' ? content : undefined;

      return (
        <div className="flex h-full items-center justify-center border-[2px] border-slate-900 bg-white px-2">
          <ScaleBarGraphic
            label={scaleBarContent?.scaleBar.label || 'Scale'}
            showLabel={block.showLabel ?? true}
            symbolScale={block.symbolScale ?? block.contentScale ?? 1}
            widthPx={Math.max(48, Math.round(block.width * 6))}
          />
        </div>
      );
    }
  }
}

function resolveTitleBlockContent(
  block: Extract<SharedSheetBlockDefinition, { type: 'titleBlock' }>,
  content: SharedSheetBlockContent | undefined,
  definition: SharedSheetRenderModel['definition'],
): Required<SharedSheetTitleBlockContent> {
  const titleBlockContent = content?.type === 'titleBlock' ? content : undefined;

  return {
    activeBasemapLabel: titleBlockContent?.activeBasemapLabel ?? '',
    checkedBy: titleBlockContent?.checkedBy ?? block.checkedBy ?? '',
    generatedAtLabel: titleBlockContent?.generatedAtLabel ?? block.generatedAtLabel ?? '',
    geologyQueryLabel: titleBlockContent?.geologyQueryLabel ?? '',
    geologyStatusLabel: titleBlockContent?.geologyStatusLabel ?? '',
    paperLabel:
      titleBlockContent?.paperLabel ??
      `${pageLabel(definition.paperSize)} ${titleCase(definition.orientation)}`,
    preparedBy: titleBlockContent?.preparedBy ?? block.preparedBy ?? '',
    projectAddress: titleBlockContent?.projectAddress ?? block.projectAddress ?? '',
    projectCode: titleBlockContent?.projectCode ?? block.projectCode ?? '',
    projectName: titleBlockContent?.projectName ?? block.projectName ?? '',
    revision: titleBlockContent?.revision ?? block.revision ?? '',
    scaleLabel: titleBlockContent?.scaleLabel ?? block.scaleLabel ?? '',
    sheetModeLabel: titleBlockContent?.sheetModeLabel ?? titleCase(definition.presetId),
    sheetNumber: titleBlockContent?.sheetNumber ?? block.sheetNumber ?? '',
    sheetTitle: titleBlockContent?.sheetTitle ?? block.title ?? definition.name,
    subtitle: titleBlockContent?.subtitle ?? block.subtitle ?? '',
    type: 'titleBlock',
  };
}

function resolveLineStyle(
  lineStyle: GenericTemplateLineStyle | undefined,
  defaultPattern: 'dashed' | 'dotted' | 'solid',
) {
  return {
    color: lineStyle?.color ?? DEFAULT_GENERIC_TEMPLATE_LINE_STYLE.color,
    pattern: defaultPattern,
    visible: lineStyle?.visible ?? DEFAULT_GENERIC_TEMPLATE_LINE_STYLE.visible,
    widthPx: lineStyle?.widthPx ?? DEFAULT_GENERIC_TEMPLATE_LINE_STYLE.widthPx,
  };
}

function GenericPanel({
  children,
  lineStyle,
  title,
}: {
  children: ReactNode;
  lineStyle: ReturnType<typeof resolveLineStyle>;
  title: string;
}) {
  return (
    <section
      className="flex h-full min-h-0 flex-col bg-white"
      style={getOuterBorderStyle(lineStyle)}
    >
      {title.trim() ? (
        <>
          <div className="px-3 py-2" style={getEdgeBorderStyle(lineStyle, 'bottom', 0.75)}>
            <div
              style={{
                color: '#475569',
                fontFamily:
                  '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-3">{children}</div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden p-3">{children}</div>
      )}
    </section>
  );
}

function GenericDetailRow({
  isLast,
  lineStyle,
  row,
}: {
  isLast: boolean;
  lineStyle: ReturnType<typeof resolveLineStyle>;
  row: { label: string; value: string };
}) {
  const hasLabel = row.label.trim().length > 0;

  return (
    <div
      className="grid text-xs"
      style={{ gridTemplateColumns: 'clamp(38px, 18%, 62px) minmax(0, 1fr)' }}
    >
      <div
        className={hasLabel ? 'bg-slate-50 px-2 py-1.5' : 'bg-white px-2 py-1.5'}
        style={{
          ...getEdgeBorderStyle(lineStyle, 'right', 0.6),
          ...(!isLast ? getEdgeBorderStyle(lineStyle, 'bottom', 0.6) : {}),
          color: hasLabel ? '#475569' : 'transparent',
          fontFamily:
            '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
          fontSize: '8.5px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {row.label}
      </div>
      <div
        className="px-2 py-1.5"
        style={{
          ...(!isLast ? getEdgeBorderStyle(lineStyle, 'bottom', 0.6) : {}),
          color: '#1e293b',
          fontSize: '10.75px',
          lineHeight: 1.25,
          ...getMultilineClampStyle(2),
          textWrap: 'balance',
        }}
      >
        {row.value}
      </div>
    </div>
  );
}

function GenericMetadataCell({
  isLast,
  label,
  labelStyle,
  lineStyle,
  value,
  valueStyle,
}: {
  isLast: boolean;
  label: string;
  labelStyle: GenericTemplateTypographyRoleStyle;
  lineStyle: ReturnType<typeof resolveLineStyle>;
  value: string;
  valueStyle: GenericTemplateTypographyRoleStyle;
}) {
  return (
    <div
      className="px-3 py-2"
      style={!isLast ? getEdgeBorderStyle(lineStyle, 'right', 0.6) : undefined}
    >
      <div
        style={getTypographyStyle(labelStyle, {
          color: '#64748b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        })}
      >
        {label}
      </div>
      <div
        className="mt-1"
        style={getTypographyStyle(valueStyle, {
          color: '#1e293b',
          ...getMultilineClampStyle(2),
          lineHeight: 1.25,
          textWrap: 'pretty',
        })}
      >
        {value}
      </div>
    </div>
  );
}

function SheetPanel({
  children,
  contentScale = 1,
  density = 'normal',
  paddingScale = 1,
  title,
}: {
  children: ReactNode;
  contentScale?: number;
  density?: SharedSheetDensity;
  paddingScale?: number;
  title: string;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col border-[2px] border-slate-900 bg-white">
      <div
        className="border-b border-slate-900"
        style={{
          paddingBottom: `${(density === 'compact' ? 4 : 6) * paddingScale}px`,
          paddingLeft: `${12 * paddingScale}px`,
          paddingRight: `${12 * paddingScale}px`,
          paddingTop: `${(density === 'compact' ? 4 : 6) * paddingScale}px`,
        }}
      >
        <div
          className="font-mono font-semibold uppercase text-slate-700"
          style={{
            fontSize: `${10 * contentScale}px`,
            letterSpacing: `${0.24 * contentScale}em`,
          }}
        >
          {title}
        </div>
      </div>
      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          padding: `${10 * paddingScale}px`,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function NotesBlockBody({
  body,
  contentScale,
  density,
}: {
  body: string;
  contentScale: number;
  density: SharedSheetDensity;
}) {
  return (
    <div
      className="h-full overflow-auto whitespace-pre-wrap text-slate-800"
      style={{
        fontSize: `${11 * contentScale}px`,
        lineHeight: `${density === 'compact' ? 18 : 20 * contentScale}px`,
      }}
    >
      {normalizeText(body) || 'No sheet notes entered.'}
    </div>
  );
}

function SheetContextRows({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid border border-slate-300">
      {rows.map((row, index) => (
        <SheetContextRow
          key={`${row.label}-${index + 1}`}
          isLast={index === rows.length - 1}
          label={row.label}
          value={row.value}
        />
      ))}
    </div>
  );
}

function SheetContextRow({
  isLast = false,
  label,
  value,
}: {
  isLast?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`grid grid-cols-[82px_minmax(0,1fr)] ${!isLast ? 'border-b border-slate-300' : ''}`}
    >
      <div className="border-r border-slate-300 px-2 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        {label}
      </div>
      <div className="px-2 py-1.5 text-[11px] text-slate-800">{value}</div>
    </div>
  );
}

function MapFrameObject({
  fitMode,
  mapImageDataUrl,
  mapImageHeight,
  mapImageWidth,
  showDesignerChrome,
  sourceLabel,
}: {
  fitMode: 'fit' | 'fill';
  mapImageDataUrl: string;
  mapImageHeight: number;
  mapImageWidth: number;
  showDesignerChrome: boolean;
  sourceLabel: string | null;
}) {
  const sourceAspectRatio =
    mapImageWidth > 0 && mapImageHeight > 0 ? mapImageWidth / mapImageHeight : 1;

  return (
    <div className="relative flex h-full min-h-0 items-center justify-center border-[2px] border-slate-900 bg-white p-2">
      {showDesignerChrome ? (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-sm bg-white/92 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600 shadow-sm">
          {sourceLabel || 'Current view'} · {fitMode === 'fill' ? 'Fill / Crop' : 'Fit'} ·{' '}
          {Number.isFinite(sourceAspectRatio) && sourceAspectRatio > 0
            ? sourceAspectRatio.toFixed(2).replace(/\.00$/, '')
            : '1'}
          :1
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-white">
        <div className="relative h-full w-full overflow-hidden border border-slate-400 bg-white">
          {mapImageDataUrl ? (
            <img
              src={mapImageDataUrl}
              alt="Spatial map sheet capture"
              className={`h-full w-full bg-white ${fitMode === 'fill' ? 'object-cover' : 'object-contain'}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Map snapshot unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NorthArrow({ symbolScale }: { symbolScale: number }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <svg
        viewBox="0 0 24 36"
        className="h-full w-full"
        style={{
          maxHeight: `${42 * symbolScale}px`,
          maxWidth: `${28 * symbolScale}px`,
        }}
      >
        <path d="M12 1 3 19h6v16h6V19h6L12 1Z" fill="#0f172a" />
        <path d="M12 7 7.8 17h8.4L12 7Z" fill="#ffffff" />
        <text
          x="12"
          y="34"
          textAnchor="middle"
          className="fill-slate-800 font-semibold"
          style={{ fontSize: `${8 * symbolScale}px` }}
        >
          N
        </text>
      </svg>
    </div>
  );
}

function ScaleBarGraphic({
  label,
  showLabel,
  symbolScale,
  widthPx,
}: {
  label: string;
  showLabel: boolean;
  symbolScale: number;
  widthPx: number;
}) {
  const segmentWidth = Math.max(18, Math.round(widthPx / 2));

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <div
          className="border border-slate-900 bg-slate-900"
          style={{ height: `${2 * symbolScale}px`, width: `${segmentWidth}px` }}
        />
        <div
          className="border border-l-0 border-slate-900 bg-white"
          style={{ height: `${2 * symbolScale}px`, width: `${segmentWidth}px` }}
        />
      </div>
      {showLabel ? (
        <div
          className="text-center font-mono font-semibold uppercase text-slate-700"
          style={{ fontSize: `${9 * symbolScale}px`, letterSpacing: `${0.12 * symbolScale}em` }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

function getTypographyStyle(
  style: GenericTemplateTypographyRoleStyle,
  overrides: Partial<CSSProperties> = {},
): CSSProperties {
  return {
    color: '#1e293b',
    fontFamily: getGenericTemplateFontFamilyStack(style.fontFamily),
    fontSize: `${style.fontSizePx}px`,
    fontWeight: style.fontWeight,
    letterSpacing: `${style.letterSpacingEm}em`,
    lineHeight: 1.35,
    ...overrides,
  };
}

function getMultilineClampStyle(maxLines: number): Partial<CSSProperties> {
  return {
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: maxLines,
    display: '-webkit-box',
    overflow: 'hidden',
    overflowWrap: 'normal',
    wordBreak: 'keep-all',
  };
}

function getOuterBorderStyle(
  lineStyle: ReturnType<typeof resolveLineStyle>,
  multiplier = 1,
): CSSProperties {
  if (!lineStyle.visible) {
    return {};
  }

  return {
    borderColor: lineStyle.color,
    borderStyle: lineStyle.pattern,
    borderWidth: `${Math.max(1, lineStyle.widthPx * multiplier)}px`,
  };
}

function getEdgeBorderStyle(
  lineStyle: ReturnType<typeof resolveLineStyle>,
  edge: 'bottom' | 'left' | 'right' | 'top',
  multiplier = 1,
): CSSProperties | undefined {
  if (!lineStyle.visible) {
    return undefined;
  }

  const width = `${Math.max(1, lineStyle.widthPx * multiplier)}px`;

  return {
    [`border${capitalize(edge)}Color`]: lineStyle.color,
    [`border${capitalize(edge)}Style`]: lineStyle.pattern,
    [`border${capitalize(edge)}Width`]: width,
  } satisfies CSSProperties;
}

function getInnerFrameBorderStyle(lineStyle: ReturnType<typeof resolveLineStyle>) {
  return getOuterBorderStyle(
    lineStyle.visible
      ? lineStyle
      : {
          ...lineStyle,
          visible: true,
        },
    0.75,
  );
}

function pageLabel(value: string) {
  return value.toUpperCase();
}

function titleCase(value: string) {
  return value
    .split('_')
    .map((part) => (part ? part[0]?.toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function capitalize(value: string) {
  return value ? value[0]?.toUpperCase() + value.slice(1) : value;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildTableGridTemplate(columns: Array<{ widthRatio?: number }>) {
  const ratios = columns.map((column) => Math.max(0.3, column.widthRatio ?? 1));
  return ratios.map((ratio) => `${ratio}fr`).join(' ');
}

function formatTableCellValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
}
