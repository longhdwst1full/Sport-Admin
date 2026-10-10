import type { StatusPresentation } from '@/foundation/management';
import type { StocktakeStatus } from '@/generated/api/inventory/inventory.schemas';
import { toOptions } from '@/shared/utils/options';

/**
 * Nhãn hiển thị dùng chung giữa bảng danh sách và drawer chi tiết phiếu kiểm kê. Tone theo nghĩa
 * nghiệp vụ: `DRAFT` ở đây là đang đếm (progress), `APPROVED` là đã ghi sổ (success).
 */
export const stocktakeStatusMeta: Record<StocktakeStatus, StatusPresentation> = {
  DRAFT: { label: 'Đang đếm', color: 'progress' },
  SUBMITTED: { label: 'Chờ duyệt', color: 'warning' },
  APPROVED: { label: 'Đã ghi sổ', color: 'success' },
  CANCELLED: { label: 'Đã huỷ', color: 'neutral' },
};

export const stocktakeStatusOptions = toOptions(stocktakeStatusMeta);

export const stocktakeScopeLabel = {
  FULL: 'Toàn kho',
  SKU_LIST: 'Theo SKU',
} as const;

export { formatDateTime as formatStocktakeTime } from '@/lib/format/datetime';
