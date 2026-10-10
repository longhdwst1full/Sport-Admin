import type { StatusPresentation } from '@/foundation/management';
import type { FlashSaleCampaignStatus } from '@/generated/api/promotions/promotions.schemas';
import { moneyFormatter } from '@/lib/format/money';
import { toOptions } from '@/shared/utils/options';

/** Nhãn tách khỏi mã trạng thái (`08-enums-constants.md`). */
export const flashSaleStatusPresentation: Record<FlashSaleCampaignStatus, StatusPresentation> = {
  DRAFT: { label: 'Nháp', color: 'neutral' },
  SCHEDULED: { label: 'Đã lên lịch', color: 'info' },
  ACTIVE: { label: 'Đang chạy', color: 'success' },
  ENDED: { label: 'Đã kết thúc', color: 'neutral' },
  CANCELLED: { label: 'Đã huỷ', color: 'neutral' },
};

export const flashSaleStatusOptions = toOptions(flashSaleStatusPresentation);

/**
 * State machine bản sao phía FE để chỉ hiện đúng nút hợp lệ.
 * Backend vẫn là nơi quyết định cuối cùng — đây chỉ là UX.
 */
export const FLASH_SALE_TRANSITIONS: Record<FlashSaleCampaignStatus, readonly FlashSaleCampaignStatus[]> = {
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
