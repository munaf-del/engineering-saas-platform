import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ImportJob, ImportItemError } from '@eng/shared';
import type { PaginatedResponse } from '@/lib/api-client';

export function useImports(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['imports', page, limit],
    queryFn: () => api<PaginatedResponse<ImportJob>>('/imports', { params: { page, limit } }),
  });
}

export function useImport(id: string) {
  return useQuery({
    queryKey: ['imports', id],
    queryFn: () => api<ImportJob>(`/imports/${id}`),
    enabled: !!id,
  });
}

export function useImportErrors(id: string) {
  return useQuery({
    queryKey: ['imports', id, 'errors'],
    queryFn: () => api<ImportItemError[]>(`/imports/${id}/errors`),
    enabled: !!id,
  });
}

export function useImportTemplates() {
  return useQuery({
    queryKey: ['imports', 'templates'],
    queryFn: () => api<{ entityType: string; description: string }[]>('/imports/templates'),
  });
}

export function useUploadImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api<ImportJob>('/imports/upload', { method: 'POST', body: formData }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports'] }),
  });
}

export function useApplyImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<ImportJob>(`/imports/${id}/apply`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imports'] });
      qc.invalidateQueries({ queryKey: ['steel-sections'] });
      qc.invalidateQueries({ queryKey: ['rebar'] });
      qc.invalidateQueries({ queryKey: ['materials'] });
      qc.invalidateQueries({ queryKey: ['geotech'] });
    },
  });
}

export function useRollbackImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<ImportJob>(`/imports/${id}/rollback`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports'] }),
  });
}
