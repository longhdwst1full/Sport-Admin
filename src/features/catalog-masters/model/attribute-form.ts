import { AttributeDataType, type CreateAttributeDto } from '@/generated/api/catalog/models';

export const ATTRIBUTE_TYPE_LABEL: Record<AttributeDataType, string> = {
  [AttributeDataType.TEXT]: 'Chữ',
  [AttributeDataType.NUMBER]: 'Số (có đơn vị)',
  [AttributeDataType.BOOLEAN]: 'Có / Không',
  [AttributeDataType.OPTION]: 'Chọn từ danh sách',
};

export interface AttributeFormValues {
  code: string;
  name: string;
  dataType: AttributeDataType;
  unit?: string;
  isVariantAxis: boolean;
  sortOrder: number;
  options: Array<{ code: string; label: string; colorHex?: string }>;
}

/** Chỉ gửi đơn vị với NUMBER và danh sách lựa chọn với OPTION — API từ chối lựa chọn ở kiểu khác. */
export function toAttributePayload(values: AttributeFormValues): CreateAttributeDto {
  const unit = values.dataType === AttributeDataType.NUMBER ? values.unit?.trim() : undefined;
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    dataType: values.dataType,
    ...(unit ? { unit } : {}),
    isVariantAxis: values.isVariantAxis,
    sortOrder: values.sortOrder,
    ...(values.dataType === AttributeDataType.OPTION
      ? {
          options: values.options.map(({ code, label, colorHex }) => ({
            code: code.trim().toUpperCase(),
            label: label.trim(),
            ...(colorHex?.trim() ? { colorHex: colorHex.trim() } : {}),
          })),
        }
      : {}),
  };
}
