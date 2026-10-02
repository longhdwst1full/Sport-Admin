import { useMemo } from 'react';
import { Tabs } from 'antd';
import type { PermissionDto } from '@/generated/api/iam/iam.schemas';
import { MenuAccessPanel } from './menu-access-panel';
import { PermissionPicker } from './permission-picker';

export interface RolePermissionEditorProps {
  permissions: PermissionDto[];
  value?: string[];
  onChange?: (value: string[]) => void;
  grantableCodes: ReadonlySet<string>;
  disabled?: boolean;
}

/**
 * Một field `permissionCodes`, hai cách nhìn: theo menu (màn nào vai trò thấy) và theo cây quyền
 * chi tiết. Cả hai cùng đọc/ghi một mảng mã, nên không thể lệch nhau.
 */
export function RolePermissionEditor({
  permissions,
  value = [],
  onChange,
  grantableCodes,
  disabled = false,
}: RolePermissionEditorProps) {
  const catalogCodes = useMemo(() => new Set(permissions.map(({ code }) => code)), [permissions]);

  return (
    <Tabs
      size="small"
      items={[
        {
          key: 'menu',
          label: 'Menu hiển thị',
          children: (
            <MenuAccessPanel
              value={value}
              onChange={onChange}
              catalogCodes={catalogCodes}
              grantableCodes={grantableCodes}
              disabled={disabled}
            />
          ),
        },
        {
          key: 'permissions',
          label: 'Chi tiết quyền',
          children: (
            <PermissionPicker
              permissions={permissions}
              value={value}
              onChange={onChange}
              grantableCodes={grantableCodes}
              disabled={disabled}
            />
          ),
        },
      ]}
    />
  );
}
