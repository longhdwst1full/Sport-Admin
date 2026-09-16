import { Result } from 'antd';
import type { ReactNode } from 'react';
import { usePermissions } from './permissions';

/**
 * Gác route theo quyền.
 *
 * Nhận một hoặc nhiều quyền: có **bất kỳ** quyền nào là vào được. Màn ghép nhiều báo cáo
 * như Bảng điều khiển cần thế — người chỉ được xem doanh thu vẫn nên vào xem phần doanh
 * thu, thay vì bị chặn cả trang vì thiếu một quyền khác.
 *
 * Đây chỉ là lớp cải thiện trải nghiệm; Backend vẫn kiểm quyền trên từng endpoint.
 */
export function PermissionRoute({
  permission,
  children,
}: {
  permission: string | string[];
  children: ReactNode;
}) {
  const granted = usePermissions();
  const required = Array.isArray(permission) ? permission : [permission];
  if (required.some((code) => granted.has(code))) return children;

  return (
    <Result
      status="403"
      title="Bạn không có quyền truy cập"
      subTitle={`Quyền cần thiết: ${required.join(' hoặc ')}`}
    />
  );
}
