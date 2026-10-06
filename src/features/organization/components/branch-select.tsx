import type { ReactNode } from 'react';
import { AsyncPagedSelect } from '@/foundation/inputs/async-paged-select';
import { searchActiveAdminBranches } from '@/generated/api/organization/organization';
import type { ActiveLookupOptionDto } from '@/generated/api/organization/organization.schemas';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';

const BRANCH_LOOKUP_QUERY_KEY = ['organization', 'branch-lookup'] as const;

export type BranchSelectLabelFormat = 'name' | 'code-name';

export interface BranchSelectProps {
  value?: string;
  /** Tuỳ chọn để `Form.Item` antd tự tiêm `value`/`onChange`. */
  onChange?: (branchId?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  status?: 'error';
  /** Nhãn của giá trị đang chọn khi nó chưa nằm trong trang đầu (chế độ sửa). */
  seedLabel?: string;
  allowClear?: boolean;
  /** `name`: chỉ tên; `code-name`: `<mã> — <tên>`. */
  labelFormat?: BranchSelectLabelFormat;
  suffixIcon?: ReactNode;
}

/**
 * Chọn chi nhánh đang hoạt động (tìm trên server, cuộn tải thêm), dùng chung cho mọi feature.
 *
 * SECURITY: chỉ là gợi ý/bộ lọc hiển thị; API vẫn kiểm chi nhánh ACTIVE và phạm vi chi nhánh của token,
 * nên danh sách ở đây không phải bằng chứng quyền.
 */
export function BranchSelect({
  value,
  onChange,
  placeholder = 'Chi nhánh',
  className,
  disabled,
  status,
  seedLabel,
  allowClear,
  labelFormat = 'name',
  suffixIcon,
}: BranchSelectProps) {
  return (
    <AsyncPagedSelect<ActiveLookupOptionDto>
      allowClear={allowClear}
      className={className}
      disabled={disabled}
      status={status}
      placeholder={placeholder}
      value={value}
      onChange={(next?: string) => onChange?.(next)}
      queryKey={BRANCH_LOOKUP_QUERY_KEY}
      staleTimeMs={CACHE_POLICY.REFERENCE.staleTime}
      seedOptions={value && seedLabel ? [{ value, label: seedLabel }] : undefined}
      fetchPage={async ({ search, page, limit }) => {
        const result = await searchActiveAdminBranches({ search: search || undefined, page, limit });
        return { items: result.items, hasMore: result.meta.hasMore };
      }}
      toOption={(branch) => ({
        value: branch.id,
        label: labelFormat === 'code-name' ? `${branch.code} — ${branch.label}` : branch.label,
      })}
      suffixIcon={suffixIcon}
    />
  );
}
