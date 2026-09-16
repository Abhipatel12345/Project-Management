import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { CharterChoicesConfig, DEFAULT_CHARTER_CHOICES } from '@/config/charter-choices.config';

export function useCharterChoices() {
  return useQuery<CharterChoicesConfig>({
    queryKey: ['charter-choices'],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: CharterChoicesConfig }>('/api/charter/choices');
        return res?.data || DEFAULT_CHARTER_CHOICES;
      } catch (err) {
        console.warn('[useCharterChoices] Failed to fetch choices, using default configuration:', err);
        return DEFAULT_CHARTER_CHOICES;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
