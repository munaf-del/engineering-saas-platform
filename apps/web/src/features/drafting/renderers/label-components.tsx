import * as React from 'react';
import type { DraftingLabelPlacement } from '../labels/drafting-label-layout';
import {
  resolveDraftingLeaderStyle,
  type ResolvedDraftingTextStyle,
} from '../standards/drafting-style-resolver';
import { getDraftingStandardProfile } from '../standards/drafting-standard-profiles';

export function DraftingCanvasLabel({
  anchorPoint,
  leaderStroke,
  leaderStrokeWidth = 1,
  lines,
  placement,
  stroke,
  surface = 'editor',
  textAnchor = 'start',
  textStyle,
  textSize,
  x,
  y,
}: {
  anchorPoint?: { x: number; y: number };
  leaderStroke?: string;
  leaderStrokeWidth?: number;
  lines: string[];
  placement?: DraftingLabelPlacement;
  stroke: string;
  surface?: 'editor' | 'sheet';
  textAnchor?: 'start' | 'middle' | 'end';
  textStyle?: ResolvedDraftingTextStyle;
  textSize: number;
  x: number;
  y: number;
}) {
  if (lines.length === 0 || placement?.hidden) {
    return null;
  }

  const labelX = placement?.hidden === false ? placement.x : x;
  const labelY = placement?.hidden === false ? placement.y : y;
  const leader = placement?.hidden === false ? placement.leader : undefined;
  const defaultLeaderStyle = resolveDraftingLeaderStyle({ surface });
  const profile = getDraftingStandardProfile();
  const resolvedLeaderStroke = leaderStroke ?? stroke;
  const resolvedLeaderWidth =
    surface === 'sheet'
      ? Math.max(defaultLeaderStyle.lineStyle.editorStrokeWidth, leaderStrokeWidth * 0.55)
      : Math.max(0.75, leaderStrokeWidth);
  const resolvedTextStyle =
    textStyle ??
    ({
      fill: stroke,
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: textSize,
      fontStyle: 'normal',
      fontWeight: 600,
      haloColor: defaultLeaderStyle.labelHaloColor,
      haloStrokeWidth: Math.max(surface === 'sheet' ? 0.18 : 14, textSize * 0.08),
      lineHeight: 1.08,
      secondaryFill: profile.palette.softInk,
      secondaryFontSize: textSize * 0.74,
      secondaryFontWeight: 500,
      textAnchor: 'start',
      textBaseline: 'middle',
      textCase: 'as_entered',
      textHeightMm: surface === 'sheet' ? textSize : textSize / 70,
    } satisfies ResolvedDraftingTextStyle);

  return (
    <g data-drafting-label="true">
      {leader && anchorPoint ? (
        <line
          opacity={0.68}
          stroke={resolvedLeaderStroke}
          strokeWidth={resolvedLeaderWidth}
          vectorEffect={surface === 'sheet' ? undefined : 'non-scaling-stroke'}
          x1={leader.start.x}
          x2={leader.end.x}
          y1={leader.start.y}
          y2={leader.end.y}
        />
      ) : null}
      {lines.map((line, index) => (
        <text
          dominantBaseline="middle"
          fill={index === 0 ? stroke : resolvedTextStyle.secondaryFill}
          fontFamily={resolvedTextStyle.fontFamily}
          fontSize={index === 0 ? resolvedTextStyle.fontSize : resolvedTextStyle.secondaryFontSize}
          fontStyle={resolvedTextStyle.fontStyle}
          fontWeight={
            index === 0 ? resolvedTextStyle.fontWeight : resolvedTextStyle.secondaryFontWeight
          }
          key={`${line}-${index}`}
          paintOrder="stroke"
          stroke={resolvedTextStyle.haloColor}
          strokeLinejoin="round"
          strokeWidth={resolvedTextStyle.haloStrokeWidth}
          textAnchor={textAnchor}
          x={labelX}
          y={labelY + index * resolvedTextStyle.fontSize * resolvedTextStyle.lineHeight}
        >
          {line}
        </text>
      ))}
    </g>
  );
}
