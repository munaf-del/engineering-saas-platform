import type {
  CreateDraftingDrawingInput,
  DraftingDrawing,
  DraftingDrawingSummary,
  DraftingModel,
  UpdateDraftingDrawingInput,
} from '@eng/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useDraftingDrawings(projectId: string) {
  return useQuery({
    queryKey: draftingListQueryKey(projectId),
    queryFn: () =>
      draftingApi<DraftingDrawingSummary[]>(`/projects/${projectId}/drafting/drawings`),
    enabled: !!projectId,
  });
}

export function useDraftingDrawing(projectId: string, drawingId: string) {
  return useQuery({
    queryKey: draftingDetailQueryKey(projectId, drawingId),
    queryFn: () =>
      draftingApi<DraftingDrawing>(`/projects/${projectId}/drafting/drawings/${drawingId}`),
    enabled: !!projectId && !!drawingId,
  });
}

export function useCreateDraftingDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDraftingDrawingInput) =>
      draftingApi<DraftingDrawing>(`/projects/${projectId}/drafting/drawings`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (drawing) => {
      queryClient.setQueryData(draftingDetailQueryKey(projectId, drawing.id), drawing);
      await queryClient.invalidateQueries({
        queryKey: draftingListQueryKey(projectId),
      });
    },
  });
}

export function useUpdateDraftingDrawing(projectId: string, drawingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDraftingDrawingInput) =>
      draftingApi<DraftingDrawing>(`/projects/${projectId}/drafting/drawings/${drawingId}`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async (drawing) => {
      queryClient.setQueryData(draftingDetailQueryKey(projectId, drawingId), drawing);
      await queryClient.invalidateQueries({
        queryKey: draftingListQueryKey(projectId),
      });
    },
  });
}

export function useSaveDraftingModel(projectId: string, drawingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (model: DraftingModel) =>
      draftingApi<DraftingDrawing>(`/projects/${projectId}/drafting/drawings/${drawingId}/model`, {
        method: 'PUT',
        body: { model },
      }),
    onSuccess: async (drawing) => {
      queryClient.setQueryData(draftingDetailQueryKey(projectId, drawingId), drawing);
      await queryClient.invalidateQueries({
        queryKey: draftingListQueryKey(projectId),
      });
    },
  });
}

function draftingListQueryKey(projectId: string) {
  return ['projects', projectId, 'drafting', 'drawings'] as const;
}

function draftingDetailQueryKey(projectId: string, drawingId: string) {
  return [...draftingListQueryKey(projectId), drawingId] as const;
}

type DraftingApiOptions = {
  method?: string;
  body?: unknown;
};

async function draftingApi<T>(path: string, options: DraftingApiOptions = {}) {
  return api<T>(path, options);
}
