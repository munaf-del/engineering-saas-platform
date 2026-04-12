'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const SETTINGS_SECTIONS = [
  {
    href: '/settings/ai',
    label: 'AI Settings',
    icon: Bot,
  },
  {
    href: '/settings/members',
    label: 'Members',
    icon: Users,
  },
] as const;

export function SettingsSectionNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {SETTINGS_SECTIONS.map((section) => {
        const active =
          pathname === section.href || pathname.startsWith(`${section.href}/`);

        return (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
