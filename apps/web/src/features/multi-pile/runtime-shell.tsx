import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function MultiPileProjectLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </Link>
  );
}

export function MultiPileFieldFilter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

export function MultiPileStatCard({
  label,
  value,
  detail,
  valueVariant = 'outline',
  className,
}: {
  label: string;
  value: string;
  detail: string;
  valueVariant?: BadgeProps['variant'];
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-background p-3', className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2">
        <Badge variant={valueVariant}>{value}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
