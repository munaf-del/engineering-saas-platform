'use client';

import { useState } from 'react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function OrgSwitcher() {
  const { user, organisations, currentOrg, switchOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (!user || organisations.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-accent/50 px-2 py-1.5 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="truncate font-medium">{currentOrg?.name ?? 'Organisation'}</span>
      </div>
    );
  }

  async function handleSwitch(orgId: string) {
    if (orgId === user?.organisationId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchOrg(orgId);
      window.location.reload();
    } catch {
      // Error handled by auth context
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-sm hover:bg-accent"
        disabled={switching}
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{switching ? 'Switching…' : currentOrg?.name}</span>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-1 shadow-md">
            {organisations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                  org.id === user?.organisationId && 'font-medium',
                )}
              >
                {org.id === user?.organisationId ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-3.5 w-3.5" />
                )}
                <span className="truncate">{org.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
