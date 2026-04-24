import type {
  CreateDraftingDrawingInput,
  DraftingDrawing,
  DraftingDrawingSummary,
  DraftingModel,
  DraftingProjectTransmittal,
  DraftingProjectTransmittalInput,
  DraftingTransmittalEvidenceSource,
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

export function useProjectDraftingTransmittals(projectId: string) {
  return useQuery({
    queryKey: projectTransmittalsQueryKey(projectId),
    queryFn: () =>
      draftingApi<DraftingProjectTransmittal[]>(`/projects/${projectId}/drafting/transmittals`),
    enabled: !!projectId,
  });
}

export function useProjectDraftingTransmittal(projectId: string, transmittalId: string) {
  return useQuery({
    queryKey: projectTransmittalDetailQueryKey(projectId, transmittalId),
    queryFn: () =>
      draftingApi<DraftingProjectTransmittal>(
        `/projects/${projectId}/drafting/transmittals/${transmittalId}`,
      ),
    enabled: !!projectId && !!transmittalId,
  });
}

export function useCreateProjectDraftingTransmittal(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DraftingProjectTransmittalInput) =>
      draftingApi<DraftingProjectTransmittal>(`/projects/${projectId}/drafting/transmittals`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (transmittal) => {
      queryClient.setQueryData(
        projectTransmittalDetailQueryKey(projectId, transmittal.id),
        transmittal,
      );
      await queryClient.invalidateQueries({ queryKey: projectTransmittalsQueryKey(projectId) });
    },
  });
}

export function useUpdateProjectDraftingTransmittal(projectId: string, transmittalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DraftingProjectTransmittalInput) =>
      draftingApi<DraftingProjectTransmittal>(
        `/projects/${projectId}/drafting/transmittals/${transmittalId}`,
        {
          method: 'PUT',
          body: payload,
        },
      ),
    onSuccess: async (transmittal) => {
      queryClient.setQueryData(
        projectTransmittalDetailQueryKey(projectId, transmittal.id),
        transmittal,
      );
      await queryClient.invalidateQueries({ queryKey: projectTransmittalsQueryKey(projectId) });
    },
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

type UploadTransmittalEvidenceInput = {
  file: File;
  notes?: string;
  name?: string;
  transmittalId: string;
};

type AttachTransmittalEvidenceInput = {
  artifactSource?: DraftingTransmittalEvidenceSource;
  documentId: string;
  notes?: string;
  transmittalId: string;
};

export function useUploadDraftingTransmittalEvidence(projectId: string, drawingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadTransmittalEvidenceInput) => {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('name', input.name?.trim() || input.file.name.replace(/\.pdf$/i, ''));
      if (input.notes) {
        formData.append('notes', input.notes);
      }

      return draftingApi<DraftingDrawing>(
        `/projects/${projectId}/drafting/drawings/${drawingId}/transmittals/${input.transmittalId}/evidence/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );
    },
    onSuccess: async (drawing) => {
      queryClient.setQueryData(draftingDetailQueryKey(projectId, drawingId), drawing);
      await queryClient.invalidateQueries({ queryKey: draftingListQueryKey(projectId) });
      await queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
    },
  });
}

export function useAttachDraftingTransmittalEvidence(projectId: string, drawingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AttachTransmittalEvidenceInput) =>
      draftingApi<DraftingDrawing>(
        `/projects/${projectId}/drafting/drawings/${drawingId}/transmittals/${input.transmittalId}/evidence/attach`,
        {
          method: 'POST',
          body: {
            artifactSource: input.artifactSource,
            documentId: input.documentId,
            notes: input.notes,
          },
        },
      ),
    onSuccess: async (drawing) => {
      queryClient.setQueryData(draftingDetailQueryKey(projectId, drawingId), drawing);
      await queryClient.invalidateQueries({ queryKey: draftingListQueryKey(projectId) });
    },
  });
}

export function useRemoveDraftingTransmittalEvidence(projectId: string, drawingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { notes?: string; transmittalId: string }) =>
      draftingApi<DraftingDrawing>(
        `/projects/${projectId}/drafting/drawings/${drawingId}/transmittals/${input.transmittalId}/evidence`,
        {
          method: 'DELETE',
          body: { notes: input.notes },
        },
      ),
    onSuccess: async (drawing) => {
      queryClient.setQueryData(draftingDetailQueryKey(projectId, drawingId), drawing);
      await queryClient.invalidateQueries({ queryKey: draftingListQueryKey(projectId) });
    },
  });
}

function draftingListQueryKey(projectId: string) {
  return ['projects', projectId, 'drafting', 'drawings'] as const;
}

function draftingDetailQueryKey(projectId: string, drawingId: string) {
  return [...draftingListQueryKey(projectId), drawingId] as const;
}

function projectTransmittalsQueryKey(projectId: string) {
  return ['projects', projectId, 'drafting', 'project-transmittals'] as const;
}

function projectTransmittalDetailQueryKey(projectId: string, transmittalId: string) {
  return [...projectTransmittalsQueryKey(projectId), transmittalId] as const;
}

type DraftingApiOptions = {
  method?: string;
  body?: unknown;
};

async function draftingApi<T>(path: string, options: DraftingApiOptions = {}) {
  return api<T>(path, options);
}
