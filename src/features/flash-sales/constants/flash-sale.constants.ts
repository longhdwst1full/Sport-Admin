import { moneyFormatter } from '@/lib/format/money';
import { toOptions } from '@/shared/utils/options';

export const FLASH_SALE_PAGE_SIZE = 20;

/** Nhãn tách khỏi mã trạng thái (`08-enums-constants.md`). */
export const flashSaleStatusPresentation: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Nháp', color: 'default' },
  SCHEDULED: { label: 'Đã lên lịch', color: 'processing' },
  ACTIVE: { label: 'Đang chạy', color: 'success' },
  ENDED: { label: 'Đã kết thúc', color: 'default' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
};

export const flashSaleStatusOptions = toOptions(flashSaleStatusPresentation);

/**
 * State machine bản sao phía FE để chỉ hiện đúng nút hợp lệ.
 * Backend vẫn là nơi quyết định cuối cùng — đây chỉ là UX.
 */
export const FLASH_SALE_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['ACTIVE', 'DRAFT', 'CANCELLED'],
  ACTIVE: ['ENDED', 'CANCELLED'],
  ENDED: [],
  CANCELLED: [],
};

export { moneyFormatter };

export type PricingMode = 'PERCENT_LIST' | 'PER_ITEM';

export const pricingModeOptions = toOptions<PricingMode>({
  PER_ITEM: 'Giá từng sản phẩm',
  PERCENT_LIST: 'Giảm % cho cả danh sách',
});

/** Nhãn SKU trong ô chọn suất bán: kèm giá hiện tại nếu có để người đặt giá flash so sánh. */
export function variantOptionLabel(item: { code: string; label: string; priceAmount?: string | null }) {
  return item.priceAmount
    ? `${item.code} — ${item.label} · ${moneyFormatter.format(Number(item.priceAmount))}`
    : `${item.code} — ${item.label}`;
}

/**
 * Giá flash tính theo phần trăm, làm tròn xuống để khách không bao giờ phải trả
 * cao hơn mức đã công bố.
 */
export function applyPercent(basePrice: number, percent: number): number {
  return Math.max(1, Math.floor((basePrice * (100 - percent)) / 100));
}
