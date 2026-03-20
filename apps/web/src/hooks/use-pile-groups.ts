import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { PileGroup, Pile, PileLayoutPoint } from '@eng/shared';

export function usePileGroups(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'pile-groups'],
    queryFn: () => api<PileGroup[]>(`/projects/${projectId}/pile-groups`),
    enabled: !!projectId,
  });
}

export function usePileGroup(projectId: string, id: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'pile-groups', id],
    queryFn: () =>
      api<PileGroup & { piles?: Pile[]; layoutPoints?: PileLayoutPoint[] }>(
        `/projects/${projectId}/pile-groups/${id}`,
      ),
    enabled: !!projectId && !!id,
  });
}

export function useCreatePileGroup(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; metadata?: Record<string, unknown> }) =>
      api<PileGroup>(`/projects/${projectId}/pile-groups`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups'] }),
  });
}

export function useUpdatePileGroup(projectId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api(`/projects/${projectId}/pile-groups/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups', id] });
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups'] });
    },
  });
}

export function useDeletePileGroup(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/projects/${projectId}/pile-groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups'] }),
  });
}

export function useAddPile(projectId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      pileType: string;
      diameter: number;
      length: number;
      embedmentDepth?: number;
      rakeAngle?: number;
    }) =>
      api<Pile>(`/projects/${projectId}/pile-groups/${groupId}/piles`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups', groupId] }),
  });
}

export function useDeletePile(projectId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pileId: string) =>
      api(`/projects/${projectId}/pile-groups/${groupId}/piles/${pileId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups', groupId] }),
  });
}

export function useAddLayoutPoint(projectId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { pileId?: string; x: number; y: number; z?: number; label?: string }) =>
      api<PileLayoutPoint>(`/projects/${projectId}/pile-groups/${groupId}/layout-points`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups', groupId] }),
  });
}
