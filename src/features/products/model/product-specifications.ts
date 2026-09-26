import { AttributeDataType, type AttributeDto, type ProductSpecificationDto, type ProductSpecificationInputDto } from '@/generated/api/catalog/catalog.schemas';

/** Một dòng đang sửa: giá trị giữ dạng chuỗi cho ô nhập, chuyển kiểu khi gửi. */
export interface SpecificationRow {
  code: string;
  values: string[];
}

export function toSpecificationRows(specifications: ProductSpecificationDto[]): SpecificationRow[] {
  return specifications.map(({ code, values }) => ({ code, values: values.map(({ value }) => String(value)) }));
}

/**
 * Chuyển các dòng đang sửa về payload API theo kiểu của thuộc tính. Trả lỗi theo dòng thay vì ném, để
 * form hiện đúng chỗ sai; API vẫn kiểm lại toàn bộ (nguồn quyết định duy nhất là Catalog service).
 */
export function toSpecificationPayload(
  rows: SpecificationRow[],
  attributes: AttributeDto[],
): { specifications: ProductSpecificationInputDto[]; errors: string[] } {
  const byCode = new Map(attributes.map((attribute) => [attribute.code, attribute]));
  const errors: string[] = [];
  const specifications: ProductSpecificationInputDto[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const attribute = byCode.get(row.code);
    const at = `Dòng ${index + 1}`;
    if (!attribute) {
      errors.push(`${at}: chọn thuộc tính`);
      return;
    }
    if (seen.has(row.code)) {
      errors.push(`${at}: ${attribute.name} đã có ở dòng khác`);
      return;
    }
    seen.add(row.code);
    const raw = row.values.map((value) => value.trim()).filter(Boolean);
    if (raw.length === 0) {
      errors.push(`${at}: nhập giá trị cho ${attribute.name}`);
      return;
    }
    if (attribute.dataType === AttributeDataType.NUMBER) {
      const numbers = raw.map((value) => Number(value.replace(',', '.')));
      if (numbers.some((value) => !Number.isFinite(value))) {
        errors.push(`${at}: ${attribute.name} chỉ nhận số${attribute.unit ? ` (đơn vị ${attribute.unit})` : ''}`);
        return;
      }
      specifications.push({ code: row.code, values: numbers });
    } else if (attribute.dataType === AttributeDataType.BOOLEAN) {
      specifications.push({ code: row.code, values: [raw[0] === 'true'] });
    } else {
      specifications.push({ code: row.code, values: raw });
    }
  });
  return { specifications, errors };
}
