import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  DeleteEnvironmentalMonitoringReportResult,
  ProjectEnvironmentalMonitoringAnnexureInput,
  ProjectEnvironmentalMonitoringLocationImportInput,
  EnvironmentalMonitoringReportSummary,
  ProjectEnvironmentalMonitoringLocationInput,
  ProjectEnvironmentalMonitoringObservationInput,
  ProjectEnvironmentalMonitoringRecommendationInput,
  ProjectEnvironmentalMonitoringReferenceInput,
  ProjectEnvironmentalMonitoringReport,
  ProjectEnvironmentalMonitoringReportPackageIssue,
  ProjectEnvironmentalMonitoringReportPackageIssueCreateInput,
  ProjectEnvironmentalMonitoringReportCreateInput,
  ProjectEnvironmentalMonitoringReportRootInput,
  ProjectEnvironmentalMonitoringSelectedCriterionInput,
  ProjectEnvironmentalNoiseResultRowInput,
  ProjectEnvironmentalVibrationResultRowInput,
} from '@/features/environmental/environmental-monitoring-types';
import type {
  EnvironmentalMonitoringOmnidotsConnectionInput,
  EnvironmentalMonitoringOmnidotsConnectionUpdateInput,
  EnvironmentalMonitoringOmnidotsImportInput,
  OmnidotsBuildDatasetResponse,
  OmnidotsConnectionSummary,
  OmnidotsCreateVibrationResultsResponse,
  OmnidotsImportResponse,
  OmnidotsMeasuringPointState,
} from '@/features/environmental/monitoring-omnidots-types';

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

export function useEnvironmentalMonitoringReportPackageIssue(
  projectId: string,
  reportId: string,
  issueId: string,
) {
  return useQuery({
    queryKey: monitoringIssueDetailQueryKey(projectId, reportId, issueId),
    queryFn: () =>
      api<ProjectEnvironmentalMonitoringReportPackageIssue>(
        `${monitoringReportPath(projectId, reportId)}/package-issues/${issueId}`,
      ),
    enabled: !!projectId && !!reportId && !!issueId,
  });
}

export function useEnvironmentalMonitoringOmnidotsConnections(
  projectId: string,
  reportId: string,
) {
  return useQuery({
    queryKey: monitoringOmnidotsConnectionsQueryKey(projectId, reportId),
    queryFn: () =>
      api<OmnidotsConnectionSummary[]>(`${monitoringReportPath(projectId, reportId)}/omnidots/connections`),
    enabled: !!projectId && !!reportId,
  });
}

export function useEnvironmentalMonitoringOmnidotsMeasuringPoints(
  projectId: string,
  reportId: string,
  connectionId: string | null,
) {
  return useQuery({
    queryKey: monitoringOmnidotsMeasuringPointsQueryKey(projectId, reportId, connectionId),
    queryFn: () =>
      api<OmnidotsMeasuringPointState>(
        `${monitoringReportPath(projectId, reportId)}/omnidots/connections/${connectionId}/measuring-points`,
      ),
    enabled: !!projectId && !!reportId && !!connectionId,
  });
}

export function useCreateEnvironmentalMonitoringOmnidotsConnection(
  projectId: string,
  reportId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EnvironmentalMonitoringOmnidotsConnectionInput) =>
      api<OmnidotsConnectionSummary>(`${monitoringReportPath(projectId, reportId)}/omnidots/connections`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: monitoringOmnidotsConnectionsQueryKey(projectId, reportId),
      });
    },
  });
}

export function useUpdateEnvironmentalMonitoringOmnidotsConnection(
  projectId: string,
  reportId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      connectionId,
      data,
    }: {
      connectionId: string;
      data: EnvironmentalMonitoringOmnidotsConnectionUpdateInput;
    }) =>
      api<OmnidotsConnectionSummary>(
        `${monitoringReportPath(projectId, reportId)}/omnidots/connections/${connectionId}`,
        {
          method: 'PATCH',
          body: data,
        },
      ),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: monitoringOmnidotsConnectionsQueryKey(projectId, reportId),
        }),
        queryClient.invalidateQueries({
          queryKey: monitoringOmnidotsMeasuringPointsQueryKey(
            projectId,
            reportId,
            variables.connectionId,
          ),
        }),
      ]);
    },
  });
}

export function useValidateEnvironmentalMonitoringOmnidotsConnection(
  projectId: string,
  reportId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      api<{
        connection: OmnidotsConnectionSummary;
        validation: { valid: boolean; accountName?: string | null; accountId?: string | null; message?: string };
      }>(`${monitoringReportPath(projectId, reportId)}/omnidots/connections/${connectionId}/validate`, {
        method: 'POST',
      }),
    onSuccess: async (_, connectionId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: monitoringOmnidotsConnectionsQueryKey(projectId, reportId),
        }),
        queryClient.invalidateQueries({
          queryKey: monitoringOmnidotsMeasuringPointsQueryKey(projectId, reportId, connectionId),
        }),
      ]);
    },
  });
}

export function useSyncEnvironmentalMonitoringOmnidotsMeasuringPoints(
  projectId: string,
  reportId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      api<{
        connection: OmnidotsConnectionSummary;
        sync: {
          status: string;
          totalCount: number;
          createdCount: number;
          updatedCount: number;
          errorMessage?: string;
        };
      }>(
        `${monitoringReportPath(projectId, reportId)}/omnidots/connections/${connectionId}/sync-measuring-points`,
        {
          method: 'POST',
        },
      ),
    onSuccess: async (_, connectionId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: monitoringOmnidotsConnectionsQueryKey(projectId, reportId),
        }),
        queryClient.invalidateQueries({
          queryKey: monitoringOmnidotsMeasuringPointsQueryKey(projectId, reportId, connectionId),
        }),
      ]);
    },
  });
}

export function useImportEnvironmentalMonitoringOmnidots(
  projectId: string,
  reportId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EnvironmentalMonitoringOmnidotsImportInput) =>
      api<OmnidotsImportResponse>(`${monitoringReportPath(projectId, reportId)}/omnidots/import`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({
        queryKey: monitoringOmnidotsMeasuringPointsQueryKey(
          projectId,
          reportId,
          payload.connectionId,
        ),
      });
    },
  });
}

export function useBuildEnvironmentalMonitoringOmnidotsDataset(
  projectId: string,
  reportId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EnvironmentalMonitoringOmnidotsImportInput) =>
      api<OmnidotsBuildDatasetResponse>(
        `${monitoringReportPath(projectId, reportId)}/omnidots/build-dataset`,
        {
          method: 'POST',
          body: payload,
        },
      ),
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({
        queryKey: monitoringOmnidotsMeasuringPointsQueryKey(
          projectId,
          reportId,
          payload.connectionId,
        ),
      });
    },
  });
}

export function useCreateVibrationResultsFromEnvironmentalMonitoringOmnidotsDataset(
  projectId: string,
  reportId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datasetId: string) =>
      api<OmnidotsCreateVibrationResultsResponse>(
        `${monitoringReportPath(projectId, reportId)}/omnidots/create-vibration-results`,
        {
          method: 'POST',
          body: { datasetId },
        },
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData(monitoringDetailQueryKey(projectId, reportId), data.report);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: monitoringDetailQueryKey(projectId, reportId),
        }),
        queryClient.invalidateQueries({
          queryKey: monitoringListQueryKey(projectId),
        }),
      ]);
    },
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

export function useDuplicateEnvironmentalMonitoringReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/duplicate`,
        {
          method: 'POST',
        },
      ),
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

export function useCreateEnvironmentalMonitoringReportPackageIssue(
  projectId: string,
  reportId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectEnvironmentalMonitoringReportPackageIssueCreateInput) =>
      api<ProjectEnvironmentalMonitoringReportPackageIssue>(
        `${monitoringReportPath(projectId, reportId)}/package-issues`,
        {
          method: 'POST',
          body: payload,
        },
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData(monitoringIssueDetailQueryKey(projectId, reportId, data.id), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: monitoringDetailQueryKey(projectId, reportId) }),
        queryClient.invalidateQueries({ queryKey: monitoringListQueryKey(projectId) }),
      ]);
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

export function useCreateEnvironmentalMonitoringAnnexure(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<ProjectEnvironmentalMonitoringAnnexureInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/annexures`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useReorderEnvironmentalMonitoringAnnexures(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<{ orderedIds: string[] }>(projectId, reportId, (payload) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/annexures/reorder`,
      {
        method: 'PUT',
        body: payload,
      },
    ),
  );
}

export function useUpdateEnvironmentalMonitoringAnnexure(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<{
    id: string;
    data: ProjectEnvironmentalMonitoringAnnexureInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/annexures/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteEnvironmentalMonitoringAnnexure(projectId: string, reportId: string) {
  return useMonitoringDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectEnvironmentalMonitoringReport>(
      `${monitoringReportPath(projectId, reportId)}/annexures/${id}`,
      { method: 'DELETE' },
    ),
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

export function useImportEnvironmentalMonitoringLocationsFromView(
  projectId: string,
  reportId: string,
) {
  return useMonitoringDetailMutation<ProjectEnvironmentalMonitoringLocationImportInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectEnvironmentalMonitoringReport>(
        `${monitoringReportPath(projectId, reportId)}/locations/import-from-view`,
        {
          method: 'POST',
          body: payload,
        },
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

function monitoringIssueDetailQueryKey(projectId: string, reportId: string, issueId: string) {
  return [
    'projects',
    projectId,
    'environmental',
    'monitoring',
    reportId,
    'package-issues',
    issueId,
  ] as const;
}

function monitoringOmnidotsConnectionsQueryKey(projectId: string, reportId: string) {
  return ['projects', projectId, 'environmental', 'monitoring', reportId, 'omnidots'] as const;
}

function monitoringOmnidotsMeasuringPointsQueryKey(
  projectId: string,
  reportId: string,
  connectionId: string | null,
) {
  return [
    'projects',
    projectId,
    'environmental',
    'monitoring',
    reportId,
    'omnidots',
    connectionId,
    'measuring-points',
  ] as const;
}
