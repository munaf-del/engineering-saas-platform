'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Skeleton } from '@/components/ui/skeleton';

export const SIDEBAR_STORAGE_KEY = 'eng.app-shell.sidebar-collapsed';

export function readStoredSidebarCollapsed() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
}

export function writeStoredSidebarCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [loading, user, router]);

  useEffect(() => {
    setSidebarCollapsed(readStoredSidebarCollapsed());
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      writeStoredSidebarCollapsed(next);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        className="hidden lg:flex"
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />
      {mobileSidebarOpen ? (
        <>
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            type="button"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[calc(100vw-2rem)] lg:hidden">
            <Sidebar mobile onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          onToggleSidebar={toggleSidebarCollapsed}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
