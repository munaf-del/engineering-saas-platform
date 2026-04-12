import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { OrganisationAiSettingsResponse } from '@eng/shared';
import type { AiDocument, AiReportClassification } from '@/features/ai/types';
import type {
  AiAssistantRespondRequest,
  AiAssistantStructuredResponse,
} from '@/features/ai/assistant-types';

export function useAiDocuments(projectId: string) {
  return useQuery({
    queryKey: ['ai', 'documents', projectId],
    queryFn: () => api<AiDocument[]>('/ai/documents', { params: { projectId } }),
    enabled: !!projectId,
  });
}

export function useUploadAiDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      api<AiDocument>('/ai/documents', { method: 'POST', body: formData }),
    onSuccess: async (document) => {
      await queryClient.invalidateQueries({ queryKey: ['ai', 'documents', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['ai', 'documents', document.id] });
    },
  });
}

export function useIndexAiDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      api<AiDocument>(`/ai/documents/${documentId}/index`, { method: 'POST' }),
    onSuccess: async (document) => {
      await queryClient.invalidateQueries({ queryKey: ['ai', 'documents', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['ai', 'documents', document.id] });
    },
  });
}

export function useExtractAiDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      api<AiDocument>(`/ai/documents/${documentId}/extract`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: async (document) => {
      await queryClient.invalidateQueries({ queryKey: ['ai', 'documents', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['ai', 'documents', document.id] });
    },
  });
}

export function useUpdateAiDocumentClassification(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      classification,
    }: {
      documentId: string;
      classification: AiReportClassification;
    }) =>
      api<AiDocument>(`/ai/documents/${documentId}/classification`, {
        method: 'PATCH',
        body: classification,
      }),
    onSuccess: async (document) => {
      queryClient.setQueryData<AiDocument[]>(['ai', 'documents', projectId], (current) =>
        current?.map((entry) => (entry.id === document.id ? document : entry)),
      );
      queryClient.setQueryData<AiDocument>(['ai', 'documents', document.id], document);
      await queryClient.invalidateQueries({ queryKey: ['ai', 'documents', projectId] });
    },
  });
}

export type DeleteAiDocumentsPayload =
  | {
      documentIds: string[];
      deleteAll?: false;
    }
  | {
      documentIds?: undefined;
      deleteAll: true;
    };

export type DeleteAiDocumentsResult = {
  deletedCount: number;
  deletedDocumentIds: string[];
  hardDelete: boolean;
  projectGeotechnicalSelectionCleared: boolean;
  localFileWarnings: string[];
  openaiCleanupWarnings: string[];
};

export function useDeleteAiDocuments(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteAiDocumentsPayload) =>
      api<DeleteAiDocumentsResult>('/ai/documents', {
        method: 'DELETE',
        body: {
          projectId,
          ...payload,
        },
      }),
    onSuccess: async (result) => {
      const deletedIds = new Set(result.deletedDocumentIds);
      queryClient.setQueryData<AiDocument[]>(['ai', 'documents', projectId], (current) =>
        current?.filter((document) => !deletedIds.has(document.id)),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai', 'documents', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['projects', projectId] }),
      ]);
      await Promise.all(
        result.deletedDocumentIds.map((documentId) =>
          queryClient.invalidateQueries({ queryKey: ['ai', 'documents', documentId] }),
        ),
      );
    },
  });
}

export function useAiAssistantRespond() {
  return useMutation({
    mutationFn: (payload: AiAssistantRespondRequest) =>
      api<AiAssistantStructuredResponse>('/ai/assistant/respond', {
        method: 'POST',
        body: payload,
      }),
  });
}

export function useAiRuntimeSettings(orgId: string) {
  return useQuery({
    queryKey: ['ai', 'settings', orgId],
    queryFn: () => api<OrganisationAiSettingsResponse>(`/organisations/${orgId}/ai-settings`),
    enabled: !!orgId,
  });
}

export function useUpdateAiRuntimeSettings(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      assistantModel: OrganisationAiSettingsResponse['assistantModel'];
      agentModel: OrganisationAiSettingsResponse['agentModel'];
    }) =>
      api<OrganisationAiSettingsResponse>(`/organisations/${orgId}/ai-settings`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai', 'settings', orgId] });
      await queryClient.invalidateQueries({ queryKey: ['organisations', orgId] });
    },
  });
}
