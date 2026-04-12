import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  buildPersistableMultiPileState,
  type MultiPileEnvelopeRunSummary,
  type MultiPileState,
} from '@eng/shared';

function stateQueryKey(projectId: string, groupId: string) {
  return ['projects', projectId, 'pile-groups', groupId, 'multi-pile'] as const;
}

function latestRunQueryKey(projectId: string, groupId: string) {
  return ['projects', projectId, 'pile-groups', groupId, 'multi-pile', 'envelope-runs', 'latest'] as const;
}

export function useMultiPileState(projectId: string, groupId: string) {
  return useQuery({
    queryKey: stateQueryKey(projectId, groupId),
    queryFn: () => api<MultiPileState>(`/projects/${projectId}/pile-groups/${groupId}/multi-pile`),
    enabled: !!projectId && !!groupId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useSaveMultiPileState(projectId: string, groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (state: MultiPileState) =>
      api<MultiPileState>(`/projects/${projectId}/pile-groups/${groupId}/multi-pile`, {
        method: 'PUT',
        body: { state: buildPersistableMultiPileState(state) },
      }),
    onSuccess: (state) => {
      qc.setQueryData(stateQueryKey(projectId, groupId), state);
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups', groupId] });
    },
  });
}

export function useLatestMultiPileEnvelope(projectId: string, groupId: string) {
  return useQuery({
    queryKey: latestRunQueryKey(projectId, groupId),
    queryFn: () =>
      api<MultiPileEnvelopeRunSummary | null>(
        `/projects/${projectId}/pile-groups/${groupId}/multi-pile/envelope-runs/latest`,
      ),
    enabled: !!projectId && !!groupId,
    refetchOnWindowFocus: false,
  });
}

export function useRunMultiPileEnvelope(projectId: string, groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (state?: MultiPileState) =>
      api<MultiPileEnvelopeRunSummary>(
        `/projects/${projectId}/pile-groups/${groupId}/multi-pile/envelope-runs`,
        state
          ? {
            method: 'POST',
            body: { state },
          }
          : { method: 'POST' },
      ),
    onSuccess: (result) => {
      qc.setQueryData(latestRunQueryKey(projectId, groupId), result);
      qc.invalidateQueries({ queryKey: stateQueryKey(projectId, groupId) });
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'pile-groups', groupId] });
    },
  });
}
