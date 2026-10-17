import { useMemo, useState } from 'react';
import { Button, Empty, Input, Tag, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { PermissionDto, RoleDto } from '@/generated/api/iam/iam.schemas';
import { DetailDrawer } from '@/foundation/overlay';
import { buildMenuVisibility } from '../model/menu-visibility';
import {
  buildRolePermissionTree,
  countGroupPermissions,
  filterPermissionTree,
} from '../model/role-permission-view';
import { PermissionGroupTitle, PermissionLeafTitle, PermissionScreenTitle } from './permission-tree-titles';

export interface RolePermissionsDrawerProps {
  /** Vai trò đang xem; `undefined` là đóng drawer. */
  role?: RoleDto;
  /** Danh mục quyền (`listAdminPermissions`) để lấy hành động/độ nhạy cảm của từng mã. */
  permissions: readonly PermissionDto[];
  onClose: () => void;
}

const groupKey = (key: string) => `group:${key}`;
const screenKey = (group: string, screen: string) => `screen:${group}:${screen}`;

/** Xem trước menu vai trò sẽ thấy — cùng hàm lọc với sidebar nên không lệch thực tế. */
function RoleMenuPreview({ codes }: { codes: readonly string[] }) {
  const items = useMemo(
    () => buildMenuVisibility(new Set(codes)).flatMap((group) => group.items.filter((item) => item.visible)),
    [codes],
  );
  if (items.length === 0) {
    return <Typography.Text type="secondary">Không thấy mục menu nào</Typography.Text>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Tag key={item.path} className="!m-0">
          {item.label}
        </Tag>
      ))}
    </div>
  );
}

/** Nội dung có state riêng; `DetailDrawer` huỷ khi đóng nên mỗi lần mở bắt đầu lại từ đầu. */
function RolePermissionsBody({ role, permissions }: { role: RoleDto; permissions: readonly PermissionDto[] }) {
  const [keyword, setKeyword] = useState('');
  // UX: mặc định mở hết; chỉ nhớ những node người dùng chủ động thu gọn.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const tree = useMemo(
    () => buildRolePermissionTree(role.permissionCodes, permissions),
    [role.permissionCodes, permissions],
  );
  const visible = useMemo(
    () => filterPermissionTree(tree, keyword),
    [tree, keyword],
  );

  const { treeData, branchKeys } = useMemo(() => {
    const keys: string[] = [];
    const data: DataNode[] = visible.map((group) => {
      keys.push(groupKey(group.key));
      return {
        key: groupKey(group.key),
        title: <PermissionGroupTitle group={group} count={countGroupPermissions(group)} />,
        children: group.screens.map((screen) => {
          keys.push(screenKey(group.key, screen.key));
          return {
            key: screenKey(group.key, screen.key),
            title: <PermissionScreenTitle label={screen.label} count={screen.permissions.length} />,
            children: screen.permissions.map((item) => ({
              key: item.code,
              isLeaf: true,
              title: <PermissionLeafTitle item={item} />,
            })),
          };
        }),
      };
    });
    return { treeData: data, branchKeys: keys };
  }, [visible]);

  const expandedKeys = branchKeys.filter((key) => !collapsed.has(key));

  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Menu sẽ hiển thị</div>
        <RoleMenuPreview codes={role.permissionCodes} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quyền theo màn hình ({role.permissionCodes.length})
          </div>
          <div className="flex gap-1">
            <Button size="small" type="text" onClick={() => setCollapsed(new Set())}>
              Mở tất cả
            </Button>
            <Button size="small" type="text" onClick={() => setCollapsed(new Set(branchKeys))}>
              Thu gọn
            </Button>
          </div>
        </div>
        <Input.Search
          allowClear
          placeholder="Tìm theo màn hình, hành động hoặc mã quyền"
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            // UX: đổi từ khoá thì mở lại mọi node để thấy ngay kết quả khớp.
            setCollapsed(new Set());
          }}
        />
        {tree.length === 0 ? (
          <Empty description="Vai trò chưa có quyền nào" />
        ) : visible.length === 0 ? (
          <Empty description="Không có quyền nào khớp từ khoá" />
        ) : (
          <div className="rounded-lg border border-slate-200 p-2">
            <Tree
              selectable={false}
              blockNode
              showLine={{ showLeafIcon: false }}
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpand={(_keys, { node, expanded }) => {
                const key = String(node.key);
                setCollapsed((previous) => {
                  const next = new Set(previous);
                  if (expanded) next.delete(key);
                  else next.add(key);
                  return next;
                });
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}

/** Drawer chỉ đọc: toàn bộ quyền của một vai trò dạng cây nhóm menu → màn hình → hành động. */
export function RolePermissionsDrawer({ role, permissions, onClose }: RolePermissionsDrawerProps) {
  return (
    <DetailDrawer
      open={Boolean(role)}
      onClose={onClose}
      size="md"
      title={
        role ? (
          <span>
            Quyền của vai trò {role.name}
            <Typography.Text type="secondary" className="ml-2 !text-xs !font-normal">
              {role.code}
            </Typography.Text>
          </span>
        ) : undefined
      }
    >
      {role && <RolePermissionsBody role={role} permissions={permissions} />}
    </DetailDrawer>
  );
}
