import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import designReviewService from '@/services/design-review.service';
import { DesignReview, DesignReviewListQueryParams, ReviewFinding } from '@/types/design-review.types';

export function useDesignReviews(params: DesignReviewListQueryParams = {}) {
  return useQuery({
    queryKey: ['design-reviews', params],
    queryFn: () => designReviewService.getDesignReviews(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateDesignReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<DesignReview>) => designReviewService.createDesignReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateDesignReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: Partial<DesignReview> }) =>
      designReviewService.updateDesignReview(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useAddReviewFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewName, finding }: { reviewName: string; finding: Partial<ReviewFinding> }) =>
      designReviewService.addReviewFinding(reviewName, finding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteDesignReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => designReviewService.deleteDesignReview(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
