import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import authService, { ConnectionTestResult, LoginPayload } from '@/services/auth.service';

export function useConnectionTest(enabled = true) {
  return useQuery<ConnectionTestResult, Error>({
    queryKey: ['erpnext-connection-test'],
    queryFn: () => authService.testConnection(),
    enabled,
    retry: 1,
    staleTime: 0, // Always fresh on manual retry
  });
}

export function useLoggedUser() {
  return useQuery<string, Error>({
    queryKey: ['erpnext-logged-user'],
    queryFn: () => authService.getLoggedUser(),
    retry: 1,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginPayload) => authService.login(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erpnext-logged-user'] });
      queryClient.invalidateQueries({ queryKey: ['erpnext-connection-test'] });
    },
  });
}
