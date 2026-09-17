import { useMemo, useState } from 'react';
import { Empty, Input, Tag, Tooltip, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { LockOutlined } from '@ant-design/icons';
import type { PermissionDto } from '@/generated/api/iam/models';
import { permissionActionLabels } from '../constants/role.constants';
import { buildPermissionTree } from '../model/permission-tree';

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

/** Tiền tố để phân biệt node nhóm/màn hình với node quyền; chỉ node quyền mới là giá trị thật. */
const GROUP_PREFIX = 'group:';
const SCREEN_PREFIX = 'screen:';

export function PermissionPicker({
  permissions,
  value = [],
  onChange,
  grantableCodes,
  disabled = false,
}: PermissionPickerProps) {
  const [keyword, setKeyword] = useState('');
  const selected = useMemo(() => new Set(value), [value]);

  const groups = useMemo(() => buildPermissionTree(permissions), [permissions]);

  const visibleGroups = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        screens: group.screens
          .map((screen) => ({
            ...screen,
            permissions: screen.permissions.filter(
              (item) =>
                item.code.toLowerCase().includes(needle) ||
                screen.label.toLowerCase().includes(needle) ||
                group.label.toLowerCase().includes(needle),
            ),
          }))
          .filter((screen) => screen.permissions.length > 0),
      }))
      .filter((group) => group.screens.length > 0);
  }, [groups, keyword]);

  const treeData: DataNode[] = useMemo(
    () =>
      visibleGroups.map((group) => ({
        key: `${GROUP_PREFIX}${group.key}`,
        title: <span className="font-semibold">{group.label}</span>,
        // Node nhóm và màn hình chỉ để gom; bỏ chọn được nhưng không gửi lên API.
        children: group.screens.map((screen) => ({
          key: `${SCREEN_PREFIX}${screen.key}`,
          title: <span className="font-medium">{screen.label}</span>,
          children: screen.permissions.map((item) => {
            const grantable = grantableCodes.has(item.code);
            const label = (
              <span className={grantable ? undefined : 'text-slate-400'}>
                <span className="mr-2">{permissionActionLabels[item.action] ?? item.action}</span>
                <Typography.Text type="secondary" className="text-xs">
                  {item.code}
                </Typography.Text>
                {item.sensitive && (
                  <Tag color="orange" className="ml-2" icon={<LockOutlined />}>
                    Nhạy cảm
                  </Tag>
                )}
              </span>
            );
            return {
              key: item.code,
              disabled: disabled || !grantable,
              title: grantable ? (
                label
              ) : (
                <Tooltip title="Bạn không có quyền này nên không thể cấp cho vai trò khác">
                  {label}
                </Tooltip>
              ),
              isLeaf: true,
            };
          }),
        })),
      })),
    [visibleGroups, grantableCodes, disabled],
  );

  const expandedKeys = useMemo(
    () =>
      visibleGroups.flatMap((group) => [
        `${GROUP_PREFIX}${group.key}`,
        ...group.screens.map((screen) => `${SCREEN_PREFIX}${screen.key}`),
      ]),
    [visibleGroups],
  );

  /**
   * Tree trả về cả key của node nhóm đang tick. Chỉ giữ mã quyền thật, và giữ nguyên những quyền
   * đang bị ẩn bởi ô tìm kiếm — nếu không, gõ tìm kiếm sẽ âm thầm bỏ chọn phần còn lại.
   */
  function handleCheck(checkedKeys: React.Key[]) {
    const visibleCodes = new Set(
      visibleGroups.flatMap((group) =>
        group.screens.flatMap((screen) => screen.permissions.map((item) => item.code)),
      ),
    );
    const next = new Set([...selected].filter((code) => !visibleCodes.has(code)));
    for (const key of checkedKeys) {
      const code = String(key);
      if (code.startsWith(GROUP_PREFIX) || code.startsWith(SCREEN_PREFIX)) continue;
      next.add(code);
    }
    onChange?.([...next].sort());
  }

  if (groups.length === 0) {
    return <Empty description="Chưa tải được danh sách quyền" />;
  }

  return (
    <div className="space-y-2">
      <Input.Search
        allowClear
        placeholder="Tìm theo màn hình hoặc mã quyền"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
      {visibleGroups.length === 0 ? (
        <Empty description="Không có quyền nào khớp từ khoá" />
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200 p-2">
          <Tree
            checkable
            selectable={false}
            // Node cha chỉ là nhãn gom nhóm, nên tick cha phải lan xuống con.
            checkStrictly={false}
            treeData={treeData}
            checkedKeys={[...selected]}
            expandedKeys={expandedKeys}
            onCheck={(checked) =>
              handleCheck(Array.isArray(checked) ? checked : checked.checked)
            }
          />
        </div>
      )}
    </div>
  );
}
