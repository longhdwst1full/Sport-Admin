import type { CreateVariantDto, ProductVariantDto, UpdateVariantDto } from '@/generated/api/catalog/catalog.schemas';

/**
 * Ô metadata của một SKU dùng chung cho form Tạo sản phẩm, thêm SKU sau tạo và sửa SKU.
 *
 * CONTRACT: SKU và barcode luôn do API sinh (SKU 8 ký tự, barcode EAN-13 nội bộ đầu '2') khi lệnh tạo
 * không gửi chúng; admin không có ô nhập và không gửi hai trường này. SKU bất biến sau khi tạo.
 */
export interface VariantFieldValues {
  name: string;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
}

export interface VariantEditValues {
  name: string;
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
}

/** Form → payload thêm SKU; không gửi `sku`/`barcode` để API tự sinh, ô kích thước trống bỏ khỏi payload. */
export const toCreateVariantDto = (values: VariantFieldValues): CreateVariantDto => ({
  name: values.name.trim(),
  weightGrams: values.weightGrams ?? 0,
  ...(values.lengthMm === undefined ? {} : { lengthMm: values.lengthMm }),
  ...(values.widthMm === undefined ? {} : { widthMm: values.widthMm }),
  ...(values.heightMm === undefined ? {} : { heightMm: values.heightMm }),
});

export const toVariantEditValues = (variant: ProductVariantDto): VariantEditValues => ({
  name: variant.name,
  weightGrams: variant.weightGrams,
  lengthMm: variant.lengthMm ?? undefined,
  widthMm: variant.widthMm ?? undefined,
  heightMm: variant.heightMm ?? undefined,
});

export const toUpdateVariantDto = (
  values: VariantEditValues,
  expectedVersion: number,
): UpdateVariantDto => ({
  // CONTRACT: không gửi `barcode` — barcode do hệ thống sinh, PATCH bỏ trường này thì giữ nguyên.
  name: values.name.trim(),
  weightGrams: values.weightGrams,
  lengthMm: values.lengthMm ?? null,
  widthMm: values.widthMm ?? null,
  heightMm: values.heightMm ?? null,
  expectedVersion,
});
