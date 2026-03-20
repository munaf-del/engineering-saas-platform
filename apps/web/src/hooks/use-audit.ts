import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface AuditLogEntry {
  id: string;
  organisationId?: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { name: string; email: string };
}

export function useAuditLogs(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['audit', page, limit],
    queryFn: () =>
      api<{ data: AuditLogEntry[]; meta: Record<string, number> }>('/audit', {
        params: { page, limit },
      }).catch(() => ({ data: [] as AuditLogEntry[], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } })),
  });
}
