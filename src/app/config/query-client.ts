import { QueryClient, type QueryKey } from '@tanstack/react-query';
import {
  invalidateReferenceData,
  REFERENCE_DATA,
  type ReferenceDataName,
} from '@/shared/constants/query-cache-policy';

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
  applyReferenceDataPolicy(queryClient);
  return queryClient;
}

/**
 * Cache lâu dữ liệu tham chiếu theo query key, ở một chỗ thay vì rải `staleTime` vào từng hook.
 * Hook nào truyền `staleTime` riêng vẫn được ưu tiên.
 *
 * Kèm theo: mutation Orval thành công làm mới đúng nhóm nó thay đổi, để cache dài không giữ
 * thương hiệu/chi nhánh/vai trò cũ sau khi chính người dùng vừa sửa.
 */
function applyReferenceDataPolicy(queryClient: QueryClient): void {
  const groupByMutation = new Map<string, ReferenceDataName>();
  for (const [name, group] of Object.entries(REFERENCE_DATA) as [ReferenceDataName, (typeof REFERENCE_DATA)[ReferenceDataName]][]) {
    for (const queryKey of group.queryKeys()) queryClient.setQueryDefaults(queryKey, group.policy);
    for (const operation of group.mutations) groupByMutation.set(operation, name);
  }
  queryClient.getMutationCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    const operation = event.mutation.options.mutationKey?.[0];
    const group = typeof operation === 'string' ? groupByMutation.get(operation) : undefined;
    if (group) void invalidateReferenceData(queryClient, group);
  });
}
