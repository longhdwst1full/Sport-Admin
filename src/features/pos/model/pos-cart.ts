import type { ActiveLookupOptionDto } from '@/generated/api/catalog/models';
import type { PosOrderItemDto } from '@/generated/api/orders/models';

/**
 * Dòng hàng trên màn quầy. Giữ giá dưới dạng số để cộng tổng hiển thị, nhưng số tiền
 * cuối cùng luôn do Backend tính lại khi tạo đơn — màn này không phải nguồn giá.
 */
export interface PosCartLine {
  variantId: string;
  sku: string;
  name: string;
  /** null khi biến thể chưa có bảng giá hiệu lực; không cho bán cho tới khi có giá. */
  unitPrice: number | null;
  quantity: number;
}

export function toCartLine(option: ActiveLookupOptionDto): PosCartLine {
  const price = option.priceAmount == null ? null : Number(option.priceAmount);
  return {
    variantId: option.id,
    sku: option.code,
    name: option.label,
    unitPrice: price == null || Number.isNaN(price) ? null : price,
    quantity: 1,
  };
}

export function addLine(lines: PosCartLine[], option: ActiveLookupOptionDto): PosCartLine[] {
  const existing = lines.find((line) => line.variantId === option.id);
  if (!existing) return [...lines, toCartLine(option)];
  return lines.map((line) =>
    line.variantId === option.id ? { ...line, quantity: line.quantity + 1 } : line,
  );
}

export function setQuantity(
  lines: PosCartLine[],
  variantId: string,
  quantity: number,
): PosCartLine[] {
  if (quantity < 1) return removeLine(lines, variantId);
  return lines.map((line) => (line.variantId === variantId ? { ...line, quantity } : line));
}

export function removeLine(lines: PosCartLine[], variantId: string): PosCartLine[] {
  return lines.filter((line) => line.variantId !== variantId);
}

export function lineTotal(line: PosCartLine): number {
  return line.unitPrice == null ? 0 : line.unitPrice * line.quantity;
}

export function cartTotal(lines: PosCartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function cartQuantity(lines: PosCartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Biến thể chưa có giá thì không gửi lên được — Backend sẽ từ chối cả đơn. */
export function linesWithoutPrice(lines: PosCartLine[]): PosCartLine[] {
  return lines.filter((line) => line.unitPrice == null);
}

export function toOrderItems(lines: PosCartLine[]): PosOrderItemDto[] {
  return lines.map((line) => ({ productVariantId: line.variantId, quantity: line.quantity }));
}
