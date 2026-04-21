import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  RootSheetTemplate,
  RootSheetTemplateInput,
} from '@/features/templates/root-sheet-template-types';

export function useRootSheetTemplates(includeArchived = false) {
  return useQuery({
    queryKey: ['root-sheet-templates', includeArchived],
    queryFn: () =>
      api<RootSheetTemplate[]>('/root-sheet-templates', {
        params: includeArchived ? { includeArchived: true } : undefined,
      }),
  });
}

export function useCreateRootSheetTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RootSheetTemplateInput) =>
      api<RootSheetTemplate>('/root-sheet-templates', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['root-sheet-templates'] });
    },
  });
}

export function useUpdateRootSheetTemplate(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<RootSheetTemplateInput>) =>
      api<RootSheetTemplate>(`/root-sheet-templates/${templateId}`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['root-sheet-templates'] });
    },
  });
}

export function useArchiveRootSheetTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      api<RootSheetTemplate>(`/root-sheet-templates/${templateId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['root-sheet-templates'] });
    },
  });
}

