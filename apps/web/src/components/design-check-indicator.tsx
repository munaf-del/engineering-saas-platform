import { cn } from '@/lib/utils';
import type { DesignCheckStatus } from '@eng/shared';

const statusConfig: Record<string, { color: string; label: string }> = {
  pass: { color: 'bg-emerald-500', label: 'Pass' },
  fail: { color: 'bg-red-500', label: 'Fail' },
  warning: { color: 'bg-amber-500', label: 'Warning' },
  not_checked: { color: 'bg-gray-400', label: 'Not checked' },
};

export function DesignCheckIndicator({
  status,
  utilisationRatio,
  compact = false,
}: {
  status: DesignCheckStatus;
  utilisationRatio?: number;
  compact?: boolean;
}) {
  const cfg = statusConfig[status] ?? { color: 'bg-gray-400', label: 'Not checked' };
  const pct = utilisationRatio !== undefined ? (utilisationRatio * 100).toFixed(1) : null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', cfg.color)} />
        {pct && <span className="text-xs font-mono">{pct}%</span>}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm">
      <span className={cn('h-2.5 w-2.5 rounded-full', cfg.color)} />
      <span className="font-medium">{cfg.label}</span>
      {pct && (
        <span className="font-mono text-muted-foreground">
          ({pct}%)
        </span>
      )}
    </div>
  );
}

export function UtilisationBar({ ratio, className }: { ratio: number; className?: string }) {
  const pct = Math.min(ratio * 100, 100);
  const color = ratio > 1 ? 'bg-red-500' : ratio > 0.9 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="min-w-[3.5rem] text-right font-mono text-xs">{(ratio * 100).toFixed(1)}%</span>
    </div>
  );
}
