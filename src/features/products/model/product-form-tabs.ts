import type { FieldPath, UseFormReturn } from 'react-hook-form';
import { ProductType } from '@/generated/api/catalog/catalog.schemas';
import type { ProductFormValues } from './product-form.mapper';

/**
 * Workspace sản phẩm: Tạo và Sửa dùng **cùng** bộ tab theo cùng thứ tự. Bố cục hợp nhất ở FE, còn API
 * vẫn tách theo nghiệp vụ: khi Tạo mọi thứ (trừ tồn đầu) đi một lệnh `createAdminProduct`; khi Sửa, SKU,
 * giá, ảnh, tồn kho, combo ghi ngay qua operation riêng, còn thông tin và thông số lưu bằng nút Lưu.
 */
export const PRODUCT_FORM_TABS = ['info', 'variants', 'media', 'specs', 'stock', 'bundle', 'review'] as const;
export type ProductFormTab = (typeof PRODUCT_FORM_TABS)[number];
export type ProductFormMode = 'create' | 'edit';

export const PRODUCT_TAB_LABELS: Record<ProductFormTab, string> = {
  info: 'Thông tin',
  variants: 'SKU & giá',
  media: 'Hình ảnh',
  specs: 'Thông số kỹ thuật',
  stock: 'Tồn kho',
  bundle: 'Combo',
  review: 'Kiểm tra xuất bản',
};

/** Combo chỉ có nghĩa với sản phẩm BUNDLE; sản phẩm thường không hiện tab này ở cả Tạo lẫn Sửa. */
export function visibleProductTabs(productType: ProductType): ProductFormTab[] {
  return PRODUCT_FORM_TABS.filter((tab) => tab !== 'bundle' || productType === ProductType.BUNDLE);
}

const VARIANT_FIELDS = ['name', 'sku', 'barcode', 'weightGrams', 'lengthMm', 'widthMm', 'heightMm', 'price'] as const;

/**
 * Trường của form thuộc tab nào — chỉ để biết lỗi rơi vào tab nào mà nhảy tới.
 *
 * Tồn đầu (`openingQuantity`) nằm ở tab Tồn kho nhưng thuộc từng dòng biến thể, nên liệt kê theo đường
 * dẫn từng ô thay vì trigger cả mảng `variants` (trigger cả mảng sẽ quy lỗi tồn đầu về tab SKU).
 *
 * Khi Sửa, SKU/tồn kho là dữ liệu thật lưu riêng, không phải ô của form; dữ liệu giữ chỗ không được
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
  switch (tab) {
    case 'info':
      return ['productType', 'name', 'brandId', 'categoryIds', 'primaryCategoryId', 'shortDescription', 'description'];
    case 'variants':
      return mode === 'create' ? eachVariant(VARIANT_FIELDS) : [];
    case 'media':
      return mode === 'create' ? ['images'] : [];
    case 'specs':
      return ['specifications'];
    case 'stock':
      return mode === 'create' ? ['initialBranchId', 'initialWarehouseCode', ...eachVariant(['openingQuantity'])] : [];
    case 'bundle':
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
 * Validate từng tab **đang hiển thị** theo thứ tự và trả về tab hỏng đầu tiên.
 *
 * Dùng `trigger` trên đúng nhóm trường của tab thay vì validate cả form một lượt: cần biết lỗi thuộc
 * tab nào để chuyển tab, và `formState.errors` không nói điều đó. Chỉ xét tab nhìn thấy được để không
 * bao giờ chuyển người dùng sang một tab bị ẩn.
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

/** Tab kế tiếp/trước đó trong danh sách đang hiển thị; undefined khi đã ở đầu hoặc cuối. */
export function adjacentTab(
  current: ProductFormTab,
  step: 1 | -1,
  tabs: readonly ProductFormTab[] = PRODUCT_FORM_TABS,
): ProductFormTab | undefined {
  return tabs[tabs.indexOf(current) + step];
}
