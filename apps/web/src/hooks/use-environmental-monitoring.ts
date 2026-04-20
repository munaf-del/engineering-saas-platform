import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  DeleteEnvironmentalMonitoringReportResult,
  EnvironmentalMonitoringReportSummary,
  ProjectEnvironmentalMonitoringLocationInput,
  ProjectEnvironmentalMonitoringObservationInput,
  ProjectEnvironmentalMonitoringRecommendationInput,
  ProjectEnvironmentalMonitoringReferenceInput,
  ProjectEnvironmentalMonitoringReport,
  ProjectEnvironmentalMonitoringReportCreateInput,
  ProjectEnvironmentalMonitoringReportRootInput,
  ProjectEnvironmentalMonitoringSelectedCriterionInput,
  ProjectEnvironmentalNoiseResultRowInput,
  ProjectEnvironmentalVibrationResultRowInput,
} from '@/features/environmental/environmental-monitoring-types';

export function useEnvironmentalMonitoringReports(projectId: string) {
  return useQuery({
    queryKey: monitoringListQueryKey(projectId),
    queryFn: () => api<EnvironmentalMonitoringReportSummary[]>(monitoringBasePath(projectId)),
    enabled: !!projectId,
  });
}

export function useEnvironmentalMonitoringReport(projectId: string, reportId: string) {
  return useQuery({
    queryKey: monitoringDetailQueryKey(projectId, reportId),
    queryFn: () =>
      api<ProjectEnvironmentalMonitoringReport>(monitoringReportPath(projectId, reportId)),
    enabled: !!projectId && !!reportId,
  });
}

export function useCreateEnvironmentalMonitoringReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectEnvironmentalMonitoringReportCreateInput) =>
      api<ProjectEnvironmentalMonitoringReport>(monitoringBasePath(projectId), {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(monitoringDetailQueryKey(projectId, data.id), data);
      await queryClient.invalidateQueries({ queryKey: monitoringListQueryKey(projectId) });
    },
  });
}

export function useDeleteEnvironmentalMonitoringReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) =>
      api<DeleteEnvironmentalMonitoringReportResult>(monitoringReportPath(projectId, reportId), {
        method: 'DELETE',
      }),
    onSuccess: async (_, reportId) => {
      queryClient.removeQueries({ queryKey: monitoringDetailQueryKey(projectId, reportId) });
      await queryClient.invalidateQueries({ queryKey: monitoringListQueryKey(projectId) });
    },
  });
}

export function useUpdateEnvironmentalMonitoringReport(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<ProjectEnvironmentalMonitoringReportRootInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(monitoringReportPath(projectId, reportId), {
        method: 'PUT',
        body: payload,
      }),
  );
}

export function useCreateEnvironmentalMonitoringReference(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<ProjectEnvironmentalMonitoringReferenceInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/references`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateEnvironmentalMonitoringReference(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<{
    id: string;
    data: ProjectEnvironmentalMonitoringReferenceInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/references/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteEnvironmentalMonitoringReference(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/references/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useCreateEnvironmentalMonitoringLocation(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<ProjectEnvironmentalMonitoringLocationInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/locations`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateEnvironmentalMonitoringLocation(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<{
    id: string;
    data: ProjectEnvironmentalMonitoringLocationInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/locations/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteEnvironmentalMonitoringLocation(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/locations/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useCreateEnvironmentalMonitoringSelectedCriterion(
  projectId: string,
  reportId: string,
) {
  return useMonitoringDetailMutation<ProjectEnvironmentalMonitoringSelectedCriterionInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/selected-criteria`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateEnvironmentalMonitoringSelectedCriterion(
  projectId: string,
  reportId: string,
) {
  return useMonitoringDetailMutation<{
    id: string;
    data: ProjectEnvironmentalMonitoringSelectedCriterionInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/selected-criteria/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteEnvironmentalMonitoringSelectedCriterion(
  projectId: string,
  reportId: string,
) {
  return useMonitoringDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/selected-criteria/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useCreateEnvironmentalNoiseResult(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<ProjectEnvironmentalNoiseResultRowInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/noise-results`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateEnvironmentalNoiseResult(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<{ id: string; data: ProjectEnvironmentalNoiseResultRowInput }>(
    projectId,
    reportId,
    ({ id, data }) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/noise-results/${id}`,
        {
          method: 'PATCH',
          body: data,
        },
      ),
  );
}

export function useDeleteEnvironmentalNoiseResult(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/noise-results/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useCreateEnvironmentalVibrationResult(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<ProjectEnvironmentalVibrationResultRowInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/vibration-results`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateEnvironmentalVibrationResult(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<{
    id: string;
    data: ProjectEnvironmentalVibrationResultRowInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/vibration-results/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteEnvironmentalVibrationResult(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/vibration-results/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useCreateEnvironmentalMonitoringObservation(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<ProjectEnvironmentalMonitoringObservationInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/observations`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateEnvironmentalMonitoringObservation(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<{
    id: string;
    data: ProjectEnvironmentalMonitoringObservationInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/observations/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteEnvironmentalMonitoringObservation(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/observations/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useCreateEnvironmentalMonitoringRecommendation(
  projectId: string,
  reportId: string,
) {
  return useMonitoringDetailMutation<ProjectEnvironmentalMonitoringRecommendationInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/recommendations`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateEnvironmentalMonitoringRecommendation(
  projectId: string,
  reportId: string,
) {
  return useMonitoringDetailMutation<{
    id: string;
    data: ProjectEnvironmentalMonitoringRecommendationInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/recommendations/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteEnvironmentalMonitoringRecommendation(
  projectId: string,
  reportId: string,
) {
  return useMonitoringDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/recommendations/${id}`,
      { method: 'DELETE' },
    ),
  );
}

function useMonitoringDetailMutation<TInput>(
  projectId: string,
  reportId: string,
  mutationFn: (input: TInput) => Promise<ProjectEnvironmentalMonitoringReport>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      queryClient.setQueryData(monitoringDetailQueryKey(projectId, reportId), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: monitoringDetailQueryKey(projectId, reportId) }),
        queryClient.invalidateQueries({ queryKey: monitoringListQueryKey(projectId) }),
      ]);
    },
  });
}

function monitoringBasePath(projectId: string) {
  return `/projects/${projectId}/environmental/monitoring`;
}

function monitoringReportPath(projectId: string, reportId: string) {
  return `${monitoringBasePath(projectId)}/${reportId}`;
}

function monitoringListQueryKey(projectId: string) {
  return ['projects', projectId, 'environmental', 'monitoring'] as const;
}

function monitoringDetailQueryKey(projectId: string, reportId: string) {
  return ['projects', projectId, 'environmental', 'monitoring', reportId] as const;
}
