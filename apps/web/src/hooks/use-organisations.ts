import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Organisation, OrganisationMember } from '@eng/shared';

export function useOrganisations() {
  return useQuery({
    queryKey: ['organisations'],
    queryFn: () => api<Organisation[]>('/organisations'),
  });
}

export function useOrganisation(id: string) {
  return useQuery({
    queryKey: ['organisations', id],
    queryFn: () => api<Organisation>(`/organisations/${id}`),
    enabled: !!id,
  });
}

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: ['organisations', orgId, 'members'],
    queryFn: () => api<OrganisationMember[]>(`/organisations/${orgId}/members`),
    enabled: !!orgId,
  });
}

export function useAddOrgMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      api(`/organisations/${orgId}/members`, { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organisations', orgId, 'members'] }),
  });
}

export function useUpdateOrgMemberRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api(`/organisations/${orgId}/members/${userId}`, { method: 'PATCH', body: { role } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organisations', orgId, 'members'] }),
  });
}

export function useRemoveOrgMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api(`/organisations/${orgId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organisations', orgId, 'members'] }),
  });
}
