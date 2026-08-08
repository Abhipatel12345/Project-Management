import { useQuery } from '@tanstack/react-query';
import dashboardService, { DashboardSummaryData } from '@/services/dashboard.service';

export function useDashboardSummary() {
  return useQuery<DashboardSummaryData, Error>({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardService.getDashboardSummary(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
}
