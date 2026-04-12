import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  ProjectCnvmp,
  ProjectCnvmpActivityInput,
  ProjectCnvmpMitigationMeasureInput,
  ProjectCnvmpMonitoringRowInput,
  ProjectCnvmpReceiverInput,
  ProjectCnvmpReferenceInput,
  ProjectCnvmpRootInput,
  ProjectCnvmpSelectedCriterionInput,
  ProjectCnvmpSelectedSourceInput,
} from '@/features/cnvmp/cnvmp-types';

export function useProjectCnvmp(projectId: string) {
  return useQuery({
    queryKey: cnvmpQueryKey(projectId),
    queryFn: () => api<ProjectCnvmp>(cnvmpPath(projectId)),
    enabled: !!projectId,
  });
}

export function useUpdateProjectCnvmp(projectId: string) {
  return useCnvmpMutation<ProjectCnvmpRootInput>(projectId, (payload) =>
    api<ProjectCnvmp>(cnvmpPath(projectId), { method: 'PUT', body: payload }),
  );
}

export function useCreateCnvmpReference(projectId: string) {
  return useCnvmpMutation<ProjectCnvmpReferenceInput>(projectId, (payload) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/references`, {
      method: 'POST',
      body: payload,
    }),
  );
}

export function useUpdateCnvmpReference(projectId: string) {
  return useCnvmpMutation<{ id: string; data: ProjectCnvmpReferenceInput }>(
    projectId,
    ({ id, data }) =>
      api<ProjectCnvmp>(`${cnvmpPath(projectId)}/references/${id}`, {
        method: 'PATCH',
        body: data,
      }),
  );
}

export function useDeleteCnvmpReference(projectId: string) {
  return useCnvmpMutation<string>(projectId, (id) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/references/${id}`, { method: 'DELETE' }),
  );
}

export function useCreateCnvmpReceiver(projectId: string) {
  return useCnvmpMutation<ProjectCnvmpReceiverInput>(projectId, (payload) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/receivers`, {
      method: 'POST',
      body: payload,
    }),
  );
}

export function useUpdateCnvmpReceiver(projectId: string) {
  return useCnvmpMutation<{ id: string; data: ProjectCnvmpReceiverInput }>(
    projectId,
    ({ id, data }) =>
      api<ProjectCnvmp>(`${cnvmpPath(projectId)}/receivers/${id}`, {
        method: 'PATCH',
        body: data,
      }),
  );
}

export function useDeleteCnvmpReceiver(projectId: string) {
  return useCnvmpMutation<string>(projectId, (id) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/receivers/${id}`, { method: 'DELETE' }),
  );
}

export function useCreateCnvmpActivity(projectId: string) {
  return useCnvmpMutation<ProjectCnvmpActivityInput>(projectId, (payload) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/activities`, {
      method: 'POST',
      body: payload,
    }),
  );
}

export function useUpdateCnvmpActivity(projectId: string) {
  return useCnvmpMutation<{ id: string; data: ProjectCnvmpActivityInput }>(
    projectId,
    ({ id, data }) =>
      api<ProjectCnvmp>(`${cnvmpPath(projectId)}/activities/${id}`, {
        method: 'PATCH',
        body: data,
      }),
  );
}

export function useDeleteCnvmpActivity(projectId: string) {
  return useCnvmpMutation<string>(projectId, (id) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/activities/${id}`, { method: 'DELETE' }),
  );
}

export function useCreateCnvmpSelectedSource(projectId: string) {
  return useCnvmpMutation<ProjectCnvmpSelectedSourceInput>(projectId, (payload) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/sources`, {
      method: 'POST',
      body: payload,
    }),
  );
}

export function useUpdateCnvmpSelectedSource(projectId: string) {
  return useCnvmpMutation<{ id: string; data: ProjectCnvmpSelectedSourceInput }>(
    projectId,
    ({ id, data }) =>
      api<ProjectCnvmp>(`${cnvmpPath(projectId)}/sources/${id}`, {
        method: 'PATCH',
        body: data,
      }),
  );
}

export function useDeleteCnvmpSelectedSource(projectId: string) {
  return useCnvmpMutation<string>(projectId, (id) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/sources/${id}`, { method: 'DELETE' }),
  );
}

export function useCreateCnvmpSelectedCriterion(projectId: string) {
  return useCnvmpMutation<ProjectCnvmpSelectedCriterionInput>(projectId, (payload) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/selected-criteria`, {
      method: 'POST',
      body: payload,
    }),
  );
}

export function useUpdateCnvmpSelectedCriterion(projectId: string) {
  return useCnvmpMutation<{ id: string; data: ProjectCnvmpSelectedCriterionInput }>(
    projectId,
    ({ id, data }) =>
      api<ProjectCnvmp>(`${cnvmpPath(projectId)}/selected-criteria/${id}`, {
        method: 'PATCH',
        body: data,
      }),
  );
}

export function useDeleteCnvmpSelectedCriterion(projectId: string) {
  return useCnvmpMutation<string>(projectId, (id) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/selected-criteria/${id}`, {
      method: 'DELETE',
    }),
  );
}

export function useCreateCnvmpMitigationMeasure(projectId: string) {
  return useCnvmpMutation<ProjectCnvmpMitigationMeasureInput>(projectId, (payload) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/mitigation-measures`, {
      method: 'POST',
      body: payload,
    }),
  );
}

export function useUpdateCnvmpMitigationMeasure(projectId: string) {
  return useCnvmpMutation<{ id: string; data: ProjectCnvmpMitigationMeasureInput }>(
    projectId,
    ({ id, data }) =>
      api<ProjectCnvmp>(`${cnvmpPath(projectId)}/mitigation-measures/${id}`, {
        method: 'PATCH',
        body: data,
      }),
  );
}

export function useDeleteCnvmpMitigationMeasure(projectId: string) {
  return useCnvmpMutation<string>(projectId, (id) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/mitigation-measures/${id}`, {
      method: 'DELETE',
    }),
  );
}

export function useCreateCnvmpMonitoringRow(projectId: string) {
  return useCnvmpMutation<ProjectCnvmpMonitoringRowInput>(projectId, (payload) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/monitoring-rows`, {
      method: 'POST',
      body: payload,
    }),
  );
}

export function useUpdateCnvmpMonitoringRow(projectId: string) {
  return useCnvmpMutation<{ id: string; data: ProjectCnvmpMonitoringRowInput }>(
    projectId,
    ({ id, data }) =>
      api<ProjectCnvmp>(`${cnvmpPath(projectId)}/monitoring-rows/${id}`, {
        method: 'PATCH',
        body: data,
      }),
  );
}

export function useDeleteCnvmpMonitoringRow(projectId: string) {
  return useCnvmpMutation<string>(projectId, (id) =>
    api<ProjectCnvmp>(`${cnvmpPath(projectId)}/monitoring-rows/${id}`, {
      method: 'DELETE',
    }),
  );
}

function useCnvmpMutation<TInput>(
  projectId: string,
  mutationFn: (input: TInput) => Promise<ProjectCnvmp>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      queryClient.setQueryData(cnvmpQueryKey(projectId), data);
      await queryClient.invalidateQueries({ queryKey: cnvmpQueryKey(projectId) });
    },
  });
}

function cnvmpPath(projectId: string) {
  return `/projects/${projectId}/cnvmp`;
}

function cnvmpQueryKey(projectId: string) {
  return ['projects', projectId, 'cnvmp'] as const;
}
