import { QueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Danh sách/tìm kiếm giữ trang trước khi đổi trang, lọc hoặc gõ tìm, thay vì chớp trống và pager về 0.
 *
 * Chỉ giữ khi query mới cùng path với query trước (key Orval: `[path, params?]`): đổi `id` trong path
 * (drawer chi tiết) thì không giữ, để không hiện nhầm bản ghi khác. Query bị tắt (`enabled: false`)
 * hoặc đã tự khai `placeholderData` thì không đụng tới.
 */
export function keepSameResourceData(queryKey: QueryKey) {
  const resource = queryKey[0];
  return <TData>(previousData: TData | undefined, previousQuery?: { queryKey: QueryKey }) =>
    typeof resource === 'string' && previousQuery?.queryKey[0] === resource ? previousData : undefined;
}

class AdminQueryClient extends QueryClient {
  override defaultQueryOptions: QueryClient['defaultQueryOptions'] = (options) => {
    const defaulted = super.defaultQueryOptions(options);
    if (defaulted.placeholderData !== undefined || defaulted.enabled === false) return defaulted;
    return {
      ...defaulted,
      placeholderData: keepSameResourceData(defaulted.queryKey) as typeof defaulted.placeholderData,
    };
  };
}

export function createAdminQueryClient(): QueryClient {
  const queryClient = new AdminQueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        retry: (failureCount, error) => {
          const status = error instanceof Error && 'status' in error ? Number(error.status) : 0;
          return status >= 400 && status < 500 ? false : failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
  return queryClient;
}
