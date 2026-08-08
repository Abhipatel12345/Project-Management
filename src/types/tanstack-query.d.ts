declare module '@tanstack/react-query' {
  export function useQuery<TData = any, TError = any>(options: any): {
    data: TData | undefined;
    isLoading: boolean;
    isError: boolean;
    error: TError | null;
    isFetching: boolean;
    refetch: () => Promise<any>;
  };

  export function useMutation<TData = any, TError = any, TVariables = any>(options: any): {
    mutate: (variables: TVariables, options?: any) => void;
    mutateAsync: (variables: TVariables, options?: any) => Promise<TData>;
    isPending: boolean;
    isError: boolean;
    error: TError | null;
  };

  export function useQueryClient(): {
    clear: () => void;
    invalidateQueries: (filters?: any) => Promise<void>;
  };

  export class QueryClient {
    constructor(config?: any);
    clear(): void;
    invalidateQueries(filters?: any): Promise<void>;
  }

  export function QueryClientProvider(props: { client: any; children: any }): React.ReactElement;
}
