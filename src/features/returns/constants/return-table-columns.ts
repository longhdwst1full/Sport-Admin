import type {
  RefundDto,
  ReturnEligibilityLineDto,
  ReturnItemDto,
  ReturnSummaryDto,
} from '@/generated/api/returns/models';

/**
 * Cấu hình cột của các bảng trong feature Đổi trả, theo khuôn `*-table-columns.ts` của admin-client:
 * tên, độ rộng và vị trí cố định nằm ở một chỗ; component chỉ ghép thêm hàm render.
 *
 * `id` bám theo tên field của DTO sinh từ contract (hoặc id riêng cho cột ghép/thao tác), nên đổi
 * tên field ở API làm lỗi compile ngay tại đây thay vì cột âm thầm trống.
 */
export interface ReturnTableColumnConfig<TId extends string> {
  id: TId;
  label: string;
  width?: number;
  fixed?: 'left' | 'right';
}

export type ReturnListColumnId = keyof ReturnSummaryDto | 'action';

export const RETURN_LIST_TABLE_COLUMNS: ReturnTableColumnConfig<ReturnListColumnId>[] = [
  { id: 'returnNo', label: 'Mã phiếu', width: 200, fixed: 'left' },
  { id: 'orderNo', label: 'Đơn hàng', width: 180 },
  { id: 'recipientName', label: 'Khách', width: 180 },
  { id: 'reasonCode', label: 'Lý do', width: 150 },
  { id: 'itemCount', label: 'Số dòng', width: 90 },
  { id: 'status', label: 'Trạng thái', width: 150 },
  { id: 'createdAt', label: 'Tạo lúc', width: 170 },
  { id: 'action', label: '', width: 72, fixed: 'right' },
];

export type ReturnItemColumnId = keyof ReturnItemDto | 'product' | 'inspection';

export const RETURN_ITEM_TABLE_COLUMNS: ReturnTableColumnConfig<ReturnItemColumnId>[] = [
  { id: 'product', label: 'Sản phẩm' },
  { id: 'quantity', label: 'SL', width: 56 },
  { id: 'unitPrice', label: 'Đơn giá', width: 120 },
  { id: 'inspection', label: 'Kết quả kiểm', width: 200 },
  { id: 'refundCap', label: 'Trần hoàn', width: 120 },
];

export type RefundColumnId = keyof RefundDto | 'reconciliation';

export const REFUND_TABLE_COLUMNS: ReturnTableColumnConfig<RefundColumnId>[] = [
  { id: 'refundNo', label: 'Mã', width: 190 },
  { id: 'method', label: 'Phương thức', width: 120 },
  { id: 'amount', label: 'Số tiền', width: 120 },
  { id: 'status', label: 'Trạng thái', width: 150 },
  { id: 'reconciliation', label: 'Đối chiếu' },
];

export type InspectionColumnId = keyof ReturnItemDto | 'product' | 'disposition' | 'note';

export const INSPECTION_TABLE_COLUMNS: ReturnTableColumnConfig<InspectionColumnId>[] = [
  { id: 'product', label: 'Sản phẩm' },
  { id: 'quantity', label: 'SL', width: 56 },
  { id: 'condition', label: 'Tình trạng', width: 170 },
  { id: 'disposition', label: 'Xử lý', width: 190 },
  { id: 'note', label: 'Ghi chú', width: 180 },
];

export type CreateReturnColumnId = keyof ReturnEligibilityLineDto | 'product' | 'requestedQuantity';

export const CREATE_RETURN_TABLE_COLUMNS: ReturnTableColumnConfig<CreateReturnColumnId>[] = [
  { id: 'product', label: 'Sản phẩm' },
  { id: 'purchasedQuantity', label: 'Đã mua', width: 80 },
  { id: 'returnableQuantity', label: 'Còn trả được', width: 110 },
  { id: 'requestedQuantity', label: 'Số trả', width: 130 },
];
