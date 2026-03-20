import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { RebarCatalog, RebarSize } from '@eng/shared';

export function useRebarCatalogs() {
  return useQuery({
    queryKey: ['rebar', 'catalogs'],
    queryFn: () =>
      api<{ data: RebarCatalog[] }>('/rebar/catalogs').then((r) => r.data),
  });
}

export function useRebarCatalog(id: string) {
  return useQuery({
    queryKey: ['rebar', 'catalogs', id],
    queryFn: () => api<RebarCatalog>(`/rebar/catalogs/${id}`),
    enabled: !!id,
  });
}

export function useRebarSizes(catalogId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['rebar', 'sizes', catalogId, page, limit],
    queryFn: () =>
      api<{ data: RebarSize[]; meta: Record<string, number> }>(
        `/rebar/catalogs/${catalogId}/sizes`,
        { params: { page, limit } },
      ),
    enabled: !!catalogId,
  });
}

export function useActivateRebarCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (catalogId: string) =>
      api(`/rebar/catalogs/${catalogId}/activate`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rebar'] }),
  });
}
