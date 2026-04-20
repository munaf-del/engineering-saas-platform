import type { MultiPilePileTypeDefinition } from '@eng/shared';
import { cn } from '@/lib/utils';
import type { MultiPileStructTypeSettings } from './utils';

type MultiPileVisualType = Pick<MultiPilePileTypeDefinition, 'id' | 'nominalDiameterMm' | 'Dmm'>;

interface MultiPileVisualProps {
  type: MultiPileVisualType;
  settings: MultiPileStructTypeSettings;
  className?: string;
}

export function canRenderMultiPileSectionSketch(
  type: MultiPileVisualType | null | undefined,
  settings: MultiPileStructTypeSettings | null | undefined,
) {
  if (!type || !settings) {
    return false;
  }

  const diameterMm = normalizedDiameterMm(type);
  return (
    Boolean(type.id) &&
    diameterMm > 0 &&
    isFiniteNonNegative(settings.cover) &&
    isFinitePositive(settings.barDia) &&
    isFiniteNonNegative(settings.nBars) &&
    isFinitePositive(settings.centralBarDia) &&
    isFiniteNonNegative(settings.centralBarCount)
  );
}

export function MultiPileSectionSketch({ type, settings, className }: MultiPileVisualProps) {
  if (!canRenderMultiPileSectionSketch(type, settings)) {
    return null;
  }

  const nominalDiameterMm = normalizedDiameterMm(type);
  const size = 260;
  const center = size / 2;
  const radius = 104;
  const coverRatio = Math.min(
    0.35,
    Math.max(0.05, settings.cover / Math.max(1, nominalDiameterMm)),
  );
  const barRingRadius = radius * (1 - coverRatio) - 10;
  const barRadius = Math.max(4, Math.min(10, settings.barDia / 3.5));
  const perimeterBars = Array.from({ length: Math.max(0, settings.nBars) }, (_, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(settings.nBars, 1);
    return {
      x: center + barRingRadius * Math.cos(angle),
      y: center + barRingRadius * Math.sin(angle),
    };
  });
  const centralBars = settings.useCentralBar
    ? Array.from({ length: Math.max(0, settings.centralBarCount) }, (_, index) => {
        const ring = Math.min(18, 6 + settings.centralBarCount * 1.4);
        const angle = (Math.PI * 2 * index) / Math.max(settings.centralBarCount, 1);
        return {
          x: center + (settings.centralBarCount > 1 ? ring * Math.cos(angle) : 0),
          y: center + (settings.centralBarCount > 1 ? ring * Math.sin(angle) : 0),
        };
      })
    : [];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn('mx-auto w-full max-w-[320px]', className)}
      aria-label={`Section sketch for ${type.id}`}
    >
      <circle cx={center} cy={center} r={radius} fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
      <circle
        cx={center}
        cy={center}
        r={radius - settings.cover * (radius / Math.max(nominalDiameterMm / 2, 1))}
        fill="none"
        stroke="#94a3b8"
        strokeDasharray="4 4"
      />
      <circle
        cx={center}
        cy={center}
        r={Math.max(28, barRingRadius + 10)}
        fill="none"
        stroke={settings.transverseSystem === 'spiral' ? '#0f766e' : '#475569'}
        strokeWidth="2"
      />
      {perimeterBars.map((bar, index) => (
        <circle
          key={`${bar.x}-${bar.y}-${index}`}
          cx={bar.x}
          cy={bar.y}
          r={barRadius}
          fill="#0f172a"
        />
      ))}
      {centralBars.map((bar, index) => (
        <circle
          key={`${bar.x}-${bar.y}-${index}`}
          cx={bar.x}
          cy={bar.y}
          r={Math.max(4, Math.min(10, settings.centralBarDia / 4))}
          fill="#0369a1"
        />
      ))}
      <text x={center} y="22" textAnchor="middle" fontSize="12" fill="#334155">
        D = {formatMaybeNumber(nominalDiameterMm)} mm
      </text>
      <text x={center} y={size - 18} textAnchor="middle" fontSize="12" fill="#334155">
        Cover = {formatMaybeNumber(settings.cover)} mm
      </text>
    </svg>
  );
}

export function canRenderMultiPileElevationSketch(
  type: MultiPileVisualType | null | undefined,
  settings: MultiPileStructTypeSettings | null | undefined,
) {
  if (!type || !settings) {
    return false;
  }

  return (
    Boolean(type.id) &&
    isFiniteNonNegative(settings.perimProjectionAboveHead) &&
    isFiniteNonNegative(settings.centralProjectionAboveHead) &&
    isFiniteNonNegative(settings.reoCutDepth)
  );
}

export function MultiPileElevationSketch({ type, settings, className }: MultiPileVisualProps) {
  if (!canRenderMultiPileElevationSketch(type, settings)) {
    return null;
  }

  const top = 50;
  const bottom = 250;
  const left = 95;
  const right = 185;
  const projectionScale = 90;
  const perimProjection = Math.min(36, settings.perimProjectionAboveHead * projectionScale);
  const centralProjection = Math.min(36, settings.centralProjectionAboveHead * projectionScale);
  const cutOffY =
    settings.axModel === 'partial'
      ? Math.min(bottom - 24, top + 70 + settings.reoCutDepth * 22)
      : null;

  return (
    <svg
      viewBox="0 0 280 290"
      className={cn('mx-auto w-full max-w-[320px]', className)}
      aria-label={`Elevation sketch for ${type.id}`}
    >
      <rect
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth="2"
      />
      <line
        x1={left + 16}
        x2={left + 16}
        y1={top - perimProjection}
        y2={bottom}
        stroke="#0f172a"
        strokeWidth="4"
      />
      <line
        x1={right - 16}
        x2={right - 16}
        y1={top - perimProjection}
        y2={bottom}
        stroke="#0f172a"
        strokeWidth="4"
      />
      {settings.useCentralBar && settings.centralBarCount > 0 ? (
        <line
          x1={(left + right) / 2}
          x2={(left + right) / 2}
          y1={top - centralProjection}
          y2={bottom}
          stroke="#0369a1"
          strokeWidth="4"
        />
      ) : null}
      <line x1={left} x2={right} y1={top} y2={top} stroke="#475569" strokeWidth="2" />
      {cutOffY != null ? (
        <>
          <line
            x1={left + 6}
            x2={right - 6}
            y1={cutOffY}
            y2={cutOffY}
            stroke="#b45309"
            strokeDasharray="6 4"
            strokeWidth="2"
          />
          <text x={right + 10} y={cutOffY + 4} fontSize="11" fill="#92400e">
            cage cut-off
          </text>
        </>
      ) : null}
      <text x={(left + right) / 2} y="22" textAnchor="middle" fontSize="12" fill="#334155">
        {axialModelLabel(settings.axModel)}
      </text>
      <text x={right + 10} y={top - perimProjection + 4} fontSize="11" fill="#334155">
        perimeter projection
      </text>
      {settings.useCentralBar && settings.centralBarCount > 0 ? (
        <text x={right + 10} y={top - centralProjection + 22} fontSize="11" fill="#0369a1">
          central projection
        </text>
      ) : null}
      <text x={(left + right) / 2} y={bottom + 24} textAnchor="middle" fontSize="11" fill="#64748b">
        {type.id} reinforcement elevation schematic
      </text>
    </svg>
  );
}

function normalizedDiameterMm(type: MultiPileVisualType) {
  const numeric = Number(type.nominalDiameterMm || type.Dmm || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isFinitePositive(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value > 0;
}

function isFiniteNonNegative(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value >= 0;
}

function axialModelLabel(value: MultiPileStructTypeSettings['axModel']) {
  if (value === 'partial') return 'Partially reinforced';
  if (value === 'plain') return 'Unreinforced';
  return 'Reinforced';
}

function formatMaybeNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(3).replace(/\.?0+$/, '');
}
