import { useMemo, useState } from 'react';
import { Empty, Input, Tooltip, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { PermissionDto } from '@/generated/api/iam/iam.schemas';
import { buildPermissionTree } from '../model/permission-tree';
import { filterPermissionTree } from '../model/role-permission-view';
import { PermissionGroupTitle, PermissionLeafTitle, PermissionScreenTitle } from './permission-tree-titles';

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

  const visibleGroups = useMemo(() => filterPermissionTree(groups, keyword), [groups, keyword]);

  const treeData: DataNode[] = useMemo(
    () =>
      visibleGroups.map((group) => ({
        key: `${GROUP_PREFIX}${group.key}`,
        title: <PermissionGroupTitle group={group} />,
        // Node nhóm và màn hình chỉ để gom; bỏ chọn được nhưng không gửi lên API.
        children: group.screens.map((screen) => ({
          key: `${SCREEN_PREFIX}${screen.key}`,
          title: <PermissionScreenTitle label={screen.label} />,
          children: screen.permissions.map((item) => {
            const grantable = grantableCodes.has(item.code);
            const label = <PermissionLeafTitle item={item} muted={!grantable} />;
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
        placeholder="Tìm theo màn hình, tên hoặc mã quyền"
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
            // Không điều khiển expandedKeys bằng một mảng cố định: như vậy người dùng
            // không thể thu gọn nhóm/màn hình. Khi lọc thì mở hết để thấy kết quả.
            defaultExpandAll
            key={keyword.trim() ? `filter:${keyword.trim()}` : 'all'}
            onCheck={(checked) =>
              handleCheck(Array.isArray(checked) ? checked : checked.checked)
            }
          />
        </div>
      )}
    </div>
  );
}
