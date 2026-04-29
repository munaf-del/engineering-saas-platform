import type {
  ProjectSpatialFeature,
  ProjectSpatialFeatureFilters,
  ProjectSpatialFeatureInput,
  UpdateProjectSpatialFeatureInput,
} from '@eng/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  ProjectSpatialSheetInput,
  ProjectSpatialSheetRecordApi,
  ProjectSpatialViewInput,
  ProjectSpatialViewRecord,
} from '@/features/spatial/project-spatial-record-types';

export function useProjectSpatialFeatures(
  projectId: string,
  filters: ProjectSpatialFeatureFilters = {},
) {
  return useQuery({
    queryKey: projectSpatialListQueryKey(projectId, filters),
    queryFn: () =>
      projectSpatialApi<ProjectSpatialFeature[]>(`/projects/${projectId}/spatial/features`, {
        params: {
          featureType: filters.featureType,
          geometryType: filters.geometryType,
          linkedDeliverableType: filters.linkedDeliverableType,
          q: filters.q,
        },
      }),
    enabled: !!projectId,
  });
}

export function useProjectSpatialFeature(projectId: string, featureId: string) {
  return useQuery({
    queryKey: projectSpatialDetailQueryKey(projectId, featureId),
    queryFn: () =>
      projectSpatialApi<ProjectSpatialFeature>(
        `/projects/${projectId}/spatial/features/${featureId}`,
      ),
    enabled: !!projectId && !!featureId,
  });
}

export function useCreateProjectSpatialFeature(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectSpatialFeatureInput) =>
      projectSpatialApi<ProjectSpatialFeature>(`/projects/${projectId}/spatial/features`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (feature) => {
      queryClient.setQueryData(projectSpatialDetailQueryKey(projectId, feature.id), feature);
      await queryClient.invalidateQueries({
        queryKey: projectSpatialQueryKeyRoot(projectId),
      });
    },
  });
}

export function useUpdateProjectSpatialFeature(projectId: string, featureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProjectSpatialFeatureInput) =>
      projectSpatialApi<ProjectSpatialFeature>(
        `/projects/${projectId}/spatial/features/${featureId}`,
        {
          method: 'PATCH',
          body: payload,
        },
      ),
    onSuccess: async (feature) => {
      queryClient.setQueryData(projectSpatialDetailQueryKey(projectId, featureId), feature);
      await queryClient.invalidateQueries({
        queryKey: projectSpatialQueryKeyRoot(projectId),
      });
    },
  });
}

export function useDeleteProjectSpatialFeature(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (featureId: string) =>
      projectSpatialApi<{ id: string; deleted: boolean }>(
        `/projects/${projectId}/spatial/features/${featureId}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: async (_, featureId) => {
      queryClient.removeQueries({
        queryKey: projectSpatialDetailQueryKey(projectId, featureId),
      });
      await queryClient.invalidateQueries({
        queryKey: projectSpatialQueryKeyRoot(projectId),
      });
    },
  });
}

export function useProjectSpatialViews(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'spatial', 'views'],
    queryFn: () =>
      projectSpatialApi<ProjectSpatialViewRecord[]>(`/projects/${projectId}/spatial/views`),
    enabled: !!projectId,
  });
}

export function useCreateProjectSpatialView(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectSpatialViewInput) =>
      projectSpatialApi<ProjectSpatialViewRecord>(`/projects/${projectId}/spatial/views`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'spatial', 'views'],
      });
    },
  });
}

export function useUpdateProjectSpatialView(projectId: string, viewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<ProjectSpatialViewInput>) =>
      projectSpatialApi<ProjectSpatialViewRecord>(
        `/projects/${projectId}/spatial/views/${viewId}`,
        {
          method: 'PATCH',
          body: payload,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'spatial', 'views'],
      });
    },
  });
}

export function useDeleteProjectSpatialView(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (viewId: string) =>
      projectSpatialApi<{ id: string; deleted: boolean }>(
        `/projects/${projectId}/spatial/views/${viewId}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'spatial', 'views'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'spatial', 'sheets'],
      });
    },
  });
}

export function useProjectSpatialSheets(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'spatial', 'sheets'],
    queryFn: () =>
      projectSpatialApi<ProjectSpatialSheetRecordApi[]>(`/projects/${projectId}/spatial/sheets`),
    enabled: !!projectId,
  });
}

export function useCreateProjectSpatialSheet(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectSpatialSheetInput) =>
      projectSpatialApi<ProjectSpatialSheetRecordApi>(`/projects/${projectId}/spatial/sheets`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'spatial', 'sheets'],
      });
    },
  });
}

export function useUpdateProjectSpatialSheet(projectId: string, sheetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<ProjectSpatialSheetInput>) =>
      projectSpatialApi<ProjectSpatialSheetRecordApi>(
        `/projects/${projectId}/spatial/sheets/${sheetId}`,
        {
          method: 'PATCH',
          body: payload,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'spatial', 'sheets'],
      });
    },
  });
}

export function useDeleteProjectSpatialSheet(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sheetId: string) =>
      projectSpatialApi<{ id: string; deleted: boolean }>(
        `/projects/${projectId}/spatial/sheets/${sheetId}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'spatial', 'sheets'],
      });
    },
  });
}

function projectSpatialQueryKeyRoot(projectId: string) {
  return ['projects', projectId, 'spatial', 'features'] as const;
}

function projectSpatialListQueryKey(projectId: string, filters: ProjectSpatialFeatureFilters) {
  return [...projectSpatialQueryKeyRoot(projectId), filters] as const;
}

function projectSpatialDetailQueryKey(projectId: string, featureId: string) {
  return [...projectSpatialQueryKeyRoot(projectId), featureId] as const;
}

type ProjectSpatialApiOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

async function projectSpatialApi<T>(path: string, options: ProjectSpatialApiOptions = {}) {
  const debugEnabled = isProjectSpatialDebugEnabled();

  if (debugEnabled) {
    console.info('[Spatial API] request', {
      path,
      method: options.method ?? 'GET',
      params: options.params,
      body: options.body,
    });
  }

  try {
    const response = await api<T>(path, options);

    if (debugEnabled) {
      console.info('[Spatial API] response', {
        path,
        data: response,
      });
    }

    return response;
  } catch (error) {
    if (debugEnabled) {
      console.error('[Spatial API] error', {
        path,
        error,
      });
    }

    throw error;
  }
}

function isProjectSpatialDebugEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('debug') === 'true';
}
