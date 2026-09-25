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
