import {
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  CarOutlined,
  CommentOutlined,
  ControlOutlined,
  DashboardOutlined,
  FileTextOutlined,
  InboxOutlined,
  KeyOutlined,
  PartitionOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface NavigationItem {
  path: string;
  label: string;
  icon: ReactNode;
  group: 'overview' | 'sales' | 'catalog' | 'operations' | 'experience' | 'organization' | 'system';
  /** Một hoặc nhiều quyền; có bất kỳ quyền nào là thấy mục này, khớp với `PermissionRoute`. */
  permission?: string | string[];
}

export const NAVIGATION_GROUP_LABELS: Record<NavigationItem['group'], string> = {
  overview: 'Tổng quan',
  sales: 'Bán hàng',
  catalog: 'Sản phẩm & danh mục',
  operations: 'Kho & vận hành',
  experience: 'Nội dung & trải nghiệm',
  organization: 'Tổ chức',
  system: 'Quản trị hệ thống',
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    path: '/',
    label: 'Bảng điều khiển',
    group: 'overview',
    icon: <DashboardOutlined />,
    // Bảng điều khiển ghép ba nhóm báo cáo, mỗi nhóm một quyền riêng ở API.
    permission: ['report.operation.view', 'report.revenue.view', 'report.inventory.view'],
  },
  {
    path: '/orders',
    label: 'Đơn hàng',
    group: 'sales',
    icon: <ShoppingCartOutlined />,
    permission: 'order.view',
  },
  {
    path: '/fulfillments',
    label: 'Giao vận',
    group: 'sales',
    icon: <CarOutlined />,
    permission: 'fulfillment.view',
  },
  {
    path: '/customers',
    label: 'Khách hàng',
    group: 'sales',
    icon: <TeamOutlined />,
    permission: 'customer.view',
  },
  {
    path: '/payments',
    label: 'Thanh toán',
    group: 'sales',
    icon: <DollarOutlined />,
    permission: 'payment.view',
  },
  {
    path: '/flash-sales',
    label: 'Flash Sale',
    group: 'catalog',
    icon: <ThunderboltOutlined />,
    permission: 'catalog.flash_sale.view',
  },
  {
    path: '/products',
    label: 'Sản phẩm',
    group: 'catalog',
    icon: <AppstoreOutlined />,
    permission: 'catalog.product.view',
  },
  {
    path: '/categories',
    label: 'Danh mục',
    group: 'catalog',
    icon: <PartitionOutlined />,
    permission: 'catalog.category.view',
  },
  {
    path: '/brands',
    label: 'Thương hiệu',
    group: 'catalog',
    icon: <TagsOutlined />,
    permission: 'catalog.brand.view',
  },
  {
    path: '/inventory',
    label: 'Kho hàng',
    group: 'operations',
    icon: <InboxOutlined />,
    permission: 'inventory.stock.view',
  },
  {
    path: '/reviews',
    label: 'Đánh giá',
    group: 'experience',
    icon: <CommentOutlined />,
    permission: 'catalog.review.moderate',
  },
  {
    path: '/content',
    label: 'Bài viết',
    group: 'experience',
    icon: <FileTextOutlined />,
    permission: 'cms.content.view',
  },
  {
    path: '/organization',
    label: 'Chi nhánh & kho',
    group: 'organization',
    icon: <BankOutlined />,
    permission: 'org.branch.view',
  },
  {
    path: '/access',
    label: 'Người dùng & quyền',
    group: 'system',
    icon: <SafetyCertificateOutlined />,
    permission: 'iam.user.view',
  },
  {
    path: '/roles',
    label: 'Vai trò & phân quyền',
    group: 'system',
    icon: <KeyOutlined />,
    permission: 'iam.role.view',
  },
  {
    path: '/system-parameters',
    label: 'Tham số hệ thống',
    group: 'system',
    icon: <ControlOutlined />,
    permission: 'system.parameter.view',
  },
  {
    path: '/audit',
    label: 'Nhật ký hệ thống',
    group: 'system',
    icon: <AuditOutlined />,
    permission: 'iam.audit.view',
  },
];

/** Mục menu hiện khi người dùng có bất kỳ quyền nào nó khai. */
export function canSeeNavigationItem(
  item: NavigationItem,
  granted: ReadonlySet<string>,
): boolean {
  if (!item.permission) return true;
  const required = Array.isArray(item.permission) ? item.permission : [item.permission];
  return required.some((code) => granted.has(code));
}
