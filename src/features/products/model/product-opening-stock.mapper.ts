import type { ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';
import type { StockAdjustmentItemInputDto } from '@/generated/api/inventory/inventory.schemas';
import type { ProductVariantFormValues } from './product-form.mapper';

const compareEntityIds = (left: string, right: string): number => {
  const leftId = BigInt(left);
  const rightId = BigInt(right);
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
};

/**
 * CONTRACT: các SKU của aggregate create dùng BIGINT identity, vì vậy thứ tự ID tăng dần
 * chính là thứ tự variants trong request. Không dựa vào thứ tự include mặc định của Prisma.
 */
export function toOpeningStockItems(
  variants: ProductVariantFormValues[],
  createdProduct: ProductDetailDto,
): StockAdjustmentItemInputDto[] {
  if (createdProduct.variants.length !== variants.length) {
    throw new Error('Số SKU trả về không khớp dữ liệu vừa tạo.');
  }

  const createdVariants = [...createdProduct.variants].sort((left, right) =>
    compareEntityIds(left.id, right.id));

  return variants.flatMap((variant, index) => {
    const quantity = variant.openingQuantity ?? 0;
    return quantity > 0
      ? [{ sku: createdVariants[index].sku, quantityDelta: quantity }]
      : [];
  });
}
