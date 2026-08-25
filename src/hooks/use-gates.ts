import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gateService from '@/services/gate.service';
import { Gate, GateListQueryParams, GateCriterion, GateDeliverable } from '@/types/gate.types';

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

export function useAddGateCriterion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gateName, criterion }: { gateName: string; criterion: Partial<GateCriterion> }) =>
      gateService.addCriterion(gateName, criterion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateGateCriterion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gateName, criterionId, data }: { gateName: string; criterionId: string; data: Partial<GateCriterion> }) =>
      gateService.updateCriterion(gateName, criterionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useApproveGateCriterion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gateName, criterionId }: { gateName: string; criterionId: string }) =>
      gateService.approveCriterion(gateName, criterionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteGateCriterion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gateName, criterionId }: { gateName: string; criterionId: string }) =>
      gateService.deleteCriterion(gateName, criterionId),
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

export function useUpdateGateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gateName, deliverableId, data }: { gateName: string; deliverableId: string; data: Partial<GateDeliverable> }) =>
      gateService.updateDeliverable(gateName, deliverableId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteGateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gateName, deliverableId }: { gateName: string; deliverableId: string }) =>
      gateService.deleteDeliverable(gateName, deliverableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useAddGateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gateName, review }: { gateName: string; review: { reviewer: string; decision: 'Approved' | 'Approved with Conditions' | 'Rejected'; comments?: string } }) =>
      gateService.addGateReview(gateName, review),
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
