import { Badge } from '@/components/ui/badge';

interface StandardsBadgeProps {
  code: string;
  edition?: string;
  size?: 'sm' | 'default';
}

const categoryColors: Record<string, string> = {
  'AS/NZS 1170': 'bg-blue-100 text-blue-800 border-blue-200',
  'AS 1170': 'bg-blue-100 text-blue-800 border-blue-200',
  'AS 3600': 'bg-slate-100 text-slate-800 border-slate-200',
  'AS 4100': 'bg-orange-100 text-orange-800 border-orange-200',
  'AS 2159': 'bg-amber-100 text-amber-800 border-amber-200',
  'AS/NZS 4671': 'bg-violet-100 text-violet-800 border-violet-200',
  'AS 1726': 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function getColor(code: string): string {
  for (const [prefix, color] of Object.entries(categoryColors)) {
    if (code.startsWith(prefix)) return color;
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

export function StandardsBadge({ code, edition, size = 'default' }: StandardsBadgeProps) {
  const color = getColor(code);
  return (
    <Badge
      variant="outline"
      className={`${color} ${size === 'sm' ? 'px-1.5 py-0 text-[10px]' : ''} font-mono`}
    >
      {code}
      {edition ? `:${edition}` : ''}
    </Badge>
  );
}

export function StandardsBadgeList({ standards }: { standards: { code: string; edition?: string }[] }) {
  if (!standards.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {standards.map((s) => (
        <StandardsBadge key={`${s.code}-${s.edition}`} code={s.code} edition={s.edition} size="sm" />
      ))}
    </div>
  );
}
