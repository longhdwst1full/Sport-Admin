import type { SelectOption } from '@/shared/utils/options';

/**
 * Option cho ô chọn tìm kiếm (thương hiệu, danh mục, chi nhánh, kho): nhãn `mã — tên`, giá trị do
 * `valueOf` chọn (`id` hoặc `code` tuỳ contract). `pinned` (giá trị đang gán của sản phẩm) đứng đầu để ô không hiện
 * id thô khi trang tìm kiếm hiện tại không chứa nó; trùng giá trị thì giữ bản đầu.
 */
export function toLookupOptions<T extends { code: string; label: string }>(
  items: readonly T[] | undefined,
  valueOf: (item: T) => string,
  pinned: readonly SelectOption[] = [],
): SelectOption[] {
  const options = [
    ...pinned,
    ...(items ?? []).map((item) => ({ value: valueOf(item), label: `${item.code} — ${item.label}` })),
  ];
  return options.filter((item, index) => options.findIndex(({ value }) => value === item.value) === index);
}

/** Option chọn SKU của sản phẩm: `SKU — tên biến thể`. */
export function toVariantOptions(variants: readonly { id: string; sku: string; name: string }[]): SelectOption[] {
  return variants.map((variant) => ({ value: variant.id, label: `${variant.sku} — ${variant.name}` }));
}
