import type { DraftingDisplayUnits, DraftingPoint } from '@eng/shared';

export function DraftingStatusBar({
  cursorPoint,
  displayUnits,
  hasModelExtents,
  visibleObjectCount,
}: {
  cursorPoint?: DraftingPoint | null;
  displayUnits?: DraftingDisplayUnits;
  hasModelExtents: boolean;
  visibleObjectCount: number;
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-3 py-2 text-xs text-muted-foreground shadow">
      {visibleObjectCount} visible object(s) ·{' '}
      {hasModelExtents ? 'Model extents ready' : 'Place the first object to establish extents'}
      {cursorPoint ? (
        <>
          {' '}
          · Cursor {formatCoordinate(cursorPoint.x, displayUnits)},{' '}
          {formatCoordinate(cursorPoint.y, displayUnits)}
        </>
      ) : null}
    </div>
  );
}

function formatCoordinate(value: number, displayUnits: DraftingDisplayUnits = 'm') {
  if (displayUnits === 'm') {
    return `${(value / 1000).toFixed(3)} m`;
  }

  return `${value.toFixed(0)} mm`;
}
