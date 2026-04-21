'use client';

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, ReactNode } from 'react';
import { FileImage, Map as MapIcon } from 'lucide-react';
import { TemplateCanvas } from './template-canvas';
import { SimpleTemplatePageChrome } from './simple-template-page-chrome';
import { getTemplatePageLayout } from '../core/template-page';
import {
  DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
  DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY,
  getGenericTemplateFontFamilyStack,
  getGenericTemplateObjectLabel,
  resolveGenericTemplateObjectInteraction,
  type GenericTemplateDetailRow,
  type GenericTemplateDocument,
  type GenericTemplateLineStyle,
  type GenericTemplateObject,
  type GenericTemplateTypography,
  type GenericTemplateTypographyRoleStyle,
} from '../core/generic-template-document';
import { As1100SheetChrome } from '../presets/as1100-101/as1100-sheet-chrome';
import { As1100DrawingTitleBlock } from '../presets/as1100-101/as1100-title-block';

export type GenericTemplateFontChoice =
  | 'Inter'
  | 'Arial'
  | 'Times New Roman'
  | 'Courier New'
  | 'Georgia';

export type GenericTemplateTextAlign = 'left' | 'center' | 'right';

export type GenericTemplateBorderPattern = 'solid' | 'dashed' | 'dotted' | 'none';

export type GenericTemplateEditorStyleOverride = {
  fontFamily?: GenericTemplateFontChoice;
  fontSizePx?: number;
  fontWeight?: number;
  lineColor?: string;
  linePattern?: GenericTemplateBorderPattern;
  lineWeightPx?: number;
  showBorder?: boolean;
  textAlign?: GenericTemplateTextAlign;
  textColor?: string;
};

type ResolvedGenericTemplateLineStyle = {
  color: string;
  pattern: Exclude<GenericTemplateBorderPattern, 'none'>;
  visible: boolean;
  widthPx: number;
};

type ResolvedGenericTemplateTextStyle = {
  color?: string;
  fontFamily?: string;
  fontSizePx?: number;
  fontWeight?: number;
  textAlign?: GenericTemplateTextAlign;
};

export function GenericTemplateSheet({
  objectStyleOverrides,
  onObjectGeometryChange,
  onSelectObject,
  previewMode = false,
  selectedObjectId,
  showDesignerChrome = true,
  template,
}: {
  objectStyleOverrides?: Record<string, GenericTemplateEditorStyleOverride>;
  onObjectGeometryChange?: (
    objectId: string,
    geometry: Pick<GenericTemplateObject, 'height' | 'width' | 'x' | 'y'>,
  ) => void;
  onSelectObject?: (objectId: string) => void;
  previewMode?: boolean;
  selectedObjectId?: string | null;
  showDesignerChrome?: boolean;
  template: GenericTemplateDocument;
}) {
  const pageLayout = getTemplatePageLayout(template.paperSize, template.orientation);

  return (
    <TemplateCanvas
      getObjectLabel={(object) =>
        shouldHideAs1100StarterObjectLabel(template, object)
          ? ''
          : object.name || getGenericTemplateObjectLabel(object.type)
      }
      objects={template.objects}
      onObjectGeometryChange={onObjectGeometryChange}
      onResolveInteraction={({ deltaX, deltaY, mode, object }) =>
        resolveGenericTemplateObjectInteraction({
          deltaX,
          deltaY,
          mode,
          object,
          orientation: template.orientation,
          paperSize: template.paperSize,
        })
      }
      onSelectObject={onSelectObject}
      pageChrome={
        template.presetId === 'as1100_inspired' ? (
          <As1100SheetChrome
            lineStyle={template.chromeStyle}
            orientation={template.orientation}
            paperSize={template.paperSize}
          />
        ) : (
          <SimpleTemplatePageChrome lineStyle={template.chromeStyle} />
        )
      }
      pageLayout={pageLayout}
      renderObject={(object) => (
        <GenericTemplateObjectBody
          object={object}
          pageLayout={pageLayout}
          showDesignerChrome={showDesignerChrome}
          styleOverride={objectStyleOverrides?.[object.id]}
          template={template}
        />
      )}
      selectedObjectId={previewMode ? null : selectedObjectId}
      selectionChromeVariant={template.presetId === 'as1100_inspired' ? 'subtle' : 'default'}
      showDesignerChrome={showDesignerChrome && !previewMode}
    />
  );
}

function GenericTemplateObjectBody({
  object,
  pageLayout,
  showDesignerChrome,
  styleOverride,
  template,
}: {
  object: GenericTemplateObject;
  pageLayout: ReturnType<typeof getTemplatePageLayout>;
  showDesignerChrome: boolean;
  styleOverride?: GenericTemplateEditorStyleOverride;
  template: GenericTemplateDocument;
}) {
  const lineStyle = resolveObjectLineStyle(object, styleOverride);
  const textStyle = resolveObjectTextStyle(styleOverride);

  switch (object.type) {
    case 'titleBlock': {
      const typography = resolveTitleBlockTypography(
        object.typography ?? DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY,
        textStyle,
      );

      return template.presetId === 'as1100_inspired' ? (
        <div className="h-full bg-white">
          <As1100DrawingTitleBlock
            fontFamilyOverride={textStyle.fontFamily}
            linePattern={lineStyle.visible ? lineStyle.pattern : 'none'}
            lineStyle={toGenericLineStyle(lineStyle)}
            objectWidthMm={object.width}
            orientation={template.orientation}
            pagePxPerMm={pageLayout.widthPx / pageLayout.widthMm}
            paperSize={template.paperSize}
            showDesignerChrome={showDesignerChrome}
            textAlignOverride={textStyle.textAlign}
            textColorOverride={textStyle.color}
            titleBlockData={{
              checkedBy: object.checkedBy || '',
              generatedAtLabel: object.generatedAtLabel || '',
              paperLabel: `${pageLabel(template.paperSize)} ${titleCase(template.orientation)}`,
              preparedBy: object.preparedBy || '',
              projectAddress: object.projectAddress || '',
              projectCode: object.projectCode || '',
              projectName: object.projectName || '',
              revision: object.revision || '',
              scaleLabel: object.scaleLabel || '',
              sheetNumber: object.sheetNumber || '',
              sheetTitle: object.title || '',
              subtitle: object.subtitle || '',
            }}
            typography={typography}
          />
        </div>
      ) : (
        <section
          className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-white"
          style={getOuterBorderStyle(lineStyle)}
        >
          <div className="px-4 py-2" style={getEdgeBorderStyle(lineStyle, 'bottom', 0.75)}>
            <div
              style={getTypographyStyle(typography.label, {
                color: textStyle.color ?? '#475569',
                fontFamily: textStyle.fontFamily,
                textAlign: textStyle.textAlign,
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
                  color: textStyle.color ?? '#0f172a',
                  fontFamily: textStyle.fontFamily,
                  textAlign: textStyle.textAlign,
                  ...getMultilineClampStyle(2),
                  textWrap: 'balance',
                })}
              >
                {object.title || template.name}
              </div>
              <div
                className="mt-2 whitespace-pre-wrap"
                style={getTypographyStyle(typography.body, {
                  color: textStyle.color ?? '#475569',
                  fontFamily: textStyle.fontFamily,
                  textAlign: textStyle.textAlign,
                  ...getMultilineClampStyle(3),
                })}
              >
                {object.subtitle || 'Reusable title block content for future documents.'}
              </div>
            </div>
            <div className="grid grid-rows-3">
              <TitleCell
                isLast={false}
                label="Project"
                labelStyle={typography.label}
                lineStyle={lineStyle}
                textStyle={textStyle}
                value={object.projectName || template.name}
                valueStyle={typography.body}
              />
              <TitleCell
                isLast={false}
                label="Code"
                labelStyle={typography.label}
                lineStyle={lineStyle}
                textStyle={textStyle}
                value={object.projectCode || 'TMP-001'}
                valueStyle={typography.body}
              />
              <TitleCell
                isLast
                label="Sheet"
                labelStyle={typography.label}
                lineStyle={lineStyle}
                textStyle={textStyle}
                value={object.sheetNumber || '001'}
                valueStyle={typography.body}
              />
            </div>
          </div>
          <div className="grid grid-cols-3" style={getEdgeBorderStyle(lineStyle, 'top', 0.75)}>
            <FooterCell
              isLast={false}
              label="Preset"
              labelStyle={typography.label}
              lineStyle={lineStyle}
              textStyle={textStyle}
              value={template.presetId.replace('_', ' ')}
              valueStyle={typography.body}
            />
            <FooterCell
              isLast={false}
              label="Paper"
              labelStyle={typography.label}
              lineStyle={lineStyle}
              textStyle={textStyle}
              value={pageLabel(template.paperSize)}
              valueStyle={typography.body}
            />
            <FooterCell
              isLast
              label="Mode"
              labelStyle={typography.label}
              lineStyle={lineStyle}
              textStyle={textStyle}
              value={titleCase(template.orientation)}
              valueStyle={typography.body}
            />
          </div>
        </section>
      );
    }
    case 'textBlock':
      return (
        <Panel
          lineStyle={lineStyle}
          textStyle={textStyle}
          title={
            template.presetId === 'as1100_inspired' ? (object.title ?? '') : object.title || 'Text'
          }
        >
          <div
            className="space-y-2"
            style={getBodyTextStyle(textStyle, {
              color: textStyle.color ?? '#1e293b',
            })}
          >
            {object.subtitle ? (
              <div
                style={getBodyTextStyle(textStyle, {
                  color: textStyle.color ?? '#475569',
                  fontWeight: textStyle.fontWeight ?? 500,
                })}
              >
                {object.subtitle}
              </div>
            ) : null}
            {object.body ? (
              <div className="whitespace-pre-wrap leading-6">{object.body}</div>
            ) : null}
          </div>
        </Panel>
      );
    case 'detailsBlock':
      return (
        <Panel
          lineStyle={lineStyle}
          textStyle={textStyle}
          title={
            template.presetId === 'as1100_inspired'
              ? (object.title ?? '')
              : object.title || 'Details'
          }
        >
          <div className="overflow-hidden rounded" style={getOuterBorderStyle(lineStyle, 0.75)}>
            {(object.rows ?? []).map((row, index) => (
              <DetailRow
                key={row.id}
                isLast={index === (object.rows?.length ?? 1) - 1}
                lineStyle={lineStyle}
                row={row}
                textStyle={textStyle}
              />
            ))}
          </div>
        </Panel>
      );
    case 'imageFrame':
      return (
        <Panel
          lineStyle={lineStyle}
          textStyle={textStyle}
          title={
            template.presetId === 'as1100_inspired'
              ? (object.title ?? '')
              : object.title || 'Image Frame'
          }
          titlePattern="solid"
        >
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded bg-slate-50"
              style={getInnerFrameBorderStyle(lineStyle)}
            >
              {object.imageUrl ? (
                <img
                  src={object.imageUrl}
                  alt={object.caption || object.title || 'Template image'}
                  className={`h-full w-full ${
                    object.fitMode === 'cover' ? 'object-cover' : 'object-contain'
                  }`}
                />
              ) : template.presetId === 'as1100_inspired' ? null : (
                <div
                  className="flex flex-col items-center gap-2 text-center"
                  style={getBodyTextStyle(textStyle, {
                    color: textStyle.color ?? '#64748b',
                  })}
                >
                  <FileImage className="h-8 w-8" />
                  <div className="text-xs uppercase tracking-[0.18em]">Reference Image Only</div>
                  <div className="max-w-[220px] text-[11px] leading-5">
                    This block does not auto-fill from a Project Spatial View.
                  </div>
                </div>
              )}
            </div>
            {object.caption ? (
              <div
                className="text-xs"
                style={getBodyTextStyle(textStyle, {
                  color: textStyle.color ?? '#64748b',
                })}
              >
                {object.caption}
              </div>
            ) : null}
          </div>
        </Panel>
      );
    case 'mapFrame':
      return (
        <Panel
          lineStyle={lineStyle}
          textStyle={textStyle}
          title={
            template.presetId === 'as1100_inspired'
              ? (object.title ?? '')
              : object.title || 'Map Frame'
          }
          titlePattern="solid"
        >
          <div
            className="flex h-full min-h-0 items-center justify-center rounded bg-sky-50"
            style={getInnerFrameBorderStyle(lineStyle)}
          >
            <div
              className="flex flex-col items-center gap-2 text-center"
              style={getBodyTextStyle(textStyle, {
                color: textStyle.color ?? '#0f4c81',
              })}
            >
              <MapIcon className="h-8 w-8" />
              <div className="text-xs font-semibold uppercase tracking-[0.18em]">
                Project Spatial Map Frame
              </div>
              <div className="max-w-[220px] text-[11px] leading-5">
                Spatial Sheets and Report Annexures place the chosen Project Spatial View here.
              </div>
            </div>
          </div>
        </Panel>
      );
    default:
      return null;
  }
}

function Panel({
  children,
  lineStyle,
  textStyle,
  title,
  titlePattern,
}: {
  children: ReactNode;
  lineStyle: ResolvedGenericTemplateLineStyle;
  textStyle: ResolvedGenericTemplateTextStyle;
  title: string;
  titlePattern?: Exclude<GenericTemplateBorderPattern, 'none'>;
}) {
  return (
    <section
      className="flex h-full min-h-0 flex-col bg-white"
      style={getOuterBorderStyle(lineStyle)}
    >
      {title.trim() ? (
        <>
          <div
            className="px-3 py-2"
            style={getEdgeBorderStyle(
              { ...lineStyle, pattern: titlePattern ?? lineStyle.pattern },
              'bottom',
              0.75,
            )}
          >
            <div
              style={getPanelHeadingStyle(textStyle, {
                color: textStyle.color ?? '#475569',
                textTransform: 'uppercase',
              })}
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

function DetailRow({
  isLast,
  lineStyle,
  row,
  textStyle,
}: {
  isLast: boolean;
  lineStyle: ResolvedGenericTemplateLineStyle;
  row: GenericTemplateDetailRow;
  textStyle: ResolvedGenericTemplateTextStyle;
}) {
  const hasLabel = row.label.trim().length > 0;

  return (
    <div
      className="grid text-xs"
      style={{ gridTemplateColumns: 'clamp(46px, 22%, 72px) minmax(0, 1fr)' }}
    >
      <div
        className={hasLabel ? 'bg-slate-50 px-2 py-1.5' : 'bg-white px-2 py-1.5'}
        style={{
          ...getEdgeBorderStyle(lineStyle, 'right', 0.6),
          ...(!isLast ? getEdgeBorderStyle(lineStyle, 'bottom', 0.6) : {}),
          ...(hasLabel
            ? getPanelHeadingStyle(textStyle, {
                color: textStyle.color ?? '#475569',
                fontSize: '8px',
                letterSpacing: '0.08em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              })
            : getBodyTextStyle(textStyle, {
                color: 'transparent',
              })),
        }}
      >
        {row.label}
      </div>
      <div
        className="px-2 py-1.5"
        style={{
          ...(!isLast ? getEdgeBorderStyle(lineStyle, 'bottom', 0.6) : {}),
          ...getBodyTextStyle(textStyle, {
            color: textStyle.color ?? '#1e293b',
            fontSize: '10.5px',
            lineHeight: '1.25',
            ...getMultilineClampStyle(2),
            textWrap: 'pretty',
          }),
        }}
      >
        {row.value}
      </div>
    </div>
  );
}

function TitleCell({
  isLast,
  label,
  labelStyle,
  lineStyle,
  textStyle,
  value,
  valueStyle,
}: {
  isLast: boolean;
  label: string;
  labelStyle: GenericTemplateTypographyRoleStyle;
  lineStyle: ResolvedGenericTemplateLineStyle;
  textStyle: ResolvedGenericTemplateTextStyle;
  value: string;
  valueStyle: GenericTemplateTypographyRoleStyle;
}) {
  return (
    <div
      className="px-3 py-2"
      style={!isLast ? getEdgeBorderStyle(lineStyle, 'bottom', 0.6) : undefined}
    >
      <div
        style={getTypographyStyle(labelStyle, {
          color: textStyle.color ?? '#64748b',
          fontFamily: textStyle.fontFamily,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: textStyle.textAlign,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        })}
      >
        {label}
      </div>
      <div
        className="mt-1"
        style={getTypographyStyle(valueStyle, {
          color: textStyle.color ?? '#0f172a',
          fontFamily: textStyle.fontFamily,
          ...getMultilineClampStyle(2),
          lineHeight: 1.25,
          textAlign: textStyle.textAlign,
          textWrap: 'pretty',
        })}
      >
        {value}
      </div>
    </div>
  );
}

function FooterCell({
  isLast,
  label,
  labelStyle,
  lineStyle,
  textStyle,
  value,
  valueStyle,
}: {
  isLast: boolean;
  label: string;
  labelStyle: GenericTemplateTypographyRoleStyle;
  lineStyle: ResolvedGenericTemplateLineStyle;
  textStyle: ResolvedGenericTemplateTextStyle;
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
          color: textStyle.color ?? '#64748b',
          fontFamily: textStyle.fontFamily,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: textStyle.textAlign,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        })}
      >
        {label}
      </div>
      <div
        className="mt-1"
        style={getTypographyStyle(valueStyle, {
          color: textStyle.color ?? '#1e293b',
          fontFamily: textStyle.fontFamily,
          ...getMultilineClampStyle(2),
          lineHeight: 1.25,
          textAlign: textStyle.textAlign,
          textWrap: 'pretty',
        })}
      >
        {value}
      </div>
    </div>
  );
}

function resolveObjectLineStyle(
  object: GenericTemplateObject,
  styleOverride?: GenericTemplateEditorStyleOverride,
): ResolvedGenericTemplateLineStyle {
  const lineStyle = object.lineStyle ?? DEFAULT_GENERIC_TEMPLATE_LINE_STYLE;
  const defaultPattern: Exclude<GenericTemplateBorderPattern, 'none'> =
    object.type === 'imageFrame' ? 'dashed' : 'solid';
  const requestedPattern = styleOverride?.linePattern ?? defaultPattern;

  return {
    color: styleOverride?.lineColor ?? lineStyle.color,
    pattern: requestedPattern === 'none' ? defaultPattern : requestedPattern,
    visible: (styleOverride?.showBorder ?? lineStyle.visible) && requestedPattern !== 'none',
    widthPx: styleOverride?.lineWeightPx ?? lineStyle.widthPx,
  };
}

function resolveObjectTextStyle(
  styleOverride?: GenericTemplateEditorStyleOverride,
): ResolvedGenericTemplateTextStyle {
  return {
    color: styleOverride?.textColor,
    fontFamily: styleOverride?.fontFamily
      ? getFontFamilyCssStack(styleOverride.fontFamily)
      : undefined,
    fontSizePx: styleOverride?.fontSizePx,
    fontWeight: styleOverride?.fontWeight,
    textAlign: styleOverride?.textAlign,
  };
}

function resolveTitleBlockTypography(
  typography: GenericTemplateTypography,
  textStyle: ResolvedGenericTemplateTextStyle,
) {
  if (!textStyle.fontSizePx && !textStyle.fontWeight) {
    return typography;
  }

  const baseSize = textStyle.fontSizePx;
  const baseWeight = textStyle.fontWeight;

  return {
    body: {
      ...typography.body,
      fontSizePx: baseSize ?? typography.body.fontSizePx,
      fontWeight: baseWeight ?? typography.body.fontWeight,
    },
    label: {
      ...typography.label,
      fontSizePx: baseSize ? Math.max(8, baseSize - 1) : typography.label.fontSizePx,
      fontWeight: baseWeight ?? typography.label.fontWeight,
    },
    title: {
      ...typography.title,
      fontSizePx: baseSize ? baseSize + 2 : typography.title.fontSizePx,
      fontWeight: baseWeight ?? typography.title.fontWeight,
    },
  } satisfies GenericTemplateTypography;
}

function toGenericLineStyle(lineStyle: ResolvedGenericTemplateLineStyle): GenericTemplateLineStyle {
  return {
    color: lineStyle.color,
    visible: lineStyle.visible,
    widthPx: lineStyle.widthPx,
  };
}

function getOuterBorderStyle(
  lineStyle: ResolvedGenericTemplateLineStyle,
  widthFactor = 1,
): CSSProperties {
  const lineWidth = getLineWidth(lineStyle, widthFactor);

  return {
    borderColor: lineStyle.color,
    borderStyle: lineStyle.visible ? lineStyle.pattern : 'solid',
    borderWidth: `${lineWidth}px`,
  };
}

function getEdgeBorderStyle(
  lineStyle: ResolvedGenericTemplateLineStyle,
  edge: 'bottom' | 'left' | 'right' | 'top',
  widthFactor = 1,
): CSSProperties {
  const lineWidth = getLineWidth(lineStyle, widthFactor);
  const borderColor = lineStyle.color;
  const borderStyle = lineStyle.visible ? lineStyle.pattern : 'solid';

  if (edge === 'top') {
    return { borderColor, borderStyle, borderTopWidth: `${lineWidth}px` };
  }
  if (edge === 'right') {
    return { borderColor, borderStyle, borderRightWidth: `${lineWidth}px` };
  }
  if (edge === 'bottom') {
    return { borderColor, borderStyle, borderBottomWidth: `${lineWidth}px` };
  }

  return { borderColor, borderStyle, borderLeftWidth: `${lineWidth}px` };
}

function getInnerFrameBorderStyle(lineStyle: ResolvedGenericTemplateLineStyle): CSSProperties {
  const lineWidth = getLineWidth(lineStyle, 0.75);

  return {
    borderColor: lineStyle.color,
    borderStyle: lineStyle.visible ? lineStyle.pattern : 'solid',
    borderWidth: `${lineWidth}px`,
  };
}

function getLineWidth(lineStyle: ResolvedGenericTemplateLineStyle, widthFactor = 1) {
  if (!lineStyle.visible) {
    return 0;
  }

  return Math.max(0.75, lineStyle.widthPx * widthFactor);
}

function getTypographyStyle(
  style: GenericTemplateTypographyRoleStyle,
  overrides: CSSProperties = {},
): CSSProperties {
  return {
    fontFamily: getGenericTemplateFontFamilyStack(style.fontFamily),
    fontSize: `${style.fontSizePx}px`,
    fontWeight: style.fontWeight,
    letterSpacing: `${style.letterSpacingEm}em`,
    lineHeight: `${Math.max(style.fontSizePx + 4, style.fontSizePx * 1.35)}px`,
    ...overrides,
  };
}

function getMultilineClampStyle(maxLines: number): CSSProperties {
  return {
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: maxLines,
    display: '-webkit-box',
    overflow: 'hidden',
    overflowWrap: 'normal',
    wordBreak: 'keep-all',
  };
}

function getPanelHeadingStyle(
  textStyle: ResolvedGenericTemplateTextStyle,
  overrides: CSSProperties = {},
): CSSProperties {
  const fontSizePx = textStyle.fontSizePx ? Math.max(10, textStyle.fontSizePx - 1) : 10;

  return {
    fontFamily: textStyle.fontFamily ?? getGenericTemplateFontFamilyStack('technical_mono'),
    fontSize: `${fontSizePx}px`,
    fontWeight: textStyle.fontWeight ?? 600,
    letterSpacing: '0.12em',
    textAlign: textStyle.textAlign,
    ...overrides,
  };
}

function getBodyTextStyle(
  textStyle: ResolvedGenericTemplateTextStyle,
  overrides: CSSProperties = {},
): CSSProperties {
  const fontSizePx = textStyle.fontSizePx ?? 14;

  return {
    fontFamily: textStyle.fontFamily,
    fontSize: `${fontSizePx}px`,
    fontWeight: textStyle.fontWeight,
    textAlign: textStyle.textAlign,
    ...overrides,
  };
}

function getFontFamilyCssStack(fontFamily: GenericTemplateFontChoice) {
  switch (fontFamily) {
    case 'Inter':
      return 'Inter, "Helvetica Neue", Arial, sans-serif';
    case 'Arial':
      return 'Arial, "Helvetica Neue", sans-serif';
    case 'Times New Roman':
      return '"Times New Roman", Georgia, serif';
    case 'Courier New':
      return '"Courier New", "SFMono-Regular", Consolas, monospace';
    case 'Georgia':
      return 'Georgia, "Times New Roman", serif';
    default:
      return 'Inter, "Helvetica Neue", Arial, sans-serif';
  }
}

function pageLabel(paperSize: string) {
  return paperSize.toUpperCase();
}

function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function shouldHideAs1100StarterObjectLabel(
  template: GenericTemplateDocument,
  object: GenericTemplateObject,
) {
  return (
    template.presetId === 'as1100_inspired' &&
    (object.type === 'detailsBlock' || object.type === 'imageFrame' || object.type === 'textBlock')
  );
}
