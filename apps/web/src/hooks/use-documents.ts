import type { Document } from '@eng/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PaginatedResponse } from '@/lib/api-client';

type UploadProjectDocumentInput = {
  file: File;
  name?: string;
  entityType?: string;
  entityId?: string;
};

export function useProjectDocuments(projectId: string, mimeType?: string) {
  return useQuery({
    queryKey: projectDocumentsQueryKey(projectId, mimeType),
    queryFn: async () => {
      const response = await api<PaginatedResponse<Document>>('/documents', {
        params: {
          projectId,
          mimeType,
          limit: 100,
        },
      });

      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useUploadProjectDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadProjectDocumentInput) => {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('name', input.name?.trim() || input.file.name);
      formData.append('projectId', projectId);

      if (input.entityType) {
        formData.append('entityType', input.entityType);
      }

      if (input.entityId) {
        formData.append('entityId', input.entityId);
      }

      return api<Document>('/documents', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: async (document) => {
      queryClient.setQueryData<Document[] | undefined>(
        projectDocumentsQueryKey(projectId, 'application/pdf'),
        (current) =>
          current ? [document, ...current.filter((entry) => entry.id !== document.id)] : [document],
      );
      queryClient.setQueryData<Document[] | undefined>(
        projectDocumentsQueryKey(projectId),
        (current) =>
          current ? [document, ...current.filter((entry) => entry.id !== document.id)] : [document],
      );
      await queryClient.invalidateQueries({
        queryKey: projectDocumentsRootQueryKey(projectId),
      });
    },
  });
}

function projectDocumentsRootQueryKey(projectId: string) {
  return ['documents', projectId] as const;
}

function projectDocumentsQueryKey(projectId: string, mimeType?: string) {
  return [...projectDocumentsRootQueryKey(projectId), mimeType ?? 'all'] as const;
}
