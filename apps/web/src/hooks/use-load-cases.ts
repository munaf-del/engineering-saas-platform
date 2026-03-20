import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface LoadCaseAPI {
  id: string;
  projectId: string;
  name: string;
  category: string;
  description?: string;
  actions?: LoadActionAPI[];
  createdAt: string;
  updatedAt: string;
}

interface LoadActionAPI {
  id: string;
  loadCaseId: string;
  name: string;
  direction: string;
  magnitude: number;
  unit: string;
  metadata?: Record<string, unknown>;
}

export function useLoadCases(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'load-cases'],
    queryFn: () => api<LoadCaseAPI[]>(`/projects/${projectId}/load-cases`),
    enabled: !!projectId,
  });
}

export function useLoadCase(projectId: string, id: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'load-cases', id],
    queryFn: () => api<LoadCaseAPI>(`/projects/${projectId}/load-cases/${id}`),
    enabled: !!projectId && !!id,
  });
}

export function useCreateLoadCase(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category: string; description?: string }) =>
      api<LoadCaseAPI>(`/projects/${projectId}/load-cases`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'load-cases'] }),
  });
}

export function useUpdateLoadCase(projectId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api(`/projects/${projectId}/load-cases/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'load-cases'] }),
  });
}

export function useDeleteLoadCase(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/projects/${projectId}/load-cases/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'load-cases'] }),
  });
}

export function useAddLoadAction(projectId: string, loadCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; direction: string; magnitude: number; unit: string }) =>
      api(`/projects/${projectId}/load-cases/${loadCaseId}/actions`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'load-cases'] }),
  });
}
