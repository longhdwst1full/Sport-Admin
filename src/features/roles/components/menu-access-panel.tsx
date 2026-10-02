import { useMemo } from 'react';
import { Alert, Switch, Tag, Tooltip, Typography } from 'antd';
import {
  buildMenuVisibility,
  findUnknownMenuCodes,
  toggleMenuPermissions,
  type MenuVisibilityItem,
} from '../model/menu-visibility';

export interface MenuAccessPanelProps {
  value: string[];
  onChange?: (value: string[]) => void;
  /** Mã có trong catalog quyền của API, để cảnh báo menu khai mã không tồn tại. */
  catalogCodes: ReadonlySet<string>;
  grantableCodes: ReadonlySet<string>;
  disabled?: boolean;
}

/**
 * Xem và bật/tắt menu Admin của vai trò. Mỗi công tắc chỉ thêm/bỏ mã quyền "xem" của màn đó —
 * không có dữ liệu menu riêng nào được lưu (xem `model/menu-visibility.ts`).
 */
export function MenuAccessPanel({
  value,
  onChange,
  catalogCodes,
  grantableCodes,
  disabled = false,
}: MenuAccessPanelProps) {
  const granted = useMemo(() => new Set(value), [value]);
  const groups = useMemo(() => buildMenuVisibility(granted), [granted]);
  const unknownCodes = useMemo(() => findUnknownMenuCodes(catalogCodes), [catalogCodes]);
  const visibleCount = groups.reduce(
    (total, group) => total + group.items.filter((item) => item.visible).length,
    0,
  );
  const totalCount = groups.reduce((total, group) => total + group.items.length, 0);

  function renderSwitch(item: MenuVisibilityItem) {
    // PERMISSION: bật cần ít nhất một mã người thao tác đang nắm; tắt luôn được vì bỏ quyền không
    // phải leo thang. Backend vẫn kiểm tra lại khi Lưu.
    const canGrant = item.requiredCodes.some((code) => grantableCodes.has(code));
    const locked = disabled || (!item.visible && !canGrant);
    const control = (
      <Switch
        size="small"
        checked={item.visible}
        disabled={locked}
        aria-label={`Hiện menu ${item.label}`}
        onChange={(checked) =>
          onChange?.(toggleMenuPermissions(value, item, checked, grantableCodes))
        }
      />
    );
    if (!disabled && !item.visible && !canGrant) {
      return (
        <Tooltip title="Bạn không có quyền xem màn này nên không thể cấp cho vai trò khác">
          <span>{control}</span>
        </Tooltip>
      );
    }
    return control;
  }

  return (
    <div className="space-y-3">
      <Typography.Text type="secondary" className="block text-sm">
        Vai trò này sẽ thấy <b>{visibleCount}</b>/{totalCount} mục menu. Bật một mục = cấp quyền xem
        của màn đó; quyền thao tác chi tiết chỉnh ở tab &quot;Chi tiết quyền&quot;.
      </Typography.Text>
      {unknownCodes.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Menu khai mã quyền không có trong catalog API"
          description={unknownCodes.join(', ')}
        />
      )}
      <div className="max-h-[420px] space-y-3 overflow-auto rounded-lg border border-slate-200 p-3">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.label}
            </div>
            <ul className="divide-y divide-slate-100">
              {group.items.map((item) => (
                <li key={item.path} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0">
                    <div className={item.visible ? 'font-medium' : 'text-slate-400'}>
                      {item.label}
                    </div>
                    <Typography.Text type="secondary" className="!text-xs">
                      {item.requiredCodes.join(' | ')}
                    </Typography.Text>
                    {item.sharedWith.length > 0 && (
                      <Tooltip title="Các mục này dùng chung mã quyền xem, bật/tắt một mục sẽ đổi cả mục kia">
                        <Tag className="ml-2" color="gold">
                          Chung quyền: {item.sharedWith.join(', ')}
                        </Tag>
                      </Tooltip>
                    )}
                  </div>
                  {renderSwitch(item)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
