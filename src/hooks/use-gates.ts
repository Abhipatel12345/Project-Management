import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gateService from '@/services/gate.service';
import { Gate, GateListQueryParams, GateDeliverable } from '@/types/gate.types';

export function useGates(params: GateListQueryParams = {}) {
  return useQuery({
    queryKey: ['gates', params],
    queryFn: () => gateService.getGates(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Gate>) => gateService.createGate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: Partial<Gate> }) =>
      gateService.updateGate(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useAddGateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gateName, deliverable }: { gateName: string; deliverable: Partial<GateDeliverable> }) =>
      gateService.addDeliverable(gateName, deliverable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => gateService.deleteGate(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
