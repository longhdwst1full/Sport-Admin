import { AsyncPagedSelect } from '@/foundation/inputs/async-paged-select';
import { searchActiveAdminBranches } from '@/generated/api/organization/organization';
import type { ActiveLookupOptionDto } from '@/generated/api/organization/organization.schemas';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';

/**
 * Lọc theo chi nhánh bằng lookup chi nhánh đang hoạt động (tìm trên server, cuộn tải thêm).
 *
 * SECURITY: đây chỉ là bộ lọc hiển thị; API vẫn thu hẹp theo phạm vi chi nhánh của token, nên chọn
 * chi nhánh ngoài phạm vi chỉ ra danh sách rỗng chứ không mở rộng quyền.
 */
export function SupportBranchSelect({
  value,
  onChange,
  className,
  disabled,
}: {
  value?: string;
  onChange: (branchId?: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <AsyncPagedSelect<ActiveLookupOptionDto>
      allowClear
      className={className}
      disabled={disabled}
      placeholder="Chi nhánh"
      value={value}
      onChange={(next?: string) => onChange(next)}
      queryKey={['support', 'branch-lookup']}
      staleTimeMs={CACHE_POLICY.REFERENCE.staleTime}
      fetchPage={async ({ search, page, limit }) => {
        const result = await searchActiveAdminBranches({ search: search || undefined, page, limit });
        return { items: result.items, hasMore: result.meta.hasMore };
      }}
      toOption={(branch) => ({ value: branch.id, label: branch.label })}
    />
  );
}
