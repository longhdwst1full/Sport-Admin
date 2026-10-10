import type { StatusPresentation } from '@/foundation/management';
import type { StockTransferStatus } from '@/generated/api/inventory/inventory.schemas';
import { toOptions } from '@/shared/utils/options';

/** Nhãn trạng thái phiếu chuyển kho, dùng chung giữa bảng danh sách và drawer chi tiết. */
export const stockTransferStatusMeta: Record<StockTransferStatus, StatusPresentation> = {
  DRAFT: { label: 'Nháp', color: 'neutral' },
  SUBMITTED: { label: 'Chờ xuất', color: 'warning' },
  SHIPPED: { label: 'Đang vận chuyển', color: 'progress' },
  RECEIVED: { label: 'Đã nhận', color: 'success' },
  CANCELLED: { label: 'Đã huỷ', color: 'neutral' },
};

export const stockTransferStatusOptions = toOptions(stockTransferStatusMeta);
