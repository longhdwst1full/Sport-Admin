import type { ProductDetailDto } from '@/generated/api/catalog/models';
import type { ProductVariantFormValues } from './product-form.mapper';

export interface InitialPriceCommand {
  variantId: string;
  amount: string;
}

/**
 * Ghép giá nhập ở màn tạo với SKU thật do backend sinh.
 *
 * Giá phải tạo sau sản phẩm vì bản ghi giá gắn vào `variantId`, mà ID chỉ có sau khi tạo. Khớp
 * theo thứ tự biến thể — backend trả về đúng thứ tự đã gửi lên.
 */
export function toInitialPriceCommands(
  variants: ProductVariantFormValues[],
  created: ProductDetailDto,
): InitialPriceCommand[] {
  return variants.flatMap((variant, index) => {
    const amount = variant.price?.trim();
    const createdVariant = created.variants[index];
    if (!amount || !createdVariant) return [];
    const parsed = Number(amount);
    // Giá 0 hoặc không phải số thì bỏ qua thay vì gửi lên để nhận lỗi; ô này không bắt buộc.
    if (!Number.isFinite(parsed) || parsed <= 0) return [];
    return [{ variantId: createdVariant.id, amount: String(Math.trunc(parsed)) }];
  });
}
