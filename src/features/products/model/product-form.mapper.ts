import type {
  CreateProductDto,
  ProductType,
  CreateProductVariantDto,
  ProductDetailDto,
  ProductSpecificationInputDto,
  UpdateProductDto,
} from '@/generated/api/catalog/catalog.schemas';
import { toInitialPriceAmount } from './product-initial-setup';
import { toSpecificationRows, type SpecificationRow } from './product-specifications';
import { toCreateVariantDto, toVariantEditValues, type VariantFieldValues } from './variant-edit.mapper';

export interface ProductVariantFormValues extends VariantFieldValues {
  openingQuantity: number;
  /** Giá bán đã gồm VAT, nhập ngay ở màn tạo; gửi kèm lệnh tạo (cùng transaction với SKU). */
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
  /** Ảnh tải lên ngay ở màn tạo; gửi kèm lệnh tạo, ảnh đầu danh sách là ảnh chính. */
  images: Array<{ assetId: string; url: string }>;
  /**
   * Thông số kỹ thuật dạng dòng đang sửa; chuyển kiểu theo từ điển thuộc tính lúc gửi
   * (`toSpecificationPayload`). Tạo và Sửa đều lưu cùng nút chính.
   */
  specifications: SpecificationRow[];
  variants: ProductVariantFormValues[];
}

export const emptyVariant = (): ProductVariantFormValues => ({
  name: '',
  weightGrams: 0,
  lengthMm: undefined,
  widthMm: undefined,
  heightMm: undefined,
  openingQuantity: 0,
  price: '',
});

const optionalText = (value?: string): string | undefined => value?.trim() || undefined;

const toCreateProductVariantDto = (
  variant: ProductVariantFormValues,
  includePrices: boolean,
): CreateProductVariantDto => {
  const initialPriceAmount = includePrices ? toInitialPriceAmount(variant.price) : undefined;
  return { ...toCreateVariantDto(variant), ...(initialPriceAmount ? { initialPriceAmount } : {}) };
};

/**
 * `includePrices` chỉ bật khi tài khoản có `catalog.price.manage`: API trả 403 cho CẢ lệnh tạo nếu gửi
 * giá mà thiếu quyền, nên không có quyền thì tạo sản phẩm không kèm giá.
 */
export const toCreateProductDto = (
  values: ProductFormValues,
  {
    includePrices = true,
    specifications = [],
  }: { includePrices?: boolean; specifications?: ProductSpecificationInputDto[] } = {},
): CreateProductDto => ({
  productType: values.productType,
  name: values.name.trim(),
  ...(values.brandId ? { brandId: values.brandId } : {}),
  ...(optionalText(values.shortDescription)
    ? { shortDescription: optionalText(values.shortDescription) }
    : {}),
  ...(optionalText(values.description) ? { description: optionalText(values.description) } : {}),
  categoryIds: values.categoryIds,
  primaryCategoryId: values.primaryCategoryId,
  variants: values.variants.map((variant) => toCreateProductVariantDto(variant, includePrices)),
  ...(values.images.length > 0
    ? { media: values.images.map(({ assetId }) => ({ mediaAssetId: assetId })) }
    : {}),
  ...(specifications.length > 0 ? { specifications } : {}),
});

/**
 * `specifications` chỉ truyền khi người dùng đã sửa thông số: API ghi đè cả bộ khi có trường này, còn
 * bỏ trống thì giữ nguyên — không gửi lại bộ cũ chỉ vì form có sẵn nó.
 */
export const toUpdateProductDto = (
  values: ProductFormValues,
  product: ProductDetailDto,
  specifications?: ProductSpecificationInputDto[],
): UpdateProductDto => ({
  productType: values.productType,
  name: values.name.trim(),
  brandId: values.brandId ?? null,
  shortDescription: optionalText(values.shortDescription) ?? null,
  description: optionalText(values.description) ?? null,
  categoryIds: values.categoryIds,
  primaryCategoryId: values.primaryCategoryId,
  ...(specifications ? { specifications } : {}),
  expectedVersion: product.version,
});

export const toProductFormValues = (
  product: ProductDetailDto,
): ProductFormValues => {
  const variants = product.variants.map((variant) => ({ ...toVariantEditValues(variant), openingQuantity: 0 }));
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
    specifications: toSpecificationRows(product.specifications),
    // Edit metadata không gửi variants. Placeholder chỉ giúp record cũ chưa có SKU vẫn qua
    // validation của form dùng chung; không tạo SKU ngầm trong update payload.
    variants: variants.length > 0 ? variants : [emptyVariant()],
  };
};
