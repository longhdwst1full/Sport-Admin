import { Button, Typography } from 'antd';

export interface PermissionCodesCellProps {
  codes: readonly string[];
  /** Mở cây quyền đầy đủ của vai trò. */
  onShowMore: () => void;
}

/**
 * Ô "Mã quyền" chỉ còn nút "Xem thêm": danh sách mã trải trong bảng khó đọc, chi tiết theo màn hình
 * nằm trong `RolePermissionsDrawer`.
 */
export function PermissionCodesCell({ codes, onShowMore }: PermissionCodesCellProps) {
  if (codes.length === 0) {
    return <Typography.Text type="secondary">Chưa có quyền</Typography.Text>;
  }
  return (
    <Button type="link" size="small" className="!px-0" onClick={onShowMore}>
      Xem thêm
    </Button>
  );
}
