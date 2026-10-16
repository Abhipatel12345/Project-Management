import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectService from '@/services/project.service';
import { Project, ProjectListQueryParams } from '@/types/project.types';

export const PROJECT_KEYS = {
  all: ['projects'] as const,
  lists: () => [...PROJECT_KEYS.all, 'list'] as const,
  list: (params: ProjectListQueryParams) => [...PROJECT_KEYS.lists(), params] as const,
  details: () => [...PROJECT_KEYS.all, 'detail'] as const,
  detail: (name: string) => [...PROJECT_KEYS.details(), name] as const,
};

export function useProjects(params: ProjectListQueryParams = {}) {
  return useQuery({
    queryKey: PROJECT_KEYS.list(params),
    queryFn: () => projectService.getProjects(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useProject(name: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(name),
    queryFn: () => projectService.getProjectByName(name),
    enabled: !!name,
    staleTime: 1000 * 30, // 30 seconds
    retry: (failureCount: number, error: any) => {
      // Do not retry on 404 (Not Found) to avoid repeated requests for missing or deleted projects
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Project>) => projectService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: Partial<Project> }) =>
      projectService.updateProject(name, data),
    onSuccess: (_data: unknown, variables: { name: string; data: Partial<Project> }) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(variables.name) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => projectService.deleteProject(name),
    onSuccess: (_data: unknown, deletedName: string) => {
      // Immediately remove the deleted project query from the cache so it is NEVER refetched
      queryClient.removeQueries({ queryKey: PROJECT_KEYS.detail(deletedName), exact: true });
      // Invalidate project lists so directory and project pickers refresh
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}
