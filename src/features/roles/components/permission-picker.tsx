import { useMemo } from 'react';
import { Checkbox, Collapse, Empty, Tag, Tooltip, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { PermissionDto } from '@/generated/api/iam/models';
import { permissionModuleLabels, permissionActionLabels } from '../constants/role.constants';

export interface PermissionPickerProps {
  permissions: PermissionDto[];
  value?: string[];
  onChange?: (value: string[]) => void;
  /**
   * Quyền người đang thao tác đang nắm. API từ chối cấp quyền ngoài tập này,
   * nên khoá sẵn ở UI thay vì để người dùng bấm rồi nhận lỗi 403.
   */
  grantableCodes: ReadonlySet<string>;
  disabled?: boolean;
}

export function PermissionPicker({
  permissions,
  value = [],
  onChange,
  grantableCodes,
  disabled = false,
}: PermissionPickerProps) {
  const selected = useMemo(() => new Set(value), [value]);

  const modules = useMemo(() => {
    const grouped = new Map<string, PermissionDto[]>();
    for (const permission of permissions) {
      const bucket = grouped.get(permission.module) ?? [];
      bucket.push(permission);
      grouped.set(permission.module, bucket);
    }
    return [...grouped.entries()]
      .map(([module, items]) => ({
        module,
        items: [...items].sort((left, right) => left.code.localeCompare(right.code)),
      }))
      .sort((left, right) =>
        (permissionModuleLabels[left.module] ?? left.module).localeCompare(
          permissionModuleLabels[right.module] ?? right.module,
          'vi',
        ),
      );
  }, [permissions]);

  function emit(next: Set<string>) {
    onChange?.([...next].sort());
  }

  function toggleOne(code: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(code);
    else next.delete(code);
    emit(next);
  }

  function toggleModule(items: PermissionDto[], checked: boolean) {
    const next = new Set(selected);
    for (const item of items) {
      if (!grantableCodes.has(item.code)) continue;
      if (checked) next.add(item.code);
      else next.delete(item.code);
    }
    emit(next);
  }

  if (modules.length === 0) {
    return <Empty description="Chưa tải được danh sách quyền" />;
  }

  return (
    <Collapse
      accordion={false}
      size="small"
      defaultActiveKey={modules.map(({ module }) => module)}
      items={modules.map(({ module, items }) => {
        const grantable = items.filter((item) => grantableCodes.has(item.code));
        const checkedCount = items.filter((item) => selected.has(item.code)).length;
        return {
          key: module,
          label: (
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{permissionModuleLabels[module] ?? module}</span>
              <Typography.Text type="secondary" className="text-xs">
                {checkedCount}/{items.length}
              </Typography.Text>
            </div>
          ),
          extra: (
            <Checkbox
              disabled={disabled || grantable.length === 0}
              checked={checkedCount > 0 && checkedCount === items.length}
              indeterminate={checkedCount > 0 && checkedCount < items.length}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => toggleModule(items, event.target.checked)}
            >
              Chọn cả nhóm
            </Checkbox>
          ),
          children: (
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => {
                const grantableItem = grantableCodes.has(item.code);
                const checkbox = (
                  <Checkbox
                    key={item.code}
                    disabled={disabled || !grantableItem}
                    checked={selected.has(item.code)}
                    onChange={(event) => toggleOne(item.code, event.target.checked)}
                  >
                    <span className="mr-2">{permissionActionLabels[item.action] ?? item.action}</span>
                    <Typography.Text type="secondary" className="text-xs">
                      {item.code}
                    </Typography.Text>
                    {item.sensitive && (
                      <Tag color="orange" className="ml-2" icon={<LockOutlined />}>
                        Nhạy cảm
                      </Tag>
                    )}
                  </Checkbox>
                );
                return grantableItem ? (
                  <div key={item.code}>{checkbox}</div>
                ) : (
                  <Tooltip key={item.code} title="Bạn không có quyền này nên không thể cấp cho vai trò khác">
                    <div>{checkbox}</div>
                  </Tooltip>
                );
              })}
            </div>
          ),
        };
      })}
    />
  );
}
