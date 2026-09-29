import { useMemo } from 'react';
import { useSearchActiveAdminBranches } from '@/generated/api/organization/organization';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';

const BRANCH_LOOKUP_LIMIT = 50;

/**
 * Tra tên chi nhánh cho các dòng ticket.
 *
 * CONTRACT: DTO ticket chỉ trả `branchId`, không kèm tên. Lookup chi nhánh đang hoạt động (tối đa 50,
 * cache REFERENCE) đủ cho topology V1; chi nhánh đã ngừng hoặc ngoài trang đầu hiện `#<id>` thay vì
 * đoán tên. Gỡ hook này khi API trả `branchName` trong DTO ticket.
 */
export function useBranchLabels(): (branchId?: string) => string | undefined {
  const branches = useSearchActiveAdminBranches(
    { page: 1, limit: BRANCH_LOOKUP_LIMIT },
    { query: { ...CACHE_POLICY.REFERENCE, retry: false } },
  );
  const labels = useMemo(
    () => new Map((branches.data?.items ?? []).map((branch) => [branch.id, branch.label])),
    [branches.data],
  );
  return (branchId) => (branchId ? labels.get(branchId) ?? `#${branchId}` : undefined);
}
