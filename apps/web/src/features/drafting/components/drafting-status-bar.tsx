import type { DraftingDisplayUnits, DraftingPoint } from '@eng/shared';

export function DraftingStatusBar({
  commandPrompt,
  cursorPoint,
  displayUnits,
  hasModelExtents,
  snapLabel,
  visibleObjectCount,
}: {
  commandPrompt?: string;
  cursorPoint?: DraftingPoint | null;
  displayUnits?: DraftingDisplayUnits;
  hasModelExtents: boolean;
  snapLabel?: string;
  visibleObjectCount: number;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-3 left-3 right-3 flex max-w-fit flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-white/90 px-3 py-2 text-xs text-muted-foreground shadow"
      data-testid="drafting-canvas-status-bar"
    >
      {commandPrompt ? <span className="font-medium text-foreground">{commandPrompt}</span> : null}
      <span>{visibleObjectCount} visible object(s)</span>
      <span>
        {hasModelExtents ? 'Model extents ready' : 'Place the first object to establish extents'}
      </span>
      {cursorPoint ? (
        <span>
          Cursor {formatCoordinate(cursorPoint.x, displayUnits)},{' '}
          {formatCoordinate(cursorPoint.y, displayUnits)}
        </span>
      ) : null}
      {snapLabel ? <span>{snapLabel}</span> : null}
    </div>
  );
}

function formatCoordinate(value: number, displayUnits: DraftingDisplayUnits = 'm') {
  if (displayUnits === 'm') {
    return `${(value / 1000).toFixed(3)} m`;
  }

  return `${value.toFixed(0)} mm`;
}
