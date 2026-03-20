'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Calculator,
  ClipboardList,
  Database,
  FolderOpen,
  History,
  Import,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { OrgSwitcher } from './org-switcher';
import { useAuth } from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const mainNav: NavItem[] = [
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Calculators', href: '/calculators', icon: Calculator },
];

const catalogueNav: NavItem[] = [
  { label: 'Materials', href: '/catalogues/materials', icon: Database },
  { label: 'Geotech', href: '/catalogues/geotech', icon: Database },
  { label: 'Steel Sections', href: '/catalogues/steel-sections', icon: Database },
  { label: 'Rebar', href: '/catalogues/rebar', icon: Database },
];

const adminNav: NavItem[] = [
  { label: 'Standards', href: '/standards', icon: ClipboardList },
  { label: 'Imports', href: '/imports', icon: Import },
  { label: 'Members', href: '/settings/members', icon: Users },
  { label: 'Audit Trail', href: '/audit', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasOrgRole } = useAuth();

  if (!user) return null;

  const isAdmin = hasOrgRole('owner', 'admin');

  return (
    <div className="flex h-full w-64 flex-col border-r bg-[hsl(var(--sidebar))]">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/projects" className="flex items-center gap-2 font-semibold">
          <Building2 className="h-5 w-5" />
          <span>EngPlatform</span>
        </Link>
      </div>

      <div className="px-3 py-3">
        <OrgSwitcher />
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-2">
        <NavSection label="Navigation" items={mainNav} pathname={pathname} />
        <NavSection label="Catalogues" items={catalogueNav} pathname={pathname} />
        {isAdmin && <NavSection label="Administration" items={adminNav} pathname={pathname} />}
        {!isAdmin && (
          <NavSection
            label="Organisation"
            items={[
              { label: 'Standards', href: '/standards', icon: ClipboardList },
              { label: 'Imports', href: '/imports', icon: Import },
            ]}
            pathname={pathname}
          />
        )}
      </ScrollArea>

      <Separator />
      <div className="p-3">
        <Link
          href="/settings/members"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-4">
      <h4 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h4>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
