'use client';

import type { PileLayoutPoint } from '@eng/shared';

interface PileLayoutSVGProps {
  points: PileLayoutPoint[];
  width?: number;
  height?: number;
  reactions?: Record<string, { value: number; unit: string }>;
}

export function PileLayoutSVG({ points, width = 400, height = 400, reactions }: PileLayoutSVGProps) {
  if (!points.length) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
        style={{ width, height }}
      >
        No pile layout defined
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 40;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;
  const scale = Math.min(plotW / rangeX, plotH / rangeY);

  function toSvg(x: number, y: number): [number, number] {
    const cx = padding + (x - minX) * scale + (plotW - rangeX * scale) / 2;
    const cy = padding + (maxY - y) * scale + (plotH - rangeY * scale) / 2;
    return [cx, cy];
  }

  const maxReaction = reactions
    ? Math.max(...Object.values(reactions).map((r) => Math.abs(r.value)), 1)
    : 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="rounded-md border bg-white"
    >
      <defs>
        <marker id="grid-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Axes */}
      <line x1={padding - 10} y1={height - padding + 10} x2={width - padding + 10} y2={height - padding + 10}
        stroke="#94a3b8" strokeWidth="1" markerEnd="url(#grid-arrow)" />
      <line x1={padding - 10} y1={height - padding + 10} x2={padding - 10} y2={padding - 10}
        stroke="#94a3b8" strokeWidth="1" markerEnd="url(#grid-arrow)" />
      <text x={width - padding + 15} y={height - padding + 14} fontSize="10" fill="#64748b">X (m)</text>
      <text x={padding - 24} y={padding - 14} fontSize="10" fill="#64748b">Y (m)</text>

      {/* Grid lines */}
      {points.map((pt) => {
        const [cx, cy] = toSvg(pt.x, pt.y);
        return (
          <g key={pt.id}>
            <line x1={cx} y1={padding} x2={cx} y2={height - padding} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1={padding} y1={cy} x2={width - padding} y2={cy} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
          </g>
        );
      })}

      {/* Piles */}
      {points.map((pt) => {
        const [cx, cy] = toSvg(pt.x, pt.y);
        const reaction = reactions && pt.pileId ? reactions[pt.pileId] : undefined;
        const reactionNorm = reaction ? Math.abs(reaction.value) / maxReaction : 0;
        const radius = 8 + reactionNorm * 8;
        const color = reaction
          ? reaction.value >= 0
            ? `rgba(16, 185, 129, ${0.4 + reactionNorm * 0.6})`
            : `rgba(239, 68, 68, ${0.4 + reactionNorm * 0.6})`
          : '#3b82f6';

        return (
          <g key={pt.id}>
            <circle cx={cx} cy={cy} r={radius} fill={color} stroke="#1e293b" strokeWidth="1.5" />
            <text x={cx} y={cy - radius - 4} textAnchor="middle" fontSize="9" fill="#334155">
              {pt.label ?? `(${pt.x}, ${pt.y})`}
            </text>
            {reaction && (
              <text x={cx} y={cy + radius + 12} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace">
                {reaction.value.toFixed(1)} {reaction.unit}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
