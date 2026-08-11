import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import issueService from '@/services/issue.service';
import { Issue, IssueListQueryParams } from '@/types/issue.types';

export function useIssues(params: IssueListQueryParams = {}) {
  return useQuery({
    queryKey: ['issues', params],
    queryFn: () => issueService.getIssues(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useIssue(name: string) {
  return useQuery({
    queryKey: ['issue', name],
    queryFn: () => issueService.getIssueByName(name),
    enabled: !!name,
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Issue>) => issueService.createIssue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: Partial<Issue> }) =>
      issueService.updateIssue(name, data),
    onSuccess: (_: any, variables: { name: string; data: Partial<Issue> }) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => issueService.deleteIssue(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
