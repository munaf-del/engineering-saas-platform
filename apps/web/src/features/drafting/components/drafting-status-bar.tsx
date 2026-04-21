export function DraftingStatusBar({
  hasModelExtents,
  visibleObjectCount,
}: {
  hasModelExtents: boolean;
  visibleObjectCount: number;
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-3 py-2 text-xs text-muted-foreground shadow">
      {visibleObjectCount} visible object(s) ·{' '}
      {hasModelExtents ? 'Model extents ready' : 'Place the first object to establish extents'}
    </div>
  );
}
