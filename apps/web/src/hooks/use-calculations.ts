import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CalculationRun, CalculationSnapshot, CalculationReport } from '@eng/shared';
import type { PaginatedResponse } from '@/lib/api-client';

export function useCalculations(projectId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['projects', projectId, 'calculations', page, limit],
    queryFn: () =>
      api<PaginatedResponse<CalculationRun>>(`/projects/${projectId}/calculations`, {
        params: { page, limit },
      }),
    enabled: !!projectId,
  });
}

export function useCalculation(projectId: string, id: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'calculations', id],
    queryFn: () => api<CalculationRun>(`/projects/${projectId}/calculations/${id}`),
    enabled: !!projectId && !!id,
  });
}

export function useCalculationSnapshot(projectId: string, id: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'calculations', id, 'snapshot'],
    queryFn: () => api<CalculationSnapshot>(`/projects/${projectId}/calculations/${id}/snapshot`),
    enabled: !!projectId && !!id,
  });
}

export function useCalculationDesignChecks(projectId: string, id: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'calculations', id, 'design-checks'],
    queryFn: () =>
      api<
        {
          id: string;
          checkType: string;
          limitState: string;
          demandValue: number;
          capacityValue: number;
          utilisationRatio: number;
          status: string;
          clauseRef?: string;
          notes?: string;
        }[]
      >(`/projects/${projectId}/calculations/${id}/design-checks`),
    enabled: !!projectId && !!id,
  });
}

export function useSubmitCalculation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api<CalculationRun>(`/projects/${projectId}/calculations`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'calculations'] }),
  });
}

export function useCalculationReports(projectId: string, runId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'calculations', runId, 'reports'],
    queryFn: () => api<CalculationReport[]>(`/projects/${projectId}/calculations/${runId}/reports`),
    enabled: !!projectId && !!runId,
  });
}

export function useCreateReport(projectId: string, runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; format?: string }) =>
      api<CalculationReport>(`/projects/${projectId}/calculations/${runId}/reports`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'calculations', runId, 'reports'] }),
  });
}
