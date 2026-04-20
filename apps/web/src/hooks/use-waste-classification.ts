import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  DeleteWasteClassificationReportResult,
  ProjectWasteClassificationAssAutofillResult,
  ProjectWasteClassificationDraftRecommendation,
  ProjectWasteClassificationChecklistItemInput,
  ProjectWasteClassificationLabResultInput,
  ProjectWasteClassificationMaterialPathwayInput,
  ProjectWasteClassificationRecommendationInput,
  ProjectWasteClassificationReferenceInput,
  ProjectWasteClassificationRelatedPathwayInput,
  ProjectWasteClassificationReport,
  ProjectWasteClassificationReportCreateInput,
  ProjectWasteClassificationReportRootInput,
  ProjectWasteClassificationReportSummary,
  ProjectWasteClassificationStepDecisionInput,
} from '@/features/environmental/waste-classification-types';

export function useWasteClassificationReports(projectId: string) {
  return useQuery({
    queryKey: wasteClassificationListQueryKey(projectId),
    queryFn: () =>
      api<ProjectWasteClassificationReportSummary[]>(wasteClassificationBasePath(projectId)),
    enabled: !!projectId,
  });
}

export function useWasteClassificationReport(projectId: string, reportId: string) {
  return useQuery({
    queryKey: wasteClassificationDetailQueryKey(projectId, reportId),
    queryFn: () =>
      api<ProjectWasteClassificationReport>(wasteClassificationReportPath(projectId, reportId)),
    enabled: !!projectId && !!reportId,
  });
}

export function useCreateWasteClassificationReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectWasteClassificationReportCreateInput) =>
      api<ProjectWasteClassificationReport>(wasteClassificationBasePath(projectId), {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(wasteClassificationDetailQueryKey(projectId, data.id), data);
      await queryClient.invalidateQueries({ queryKey: wasteClassificationListQueryKey(projectId) });
    },
  });
}

export function useDeleteWasteClassificationReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) =>
      api<DeleteWasteClassificationReportResult>(
        wasteClassificationReportPath(projectId, reportId),
        {
          method: 'DELETE',
        },
      ),
    onSuccess: async (_, reportId) => {
      queryClient.removeQueries({
        queryKey: wasteClassificationDetailQueryKey(projectId, reportId),
      });
      await queryClient.invalidateQueries({ queryKey: wasteClassificationListQueryKey(projectId) });
    },
  });
}

export function useUpdateWasteClassificationReport(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<ProjectWasteClassificationReportRootInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectWasteClassificationReport>(wasteClassificationReportPath(projectId, reportId), {
        method: 'PUT',
        body: payload,
      }),
  );
}

export function useCreateWasteClassificationReference(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<ProjectWasteClassificationReferenceInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectWasteClassificationReport>(
        `${wasteClassificationReportPath(projectId, reportId)}/references`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateWasteClassificationReference(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<{
    id: string;
    data: ProjectWasteClassificationReferenceInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/references/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteWasteClassificationReference(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/references/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useUpdateWasteClassificationStepDecision(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<{
    id: string;
    data: ProjectWasteClassificationStepDecisionInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/step-decisions/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useUpdateWasteClassificationChecklistItem(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<{
    stepDecisionId: string;
    id: string;
    data: ProjectWasteClassificationChecklistItemInput;
  }>(projectId, reportId, ({ stepDecisionId, id, data }) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/step-decisions/${stepDecisionId}/checklist-items/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useCreateWasteClassificationLabResult(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<ProjectWasteClassificationLabResultInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectWasteClassificationReport>(
        `${wasteClassificationReportPath(projectId, reportId)}/lab-results`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateWasteClassificationLabResult(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<{
    id: string;
    data: ProjectWasteClassificationLabResultInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/lab-results/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useDeleteWasteClassificationLabResult(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/lab-results/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useCreateWasteClassificationRecommendation(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<ProjectWasteClassificationRecommendationInput>(
    projectId,
    reportId,
    (payload) =>
      api<ProjectWasteClassificationReport>(
        `${wasteClassificationReportPath(projectId, reportId)}/recommendations`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  );
}

export function useUpdateWasteClassificationRecommendation(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<{
    id: string;
    data: ProjectWasteClassificationRecommendationInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/recommendations/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useUpdateWasteClassificationMaterialPathway(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<{
    id: string;
    data: ProjectWasteClassificationMaterialPathwayInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/material-pathways/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

export function useAutofillWasteClassificationAssPathway(projectId: string, reportId: string) {
  return useMutation({
    mutationFn: (pathwayId: string) =>
      api<ProjectWasteClassificationAssAutofillResult>(
        `${wasteClassificationReportPath(projectId, reportId)}/material-pathways/${pathwayId}/ass-autofill`,
        {
          method: 'POST',
          body: {},
        },
      ),
  });
}

export function useGenerateWasteClassificationDraftRecommendation(
  projectId: string,
  reportId: string,
) {
  return useMutation({
    mutationFn: (payload: {
      finalWasteClass?: ProjectWasteClassificationDraftRecommendation['finalWasteClass'];
    }) =>
      api<ProjectWasteClassificationDraftRecommendation>(
        `${wasteClassificationReportPath(projectId, reportId)}/draft-recommendation`,
        {
          method: 'POST',
          body: payload,
        },
      ),
  });
}

export function useDeleteWasteClassificationRecommendation(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<string>(projectId, reportId, (id) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/recommendations/${id}`,
      { method: 'DELETE' },
    ),
  );
}

export function useUpdateWasteClassificationRelatedPathway(projectId: string, reportId: string) {
  return useWasteClassificationDetailMutation<{
    id: string;
    data: ProjectWasteClassificationRelatedPathwayInput;
  }>(projectId, reportId, ({ id, data }) =>
    api<ProjectWasteClassificationReport>(
      `${wasteClassificationReportPath(projectId, reportId)}/related-pathways/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),
  );
}

function useWasteClassificationDetailMutation<TInput>(
  projectId: string,
  reportId: string,
  mutationFn: (input: TInput) => Promise<ProjectWasteClassificationReport>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      queryClient.setQueryData(wasteClassificationDetailQueryKey(projectId, reportId), data);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: wasteClassificationDetailQueryKey(projectId, reportId),
        }),
        queryClient.invalidateQueries({ queryKey: wasteClassificationListQueryKey(projectId) }),
      ]);
    },
  });
}

function wasteClassificationBasePath(projectId: string) {
  return `/projects/${projectId}/environmental/waste-classification`;
}

function wasteClassificationReportPath(projectId: string, reportId: string) {
  return `${wasteClassificationBasePath(projectId)}/${reportId}`;
}

function wasteClassificationListQueryKey(projectId: string) {
  return ['projects', projectId, 'environmental', 'waste-classification'] as const;
}

function wasteClassificationDetailQueryKey(projectId: string, reportId: string) {
  return ['projects', projectId, 'environmental', 'waste-classification', reportId] as const;
}
