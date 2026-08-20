import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectConnectionsService from '@/services/project-connections.service';
import { ConnectionCountResult, ConnectionRecordsResponse, ConnectionRecordItem } from '@/types/connection.types';

export const CONNECTION_KEYS = {
  all: ['project-connections'] as const,
  counts: (projectId: string) => [...CONNECTION_KEYS.all, 'counts', projectId] as const,
  records: (projectId: string, doctype: string, page: number) =>
    [...CONNECTION_KEYS.all, 'records', projectId, doctype, page] as const,
};

export function useProjectConnectionCounts(projectId: string) {
  return useQuery<Record<string, ConnectionCountResult>>({
    queryKey: CONNECTION_KEYS.counts(projectId),
    queryFn: () => projectConnectionsService.getAllConnectionCounts(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

export function useProjectConnectionRecords(
  projectId: string,
  doctype: string,
  projectField: string = 'project',
  alternativeProjectField?: string,
  page: number = 1,
  pageSize: number = 20,
  enabled: boolean = true
) {
  return useQuery<ConnectionRecordsResponse>({
    queryKey: CONNECTION_KEYS.records(projectId, doctype, page),
    queryFn: () =>
      projectConnectionsService.getConnectionRecords(
        projectId,
        doctype,
        projectField,
        alternativeProjectField,
        page,
        pageSize
      ),
    enabled: enabled && !!projectId && !!doctype,
    staleTime: 1000 * 15,
  });
}

export function useCreateConnectionRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      doctype,
      data,
    }: {
      doctype: string;
      data: Record<string, any>;
    }) => projectConnectionsService.createConnectionRecord(doctype, data),
    onSuccess: (_data: ConnectionRecordItem, variables: { doctype: string; data: Record<string, any> }) => {
      queryClient.invalidateQueries({ queryKey: CONNECTION_KEYS.all });
    },
  });
}
