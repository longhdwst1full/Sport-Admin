import { toOptions } from '@/shared/utils/options';

/**
 * Loại dữ liệu đang được ghi audit. API nhận chuỗi tự do (không có enum trong contract) nên đây là
 * danh sách lọc gợi ý; mã lạ trong log vẫn hiển thị nguyên văn qua `entityTypeLabel`.
 */
const ENTITY_TYPE_LABELS = {
  USER: 'Người dùng',
  USER_ROLE_ASSIGNMENT: 'Gán vai trò',
  PRODUCT: 'Sản phẩm',
  PRODUCT_VARIANT: 'Biến thể sản phẩm',
  PRODUCT_PRICE: 'Giá sản phẩm',
  INVENTORY_BALANCE: 'Tồn kho',
  MEDIA_ASSET: 'Tệp media',
} as const satisfies Record<string, string>;

export const ENTITY_TYPE_OPTIONS = toOptions(ENTITY_TYPE_LABELS);

export const entityTypeLabel = (value: string): string =>
  (ENTITY_TYPE_LABELS as Record<string, string>)[value] ?? value;
