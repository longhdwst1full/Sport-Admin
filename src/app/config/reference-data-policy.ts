import type { QueryClient } from '@tanstack/react-query';
import {
  invalidateReferenceData,
  REFERENCE_DATA,
  type ReferenceDataName,
} from '@/shared/constants/query-cache-policy';

const applied = new WeakSet<QueryClient>();

/**
 * Cache lâu dữ liệu tham chiếu theo query key, ở một chỗ thay vì rải `staleTime` vào từng hook.
 * Hook nào truyền `staleTime` riêng vẫn được ưu tiên.
 *
 * Kèm theo: mutation Orval thành công làm mới đúng nhóm nó thay đổi, để cache dài không giữ
 * thương hiệu/chi nhánh/vai trò cũ sau khi chính người dùng vừa sửa.
 */
export function applyReferenceDataPolicy(queryClient: QueryClient): void {
  if (applied.has(queryClient)) return;
  applied.add(queryClient);
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
