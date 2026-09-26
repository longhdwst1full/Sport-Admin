import type { FieldPath, UseFormReturn } from 'react-hook-form';
import type { ProductFormValues } from './product-form.mapper';

/**
 * Workspace sản phẩm: Tạo và Sửa dùng **cùng** ba tab theo cùng thứ tự. Mỗi tab gộp nhiều khối:
 * - `info`: Thông tin cơ bản + Hình ảnh + Thông số kỹ thuật;
 * - `variants`: SKU & giá + Tồn kho + Combo (khối Combo chỉ hiện với sản phẩm BUNDLE, ẩn ngay trong
 *   nội dung tab chứ không ẩn tab);
 * - `review`: Kiểm tra xuất bản.
 *
 * Bố cục hợp nhất ở FE, còn API vẫn tách theo nghiệp vụ: khi Tạo mọi thứ (trừ tồn đầu) đi một lệnh
 * `createAdminProduct`; khi Sửa, SKU, giá, ảnh, tồn kho, combo ghi ngay qua operation riêng, còn thông
 * tin và thông số lưu bằng nút Lưu.
 */
export const PRODUCT_FORM_TABS = ['info', 'variants', 'review'] as const;
export type ProductFormTab = (typeof PRODUCT_FORM_TABS)[number];
export type ProductFormMode = 'create' | 'edit';

export const PRODUCT_TAB_LABELS: Record<ProductFormTab, string> = {
  info: 'Thông tin',
  variants: 'SKU, giá & tồn kho',
  review: 'Kiểm tra xuất bản',
};

const BASIC_INFO_FIELDS = [
  'productType',
  'name',
  'brandId',
  'categoryIds',
  'primaryCategoryId',
  'shortDescription',
  'description',
] as const satisfies ReadonlyArray<FieldPath<ProductFormValues>>;

const VARIANT_FIELDS = ['name', 'sku', 'barcode', 'weightGrams', 'lengthMm', 'widthMm', 'heightMm', 'price'] as const;

/**
 * Trường của form thuộc tab nào — chỉ để biết lỗi rơi vào tab nào mà nhảy tới.
 *
 * Tồn đầu (`openingQuantity`) thuộc từng dòng biến thể nên liệt kê theo đường dẫn từng ô thay vì
 * trigger cả mảng `variants`; SKU và tồn kho nay cùng tab `variants` nên cả hai quy về tab đó.
 *
 * Khi Sửa, SKU/ảnh/tồn kho là dữ liệu thật lưu riêng, không phải ô của form; dữ liệu giữ chỗ không được
 * phép chặn nút Lưu.
 */
export function productTabFields(
  tab: ProductFormTab,
  mode: ProductFormMode,
  variantCount: number,
): Array<FieldPath<ProductFormValues>> {
  const eachVariant = (fields: readonly string[]) =>
    Array.from({ length: variantCount }, (_, index) =>
      fields.map((field) => `variants.${index}.${field}` as FieldPath<ProductFormValues>),
    ).flat();
  const isCreate = mode === 'create';
  switch (tab) {
    case 'info':
      // Thứ tự theo khối hiển thị: thông tin cơ bản → hình ảnh → thông số kỹ thuật.
      return [...BASIC_INFO_FIELDS, ...(isCreate ? (['images'] as const) : []), 'specifications'];
    case 'variants':
      return isCreate
        ? [...eachVariant(VARIANT_FIELDS), 'initialBranchId', 'initialWarehouseCode', ...eachVariant(['openingQuantity'])]
        : [];
    case 'review':
      return [];
  }
}

export interface TabValidationResult {
  isValid: boolean;
  /** Tab đầu tiên có lỗi, theo đúng thứ tự hiển thị. */
  errorTab?: ProductFormTab;
}

/**
 * Validate từng tab theo thứ tự hiển thị và trả về tab hỏng đầu tiên.
 *
 * Dùng `trigger` trên đúng nhóm trường của tab thay vì validate cả form một lượt: cần biết lỗi thuộc
 * tab nào để chuyển tab, và `formState.errors` không nói điều đó. `tabs` cho phép giới hạn tập tab được
 * xét; mặc định là cả ba tab.
 */
export async function validateProductTabs(
  form: UseFormReturn<ProductFormValues>,
  mode: ProductFormMode = 'create',
  tabs: readonly ProductFormTab[] = PRODUCT_FORM_TABS,
): Promise<TabValidationResult> {
  const variantCount = form.getValues('variants')?.length ?? 0;
  for (const tab of tabs) {
    const fields = productTabFields(tab, mode, variantCount);
    if (fields.length === 0) continue;
    if (!(await form.trigger(fields))) return { isValid: false, errorTab: tab };
  }
  return { isValid: true };
}

/** Tab kế tiếp/trước đó trong danh sách tab; undefined khi đã ở đầu hoặc cuối. */
export function adjacentTab(
  current: ProductFormTab,
  step: 1 | -1,
  tabs: readonly ProductFormTab[] = PRODUCT_FORM_TABS,
): ProductFormTab | undefined {
  return tabs[tabs.indexOf(current) + step];
}
