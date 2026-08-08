import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import teamService from '@/services/team.service';
import { TeamMemberFormData } from '@/types/team.types';

export const TEAM_KEYS = {
  all: ['project-team'] as const,
  project: (projectId: string) => [...TEAM_KEYS.all, projectId] as const,
  employees: (search: string) => ['available-employees', search] as const,
};

export function useProjectTeam(projectId: string) {
  return useQuery({
    queryKey: TEAM_KEYS.project(projectId),
    queryFn: () => teamService.getTeamMembers(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useAddTeamMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TeamMemberFormData) => teamService.addTeamMember(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_KEYS.project(projectId) });
    },
  });
}

export function useUpdateTeamMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: Partial<TeamMemberFormData> }) =>
      teamService.updateTeamMember(projectId, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_KEYS.project(projectId) });
    },
  });
}

export function useToggleBoardStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => teamService.toggleBoardStatus(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_KEYS.project(projectId) });
    },
  });
}

export function useRemoveTeamMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => teamService.removeTeamMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_KEYS.project(projectId) });
    },
  });
}

export function useAvailableEmployees(search: string = '') {
  return useQuery({
    queryKey: TEAM_KEYS.employees(search),
    queryFn: () => teamService.getAvailableEmployees(search),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
