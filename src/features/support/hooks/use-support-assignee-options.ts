import { useMemo } from 'react';
import { useAuth } from '@/core/auth/auth-context';
import { useCan } from '@/core/auth/permissions';
import { useListAdminSupportAssignees } from '@/generated/api/support/support';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';
import { SUPPORT_PERMISSION } from '../constants/support.constants';
import { toSupportAssigneeOptions } from '../model/support-assignee.mapper';

export interface SupportAssigneeOption {
  value: string;
  label: string;
}

/**
 * Người nhận ticket: "Tôi" luôn đứng đầu, cộng nhân viên ACTIVE có quyền xử lý phiếu ở `branchId`
 * (`listAdminSupportAssignees`). Bỏ trống `branchId` = phiếu không gắn chi nhánh → API chỉ trả nhân viên
 * phạm vi GLOBAL.
 *
 * Nhãn ứng viên là "<tên> — <email đã che>" (chỉ còn tên khi API trả `email` null) để phân biệt người trùng
 * tên; `value` vẫn là `userId`. Hai Select dùng `optionFilterProp="label"` nên tìm được theo cả tên lẫn email.
 *
 * PERMISSION: lookup đòi `support.ticket.assign`; không có quyền thì không gọi (tránh 403) và chỉ còn "Tôi".
 * SECURITY: API lọc theo phạm vi chi nhánh của token và vẫn kiểm người nhận khi giao việc.
 */
export function useSupportAssigneeOptions(
  enabled: boolean,
  branchId?: string,
): {
  options: SupportAssigneeOption[];
  loading: boolean;
  limitedToSelf: boolean;
} {
  const { currentUser } = useAuth();
  const canAssign = useCan(SUPPORT_PERMISSION.ASSIGN);
  const assignees = useListAdminSupportAssignees(branchId ? { branchId } : undefined, {
    query: { ...CACHE_POLICY.LOOKUP, enabled: enabled && canAssign, retry: false },
  });

  const options = useMemo(() => {
    const self = currentUser ? { userId: currentUser.userId, displayName: currentUser.displayName } : undefined;
    // Nhãn kèm email đã che để phân biệt hai nhân viên trùng tên; `email` do API che sẵn, FE không xử lý thêm.
    const candidates = (assignees.data?.items ?? []).map((item) => ({
      userId: item.id,
      displayName: item.fullName,
      maskedEmail: item.email,
    }));
    return toSupportAssigneeOptions(self, candidates);
  }, [currentUser, assignees.data]);

  return { options, loading: assignees.isLoading, limitedToSelf: !canAssign };
}
