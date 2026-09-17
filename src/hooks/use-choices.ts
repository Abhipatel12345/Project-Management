import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import choicesService from '@/services/choices.service';
import { MasterChoicesConfig, DEFAULT_MASTER_CHOICES } from '@/config/charter-choices.config';

export const CHOICES_KEYS = {
  all: ['master-choices'] as const,
};

export function useChoices() {
  return useQuery<MasterChoicesConfig>({
    queryKey: CHOICES_KEYS.all,
    queryFn: () => choicesService.getMasterChoices(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    initialData: DEFAULT_MASTER_CHOICES,
  });
}

export function useUpdateChoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (choices: Partial<MasterChoicesConfig>) => choicesService.updateMasterChoices(choices),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHOICES_KEYS.all });
    },
  });
}
