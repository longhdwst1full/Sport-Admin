import type { StatusPresentation } from '@/foundation/management';
import type { ColumnItem } from '@/foundation/table';
import {
  StockAdjustmentReason,
  StockAdjustmentType,
  type InventoryBalanceDtoStatus,
  type InventoryMovementType,
} from '@/generated/api/inventory/inventory.schemas';
import { toOptions } from '@/shared/utils/options';
import { parseEnum } from '@/shared/utils/parse-enum';

/** Trạng thái dòng tồn do API tính theo điểm đặt lại. */
export const inventoryBalanceStatusPresentation: Record<InventoryBalanceDtoStatus, StatusPresentation> = {
  IN_STOCK: { color: 'success', label: 'Còn hàng' },
  LOW_STOCK: { color: 'warning', label: 'Sắp hết hàng' },
  OUT_OF_STOCK: { color: 'danger', label: 'Hết hàng' },
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
export const movementPresentation: Record<InventoryMovementType, StatusPresentation> = {
  ADJUST: { label: 'Điều chỉnh', color: 'info' },
  RECEIVE: { label: 'Nhập kho', color: 'success' },
  TRANSFER_OUT: { label: 'Chuyển đi', color: 'progress' },
  TRANSFER_IN: { label: 'Chuyển đến', color: 'success' },
  SALE_SHIP: { label: 'Xuất bán', color: 'progress' },
  DELIVERY_RETURN_RESTOCK: { label: 'Nhập lại hàng giao thất bại', color: 'accent' },
  RETURN_RESTOCK: { label: 'Nhập lại hàng khách trả', color: 'accent' },
  SUPPLIER_RETURN: { label: 'Xuất trả nhà cung cấp', color: 'warning' },
};

/**
 * Nhãn loại chứng từ của dòng sổ kho.
 * CONTRACT: `InventoryMovementDto.referenceType` là string thô (chưa có enum trong OpenAPI); giá trị
 * thực lấy từ `INVENTORY_REFERENCE_TYPE` ở API. Mã lạ hiện "Chứng từ khác" thay vì mã tiếng Anh.
 */
const movementReferenceLabels: Record<string, string> = {
  STOCK_ADJUSTMENT: 'Phiếu điều chỉnh',
  STOCK_TRANSFER: 'Phiếu chuyển kho',
  STOCKTAKE: 'Phiếu kiểm kê',
  FULFILLMENT: 'Phiếu giao vận',
  RETURN_REQUEST: 'Yêu cầu đổi trả',
  GOODS_RECEIPT: 'Phiếu nhập hàng',
  SUPPLIER_RETURN: 'Phiếu trả nhà cung cấp',
};

export const movementReferenceLabel = (referenceType: string) =>
  movementReferenceLabels[referenceType] ?? 'Chứng từ khác';

/**
 * Trạng thái phiếu điều chỉnh. CONTRACT: DTO khai `status: string`; API hiện chỉ trả `POSTED`
 * (phiếu ghi sổ ngay khi tạo).
 */
export const adjustmentStatusPresentation: Record<string, StatusPresentation> = {
  POSTED: { label: 'Đã ghi sổ', color: 'success' },
};

export const movementTypeOptions = toOptions(movementPresentation);

/** Nhãn ngắn của loại phiếu điều chỉnh trên danh sách/chi tiết. */
const adjustmentTypeLabel: Record<StockAdjustmentType, string> = {
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

const adjustmentReasonLabel: Record<StockAdjustmentReason, string> = {
  [StockAdjustmentReason.MANUAL]: 'Điều chỉnh thủ công',
  [StockAdjustmentReason.COUNT_CORRECTION]: 'Chênh lệch kiểm kê',
  [StockAdjustmentReason.INITIAL_STOCK]: 'Khởi tạo tồn đầu kỳ',
  [StockAdjustmentReason.EXTERNAL_RECEIPT]: 'Nhập từ chứng từ ngoài',
};

export const adjustmentReasonOptions = toOptions(adjustmentReasonLabel);

/** CONTRACT: DTO phiếu điều chỉnh khai `adjustmentType`/`reasonCode` là string; mã lạ không hiện mã thô. */
export function adjustmentTypeText(code: string): string {
  const type = parseEnum(StockAdjustmentType, code);
  return type ? adjustmentTypeLabel[type] : 'Loại khác';
}

export function adjustmentReasonText(code: string): string {
  const reason = parseEnum(StockAdjustmentReason, code);
  return reason ? adjustmentReasonLabel[reason] : 'Nguyên nhân khác';
}
