import { AsyncPagedSelect } from '@/foundation/inputs/async-paged-select';
import { searchActiveAdminBranches } from '@/generated/api/organization/organization';
import type { ActiveLookupOptionDto } from '@/generated/api/organization/organization.schemas';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';

/**
 * Chọn chi nhánh đang hoạt động; bỏ trống nghĩa là "Tất cả chi nhánh" (placeholder nói rõ điều đó).
 *
 * SECURITY: API kiểm phạm vi chi nhánh của người gắn; danh sách ở đây không phải bằng chứng quyền.
 */
export function KnowledgeBranchSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: {
  value?: string;
  onChange?: (branchId?: string) => void;
  placeholder: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <AsyncPagedSelect<ActiveLookupOptionDto>
      allowClear
      className={className}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={(next?: string) => onChange?.(next)}
      queryKey={['assistant-knowledge', 'branch-lookup']}
      staleTimeMs={CACHE_POLICY.REFERENCE.staleTime}
      fetchPage={async ({ search, page, limit }) => {
        const result = await searchActiveAdminBranches({ search: search || undefined, page, limit });
        return { items: result.items, hasMore: result.meta.hasMore };
      }}
      toOption={(branch) => ({ value: branch.id, label: branch.label })}
    />
  );
}
