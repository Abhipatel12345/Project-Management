import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import taskService from '@/services/task.service';
import { Task, TaskListQueryParams } from '@/types/task.types';

export const TASK_KEYS = {
  all: ['tasks'] as const,
  lists: () => [...TASK_KEYS.all, 'list'] as const,
  list: (params: TaskListQueryParams) => [...TASK_KEYS.lists(), params] as const,
  details: () => [...TASK_KEYS.all, 'detail'] as const,
  detail: (name: string) => [...TASK_KEYS.details(), name] as const,
  comments: (name: string) => [...TASK_KEYS.detail(name), 'comments'] as const,
  attachments: (name: string) => [...TASK_KEYS.detail(name), 'attachments'] as const,
};

export function useTasks(params: TaskListQueryParams = {}) {
  return useQuery({
    queryKey: TASK_KEYS.list(params),
    queryFn: () => taskService.getTasks(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useTask(name: string) {
  return useQuery({
    queryKey: TASK_KEYS.detail(name),
    queryFn: () => taskService.getTaskByName(name),
    enabled: !!name,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Task>) => taskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: Partial<Task> }) =>
      taskService.updateTask(name, data),
    onSuccess: (_data: Task, variables: { name: string; data: Partial<Task> }) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.name) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => taskService.deleteTask(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    },
  });
}

export function useTaskComments(name: string) {
  return useQuery({
    queryKey: TASK_KEYS.comments(name),
    queryFn: () => taskService.getTaskComments(name),
    enabled: !!name,
  });
}

export function useTaskAttachments(name: string) {
  return useQuery({
    queryKey: TASK_KEYS.attachments(name),
    queryFn: () => taskService.getTaskAttachments(name),
    enabled: !!name,
  });
}
