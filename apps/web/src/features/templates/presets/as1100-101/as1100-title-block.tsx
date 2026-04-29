'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
  DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY,
  getGenericTemplateFontFamilyStack,
  type GenericTemplateLineStyle,
  type GenericTemplateTypography,
  type GenericTemplateTypographyRoleStyle,
} from '../../core/generic-template-document';
import { getAs1100LetteringSpec, getAs1100TitleBlockSpec } from './as1100-spec';
import type { TemplatePageOrientation, TemplatePaperSize } from '../../core/template-page';

export type As1100TitleBlockData = {
  checkedBy: string;
  generatedAtLabel: string;
  paperLabel: string;
  preparedBy: string;
  projectAddress: string;
  projectCode: string;
  projectName: string;
  revision: string;
  scaleLabel: string;
  sheetNumber: string;
  sheetTitle: string;
  subtitle: string;
};

export function As1100DrawingTitleBlock({
  contentScale: _contentScale,
  density: _density,
  fontFamilyOverride,
  lineStyle = DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
  linePattern = 'solid',
  objectWidthMm,
  orientation: _orientation,
  paddingScale: _paddingScale,
  pagePxPerMm,
  paperSize,
  showDesignerChrome,
  textAlignOverride = 'left',
  textColorOverride,
  targetHeightPx,
  titleBlockData,
  typography = DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY,
}: {
  contentScale?: number;
  density?: string;
  fontFamilyOverride?: string;
  lineStyle?: GenericTemplateLineStyle;
  linePattern?: 'dashed' | 'dotted' | 'none' | 'solid';
  objectWidthMm?: number;
  orientation: TemplatePageOrientation;
  paddingScale?: number;
  pagePxPerMm?: number;
  paperSize: TemplatePaperSize;
  showDesignerChrome: boolean;
  textAlignOverride?: 'center' | 'left' | 'right';
  textColorOverride?: string;
  targetHeightPx?: number;
  titleBlockData: As1100TitleBlockData;
  typography?: GenericTemplateTypography;
}) {
  const spec = getAs1100TitleBlockSpec(paperSize, _orientation);
  const totalHeightMm = spec.totalHeightMm;
  const defaultWidthMm = spec.totalWidthMm;
  const totalWidthMm = objectWidthMm ?? defaultWidthMm;
  const letterSpec = getAs1100LetteringSpec(paperSize);
  const resolvedPagePxPerMm =
    pagePxPerMm ?? (targetHeightPx ? targetHeightPx / totalHeightMm : 2.1);

  const props = {
    fontFamilyOverride,
    letterSpec,
    linePattern,
    lineStyle,
    pagePxPerMm: resolvedPagePxPerMm,
    paperSize,
    textAlign: textAlignOverride,
    textColor: textColorOverride,
    titleBlockData,
    totalHeightMm,
    totalWidthMm,
    typography,
  } satisfies VariantProps;

  return (
    <section
      className="relative h-full min-h-0 bg-white"
      style={getOuterBorderStyle(lineStyle, linePattern)}
    >
      {showDesignerChrome ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-sky-400/60" />
      ) : null}
      {paperSize === 'a0' ? (
        <A0TitleBlock {...props} />
      ) : paperSize === 'a4' ? (
        <A4TitleBlock {...props} />
      ) : (
        <PreferredSeriesTitleBlock {...props} />
      )}
    </section>
  );
}

function A0TitleBlock(props: VariantProps) {
  const { totalWidthMm, totalHeightMm, titleBlockData } = props;
  const jWidthMm = Math.max(0, totalWidthMm - 310);
  const dX = jWidthMm;
  const formalX = dX + 110;
  const labelColumnWidthMm = 50;
  const valueColumnWidthMm = 120;
  const sheetSizeWidthMm = 30;

  return (
    <Plate totalHeightMm={totalHeightMm} totalWidthMm={totalWidthMm}>
      {jWidthMm > 0 ? (
        <>
          <VerticalLine xMm={jWidthMm} yMm={0} heightMm={totalHeightMm} {...props} />
          <TextRegion
            align="left"
            paddingMode="compact"
            role="body"
            text={titleBlockData.subtitle || titleBlockData.projectAddress}
            xMm={0}
            yMm={0}
            verticalAlign="top"
            widthMm={jWidthMm}
            heightMm={80}
            {...props}
          />
        </>
      ) : null}

      <VerticalLine xMm={formalX} yMm={0} heightMm={totalHeightMm} {...props} />
      <VerticalLine xMm={formalX + 50} yMm={0} heightMm={80} {...props} />
      <VerticalLine xMm={formalX + 170} yMm={0} heightMm={80} {...props} />
      <HorizontalLine xMm={formalX} yMm={20} lengthMm={200} {...props} />
      <HorizontalLine xMm={formalX} yMm={50} lengthMm={200} {...props} />
      <HorizontalLine xMm={formalX} yMm={71} lengthMm={170} {...props} />

      <TextRegion
        align="left"
        paddingMode="compact"
        role="body"
        text={buildRecordSummary(titleBlockData)}
        xMm={dX}
        yMm={0}
        verticalAlign="top"
        widthMm={110}
        heightMm={80}
        {...props}
      />
      <TextRegion
        align="left"
        role="heading"
        text={buildAuthorityText(titleBlockData)}
        xMm={formalX + labelColumnWidthMm}
        yMm={0}
        widthMm={valueColumnWidthMm}
        heightMm={20}
        {...props}
      />
      <LabelOnlyCell
        label="TITLE"
        text={titleBlockData.sheetTitle}
        xMm={formalX}
        yMm={20}
        widthMm={labelColumnWidthMm}
        heightMm={30}
        {...props}
      />
      <ValueCell
        align="left"
        paddingMode="default"
        role="title"
        text={titleBlockData.sheetTitle}
        verticalAlign="center"
        xMm={formalX + labelColumnWidthMm}
        yMm={20}
        widthMm={valueColumnWidthMm}
        heightMm={30}
        {...props}
      />
      <LabeledField
        label="CODE IDENT NO"
        text={titleBlockData.projectCode}
        role="body"
        xMm={formalX}
        yMm={50}
        widthMm={labelColumnWidthMm}
        heightMm={21}
        {...props}
      />
      <LabeledField
        label="DRAWING NO"
        text={titleBlockData.sheetNumber}
        role="title"
        xMm={formalX + labelColumnWidthMm}
        yMm={50}
        widthMm={valueColumnWidthMm}
        heightMm={21}
        {...props}
      />
      <SheetSizeField
        text={getPaperCode(titleBlockData.paperLabel)}
        xMm={formalX + labelColumnWidthMm + valueColumnWidthMm}
        yMm={0}
        widthMm={sheetSizeWidthMm}
        heightMm={80}
        labelYRatio={0.7}
        valueYRatio={0.88}
        {...props}
      />
      <LabeledField
        label="SCALE"
        text={titleBlockData.scaleLabel}
        role="body"
        xMm={formalX}
        yMm={71}
        widthMm={labelColumnWidthMm}
        heightMm={9}
        {...props}
      />
      <TextRegion
        align="left"
        paddingMode="compact"
        role="body"
        text={buildFooterInfo(titleBlockData)}
        xMm={formalX + labelColumnWidthMm}
        yMm={71}
        widthMm={valueColumnWidthMm}
        heightMm={9}
        {...props}
      />
    </Plate>
  );
}

function PreferredSeriesTitleBlock(props: VariantProps) {
  const { totalWidthMm, totalHeightMm, titleBlockData } = props;
  const recordPanelWidthMm = clamp(totalWidthMm * 0.15, 24, 56);
  const formalWidthMm = Math.max(0, totalWidthMm - recordPanelWidthMm);
  const sheetSizeWidthMm = clamp(formalWidthMm * 0.11, 14, 18);
  const labelColumnWidthMm = clamp(formalWidthMm * 0.17, 24, 34);
  const valueColumnWidthMm = Math.max(0, formalWidthMm - labelColumnWidthMm - sheetSizeWidthMm);
  const formalX = Math.max(
    0,
    totalWidthMm - (labelColumnWidthMm + valueColumnWidthMm + sheetSizeWidthMm),
  );
  const recordSummaryWidthMm = formalX;
  const formalBandWidthMm = labelColumnWidthMm + valueColumnWidthMm + sheetSizeWidthMm;

  return (
    <Plate totalHeightMm={totalHeightMm} totalWidthMm={totalWidthMm}>
      <HorizontalLine xMm={0} yMm={20} lengthMm={totalWidthMm} {...props} />
      {recordSummaryWidthMm > 0 ? (
        <VerticalLine xMm={recordSummaryWidthMm} yMm={20} heightMm={55} {...props} />
      ) : null}
      <VerticalLine xMm={formalX} yMm={20} heightMm={55} {...props} />
      <VerticalLine xMm={formalX + labelColumnWidthMm} yMm={20} heightMm={55} {...props} />
      <VerticalLine
        xMm={formalX + labelColumnWidthMm + valueColumnWidthMm}
        yMm={35}
        heightMm={40}
        {...props}
      />
      <HorizontalLine xMm={formalX} yMm={35} lengthMm={formalBandWidthMm} {...props} />
      <HorizontalLine
        xMm={formalX}
        yMm={55}
        lengthMm={labelColumnWidthMm + valueColumnWidthMm}
        {...props}
      />
      <HorizontalLine
        xMm={formalX}
        yMm={67}
        lengthMm={labelColumnWidthMm + valueColumnWidthMm}
        {...props}
      />

      <TextRegion
        align="left"
        paddingMode="compact"
        role="body"
        text={titleBlockData.subtitle || titleBlockData.projectAddress}
        xMm={0}
        yMm={0}
        verticalAlign="top"
        widthMm={totalWidthMm}
        heightMm={20}
        {...props}
      />
      <TextRegion
        align="left"
        paddingMode="compact"
        role="body"
        text={buildRecordSummary(titleBlockData)}
        xMm={0}
        yMm={20}
        verticalAlign="top"
        widthMm={recordSummaryWidthMm}
        heightMm={55}
        {...props}
      />
      <TextRegion
        align="left"
        role="heading"
        text={buildAuthorityText(titleBlockData)}
        xMm={formalX + labelColumnWidthMm}
        yMm={20}
        widthMm={valueColumnWidthMm + sheetSizeWidthMm}
        heightMm={15}
        {...props}
      />
      <LabelOnlyCell
        label="TITLE"
        text={titleBlockData.sheetTitle}
        xMm={formalX}
        yMm={35}
        widthMm={labelColumnWidthMm}
        heightMm={20}
        {...props}
      />
      <ValueCell
        align="left"
        paddingMode="compact"
        role="title"
        text={titleBlockData.sheetTitle}
        verticalAlign="center"
        xMm={formalX + labelColumnWidthMm}
        yMm={35}
        widthMm={valueColumnWidthMm}
        heightMm={20}
        {...props}
      />
      <LabeledField
        label="CODE IDENT NO"
        text={titleBlockData.projectCode}
        role="body"
        xMm={formalX}
        yMm={55}
        widthMm={labelColumnWidthMm}
        heightMm={12}
        {...props}
      />
      <LabeledField
        label="DRAWING NO"
        text={titleBlockData.sheetNumber}
        role="title"
        xMm={formalX + labelColumnWidthMm}
        yMm={55}
        widthMm={valueColumnWidthMm}
        heightMm={12}
        {...props}
      />
      <SheetSizeField
        text={getPaperCode(titleBlockData.paperLabel)}
        xMm={formalX + labelColumnWidthMm + valueColumnWidthMm}
        yMm={35}
        widthMm={sheetSizeWidthMm}
        heightMm={40}
        labelYRatio={0.32}
        valueYRatio={0.82}
        {...props}
      />
      <LabeledField
        label="SCALE"
        text={titleBlockData.scaleLabel}
        role="body"
        xMm={formalX}
        yMm={67}
        widthMm={labelColumnWidthMm}
        heightMm={8}
        {...props}
      />
      <TextRegion
        align="left"
        paddingMode="compact"
        role="body"
        text={buildFooterInfo(titleBlockData)}
        xMm={formalX + labelColumnWidthMm}
        yMm={67}
        widthMm={valueColumnWidthMm}
        heightMm={8}
        {...props}
      />
    </Plate>
  );
}

function A4TitleBlock(props: VariantProps) {
  const { totalWidthMm, totalHeightMm, titleBlockData } = props;
  const recordPanelWidthMm = clamp(totalWidthMm * 0.2, 28, 46);
  const formalWidthMm = Math.max(0, totalWidthMm - recordPanelWidthMm);
  const sheetSizeWidthMm = clamp(formalWidthMm * 0.11, 13, 17);
  const labelColumnWidthMm = clamp(formalWidthMm * 0.18, 20, 26);
  const valueColumnWidthMm = Math.max(0, formalWidthMm - labelColumnWidthMm - sheetSizeWidthMm);
  const formalX = Math.max(
    0,
    totalWidthMm - (labelColumnWidthMm + valueColumnWidthMm + sheetSizeWidthMm),
  );
  const recordSummaryWidthMm = formalX;
  const formalBandWidthMm = labelColumnWidthMm + valueColumnWidthMm + sheetSizeWidthMm;

  return (
    <Plate totalHeightMm={totalHeightMm} totalWidthMm={totalWidthMm}>
      <HorizontalLine xMm={0} yMm={20} lengthMm={totalWidthMm} {...props} />
      <VerticalLine xMm={formalX} yMm={20} heightMm={55} {...props} />
      <VerticalLine xMm={formalX + labelColumnWidthMm} yMm={20} heightMm={55} {...props} />
      <VerticalLine
        xMm={formalX + labelColumnWidthMm + valueColumnWidthMm}
        yMm={35}
        heightMm={40}
        {...props}
      />
      <HorizontalLine xMm={formalX} yMm={35} lengthMm={formalBandWidthMm} {...props} />
      <HorizontalLine
        xMm={formalX}
        yMm={55}
        lengthMm={labelColumnWidthMm + valueColumnWidthMm}
        {...props}
      />
      <HorizontalLine
        xMm={formalX}
        yMm={67}
        lengthMm={labelColumnWidthMm + valueColumnWidthMm}
        {...props}
      />

      <TextRegion
        align="left"
        paddingMode="compact"
        role="body"
        text={titleBlockData.subtitle || titleBlockData.projectAddress}
        xMm={0}
        yMm={0}
        verticalAlign="top"
        widthMm={totalWidthMm}
        heightMm={20}
        {...props}
      />
      <TextRegion
        align="left"
        paddingMode="compact"
        role="body"
        text={buildRecordSummary(titleBlockData)}
        xMm={0}
        yMm={20}
        verticalAlign="top"
        widthMm={recordSummaryWidthMm}
        heightMm={55}
        {...props}
      />
      <TextRegion
        align="left"
        role="heading"
        text={buildAuthorityText(titleBlockData)}
        xMm={formalX + labelColumnWidthMm}
        yMm={20}
        widthMm={valueColumnWidthMm + sheetSizeWidthMm}
        heightMm={15}
        {...props}
      />
      <LabelOnlyCell
        label="TITLE"
        text={titleBlockData.sheetTitle}
        xMm={formalX}
        yMm={35}
        widthMm={labelColumnWidthMm}
        heightMm={20}
        {...props}
      />
      <ValueCell
        align="left"
        paddingMode="compact"
        role="title"
        text={titleBlockData.sheetTitle}
        verticalAlign="center"
        xMm={formalX + labelColumnWidthMm}
        yMm={35}
        widthMm={valueColumnWidthMm}
        heightMm={20}
        {...props}
      />
      <LabeledField
        label="CODE IDENT NO"
        text={titleBlockData.projectCode}
        role="body"
        xMm={formalX}
        yMm={55}
        widthMm={labelColumnWidthMm}
        heightMm={12}
        {...props}
      />
      <LabeledField
        label="DRAWING NO"
        text={titleBlockData.sheetNumber}
        role="title"
        xMm={formalX + labelColumnWidthMm}
        yMm={55}
        widthMm={valueColumnWidthMm}
        heightMm={12}
        {...props}
      />
      <SheetSizeField
        text={getPaperCode(titleBlockData.paperLabel)}
        xMm={formalX + labelColumnWidthMm + valueColumnWidthMm}
        yMm={35}
        widthMm={sheetSizeWidthMm}
        heightMm={40}
        labelYRatio={0.32}
        valueYRatio={0.82}
        {...props}
      />
      <LabeledField
        label="SCALE"
        text={titleBlockData.scaleLabel}
        role="body"
        xMm={formalX}
        yMm={67}
        widthMm={labelColumnWidthMm}
        heightMm={8}
        {...props}
      />
      <TextRegion
        align="left"
        role="body"
        text={buildFooterInfo(titleBlockData)}
        xMm={formalX + labelColumnWidthMm}
        yMm={67}
        widthMm={valueColumnWidthMm}
        heightMm={8}
        {...props}
      />
    </Plate>
  );
}

function Plate({
  children,
  totalHeightMm,
  totalWidthMm,
}: {
  children: ReactNode;
  totalHeightMm: number;
  totalWidthMm: number;
}) {
  return (
    <div className="relative h-full w-full" style={{ overflow: 'hidden' }}>
      {children}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
        }}
        data-mm={`${totalWidthMm}x${totalHeightMm}`}
      />
    </div>
  );
}

function TextRegion({
  align,
  fontFamilyOverride,
  heightMm,
  letterSpec,
  pagePxPerMm,
  paddingMode = 'default',
  role,
  text,
  textAlign,
  textColor,
  totalHeightMm,
  totalWidthMm,
  typography,
  verticalAlign = 'center',
  widthMm,
  xMm,
  yMm,
}: VariantProps & {
  align: 'center' | 'left';
  heightMm: number;
  paddingMode?: 'compact' | 'default';
  role: 'body' | 'heading' | 'title';
  text: string;
  verticalAlign?: 'center' | 'top';
  widthMm: number;
  xMm: number;
  yMm: number;
}) {
  const padding = getCellPadding(pagePxPerMm, widthMm, heightMm, paddingMode);

  return (
    <div
      className="absolute"
      style={absoluteRect(xMm, yMm, widthMm, heightMm, totalWidthMm, totalHeightMm)}
    >
      <div
        className="flex h-full flex-col overflow-hidden"
        style={{
          justifyContent: verticalAlign === 'top' ? 'flex-start' : 'center',
          padding: `${padding.y}px ${padding.x}px`,
          textAlign: textAlign ?? align,
        }}
      >
        <div
          className="whitespace-pre-wrap"
          style={getStandardTextStyle({
            color: textColor,
            fontFamilyOverride,
            letterSpec,
            pagePxPerMm,
            role,
            roleStyle:
              role === 'title'
                ? typography.title
                : role === 'heading'
                  ? typography.label
                  : typography.body,
            textAlign: textAlign ?? align,
            uppercase: true,
            wordBreak: 'keep-all',
          })}
        >
          {formatDrawingText(text, { preserveLineBreaks: true })}
        </div>
      </div>
    </div>
  );
}

function LabeledField({
  fontFamilyOverride,
  heightMm,
  label,
  letterSpec,
  pagePxPerMm,
  role,
  text,
  textAlign = 'left',
  textColor,
  totalHeightMm,
  totalWidthMm,
  typography,
  widthMm,
  xMm,
  yMm,
}: VariantProps & {
  heightMm: number;
  label: string;
  role: 'body' | 'heading' | 'title';
  text: string;
  widthMm: number;
  xMm: number;
  yMm: number;
  textAlign?: 'center' | 'left' | 'right';
}) {
  const padding = getCellPadding(pagePxPerMm, widthMm, heightMm, 'compact');

  return (
    <div
      className="absolute"
      style={absoluteRect(xMm, yMm, widthMm, heightMm, totalWidthMm, totalHeightMm)}
    >
      <div
        className="flex h-full flex-col overflow-hidden"
        style={{
          gap: `${Math.max(0.5, padding.y * 0.45)}px`,
          justifyContent: 'flex-start',
          padding: `${padding.y}px ${padding.x}px`,
        }}
      >
        <div
          className="min-h-0"
          style={getStandardTextStyle({
            color: textColor ?? '#475569',
            fontFamilyOverride,
            letterSpec,
            pagePxPerMm,
            role: 'body',
            roleStyle: typography.label,
            textAlign: 'left',
            uppercase: true,
            whiteSpace: 'nowrap',
          })}
        >
          {label}
        </div>
        <div
          className="whitespace-pre-wrap"
          style={getStandardTextStyle({
            color: textColor,
            fontFamilyOverride,
            letterSpec,
            pagePxPerMm,
            role,
            roleStyle:
              role === 'title'
                ? typography.title
                : role === 'heading'
                  ? typography.label
                  : typography.body,
            textAlign,
            uppercase: true,
            wordBreak: 'keep-all',
          })}
        >
          {formatDrawingText(text, { preserveLineBreaks: true })}
        </div>
      </div>
    </div>
  );
}

function LabelOnlyCell({
  fontFamilyOverride,
  heightMm,
  label,
  letterSpec,
  pagePxPerMm,
  textColor,
  totalHeightMm,
  totalWidthMm,
  typography,
  widthMm,
  xMm,
  yMm,
}: VariantProps & {
  heightMm: number;
  label: string;
  text?: string;
  widthMm: number;
  xMm: number;
  yMm: number;
}) {
  const padding = getCellPadding(pagePxPerMm, widthMm, heightMm, 'compact');

  return (
    <div
      className="absolute"
      style={absoluteRect(xMm, yMm, widthMm, heightMm, totalWidthMm, totalHeightMm)}
    >
      <div className="flex h-full items-start" style={{ padding: `${padding.y}px ${padding.x}px` }}>
        <div
          style={getStandardTextStyle({
            color: textColor ?? '#475569',
            fontFamilyOverride,
            letterSpec,
            pagePxPerMm,
            role: 'body',
            roleStyle: typography.label,
            textAlign: 'left',
            uppercase: true,
          })}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function ValueCell({
  align,
  heightMm,
  paddingMode,
  role,
  text,
  verticalAlign,
  widthMm,
  xMm,
  yMm,
  ...props
}: VariantProps & {
  align: 'center' | 'left';
  heightMm: number;
  paddingMode?: 'compact' | 'default';
  role: 'body' | 'heading' | 'title';
  text: string;
  verticalAlign?: 'center' | 'top';
  widthMm: number;
  xMm: number;
  yMm: number;
}) {
  return (
    <TextRegion
      align={align}
      heightMm={heightMm}
      paddingMode={paddingMode}
      role={role}
      text={text}
      verticalAlign={verticalAlign}
      widthMm={widthMm}
      xMm={xMm}
      yMm={yMm}
      {...props}
    />
  );
}

function SheetSizeField({
  fontFamilyOverride,
  heightMm,
  labelYRatio,
  letterSpec,
  pagePxPerMm,
  text,
  textColor,
  totalHeightMm,
  totalWidthMm,
  typography,
  valueYRatio,
  widthMm,
  xMm,
  yMm,
}: VariantProps & {
  heightMm: number;
  labelYRatio: number;
  text: string;
  valueYRatio: number;
  widthMm: number;
  xMm: number;
  yMm: number;
}) {
  const labelY = yMm + heightMm * labelYRatio;
  const valueY = yMm + heightMm * valueYRatio;

  return (
    <div
      className="absolute"
      style={absoluteRect(xMm, yMm, widthMm, heightMm, totalWidthMm, totalHeightMm)}
    >
      <div
        className="absolute left-0 right-0"
        style={{
          top: mmToPercent(labelY - yMm, heightMm),
          transform: 'translateY(-50%)',
        }}
      >
        <div
          className="text-center"
          style={{
            ...getStandardTextStyle({
              color: textColor ?? '#475569',
              fontFamilyOverride,
              letterSpec,
              pagePxPerMm,
              role: 'body',
              roleStyle: typography.label,
              textAlign: 'center',
              uppercase: true,
            }),
            whiteSpace: 'pre-line',
          }}
        >
          {'SHEET\nSIZE'}
        </div>
      </div>
      <div
        className="absolute left-0 right-0"
        style={{
          top: mmToPercent(valueY - yMm, heightMm),
          transform: 'translateY(-50%)',
        }}
      >
        <div
          className="text-center"
          style={getStandardTextStyle({
            color: textColor,
            fontFamilyOverride,
            letterSpec,
            pagePxPerMm,
            role: 'heading',
            roleStyle: typography.label,
            textAlign: 'center',
            uppercase: true,
          })}
        >
          {formatDrawingText(text)}
        </div>
      </div>
    </div>
  );
}

function HorizontalLine({
  lengthMm,
  linePattern,
  lineStyle,
  totalHeightMm,
  totalWidthMm,
  xMm,
  yMm,
}: LineProps & {
  lengthMm: number;
  xMm: number;
  yMm: number;
}) {
  const widthPx = getLineWidth(lineStyle, linePattern, 0.7);
  if (widthPx <= 0) {
    return null;
  }

  return (
    <div
      className="absolute"
      style={{
        left: mmToPercent(xMm, totalWidthMm),
        top: mmToPercent(yMm, totalHeightMm),
        width: mmToPercent(lengthMm, totalWidthMm),
        borderTopColor: lineStyle.color,
        borderTopStyle: linePattern === 'none' ? 'solid' : linePattern,
        borderTopWidth: `${widthPx}px`,
      }}
    />
  );
}

function VerticalLine({
  heightMm,
  linePattern,
  lineStyle,
  totalHeightMm,
  totalWidthMm,
  xMm,
  yMm,
}: LineProps & {
  heightMm?: number;
  xMm: number;
  yMm: number;
}) {
  const widthPx = getLineWidth(lineStyle, linePattern, 0.7);
  if (widthPx <= 0) {
    return null;
  }
  const resolvedHeightMm = heightMm ?? totalHeightMm;

  return (
    <div
      className="absolute"
      style={{
        left: mmToPercent(xMm, totalWidthMm),
        top: mmToPercent(yMm, totalHeightMm),
        height: mmToPercent(resolvedHeightMm, totalHeightMm),
        borderLeftColor: lineStyle.color,
        borderLeftStyle: linePattern === 'none' ? 'solid' : linePattern,
        borderLeftWidth: `${widthPx}px`,
      }}
    />
  );
}

function absoluteRect(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  totalWidthMm: number,
  totalHeightMm: number,
) {
  return {
    left: mmToPercent(xMm, totalWidthMm),
    top: mmToPercent(yMm, totalHeightMm),
    width: mmToPercent(widthMm, totalWidthMm),
    height: mmToPercent(heightMm, totalHeightMm),
  } satisfies CSSProperties;
}

function mmToPercent(valueMm: number, totalMm: number) {
  return `${(Math.max(0, valueMm) / Math.max(1, totalMm)) * 100}%`;
}

function buildAuthorityText(titleBlockData: As1100TitleBlockData) {
  return [titleBlockData.projectName, titleBlockData.projectAddress].filter(Boolean).join('\n');
}

function buildRecordSummary(titleBlockData: As1100TitleBlockData) {
  return [
    titleBlockData.preparedBy ? `DRAWN ${titleBlockData.preparedBy}` : '',
    titleBlockData.checkedBy ? `CHECKED ${titleBlockData.checkedBy}` : '',
    titleBlockData.generatedAtLabel ? `DATE ${titleBlockData.generatedAtLabel}` : '',
    titleBlockData.revision ? `REV ${titleBlockData.revision}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildFooterInfo(titleBlockData: As1100TitleBlockData) {
  return [
    titleBlockData.sheetNumber ? `SHEET ${titleBlockData.sheetNumber}` : '',
    titleBlockData.revision ? `REV ${titleBlockData.revision}` : '',
  ]
    .filter(Boolean)
    .join('  ');
}

function getPaperCode(paperLabel: string) {
  const [paperCode = paperLabel] = paperLabel.split(' ');
  return paperCode;
}

function getCellPadding(
  pagePxPerMm: number,
  widthMm: number,
  heightMm: number,
  mode: 'compact' | 'default',
) {
  const x = Math.max(
    1,
    Math.min(pagePxPerMm * (mode === 'compact' ? 0.7 : 0.95), widthMm * pagePxPerMm * 0.06),
  );
  const y = Math.max(
    0.5,
    Math.min(pagePxPerMm * (mode === 'compact' ? 0.45 : 0.7), heightMm * pagePxPerMm * 0.11),
  );

  return { x, y };
}

function getStandardTextStyle({
  color,
  fontFamilyOverride,
  letterSpec,
  pagePxPerMm,
  role,
  roleStyle,
  textAlign = 'left',
  uppercase = false,
  whiteSpace = 'pre-wrap',
  wordBreak = 'normal',
}: {
  color?: string;
  fontFamilyOverride?: string;
  letterSpec: ReturnType<typeof getAs1100LetteringSpec>;
  pagePxPerMm: number;
  role: 'body' | 'heading' | 'title';
  roleStyle: GenericTemplateTypographyRoleStyle;
  textAlign?: 'center' | 'left' | 'right';
  uppercase?: boolean;
  whiteSpace?: CSSProperties['whiteSpace'];
  wordBreak?: CSSProperties['wordBreak'];
}) {
  const defaultRoleStyle =
    role === 'title'
      ? DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.title
      : role === 'heading'
        ? DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.label
        : DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.body;
  const heightMm =
    role === 'title'
      ? letterSpec.titleAndDrawingNumberHeightMm
      : role === 'heading'
        ? letterSpec.headingHeightMm
        : letterSpec.bodyHeightMm;
  const sizeRatio = clamp(roleStyle.fontSizePx / defaultRoleStyle.fontSizePx, 0.65, 1.85);
  const rawFontSizePx = heightMm * pagePxPerMm * sizeRatio;
  const fontSizePx = Math.max(
    role === 'title' ? 9.5 : role === 'heading' ? 8.5 : 7.5,
    rawFontSizePx,
  );
  const characterThicknessPx = Math.max(fontSizePx * 0.08, 0.35);
  const letterSpacingPx = clamp(
    Math.max(
      roleStyle.letterSpacingEm * fontSizePx * (role === 'title' ? 0.58 : 0.72),
      characterThicknessPx * 0.88,
      pagePxPerMm * 0.06,
    ),
    0.12,
    role === 'title'
      ? fontSizePx * 0.035
      : role === 'heading'
        ? fontSizePx * 0.08
        : fontSizePx * 0.06,
  );
  const wordSpacingPx =
    role === 'title'
      ? clamp(fontSizePx * 0.025, fontSizePx * 0.01, fontSizePx * 0.06)
      : clamp(fontSizePx * 0.08, fontSizePx * 0.04, fontSizePx * 0.18);
  const lineHeightPx = fontSizePx * (role === 'title' ? 1.08 : role === 'heading' ? 1.1 : 1.08);

  return {
    color: color ?? '#0f172a',
    fontFamily: fontFamilyOverride ?? getGenericTemplateFontFamilyStack(roleStyle.fontFamily),
    fontSize: `${fontSizePx}px`,
    fontWeight: roleStyle.fontWeight,
    letterSpacing: `${letterSpacingPx}px`,
    lineHeight: `${lineHeightPx}px`,
    overflowWrap: 'normal',
    textAlign,
    textTransform: uppercase ? 'uppercase' : undefined,
    textWrap: role === 'title' ? 'pretty' : undefined,
    whiteSpace,
    wordBreak,
    wordSpacing: `${wordSpacingPx}px`,
  } satisfies CSSProperties;
}

function getOuterBorderStyle(
  lineStyle: GenericTemplateLineStyle,
  linePattern: 'dashed' | 'dotted' | 'none' | 'solid',
): CSSProperties {
  return {
    borderColor: lineStyle.color,
    borderStyle: lineStyle.visible && linePattern !== 'none' ? linePattern : 'solid',
    borderWidth: lineStyle.visible && linePattern !== 'none' ? `${lineStyle.widthPx}px` : '0px',
  };
}

function getLineWidth(
  lineStyle: GenericTemplateLineStyle,
  linePattern: 'dashed' | 'dotted' | 'none' | 'solid',
  widthFactor = 1,
) {
  if (!lineStyle.visible || linePattern === 'none') {
    return 0;
  }

  return Math.max(1, lineStyle.widthPx * widthFactor);
}

function formatDrawingText(
  value: string,
  options: {
    preserveLineBreaks?: boolean;
  } = {},
) {
  const cleaned = value
    .split(options.preserveLineBreaks ? '\n' : /\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(options.preserveLineBreaks ? '\n' : ' ');

  return cleaned.toUpperCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type VariantProps = {
  fontFamilyOverride?: string;
  letterSpec: ReturnType<typeof getAs1100LetteringSpec>;
  linePattern: 'dashed' | 'dotted' | 'none' | 'solid';
  lineStyle: GenericTemplateLineStyle;
  pagePxPerMm: number;
  paperSize: TemplatePaperSize;
  textAlign: 'center' | 'left' | 'right';
  textColor?: string;
  titleBlockData: As1100TitleBlockData;
  totalHeightMm: number;
  totalWidthMm: number;
  typography: GenericTemplateTypography;
};

type LineProps = {
  linePattern: 'dashed' | 'dotted' | 'none' | 'solid';
  lineStyle: GenericTemplateLineStyle;
  pagePxPerMm: number;
  totalHeightMm: number;
  totalWidthMm: number;
};
