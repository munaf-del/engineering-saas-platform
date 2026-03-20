'use client';

import { AuthProvider } from '@/lib/auth';
import { QueryProvider } from '@/lib/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
