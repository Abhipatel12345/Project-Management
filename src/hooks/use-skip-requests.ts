import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import skipRequestService from '@/services/skip-request.service';
import { CreateSkipRequestInput, TaskSkipRequest } from '@/types/skip-request.types';

export const SKIP_REQUEST_KEYS = {
  all: ['skip-requests'] as const,
  project: (projectId?: string) => [...SKIP_REQUEST_KEYS.all, projectId || 'ALL'] as const,
};

export function useSkipRequests(projectId?: string) {
  return useQuery({
    queryKey: SKIP_REQUEST_KEYS.project(projectId),
    queryFn: () => skipRequestService.getSkipRequests(projectId),
    staleTime: 1000 * 15,
  });
}

export function useCreateSkipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSkipRequestInput) => skipRequestService.createSkipRequest(input),
    onSuccess: (_: TaskSkipRequest, variables: CreateSkipRequestInput) => {
      queryClient.invalidateQueries({ queryKey: SKIP_REQUEST_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useApproveSkipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, requestId }: { projectId: string; requestId: string }) =>
      skipRequestService.approveSkipRequest(projectId, requestId),
    onSuccess: (_: TaskSkipRequest, variables: { projectId: string; requestId: string }) => {
      queryClient.invalidateQueries({ queryKey: SKIP_REQUEST_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useRejectSkipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, requestId, rejectionReason }: { projectId: string; requestId: string; rejectionReason: string }) =>
      skipRequestService.rejectSkipRequest(projectId, requestId, rejectionReason),
    onSuccess: (_: TaskSkipRequest, variables: { projectId: string; requestId: string; rejectionReason: string }) => {
      queryClient.invalidateQueries({ queryKey: SKIP_REQUEST_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
