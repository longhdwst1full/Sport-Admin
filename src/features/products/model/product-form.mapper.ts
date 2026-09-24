import type {
  CreateProductDto,
  ProductType,
  CreateVariantDto,
  ProductDetailDto,
  UpdateProductDto,
} from '@/generated/api/catalog/models';

export interface ProductVariantFormValues {
  name: string;
  barcode?: string;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  openingQuantity: number;
  /** Giá bán đã gồm VAT, nhập ngay ở màn tạo; tạo bản giá sau khi có SKU thật. */
  price?: string;
}

export interface ProductFormValues {
  productType: ProductType;
  name: string;
  brandId?: string;
  categoryIds: string[];
  primaryCategoryId: string;
  shortDescription?: string;
  description?: string;
  initialBranchId?: string;
  initialWarehouseCode?: string;
  /**
   * Ảnh tải lên ngay ở màn tạo; gắn vào sản phẩm sau khi tạo xong vì API gắn ảnh cần productId.
   * Ảnh đầu danh sách là ảnh chính.
   */
  images: Array<{ assetId: string; url: string }>;
  variants: ProductVariantFormValues[];
}

export const emptyVariant = (): ProductVariantFormValues => ({
  name: '',
  barcode: '',
  weightGrams: 0,
  lengthMm: undefined,
  widthMm: undefined,
  heightMm: undefined,
  openingQuantity: 0,
  price: '',
});

const optionalText = (value?: string): string | undefined => value?.trim() || undefined;

const toCreateVariantDto = (variant: ProductVariantFormValues): CreateVariantDto => ({
  name: variant.name.trim(),
  ...(optionalText(variant.barcode) ? { barcode: optionalText(variant.barcode) } : {}),
  weightGrams: variant.weightGrams ?? 0,
  ...(variant.lengthMm === undefined ? {} : { lengthMm: variant.lengthMm }),
  ...(variant.widthMm === undefined ? {} : { widthMm: variant.widthMm }),
  ...(variant.heightMm === undefined ? {} : { heightMm: variant.heightMm }),
});

export const toCreateProductDto = (values: ProductFormValues): CreateProductDto => ({
  productType: values.productType,
  name: values.name.trim(),
  ...(values.brandId ? { brandId: values.brandId } : {}),
  ...(optionalText(values.shortDescription)
    ? { shortDescription: optionalText(values.shortDescription) }
    : {}),
  ...(optionalText(values.description) ? { description: optionalText(values.description) } : {}),
  categoryIds: values.categoryIds,
  primaryCategoryId: values.primaryCategoryId,
  variants: values.variants.map(toCreateVariantDto),
});

export const toUpdateProductDto = (
  values: ProductFormValues,
  product: ProductDetailDto,
): UpdateProductDto => ({
  productType: values.productType,
  name: values.name.trim(),
  brandId: values.brandId ?? null,
  shortDescription: optionalText(values.shortDescription) ?? null,
  description: optionalText(values.description) ?? null,
  categoryIds: values.categoryIds,
  primaryCategoryId: values.primaryCategoryId,
  expectedVersion: product.version,
});

export const toProductFormValues = (
  product: ProductDetailDto,
): ProductFormValues => {
  const variants = product.variants.map((variant) => ({
    name: variant.name,
    barcode: variant.barcode ?? '',
    weightGrams: variant.weightGrams,
    lengthMm: variant.lengthMm ?? undefined,
    widthMm: variant.widthMm ?? undefined,
    heightMm: variant.heightMm ?? undefined,
    openingQuantity: 0,
  }));
  return {
    productType: product.productType,
    name: product.name,
    brandId: product.brandId ?? undefined,
    categoryIds: product.categoryIds,
    primaryCategoryId: product.primaryCategoryId ?? product.categoryIds[0] ?? '',
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    initialBranchId: undefined,
    initialWarehouseCode: undefined,
    // Ở chế độ sửa, ảnh do `ProductMediaPanel` quản lý trực tiếp qua API media, không đi qua form.
    images: [],
    // Edit metadata không gửi variants. Placeholder chỉ giúp record cũ chưa có SKU vẫn qua
    // validation của form dùng chung; không tạo SKU ngầm trong update payload.
    variants: variants.length > 0 ? variants : [emptyVariant()],
  };
};
