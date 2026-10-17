import type { PosCatalogItemDto, PosOrderItemDto } from '@/generated/api/orders/orders.schemas';

/**
 * Dòng hàng trên màn quầy. Giữ giá dưới dạng số để cộng tổng hiển thị, nhưng số tiền
 * cuối cùng luôn do Backend tính lại khi tạo đơn — màn này không phải nguồn giá.
 */
export interface PosCartLine {
  variantId: string;
  sku: string;
  name: string;
  /** Thumbnail nhận diện tại quầy; null khi sản phẩm chưa có ảnh. */
  imageUrl: string | null;
  /** null khi biến thể chưa có bảng giá hiệu lực; không cho bán cho tới khi có giá. */
  unitPrice: number | null;
  quantity: number;
  isBundle: boolean;
  /** Thành phần combo, hiển thị để nhân viên biết đang bán gì. Rỗng với hàng lẻ. */
  components: Array<{ sku: string; name: string; quantity: number }>;
  /**
   * Tồn khả dụng lúc chọn hàng. Là ảnh chụp, không phải chỗ đã giữ: Backend vẫn kiểm
   * lại khi tạo đơn, nên đây chỉ để cảnh báo sớm cho nhân viên.
   */
  availableQuantity: number;
  /**
   * Giá flash sale đang chạy; `null` khi không có chương trình, hoặc khi Backend đã báo suất vừa
   * hết và dòng này quay về giá gốc.
   */
  flashPrice: number | null;
  /** Số suất còn lại lúc chọn hàng. Ảnh chụp như `availableQuantity`, không phải chỗ đã giữ. */
  flashSaleAvailableQuantity: number | null;
}

/**
 * Số lượng của dòng được giá flash: tối đa bằng số suất còn lại.
 *
 * INVARIANT (khớp `PosOrderService.buildCheckout`, cùng luật checkout web): vượt suất thì phần trong
 * suất giá flash, phần dư giá gốc — đơn có hai dòng. Trước đây màn này hiện giá flash cho cả dòng,
 * nhân viên đọc cho khách con số thấp hơn số Backend thu.
 */
export function flashQuantity(line: PosCartLine): number {
  if (line.flashPrice == null) return 0;
  return Math.min(line.quantity, Math.max(line.flashSaleAvailableQuantity ?? 0, 0));
}

/**
 * Đơn giá hiển thị: giá flash khi có ít nhất một sản phẩm hưởng giá flash, không thì giá gốc. Thành tiền
 * tách phần dư theo giá gốc ở `lineTotal`.
 *
 * Màn này KHÔNG phải nguồn giá — Backend chốt lại lúc tạo đơn. Nhưng con số hiện ở đây là con số
 * nhân viên đọc cho khách, nên nó phải bằng con số Backend sẽ tính.
 */
export function effectivePrice(line: PosCartLine): number | null {
  return flashQuantity(line) > 0 ? line.flashPrice : line.unitPrice;
}

function toCartLine(item: PosCatalogItemDto): PosCartLine {
  const price = item.unitPrice == null ? null : Number(item.unitPrice);
  return {
    variantId: item.id,
    sku: item.sku,
    name: item.name,
    imageUrl: item.imageUrl,
    unitPrice: price == null || Number.isNaN(price) ? null : price,
    quantity: 1,
    isBundle: item.isBundle,
    components: item.components.map((component) => ({
      sku: component.sku,
      name: component.name,
      quantity: component.quantity,
    })),
    availableQuantity: item.availableQuantity,
    flashPrice: toPrice(item.flashPrice),
    flashSaleAvailableQuantity: item.flashSaleAvailableQuantity,
  };
}

/** Tiền về từ API là chuỗi thập phân để không mất chính xác; đổi sang số chỉ để hiển thị/cộng. */
function toPrice(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function addLine(lines: PosCartLine[], item: PosCatalogItemDto): PosCartLine[] {
  const existing = lines.find((line) => line.variantId === item.id);
  if (!existing) return [...lines, toCartLine(item)];
  // Không cho vượt tồn ngay khi bấm: Backend sẽ từ chối cả đơn chứ không cắt bớt dòng.
  const quantity = Math.min(existing.quantity + 1, Math.max(item.availableQuantity, 1));
  return lines.map((line) =>
    line.variantId === item.id
      ? {
          ...line,
          quantity,
          availableQuantity: item.availableQuantity,
          flashPrice: toPrice(item.flashPrice),
          flashSaleAvailableQuantity: item.flashSaleAvailableQuantity,
        }
      : line,
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
  if (line.unitPrice == null) return 0;
  const flash = flashQuantity(line);
  return flash * (line.flashPrice ?? line.unitPrice) + (line.quantity - flash) * line.unitPrice;
}

/**
 * Bỏ giá flash của những dòng Backend vừa báo là hết suất, để màn hình hiện đúng giá sẽ thu.
 *
 * `variantIds` rỗng nghĩa là Backend không xác định được dòng nào — bỏ giá flash của tất cả, vì
 * hiện sai một dòng giá thấp hơn thực thu còn tệ hơn là để nhân viên xem lại nhiều dòng.
 */
export function dropFlashPrice(lines: PosCartLine[], variantIds: string[]): PosCartLine[] {
  return lines.map((line) =>
    variantIds.length === 0 || variantIds.includes(line.variantId)
      ? { ...line, flashPrice: null, flashSaleAvailableQuantity: null }
      : line,
  );
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

/** Dòng đã đặt quá tồn khả dụng lúc chọn hàng. */
export function linesOverStock(lines: PosCartLine[]): PosCartLine[] {
  return lines.filter((line) => line.quantity > line.availableQuantity);
}

export function toOrderItems(lines: PosCartLine[]): PosOrderItemDto[] {
  return lines.map((line) => ({ productVariantId: line.variantId, quantity: line.quantity }));
}
