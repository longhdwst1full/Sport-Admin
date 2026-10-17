import { Button, Tag, Tooltip, Typography } from 'antd';
import { summarizePermissionCodes } from '../model/role-permission-view';

export interface PermissionCodesCellProps {
  codes: readonly string[];
  /** Mở cây quyền đầy đủ của vai trò. */
  onShowMore: () => void;
}

/**
 * Ô "Mã quyền" gọn: vài mã đầu + "+N" + nút "Xem thêm". Danh sách đầy đủ (theo màn hình) nằm trong
 * `RolePermissionsDrawer`, không trải hết hàng chục tag ra bảng.
 */
export function PermissionCodesCell({ codes, onShowMore }: PermissionCodesCellProps) {
  if (codes.length === 0) {
    return <Typography.Text type="secondary">Chưa có quyền</Typography.Text>;
  }
  const { visible, hiddenCount } = summarizePermissionCodes(codes);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {visible.map((code) => (
        <Tooltip key={code} title={code}>
          <Tag className="!m-0 max-w-[180px] truncate font-mono !text-[11px]">{code}</Tag>
        </Tooltip>
      ))}
      {hiddenCount > 0 && <Tag className="!m-0" color="blue">+{hiddenCount}</Tag>}
      <Button type="link" size="small" className="!px-1" onClick={onShowMore}>
        Xem thêm
      </Button>
    </div>
  );
}
