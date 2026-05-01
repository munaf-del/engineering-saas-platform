'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Building2,
  Calculator,
  Cable,
  ClipboardList,
  Database,
  FolderOpen,
  History,
  Import,
  Layers,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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
  { label: 'Templates', href: '/templates', icon: Layers },
  { label: 'Calculators', href: '/calculators', icon: Calculator },
  { label: 'SAP2000 Bridge', href: '/sap2000', icon: Cable },
];

const catalogueNav: NavItem[] = [
  { label: 'Materials', href: '/catalogues/materials', icon: Database },
  { label: 'Geotech', href: '/catalogues/geotech', icon: Database },
  { label: 'Steel Sections', href: '/catalogues/steel-sections', icon: Database },
  { label: 'Rebar', href: '/catalogues/rebar', icon: Database },
];

const adminNav: NavItem[] = [
  { label: 'AI Settings', href: '/settings/ai', icon: Bot },
  { label: 'Standards', href: '/standards', icon: ClipboardList },
  { label: 'Imports', href: '/imports', icon: Import },
  { label: 'Rule Packs', href: '/rule-packs', icon: Package },
  { label: 'Members', href: '/settings/members', icon: Users },
  { label: 'Audit Trail', href: '/audit', icon: History },
];

export function Sidebar({
  className,
  collapsed = false,
  mobile = false,
  onClose,
  onToggleCollapsed,
}: {
  className?: string;
  collapsed?: boolean;
  mobile?: boolean;
  onClose?: () => void;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const { user, hasOrgRole } = useAuth();

  if (!user) return null;

  const isAdmin = hasOrgRole('owner', 'admin');
  const showLabels = !collapsed || mobile;
  const organisationNav: NavItem[] = [
    { label: 'Standards', href: '/standards', icon: ClipboardList },
    { label: 'Imports', href: '/imports', icon: Import },
  ];

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-[hsl(var(--sidebar))] transition-[width] duration-200',
        showLabels ? 'w-64' : 'w-[4.5rem]',
        className,
      )}
      data-state={showLabels ? 'expanded' : 'collapsed'}
      data-testid="app-sidebar"
    >
      <div
        className={cn(
          'flex h-14 items-center border-b',
          showLabels ? 'justify-between px-4' : 'justify-center px-2',
        )}
      >
        <Link
          href="/projects"
          className={cn('flex items-center gap-2 font-semibold', !showLabels && 'justify-center')}
          title="EngPlatform"
        >
          <Building2 className="h-5 w-5 shrink-0" />
          {showLabels ? <span>EngPlatform</span> : <span className="sr-only">EngPlatform</span>}
        </Link>
        {mobile ? (
          <Button
            aria-label="Close navigation"
            className="h-8 w-8"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : onToggleCollapsed && showLabels ? (
          <Button
            aria-label="Collapse navigation"
            className="h-8 w-8"
            onClick={onToggleCollapsed}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className={cn(showLabels ? 'px-3 py-3' : 'flex justify-center px-2 py-3')}>
        <OrgSwitcher compact={!showLabels} />
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className={cn('py-2', showLabels ? 'px-3' : 'px-2')}>
          <NavSection
            collapsed={!showLabels}
            label="Navigation"
            items={mainNav}
            pathname={pathname}
          />
          <NavSection
            collapsed={!showLabels}
            label="Catalogues"
            items={catalogueNav}
            pathname={pathname}
          />
          {isAdmin && (
            <NavSection
              collapsed={!showLabels}
              label="Administration"
              items={adminNav}
              pathname={pathname}
            />
          )}
          {!isAdmin && (
            <NavSection
              collapsed={!showLabels}
              label="Organisation"
              items={organisationNav}
              pathname={pathname}
            />
          )}
        </div>
      </ScrollArea>

      <Separator />
      <div className={cn(showLabels ? 'p-3' : 'p-2')}>
        <NavLink
          active={pathname === '/settings/ai'}
          collapsed={!showLabels}
          item={{ label: 'Settings', href: '/settings/ai', icon: Settings }}
        />
        {!showLabels && onToggleCollapsed ? (
          <Button
            aria-label="Expand navigation"
            className="mt-2 h-10 w-full"
            onClick={onToggleCollapsed}
            size="icon"
            title="Expand navigation"
            type="button"
            variant="ghost"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

function NavSection({
  label,
  items,
  pathname,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="mb-4">
      {collapsed ? (
        <div className="mx-auto mb-2 h-px w-8 bg-border" />
      ) : (
        <h4 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h4>
      )}
      <nav className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return <NavLink active={active} collapsed={collapsed} item={item} key={item.href} />;
        })}
      </nav>
    </div>
  );
}

function NavLink({
  active,
  collapsed,
  item,
}: {
  active: boolean;
  collapsed: boolean;
  item: NavItem;
}) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center rounded-md text-sm font-medium transition-colors',
        collapsed ? 'h-10 justify-center px-2' : 'gap-2 px-2 py-1.5',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
      )}
      href={item.href}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
    </Link>
  );
}
