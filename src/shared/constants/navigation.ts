/**
 * Dữ liệu điều hướng thuần (không JSX) dùng chung cho cả `app` (sidebar/tabs/command palette)
 * và `features/roles` (cây quyền). Icon (JSX) sống ở `app/navigation` vì `shared` không được
 * phụ thuộc React rendering đặc thù — xem `.claude/rules/14-shared-module.md` RULE-SHR-01.
 */

export type NavigationGroup =
  | 'overview'
  | 'sales'
  | 'catalog'
  | 'operations'
  | 'experience'
  | 'organization'
  | 'system';

export interface NavigationItemData {
  path: string;
  label: string;
  group: NavigationGroup;
  /** Một hoặc nhiều quyền; có bất kỳ quyền nào là thấy mục này, khớp với `PermissionRoute`. */
  permission?: string | string[];
}

export const NAVIGATION_GROUP_LABELS: Record<NavigationGroup, string> = {
  overview: 'Tổng quan',
  sales: 'Bán hàng',
  catalog: 'Sản phẩm & danh mục',
  operations: 'Kho & vận hành',
  experience: 'Nội dung & trải nghiệm',
  organization: 'Tổ chức',
  system: 'Quản trị hệ thống',
};

export const NAVIGATION_ITEMS_DATA: NavigationItemData[] = [
  {
    path: '/',
    label: 'Bảng điều khiển',
    group: 'overview',
    // Bảng điều khiển ghép ba nhóm báo cáo, mỗi nhóm một quyền riêng ở API.
    permission: ['report.operation.view', 'report.revenue.view', 'report.inventory.view'],
  },
  {
    path: '/orders',
    label: 'Đơn hàng',
    group: 'sales',
    permission: 'order.view',
  },
  {
    path: '/fulfillments',
    label: 'Giao vận',
    group: 'sales',
    permission: 'fulfillment.view',
  },
  {
    path: '/returns',
    label: 'Đổi trả',
    group: 'sales',
    permission: 'return.view',
  },
  {
    path: '/support-tickets',
    label: 'Hàng đợi hỗ trợ',
    group: 'sales',
    permission: 'support.ticket.view',
  },
  {
    path: '/customers',
    label: 'Khách hàng',
    group: 'sales',
    permission: 'customer.view',
  },
  {
    path: '/payments',
    label: 'Thanh toán',
    group: 'sales',
    permission: 'payment.view',
  },
  {
    path: '/flash-sales',
    label: 'Flash Sale',
    group: 'catalog',
    permission: 'catalog.flash_sale.view',
  },
  {
    path: '/products',
    label: 'Sản phẩm',
    group: 'catalog',
    permission: 'catalog.product.view',
  },
  {
    path: '/categories',
    label: 'Danh mục',
    group: 'catalog',
    permission: 'catalog.category.view',
  },
  {
    path: '/brands',
    label: 'Thương hiệu',
    group: 'catalog',
    permission: 'catalog.brand.view',
  },
  {
    path: '/attributes',
    label: 'Thuộc tính sản phẩm',
    group: 'catalog',
    permission: 'catalog.product.view',
  },
  {
    path: '/inventory',
    label: 'Kho hàng',
    group: 'operations',
    permission: 'inventory.stock.view',
  },
  {
    path: '/procurement',
    label: 'Nhập hàng & NCC',
    group: 'operations',
    permission: 'purchase.order.view',
  },
  {
    path: '/reviews',
    label: 'Đánh giá',
    group: 'experience',
    permission: 'catalog.review.moderate',
  },
  {
    path: '/content',
    label: 'Bài viết',
    group: 'experience',
    permission: 'cms.content.view',
  },
  {
    path: '/banners',
    label: 'Banner',
    group: 'experience',
    permission: 'cms.content.view',
  },
  {
    path: '/social-dashboard',
    label: 'Dashboard mạng xã hội',
    group: 'experience',
    // Contract dashboard (getAdminSocialDashboard/listAdminSocialTopPosts) dùng cms.content.view.
    permission: 'cms.content.view',
  },
  {
    path: '/media',
    label: 'Thư viện ảnh',
    group: 'experience',
    permission: 'media.asset.view',
  },
  {
    path: '/assistant-knowledge',
    label: 'Tri thức trợ lý',
    group: 'experience',
    permission: 'assistant.knowledge.manage',
  },
  {
    path: '/organization',
    label: 'Chi nhánh & kho',
    group: 'organization',
    permission: 'org.branch.view',
  },
  {
    path: '/access',
    label: 'Người dùng & quyền',
    group: 'system',
    permission: 'iam.user.view',
  },
  {
    path: '/roles',
    label: 'Vai trò & phân quyền',
    group: 'system',
    permission: 'iam.role.view',
  },
  {
    path: '/system-parameters',
    label: 'Tham số hệ thống',
    group: 'system',
    permission: 'system.parameter.view',
  },
  {
    path: '/notifications',
    label: 'Thông báo email',
    group: 'system',
    permission: 'system.parameter.view',
  },
  {
    path: '/audit',
    label: 'Nhật ký hệ thống',
    group: 'system',
    permission: 'iam.audit.view',
  },
];

/** Mục menu hiện khi người dùng có bất kỳ quyền nào nó khai. */
export function canSeeNavigationItem(
  item: Pick<NavigationItemData, 'permission'>,
  granted: ReadonlySet<string>,
): boolean {
  if (!item.permission) return true;
  const required = Array.isArray(item.permission) ? item.permission : [item.permission];
  return required.some((code) => granted.has(code));
}
