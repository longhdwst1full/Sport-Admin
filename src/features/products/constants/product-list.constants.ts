import type { ProductType } from '@/generated/api/catalog/catalog.schemas';
import { toOptions } from '@/shared/utils/options';
import {
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  ADMIN_TABLE_PAGE_SIZE_OPTIONS,
} from '@/foundation/table';

export const PRODUCT_LIST_DEFAULT_PAGE_SIZE = ADMIN_TABLE_DEFAULT_PAGE_SIZE;
export const PRODUCT_LIST_PAGE_SIZE_OPTIONS = ADMIN_TABLE_PAGE_SIZE_OPTIONS;

/** SKU/barcode của biến thể chưa lưu: API sinh khi tạo (admin không có ô nhập). */
export const AUTO_GENERATED_CODE_HINT = 'Tự sinh khi lưu';

/** Nhãn checklist xuất bản theo mã từ API (`getAdminProductSetupStatus`). */
export const PRODUCT_READINESS_LABEL: Record<string, string> = {
  NO_SELLABLE_VARIANT: 'Cần ít nhất một SKU đang bán có giá hiệu lực',
  STANDARD_HAS_BUNDLE_VARIANT: 'Sản phẩm thường không được chứa SKU combo',
  INVALID_BUNDLE: 'Mọi SKU combo phải có giá, cấu hình combo đang hoạt động và thành phần hợp lệ',
  MISSING_PRIMARY_IMAGE: 'Cần có ảnh chính',
  NO_AVAILABLE_STOCK: 'Chưa chi nhánh nào có tồn khả dụng — vẫn xuất bản được, website sẽ hiện hết hàng',
};

/** Nhãn loại sản phẩm; ô chọn ở form và bảng kiểm tra xuất bản dùng chung. */
export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  STANDARD: 'Sản phẩm thường',
  BUNDLE: 'Combo cố định',
};

/** Loại sản phẩm cho ô chọn ở form; nhãn tiếng Việt thay cho mã enum. */
export const PRODUCT_TYPE_OPTIONS = toOptions<ProductType>(PRODUCT_TYPE_LABEL);

/**
 * Ô kích thước của một SKU `[tên trường, nhãn, giá trị nhỏ nhất]` — cùng thứ tự ở form Tạo, thêm SKU và
 * sửa SKU. Khối lượng cho phép 0 (hàng số), kích thước tối thiểu 1 mm (khớp `VARIANT_FIELD_RULES`).
 */
export const VARIANT_DIMENSION_FIELDS = [
  ['weightGrams', 'Khối lượng (g)', 0],
  ['lengthMm', 'Dài (mm)', 1],
  ['widthMm', 'Rộng (mm)', 1],
  ['heightMm', 'Cao (mm)', 1],
] as const;
