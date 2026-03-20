import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Standard, StandardEdition, StandardsProfile, ProjectStandardAssignment } from '@eng/shared';

export function useStandards() {
  return useQuery({
    queryKey: ['standards'],
    queryFn: () =>
      api<{ data: Standard[] }>('/standards').then((r) => r.data),
  });
}

export function useStandardEditions() {
  return useQuery({
    queryKey: ['standards', 'editions'],
    queryFn: () =>
      api<{ data: StandardEdition[] }>('/standards/editions').then((r) => r.data),
  });
}

export function useCurrentEditions() {
  return useQuery({
    queryKey: ['standards', 'editions', 'current'],
    queryFn: () =>
      api<{ data: StandardEdition[] }>('/standards/editions/current').then((r) => r.data),
  });
}

export function useStandardsProfiles() {
  return useQuery({
    queryKey: ['standards', 'profiles'],
    queryFn: () =>
      api<{ data: StandardsProfile[] }>('/standards/profiles').then((r) => r.data),
  });
}

export function useStandardsProfile(id: string) {
  return useQuery({
    queryKey: ['standards', 'profiles', id],
    queryFn: () => api<StandardsProfile>(`/standards/profiles/${id}`),
    enabled: !!id,
  });
}

export function useCreateStandardsProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; isDefault?: boolean }) =>
      api<StandardsProfile>('/standards/profiles', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['standards', 'profiles'] }),
  });
}

export function usePinStandard(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (standardEditionId: string) =>
      api(`/standards/profiles/${profileId}/pin`, { method: 'POST', body: { standardEditionId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['standards', 'profiles'] }),
  });
}

export function useBulkPinStandards(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (standardEditionIds: string[]) =>
      api(`/standards/profiles/${profileId}/pin/bulk`, { method: 'POST', body: { standardEditionIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['standards', 'profiles'] }),
  });
}

export function useProjectStandardAssignments(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'standard-assignments'],
    queryFn: () => api<ProjectStandardAssignment[]>(`/standards/projects/${projectId}/assignments`),
    enabled: !!projectId,
  });
}

export function useAssignProjectStandard(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { standardEditionId: string; notes?: string }) =>
      api(`/standards/projects/${projectId}/assignments`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'standard-assignments'] }),
  });
}
