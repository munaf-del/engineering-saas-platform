'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoading } from '@/components/loading';
import { useAuth } from '@/lib/auth';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
        <div className="mx-auto max-w-7xl">
          <PageLoading />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:px-0 print:py-0 sm:px-6">
      {children}
    </div>
  );
}
