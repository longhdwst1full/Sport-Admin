export const FLASH_SALE_PAGE_SIZE = 20;

/** Nhãn tách khỏi mã trạng thái (`08-enums-constants.md`). */
export const flashSaleStatusPresentation: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Nháp', color: 'default' },
  SCHEDULED: { label: 'Đã lên lịch', color: 'processing' },
  ACTIVE: { label: 'Đang chạy', color: 'success' },
  ENDED: { label: 'Đã kết thúc', color: 'default' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
};

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

export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
