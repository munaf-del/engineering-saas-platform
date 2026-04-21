'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import type { ProjectSpatialFeatureType, ProjectSpatialGeometryType } from '@eng/shared';
import {
  PROJECT_SPATIAL_GEOLOGY_OVERLAY_LEGEND,
  PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER,
  type ProjectSpatialFeatureSymbologyDefinition,
  type ProjectSpatialFillPattern,
  type ProjectSpatialPointSymbolShape,
  type ProjectSpatialPointSymbolVariant,
} from './project-spatial-utils';

export type ProjectSpatialLegendFeatureEntry = {
  featureType: ProjectSpatialFeatureType;
  geometryType: ProjectSpatialGeometryType;
  label: string;
  count: number;
  symbology: ProjectSpatialFeatureSymbologyDefinition;
};

export function ProjectSpatialLegend({
  contentScale = 1,
  columnCount = 1,
  density = 'normal',
  entries,
  showGeologyOverlay,
  showMapContext = true,
  geologyQueryLocation,
  paddingScale = 1,
  symbolScale = 1,
  variant = 'panel',
  showCounts = true,
}: {
  contentScale?: number;
  columnCount?: number;
  density?: 'compact' | 'normal';
  entries: ProjectSpatialLegendFeatureEntry[];
  showGeologyOverlay: boolean;
  geologyQueryLocation: [number, number] | null;
  showMapContext?: boolean;
  paddingScale?: number;
  symbolScale?: number;
  variant?: 'panel' | 'sheet';
  showCounts?: boolean;
}) {
  const sectionSpacingClass = variant === 'sheet' ? 'space-y-3' : 'space-y-4';
  const dividerClass = variant === 'sheet' ? 'border-t pt-3' : 'border-t pt-4';
  const rowsClassName =
    variant === 'sheet' && columnCount > 1 ? 'grid gap-2 md:grid-cols-2' : 'space-y-2';

  return (
    <div className={sectionSpacingClass}>
      <div className={rowsClassName}>
        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            No visible project feature symbols right now.
          </div>
        ) : (
          entries.map((entry) => (
            <LegendRow
              key={`${entry.featureType}-${entry.geometryType}`}
              contentScale={contentScale}
              density={density}
              paddingScale={paddingScale}
              variant={variant}
              symbol={
                <ProjectFeatureLegendSwatch
                  geometryType={entry.geometryType}
                  symbology={entry.symbology}
                  symbolScale={symbolScale}
                />
              }
              label={entry.label}
              meta={showCounts ? `${entry.count} visible` : undefined}
            />
          ))
        )}
      </div>

      {showMapContext ? (
        <div className={`${rowsClassName} ${dividerClass}`}>
          <div
            className={
              columnCount > 1 && variant === 'sheet'
                ? 'text-xs font-medium uppercase tracking-wide text-muted-foreground md:col-span-2'
                : 'text-xs font-medium uppercase tracking-wide text-muted-foreground'
            }
          >
            Read-only Map Context
          </div>
          <LegendRow
            contentScale={contentScale}
            density={density}
            paddingScale={paddingScale}
            variant={variant}
            symbol={
              <GeologyOverlayLegendSwatch active={showGeologyOverlay} symbolScale={symbolScale} />
            }
            label={PROJECT_SPATIAL_GEOLOGY_OVERLAY_LEGEND.label}
            meta={showGeologyOverlay ? 'Overlay visible' : 'Overlay hidden'}
          />
          {showGeologyOverlay && geologyQueryLocation ? (
            <LegendRow
              contentScale={contentScale}
              density={density}
              paddingScale={paddingScale}
              variant={variant}
              symbol={<GeologyQueryLegendSwatch symbolScale={symbolScale} />}
              label={PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.label}
              meta={`Latest query: ${formatGeologyLocation(geologyQueryLocation)}`}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function formatGeologyLocation([longitude, latitude]: [number, number]) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function LegendRow({
  contentScale,
  density,
  symbol,
  label,
  meta,
  paddingScale,
  variant,
}: {
  contentScale: number;
  density: 'compact' | 'normal';
  symbol: ReactNode;
  label: string;
  meta?: string;
  paddingScale: number;
  variant: 'panel' | 'sheet';
}) {
  const densityClass = density === 'compact' ? 'gap-2' : 'gap-3';
  const paddingStyle = {
    paddingBottom: `${6 * paddingScale}px`,
    paddingLeft: `${12 * paddingScale}px`,
    paddingRight: `${12 * paddingScale}px`,
    paddingTop: `${6 * paddingScale}px`,
  };

  return (
    <div
      className={
        variant === 'sheet'
          ? `flex items-center rounded-md border border-slate-300 ${densityClass}`
          : `flex items-center rounded-md border ${densityClass}`
      }
      style={paddingStyle}
    >
      {symbol}
      <div className="min-w-0">
        <div
          className="font-medium"
          style={{ fontSize: `${14 * contentScale}px`, lineHeight: `${18 * contentScale}px` }}
        >
          {label}
        </div>
        {meta ? (
          <div
            className="text-muted-foreground"
            style={{ fontSize: `${12 * contentScale}px`, lineHeight: `${16 * contentScale}px` }}
          >
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectFeatureLegendSwatch({
  geometryType,
  symbology,
  symbolScale = 1,
}: {
  geometryType: ProjectSpatialGeometryType;
  symbology: ProjectSpatialFeatureSymbologyDefinition;
  symbolScale?: number;
}) {
  const patternId = useId().replace(/:/g, '');
  const strokeDasharray = toSvgDasharray(symbology.strokeDash);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md border bg-white/90"
      style={{ height: `${36 * symbolScale}px`, width: `${48 * symbolScale}px` }}
    >
      <svg
        viewBox="0 0 40 24"
        className="overflow-visible"
        style={{ height: `${24 * symbolScale}px`, width: `${40 * symbolScale}px` }}
      >
        <defs>{renderSvgFillPattern(symbology.fillPattern, symbology.color, patternId)}</defs>

        {geometryType === 'point' ? <LegendPointSymbol symbology={symbology} /> : null}

        {geometryType === 'line_string' ? (
          <>
            <line
              x1="5"
              y1="12"
              x2="35"
              y2="12"
              stroke="rgba(255,255,255,0.96)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <line
              x1="5"
              y1="12"
              x2="35"
              y2="12"
              stroke={symbology.color}
              strokeWidth={symbology.strokeWidth + 1}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
            />
          </>
        ) : null}

        {geometryType === 'polygon' ? (
          <>
            <rect
              x="6"
              y="4"
              width="28"
              height="16"
              rx="2"
              fill={withAlphaHex(symbology.color, Math.min(symbology.fillOpacity + 0.04, 0.28))}
              stroke="rgba(255,255,255,0.96)"
              strokeWidth="3"
            />
            <rect
              x="6"
              y="4"
              width="28"
              height="16"
              rx="2"
              fill={withAlphaHex(symbology.color, Math.min(symbology.fillOpacity + 0.04, 0.28))}
              stroke={symbology.color}
              strokeWidth={symbology.strokeWidth}
              strokeDasharray={strokeDasharray}
            />
            {symbology.fillPattern !== 'none' && symbology.fillPattern !== 'solid' ? (
              <rect x="6" y="4" width="28" height="16" rx="2" fill={`url(#${patternId})`} />
            ) : null}
          </>
        ) : null}
      </svg>
    </div>
  );
}

function LegendPointSymbol({ symbology }: { symbology: ProjectSpatialFeatureSymbologyDefinition }) {
  return (
    <>
      {renderPointShapeSvg(
        symbology.pointShape,
        symbology.pointRadius + 2.25,
        'rgba(255,255,255,0.96)',
        'rgba(255,255,255,0.96)',
        1,
      )}
      {renderPointShapeSvg(
        symbology.pointShape,
        symbology.pointRadius,
        resolveLegendPointFill(symbology.pointVariant, symbology.color),
        symbology.color,
        2.25,
      )}
      {symbology.pointVariant === 'bullseye' ? (
        <circle cx="20" cy="12" r="2.4" fill={symbology.color} stroke="#ffffff" strokeWidth="1" />
      ) : null}
    </>
  );
}

function GeologyOverlayLegendSwatch({
  active,
  symbolScale = 1,
}: {
  active: boolean;
  symbolScale?: number;
}) {
  const patternId = useId().replace(/:/g, '');
  const strokeColor = active ? PROJECT_SPATIAL_GEOLOGY_OVERLAY_LEGEND.strokeColor : '#94a3b8';
  const fillColor = active
    ? PROJECT_SPATIAL_GEOLOGY_OVERLAY_LEGEND.fillColor
    : 'rgba(148, 163, 184, 0.1)';

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md border bg-white/90"
      style={{ height: `${36 * symbolScale}px`, width: `${48 * symbolScale}px` }}
    >
      <svg viewBox="0 0 40 24" style={{ height: `${24 * symbolScale}px`, width: `${40 * symbolScale}px` }}>
        <defs>
          <pattern
            id={patternId}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={withAlphaHex(strokeColor, active ? 0.55 : 0.3)}
              strokeWidth="1.4"
            />
          </pattern>
        </defs>
        <rect
          x="6"
          y="4"
          width="28"
          height="16"
          rx="2"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
        />
        <rect x="6" y="4" width="28" height="16" rx="2" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

function GeologyQueryLegendSwatch({ symbolScale = 1 }: { symbolScale?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md border bg-white/90"
      style={{ height: `${36 * symbolScale}px`, width: `${48 * symbolScale}px` }}
    >
      <svg
        viewBox="0 0 40 24"
        className="overflow-visible"
        style={{ height: `${24 * symbolScale}px`, width: `${40 * symbolScale}px` }}
      >
        <text
          x="20"
          y="4"
          textAnchor="middle"
          fontSize="6"
          fontWeight="700"
          fill={PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.textColor}
        >
          GEO
        </text>
        <circle
          cx="20"
          cy="14"
          r="7.5"
          fill="rgba(255,255,255,0.18)"
          stroke={withAlphaHex(PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.color, 0.55)}
          strokeWidth="1.5"
        />
        <circle
          cx="20"
          cy="14"
          r="5"
          fill={PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.accentColor}
          stroke={PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.color}
          strokeWidth="1.8"
        />
        <circle
          cx="20"
          cy="14"
          r="1.8"
          fill={PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.color}
          stroke="#ffffff"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  );
}

function resolveLegendPointFill(pointVariant: ProjectSpatialPointSymbolVariant, color: string) {
  if (pointVariant === 'open' || pointVariant === 'bullseye') {
    return 'rgba(255,255,255,0.96)';
  }

  return color;
}

function renderPointShapeSvg(
  pointShape: ProjectSpatialPointSymbolShape,
  size: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
) {
  if (pointShape === 'circle') {
    return (
      <circle cx="20" cy="12" r={size} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    );
  }

  if (pointShape === 'square') {
    return (
      <rect
        x={20 - size}
        y={12 - size}
        width={size * 2}
        height={size * 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (pointShape === 'triangle') {
    return (
      <polygon
        points={`${20},${12 - size} ${20 - size * 0.92},${12 + size * 0.88} ${20 + size * 0.92},${12 + size * 0.88}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    );
  }

  if (pointShape === 'diamond') {
    return (
      <polygon
        points={`${20},${12 - size} ${20 + size},${12} ${20},${12 + size} ${20 - size},${12}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    );
  }

  return (
    <polygon
      points={buildStarPoints(20, 12, size, size * 0.45)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  );
}

function renderSvgFillPattern(
  fillPattern: ProjectSpatialFillPattern,
  color: string,
  patternId: string,
) {
  const patternColor = withAlphaHex(color, 0.4);

  if (fillPattern === 'none' || fillPattern === 'solid') {
    return null;
  }

  if (fillPattern === 'diagonal') {
    return (
      <pattern
        id={patternId}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke={patternColor} strokeWidth="1.4" />
      </pattern>
    );
  }

  if (fillPattern === 'cross') {
    return (
      <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 0 L8 8 M8 0 L0 8" stroke={patternColor} strokeWidth="1.2" />
      </pattern>
    );
  }

  return (
    <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill={patternColor} />
      <circle cx="6" cy="6" r="1.2" fill={patternColor} />
    </pattern>
  );
}

function toSvgDasharray(dashValues: number[]) {
  return dashValues.length > 0 ? dashValues.join(' ') : undefined;
}

function buildStarPoints(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
) {
  const points: string[] = [];

  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    points.push(`${x},${y}`);
  }

  return points.join(' ');
}

function withAlphaHex(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const red = (bigint >> 16) & 255;
  const green = (bigint >> 8) & 255;
  const blue = bigint & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
