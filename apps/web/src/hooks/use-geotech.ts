import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { GeotechMaterialClass, GeotechParameterSet } from '@eng/shared';

export function useGeotechClasses() {
  return useQuery({
    queryKey: ['geotech', 'classes'],
    queryFn: () =>
      api<{ data: GeotechMaterialClass[] }>('/geotech/classes').then((r) => r.data),
  });
}

export function useGeotechParameters(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['geotech', 'parameters', page, limit],
    queryFn: () => api<{ data: GeotechParameterSet[]; meta: Record<string, number> }>('/geotech/parameters', { params: { page, limit } }),
  });
}

export function useCreateGeotechParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api('/geotech/parameters', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geotech'] }),
  });
}

export function useDeleteGeotechParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/geotech/parameters/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geotech'] }),
  });
}
