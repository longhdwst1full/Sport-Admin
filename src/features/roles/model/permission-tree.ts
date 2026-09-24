import { NAVIGATION_GROUP_LABELS, NAVIGATION_ITEMS } from '@/app/navigation/navigation.config';
import type { PermissionDto } from '@/generated/api/iam/models';

export interface PermissionTreeLeaf {
  code: string;
  action: string;
  sensitive: boolean;
}

export interface PermissionTreeScreen {
  /** Họ quyền = mã quyền bỏ đoạn hành động cuối. Ví dụ `catalog.product`. */
  key: string;
  label: string;
  permissions: PermissionTreeLeaf[];
}

export interface PermissionTreeGroup {
  key: string;
  label: string;
  screens: PermissionTreeScreen[];
}

/** Nhóm cho quyền chưa gắn với màn hình nào trong Admin. */
export const UNMAPPED_GROUP_KEY = 'unmapped';
export const UNMAPPED_GROUP_LABEL = 'Chưa có màn hình';

/**
 * Nhãn cho từng họ quyền. Menu chỉ khai một mã `*.view` cho mỗi màn, nên các họ quyền còn lại
 * phải có nhãn riêng — không thì cây quyền hiện mã kỹ thuật cho người dùng cuối.
 */
const FAMILY_LABELS: Record<string, string> = {
  'system.module': 'Truy cập hệ thống',
  'org.branch': 'Chi nhánh',
  'org.warehouse': 'Kho',
  'iam.user': 'Nhân sự',
  'iam.role': 'Vai trò',
  'iam.assignment': 'Phân công vai trò',
  'iam.audit': 'Nhật ký hệ thống',
  'catalog.brand': 'Thương hiệu',
  'catalog.category': 'Danh mục',
  'catalog.product': 'Sản phẩm',
  'catalog.price': 'Giá bán',
  'catalog.flash_sale': 'Flash Sale',
  'catalog.review': 'Đánh giá',
  'cms.content': 'Bài viết',
  'system.parameter': 'Tham số hệ thống',
  'inventory.stock': 'Tồn kho',
  'inventory.stocktake': 'Kiểm kê',
  'inventory.transfer': 'Chuyển kho',
  order: 'Đơn hàng',
  payment: 'Thanh toán',
  fulfillment: 'Giao vận',
  customer: 'Khách hàng',
  return: 'Đổi trả',
  'return.window': 'Nhận trả quá hạn',
  'payment.refund': 'Hoàn tiền',
  'media.asset': 'Thư viện ảnh',
  'report.operation': 'Báo cáo vận hành',
  'report.revenue': 'Báo cáo doanh thu',
  'report.inventory': 'Báo cáo tồn kho',
};

/** Họ quyền dùng chung một màn hình dù menu chỉ trỏ tới một mã. */
const FAMILY_TO_SCREEN_PERMISSION: Record<string, string> = {
  'catalog.price': 'catalog.product.view',
  'org.warehouse': 'org.branch.view',
  'inventory.stocktake': 'inventory.stock.view',
  'inventory.transfer': 'inventory.stock.view',
  'iam.assignment': 'iam.user.view',
  'iam.role': 'iam.role.view',
  // Hoàn tiền và nhận trả quá hạn đều thao tác trên màn Đổi trả, không có màn riêng.
  'payment.refund': 'return.view',
  'return.window': 'return.view',
};

export function permissionFamily(code: string): string {
  const parts = code.split('.');
  return parts.length <= 1 ? code : parts.slice(0, -1).join('.');
}

interface ScreenBinding {
  groupKey: string;
  groupLabel: string;
  order: number;
}

function buildScreenIndex(): Map<string, ScreenBinding> {
  const index = new Map<string, ScreenBinding>();
  NAVIGATION_ITEMS.forEach((item, order) => {
    const codes = Array.isArray(item.permission)
      ? item.permission
      : item.permission
        ? [item.permission]
        : [];
    for (const code of codes) {
      index.set(code, {
        groupKey: item.group,
        groupLabel: NAVIGATION_GROUP_LABELS[item.group],
        order,
      });
    }
  });
  return index;
}

/**
 * Dựng cây quyền ba tầng: nhóm menu → màn hình → hành động.
 *
 * Danh sách phẳng hơn 50 mã không nói được "quyền này thuộc màn nào", nên người cấp quyền phải tự
 * dịch mã kỹ thuật sang màn hình trong đầu. Cây này lấy đúng cấu trúc menu mà họ đang nhìn thấy.
 *
 * Quyền không khớp màn nào rơi vào nhóm "Chưa có màn hình" thay vì bị giấu — giấu quyền nghĩa là
 * không ai cấp được nó nữa.
 */
export function buildPermissionTree(permissions: PermissionDto[]): PermissionTreeGroup[] {
  const screenIndex = buildScreenIndex();
  const groups = new Map<string, PermissionTreeGroup & { order: number }>();
  const screenOrder = new Map<string, number>();

  for (const permission of permissions) {
    const family = permissionFamily(permission.code);
    const binding =
      screenIndex.get(permission.code) ??
      screenIndex.get(`${family}.view`) ??
      screenIndex.get(FAMILY_TO_SCREEN_PERMISSION[family] ?? '');

    const groupKey = binding?.groupKey ?? UNMAPPED_GROUP_KEY;
    const groupLabel = binding?.groupLabel ?? UNMAPPED_GROUP_LABEL;
    const order = binding?.order ?? Number.MAX_SAFE_INTEGER;

    const group = groups.get(groupKey) ?? { key: groupKey, label: groupLabel, screens: [], order };
    group.order = Math.min(group.order, order);
    groups.set(groupKey, group);

    let screen = group.screens.find((candidate) => candidate.key === family);
    if (!screen) {
      screen = { key: family, label: FAMILY_LABELS[family] ?? family, permissions: [] };
      group.screens.push(screen);
      screenOrder.set(family, order);
    }
    screen.permissions.push({
      code: permission.code,
      action: permission.action,
      sensitive: permission.sensitive ?? false,
    });
  }

  return [...groups.values()]
    .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label, 'vi'))
    .map((group) => ({
      key: group.key,
      label: group.label,
      screens: [...group.screens]
        .sort(
          (left, right) =>
            (screenOrder.get(left.key) ?? 0) - (screenOrder.get(right.key) ?? 0) ||
            left.label.localeCompare(right.label, 'vi'),
        )
        .map((screen) => ({
          ...screen,
          permissions: [...screen.permissions].sort((left, right) =>
            left.code.localeCompare(right.code),
          ),
        })),
    }));
}
