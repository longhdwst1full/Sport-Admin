import type { FieldPath, UseFormReturn } from 'react-hook-form';
import type { ProductFormValues } from './product-form.mapper';

export const PRODUCT_FORM_TABS = ['basic', 'media', 'variants', 'review'] as const;
export type ProductFormTab = (typeof PRODUCT_FORM_TABS)[number];

export const PRODUCT_TAB_LABELS: Record<ProductFormTab, string> = {
  basic: 'Thông tin cơ bản',
  media: 'Hình ảnh & mô tả',
  variants: 'Biến thể & giá',
  review: 'Kiểm tra & tạo',
};

/**
 * Trường thuộc về tab nào.
 *
 * Form là **một khối liên tục** trải qua nhiều tab, không phải bốn form rời: chỉ có một
 * `useForm` và một lần submit. Backend tạo Product + category + SKU + giá ban đầu + ảnh trong một
 * transaction; chỉ tồn đầu (nghiệp vụ kho của chi nhánh) là request gọi tiếp sau đó (xem
 * `ProductFormDrawer`) nên có thể lỗi riêng trong khi sản phẩm đã được tạo. Bảng này chỉ dùng để biết lỗi rơi vào tab nào mà nhảy tới — nếu không, người dùng bấm Tạo, form báo không hợp lệ, mà ô lỗi nằm ở tab họ
 * không nhìn thấy.
 */
export const PRODUCT_TAB_FIELDS: Record<ProductFormTab, Array<FieldPath<ProductFormValues>>> = {
  basic: ['productType', 'name', 'brandId', 'categoryIds', 'primaryCategoryId'],
  media: ['images', 'shortDescription', 'description'],
  variants: ['variants', 'initialBranchId', 'initialWarehouseCode'],
  review: [],
};

export interface TabValidationResult {
  isValid: boolean;
  /** Tab đầu tiên có lỗi, theo đúng thứ tự hiển thị. */
  errorTab?: ProductFormTab;
}

/**
 * Validate từng tab theo thứ tự và trả về tab hỏng đầu tiên.
 *
 * Dùng `trigger` trên đúng nhóm trường của tab thay vì validate cả form một lượt: cần biết lỗi
 * thuộc tab nào để chuyển tab, và `formState.errors` không nói điều đó.
 */
export async function validateProductTabs(
  form: UseFormReturn<ProductFormValues>,
): Promise<TabValidationResult> {
  for (const tab of PRODUCT_FORM_TABS) {
    const fields = PRODUCT_TAB_FIELDS[tab];
    if (fields.length === 0) continue;
    if (!(await form.trigger(fields))) return { isValid: false, errorTab: tab };
  }
  return { isValid: true };
}

/** Tab kế tiếp/trước đó cho hai nút điều hướng; undefined khi đã ở đầu hoặc cuối. */
export function adjacentTab(current: ProductFormTab, step: 1 | -1): ProductFormTab | undefined {
  return PRODUCT_FORM_TABS[PRODUCT_FORM_TABS.indexOf(current) + step];
}
