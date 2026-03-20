import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface LoadCombinationSetAPI {
  id: string;
  projectId: string;
  name: string;
  standardRef?: string;
  description?: string;
  combinations?: LoadCombinationAPI[];
  createdAt: string;
  updatedAt: string;
}

interface LoadCombinationAPI {
  id: string;
  setId: string;
  name: string;
  limitState: string;
  clauseRef?: string;
  factors: Record<string, unknown>[];
}

export function useLoadCombinationSets(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'load-combination-sets'],
    queryFn: () =>
      api<{ data: LoadCombinationSetAPI[] }>(`/projects/${projectId}/load-combination-sets`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useLoadCombinationSet(projectId: string, id: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'load-combination-sets', id],
    queryFn: () => api<LoadCombinationSetAPI>(`/projects/${projectId}/load-combination-sets/${id}`),
    enabled: !!projectId && !!id,
  });
}

export function useCreateLoadCombinationSet(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; standardRef?: string; description?: string }) =>
      api(`/projects/${projectId}/load-combination-sets`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'load-combination-sets'] }),
  });
}

export function useAddLoadCombination(projectId: string, setId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; limitState: string; clauseRef?: string; factors: Record<string, unknown>[] }) =>
      api(`/projects/${projectId}/load-combination-sets/${setId}/combinations`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'load-combination-sets'] }),
  });
}

export function useDeleteLoadCombinationSet(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/projects/${projectId}/load-combination-sets/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'load-combination-sets'] }),
  });
}
