import { ShopOutlined } from '@ant-design/icons';
import { AsyncPagedSelect } from '@/foundation/inputs/async-paged-select';
import { searchActiveAdminBranches } from '@/generated/api/organization/organization';
import type { ActiveLookupOptionDto } from '@/generated/api/organization/organization.schemas';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';

/**
 * Chọn chi nhánh đang hoạt động cho một assignment (tìm trên server, cuộn tải thêm).
 *
 * SECURITY: chỉ là gợi ý; `assignAdminUserRole`/`createAdminStaffUser` tự kiểm chi nhánh ACTIVE và
 * phạm vi của người gán.
 */
export function AccessBranchSelect({
  value,
  onChange,
  seedLabel,
  status,
}: {
  value?: string;
  onChange: (branchId: string) => void;
  /** Nhãn của giá trị đang chọn khi nó chưa nằm trong trang đầu (chế độ sửa). */
  seedLabel?: string;
  status?: 'error';
}) {
  return (
    <AsyncPagedSelect<ActiveLookupOptionDto>
      className="w-full"
      status={status}
      placeholder="Chọn chi nhánh đang hoạt động"
      value={value || undefined}
      onChange={(next?: string) => onChange(next ?? '')}
      queryKey={['access', 'branch-lookup']}
      staleTimeMs={CACHE_POLICY.REFERENCE.staleTime}
      seedOptions={value && seedLabel ? [{ value, label: seedLabel }] : []}
      fetchPage={async ({ search, page, limit }) => {
        const result = await searchActiveAdminBranches({ search: search || undefined, page, limit });
        return { items: result.items, hasMore: result.meta.hasMore };
      }}
      toOption={(branch) => ({ value: branch.id, label: `${branch.code} — ${branch.label}` })}
      suffixIcon={<ShopOutlined className="text-slate-400" />}
    />
  );
}
