import { useMemo } from 'react';
import { useAuth } from '@/core/auth/auth-context';
import { useCan } from '@/core/auth/permissions';
import { useListAdminUsers } from '@/generated/api/iam/iam';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';

const USER_LIST_PERMISSION = 'iam.user.view';

export interface SupportAssigneeOption {
  value: string;
  label: string;
}

/**
 * Danh sách người có thể nhận ticket: luôn có chính người đang đăng nhập ("Tôi"), cộng nhân viên
 * đang hoạt động nếu người dùng được xem danh sách nhân sự.
 *
 * PERMISSION: `listAdminUsers` đòi `iam.user.view`; nhân viên hỗ trợ thường không có quyền này nên
 * chỉ gọi khi có quyền, tránh một lượt 403 mỗi lần mở màn. Backend vẫn kiểm người nhận có hợp lệ
 * (đúng phạm vi chi nhánh, có quyền hỗ trợ) khi giao việc.
 *
 * CONTRACT: nếu backend hỗ trợ phát hành lookup người nhận theo phạm vi ticket, thay nguồn này bằng
 * lookup đó; lọc STAFF/ACTIVE ở đây chỉ là gần đúng.
 */
export function useSupportAssigneeOptions(enabled: boolean): {
  options: SupportAssigneeOption[];
  loading: boolean;
  limitedToSelf: boolean;
} {
  const { currentUser } = useAuth();
  const canListUsers = useCan(USER_LIST_PERMISSION);
  const users = useListAdminUsers({
    query: { ...CACHE_POLICY.LOOKUP, enabled: enabled && canListUsers, retry: false },
  });

  const options = useMemo(() => {
    const self = currentUser
      ? [{ value: currentUser.userId, label: `Tôi (${currentUser.displayName})` }]
      : [];
    const staff = (users.data?.items ?? [])
      .filter((user) => user.userType === 'STAFF' && user.status === 'ACTIVE')
      .filter((user) => user.id !== currentUser?.userId)
      .map((user) => ({ value: user.id, label: user.displayName }));
    return [...self, ...staff];
  }, [currentUser, users.data]);

  return { options, loading: users.isLoading, limitedToSelf: !canListUsers };
}
