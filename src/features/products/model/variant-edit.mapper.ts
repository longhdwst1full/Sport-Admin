import type { CreateVariantDto, ProductVariantDto, UpdateVariantDto } from '@/generated/api/catalog/catalog.schemas';

/** Ô metadata của một SKU dùng chung cho form Tạo sản phẩm, thêm SKU sau tạo và sửa SKU. */
export interface VariantFieldValues {
  name: string;
  /** Mã hàng của cửa hàng; bỏ trống thì API tự sinh. Không sửa được sau khi tạo. */
  sku?: string;
  barcode?: string;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
}

export interface VariantEditValues {
  name: string;
  barcode: string;
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
}

const optionalText = (value?: string): string | undefined => value?.trim() || undefined;

/** Form → payload thêm SKU; ô trống bỏ hẳn khỏi payload để API dùng mặc định (SKU tự sinh). */
export const toCreateVariantDto = (values: VariantFieldValues): CreateVariantDto => {
  const sku = optionalText(values.sku)?.toUpperCase();
  const barcode = optionalText(values.barcode);
  return {
    name: values.name.trim(),
    ...(sku ? { sku } : {}),
    ...(barcode ? { barcode } : {}),
    weightGrams: values.weightGrams ?? 0,
    ...(values.lengthMm === undefined ? {} : { lengthMm: values.lengthMm }),
    ...(values.widthMm === undefined ? {} : { widthMm: values.widthMm }),
    ...(values.heightMm === undefined ? {} : { heightMm: values.heightMm }),
  };
};

export const toVariantEditValues = (variant: ProductVariantDto): VariantEditValues => ({
  name: variant.name,
  barcode: variant.barcode ?? '',
  weightGrams: variant.weightGrams,
  lengthMm: variant.lengthMm ?? undefined,
  widthMm: variant.widthMm ?? undefined,
  heightMm: variant.heightMm ?? undefined,
});

export const toUpdateVariantDto = (
  values: VariantEditValues,
  expectedVersion: number,
): UpdateVariantDto => ({
  name: values.name.trim(),
  barcode: values.barcode.trim() || null,
  weightGrams: values.weightGrams,
  lengthMm: values.lengthMm ?? null,
  widthMm: values.widthMm ?? null,
  heightMm: values.heightMm ?? null,
  expectedVersion,
});
