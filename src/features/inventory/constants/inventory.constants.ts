import type { ColumnItem } from '@/foundation/table';
import {
  StockAdjustmentReason,
  StockAdjustmentType,
  type InventoryMovementType,
} from '@/generated/api/inventory/inventory.schemas';
import { toOptions } from '@/shared/utils/options';

/** Trạng thái dòng tồn do API tính theo điểm đặt lại. */
export const inventoryBalanceStatusPresentation = {
  IN_STOCK: { color: 'green', label: 'Còn hàng' },
  LOW_STOCK: { color: 'orange', label: 'Sắp hết hàng' },
  OUT_OF_STOCK: { color: 'red', label: 'Hết hàng' },
};

/** Cột tuỳ chỉnh được của bảng tồn; `id` trùng `key` cột trong `InventoryBalancePanel`. */
export const BALANCE_COLUMN_ITEMS: ColumnItem[] = [
  { id: 'sku', label: 'Sản phẩm / SKU', fixed: true },
  { id: 'warehouse', label: 'Kho hàng' },
  { id: 'onHand', label: 'Tồn vật lý' },
  { id: 'reserved', label: 'Đang giữ chỗ' },
  { id: 'available', label: 'Có thể bán' },
  { id: 'reorderPoint', label: 'Điểm đặt lại' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'actions', label: 'Thao tác', fixed: true },
];

// Khai theo enum sinh từ contract: backend thêm loại movement mà quên nhãn thì compile báo lỗi.
export const movementPresentation: Record<InventoryMovementType, { label: string; color: string }> =
  {
    ADJUST: { label: 'Điều chỉnh', color: 'blue' },
    RECEIVE: { label: 'Nhập kho', color: 'green' },
    TRANSFER_OUT: { label: 'Chuyển đi', color: 'orange' },
    TRANSFER_IN: { label: 'Chuyển đến', color: 'green' },
    SALE_SHIP: { label: 'Xuất bán', color: 'purple' },
    DELIVERY_RETURN_RESTOCK: { label: 'Nhập lại hàng giao thất bại', color: 'gold' },
    RETURN_RESTOCK: { label: 'Nhập lại hàng khách trả', color: 'cyan' },
    SUPPLIER_RETURN: { label: 'Xuất trả nhà cung cấp', color: 'magenta' },
  };

export const movementTypeOptions = toOptions(movementPresentation);

/** Nhãn ngắn của loại phiếu điều chỉnh trên danh sách/chi tiết. */
export const adjustmentTypeLabel: Record<string, string> = {
  CORRECTION: 'Điều chỉnh',
  OPENING_BALANCE: 'Tồn đầu kỳ',
  MANUAL_RECEIPT: 'Nhập thủ công',
};

/** Nhãn đầy đủ khi chọn loại phiếu trong form tạo điều chỉnh. */
export const adjustmentTypeOptions = toOptions<StockAdjustmentType>({
  [StockAdjustmentType.CORRECTION]: 'Điều chỉnh chênh lệch',
  [StockAdjustmentType.OPENING_BALANCE]: 'Nhập tồn đầu kỳ',
  [StockAdjustmentType.MANUAL_RECEIPT]: 'Nhập hàng thủ công',
});

export const adjustmentReasonOptions = toOptions<StockAdjustmentReason>({
  [StockAdjustmentReason.MANUAL]: 'Điều chỉnh thủ công',
  [StockAdjustmentReason.COUNT_CORRECTION]: 'Chênh lệch kiểm kê',
  [StockAdjustmentReason.INITIAL_STOCK]: 'Khởi tạo tồn đầu kỳ',
  [StockAdjustmentReason.EXTERNAL_RECEIPT]: 'Nhập từ chứng từ ngoài',
});
