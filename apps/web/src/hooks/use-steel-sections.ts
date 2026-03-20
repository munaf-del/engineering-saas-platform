import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { SteelSectionCatalog, SteelSection } from '@eng/shared';

export function useSteelSectionCatalogs() {
  return useQuery({
    queryKey: ['steel-sections', 'catalogs'],
    queryFn: () =>
      api<{ data: SteelSectionCatalog[] }>('/steel-sections/catalogs').then((r) => r.data),
  });
}

export function useSteelSectionCatalog(id: string) {
  return useQuery({
    queryKey: ['steel-sections', 'catalogs', id],
    queryFn: () => api<SteelSectionCatalog>(`/steel-sections/catalogs/${id}`),
    enabled: !!id,
  });
}

export function useSteelSections(catalogId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['steel-sections', 'sections', catalogId, page, limit],
    queryFn: () =>
      api<{ data: SteelSection[]; meta: Record<string, number> }>(
        `/steel-sections/catalogs/${catalogId}/sections`,
        { params: { page, limit } },
      ),
    enabled: !!catalogId,
  });
}

export function useActivateSteelCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (catalogId: string) =>
      api(`/steel-sections/catalogs/${catalogId}/activate`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['steel-sections'] }),
  });
}
