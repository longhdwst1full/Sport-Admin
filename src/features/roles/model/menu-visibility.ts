import {
  canSeeNavigationItem,
  NAVIGATION_GROUP_LABELS,
  NAVIGATION_ITEMS_DATA,
  type NavigationGroup,
} from '@/shared/constants/navigation';

/**
 * Menu hiển thị của một vai trò được SUY RA từ tập quyền, không lưu riêng.
 *
 * Giống `admin-client` (menu lọc theo quyền `*_view`), dctd không có bảng "menu" hay màn quản lý
 * menu: `NAVIGATION_ITEMS_DATA` là nguồn duy nhất, mỗi mục khai mã quyền làm nó hiện, và
 * `canSeeNavigationItem` là đúng hàm sidebar/`PermissionRoute` dùng. Thêm bảng menu ở DB sẽ tạo
 * hai nguồn sự thật có thể lệch nhau (menu hiện nhưng API trả 403, hoặc ngược lại).
 */
export interface MenuVisibilityItem {
  path: string;
  label: string;
  /** Mã quyền làm mục hiện; có bất kỳ mã nào là thấy. */
  requiredCodes: string[];
  visible: boolean;
  /** Mục khác dùng chung ít nhất một mã — tắt mục này cũng ẩn chúng. */
  sharedWith: string[];
}

export interface MenuVisibilityGroup {
  key: NavigationGroup;
  label: string;
  items: MenuVisibilityItem[];
}

export function menuRequiredCodes(permission: string | string[] | undefined): string[] {
  if (!permission) return [];
  return Array.isArray(permission) ? permission : [permission];
}

export function buildMenuVisibility(granted: ReadonlySet<string>): MenuVisibilityGroup[] {
  const groups = new Map<NavigationGroup, MenuVisibilityGroup>();
  for (const item of NAVIGATION_ITEMS_DATA) {
    const requiredCodes = menuRequiredCodes(item.permission);
    const sharedWith = NAVIGATION_ITEMS_DATA.filter(
      (other) =>
        other.path !== item.path &&
        menuRequiredCodes(other.permission).some((code) => requiredCodes.includes(code)),
    ).map((other) => other.label);
    const group = groups.get(item.group) ?? {
      key: item.group,
      label: NAVIGATION_GROUP_LABELS[item.group],
      items: [],
    };
    group.items.push({
      path: item.path,
      label: item.label,
      requiredCodes,
      visible: canSeeNavigationItem(item, granted),
      sharedWith,
    });
    groups.set(item.group, group);
  }
  return [...groups.values()];
}

/**
 * Bật/tắt một mục menu bằng cách thêm/bỏ các mã quyền làm nó hiện.
 *
 * - Bật: chỉ thêm mã người thao tác cấp được (PERMISSION: API chặn tự nâng quyền); mục nhiều mã
 *   (Bảng điều khiển) được thêm hết các mã cấp được vì mỗi mã mở một khối báo cáo riêng.
 * - Tắt: bỏ mọi mã của mục, kể cả mã dùng chung với mục khác — đó là hệ quả thật của mô hình
 *   menu-theo-quyền, UI phải báo trước qua `sharedWith`. Quyền thao tác (`*.manage`, ...) của màn
 *   giữ nguyên; người sửa gỡ chúng ở tab chi tiết nếu muốn.
 */
export function toggleMenuPermissions(
  current: readonly string[],
  item: Pick<MenuVisibilityItem, 'requiredCodes'>,
  visible: boolean,
  grantableCodes: ReadonlySet<string>,
): string[] {
  const next = new Set(current);
  if (visible) {
    item.requiredCodes.filter((code) => grantableCodes.has(code)).forEach((code) => next.add(code));
  } else {
    item.requiredCodes.forEach((code) => next.delete(code));
  }
  return [...next].sort();
}

/** Mã menu không có trong catalog quyền từ API — dấu hiệu menu và BE lệch nhau. */
export function findUnknownMenuCodes(catalogCodes: ReadonlySet<string>): string[] {
  if (catalogCodes.size === 0) return [];
  const unknown = new Set<string>();
  for (const item of NAVIGATION_ITEMS_DATA) {
    menuRequiredCodes(item.permission)
      .filter((code) => !catalogCodes.has(code))
      .forEach((code) => unknown.add(code));
  }
  return [...unknown].sort();
}
