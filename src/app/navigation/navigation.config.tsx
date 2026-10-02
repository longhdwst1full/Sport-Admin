import {
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  CarOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  ControlOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  FlagOutlined,
  InboxOutlined,
  KeyOutlined,
  MailOutlined,
  PictureOutlined,
  PartitionOutlined,
  ProfileOutlined,
  RobotOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import {
  canSeeNavigationItem,
  NAVIGATION_GROUP_LABELS,
  NAVIGATION_ITEMS_DATA,
  type NavigationItemData,
} from '@/shared/constants/navigation';

export type { NavigationGroup } from '@/shared/constants/navigation';
export { NAVIGATION_GROUP_LABELS, canSeeNavigationItem };

export interface NavigationItem extends NavigationItemData {
  icon: ReactNode;
}

/**
 * Icon (JSX) khớp theo `path` với dữ liệu điều hướng thuần trong `shared/constants/navigation`.
 * Tách riêng khỏi dữ liệu vì `shared` không được phụ thuộc icon set/JSX (RULE-SHR-01) và
 * `features/roles` (cây quyền) chỉ cần dữ liệu, không cần icon.
 */
const NAVIGATION_ICONS: Record<string, ReactNode> = {
  '/': <DashboardOutlined />,
  '/orders': <ShoppingCartOutlined />,
  '/fulfillments': <CarOutlined />,
  '/returns': <RollbackOutlined />,
  '/support-tickets': <CustomerServiceOutlined />,
  '/customers': <TeamOutlined />,
  '/payments': <DollarOutlined />,
  '/flash-sales': <ThunderboltOutlined />,
  '/products': <AppstoreOutlined />,
  '/categories': <PartitionOutlined />,
  '/brands': <TagsOutlined />,
  '/attributes': <ProfileOutlined />,
  '/inventory': <InboxOutlined />,
  '/procurement': <ShoppingOutlined />,
  '/reviews': <CommentOutlined />,
  '/content': <FileTextOutlined />,
  '/banners': <FlagOutlined />,
  '/assistant-knowledge': <RobotOutlined />,
  '/organization': <BankOutlined />,
  '/access': <SafetyCertificateOutlined />,
  '/roles': <KeyOutlined />,
  '/system-parameters': <ControlOutlined />,
  '/notifications': <MailOutlined />,
  '/media': <PictureOutlined />,
  '/audit': <AuditOutlined />,
};

export const NAVIGATION_ITEMS: NavigationItem[] = NAVIGATION_ITEMS_DATA.map((item) => ({
  ...item,
  icon: NAVIGATION_ICONS[item.path] ?? <ControlOutlined />,
}));
