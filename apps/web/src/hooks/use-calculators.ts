import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CalculatorDefinition, CalculatorVersion } from '@eng/shared';

export function useCalculators() {
  return useQuery({
    queryKey: ['calculators'],
    queryFn: () =>
      api<{ data: CalculatorDefinition[] }>('/calculators').then((r) => r.data),
  });
}

export function useCalculator(id: string) {
  return useQuery({
    queryKey: ['calculators', id],
    queryFn: () => api<CalculatorDefinition & { versions?: CalculatorVersion[] }>(`/calculators/${id}`),
    enabled: !!id,
  });
}

export function useCalculatorVersions(id: string) {
  return useQuery({
    queryKey: ['calculators', id, 'versions'],
    queryFn: () =>
      api<{ data: CalculatorVersion[] }>(`/calculators/${id}/versions`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useSeedCalculators() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/calculators/seed/v1', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calculators'] }),
  });
}
