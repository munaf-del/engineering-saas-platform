'use client';

import * as React from 'react';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function Header({
  onOpenSidebar,
  onToggleSidebar,
  sidebarCollapsed,
}: {
  onOpenSidebar: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}) {
  const { user, currentOrg, signOut } = useAuth();

  if (!user) return null;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <Button
          aria-label="Open navigation"
          className="h-9 w-9 lg:hidden"
          onClick={onOpenSidebar}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="hidden h-9 w-9 lg:inline-flex"
          onClick={onToggleSidebar}
          size="icon"
          type="button"
          variant="ghost"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="hidden sm:inline-flex">
          {user.orgRole}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
                {currentOrg && (
                  <span className="text-xs text-muted-foreground">{currentOrg.name}</span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
