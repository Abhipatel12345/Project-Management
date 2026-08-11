import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import documentService from '@/services/document.service';
import { DocumentItem, DocumentListQueryParams } from '@/types/document.types';

export function useDocuments(params: DocumentListQueryParams = {}) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => documentService.getDocuments(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<DocumentItem>) => documentService.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: Partial<DocumentItem> }) =>
      documentService.updateDocument(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => documentService.deleteDocument(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
