import {
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  ADMIN_TABLE_PAGE_SIZE_OPTIONS,
} from '@/foundation/table';

export const PRODUCT_LIST_DEFAULT_PAGE_SIZE = ADMIN_TABLE_DEFAULT_PAGE_SIZE;
export const PRODUCT_LIST_PAGE_SIZE_OPTIONS = ADMIN_TABLE_PAGE_SIZE_OPTIONS;

/**
 * SKU nhập tay khớp validate của API (`PRODUCT_IDENTIFIER.SKU_PATTERN`): viết hoa, bắt đầu bằng chữ/số,
 * cho phép . _ + - (mã cũ của cửa hàng có dạng `V-40+`). Bỏ trống thì API sinh mã 8 ký tự.
 */
export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._+-]{1,39}$/;
export const SKU_PATTERN_MESSAGE = 'SKU chỉ gồm A-Z, 0-9, . _ + - và dài 2-40 ký tự';

/** Nhãn checklist xuất bản theo mã từ API (`getAdminProductSetupStatus`). */
export const PRODUCT_READINESS_LABEL: Record<string, string> = {
  NO_SELLABLE_VARIANT: 'Cần ít nhất một SKU đang bán có giá hiệu lực',
  STANDARD_HAS_BUNDLE_VARIANT: 'Sản phẩm thường không được chứa SKU combo',
  INVALID_BUNDLE: 'Mọi SKU combo phải có giá, cấu hình combo đang hoạt động và thành phần hợp lệ',
  MISSING_PRIMARY_IMAGE: 'Cần có ảnh chính',
  NO_AVAILABLE_STOCK: 'Chưa chi nhánh nào có tồn khả dụng — vẫn xuất bản được, website sẽ hiện hết hàng',
};
