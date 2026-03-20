import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { MaterialFamily, Material } from '@eng/shared';
import type { PaginatedResponse } from '@/lib/api-client';

export function useMaterialFamilies() {
  return useQuery({
    queryKey: ['materials', 'families'],
    queryFn: () => api<MaterialFamily[]>('/materials/families'),
  });
}

export function useMaterials(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['materials', 'grades', page, limit],
    queryFn: () => api<PaginatedResponse<Material>>('/materials/grades', { params: { page, limit } }),
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: ['materials', 'grades', id],
    queryFn: () => api<Material>(`/materials/grades/${id}`),
    enabled: !!id,
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api<Material>('/materials/grades', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/materials/grades/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  });
}
