import { toOptions } from '@/shared/utils/options';

/** Nhãn trạng thái phiếu chuyển kho, dùng chung giữa bảng danh sách và drawer chi tiết. */
export const stockTransferStatusMeta = {
  DRAFT: { label: 'Nháp', color: 'default' },
  SUBMITTED: { label: 'Chờ xuất', color: 'blue' },
  SHIPPED: { label: 'Đang vận chuyển', color: 'orange' },
  RECEIVED: { label: 'Đã nhận', color: 'green' },
  CANCELLED: { label: 'Đã huỷ', color: 'red' },
} as const;

export const stockTransferStatusOptions = toOptions(stockTransferStatusMeta);
