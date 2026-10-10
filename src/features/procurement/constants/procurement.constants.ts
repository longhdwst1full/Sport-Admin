import type { StatusPresentation } from '@/foundation/management/status-tag';
import {
  DirectReceiptReason,
  GoodsReceiptCostAllocation,
  GoodsReceiptCostType,
  GoodsReceiptStatus,
  GoodsReceiptType,
  PurchaseOrderApprovalLevel,
  PurchaseOrderStatus,
  SupplierReturnStatus,
  SupplierStatus,
} from '@/generated/api/procurement/procurement.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import { toOptions } from '@/shared/utils/options';

export const supplierStatusPresentation: Record<SupplierStatus, StatusPresentation> = {
  [SupplierStatus.ACTIVE]: { label: 'Đang giao dịch', color: 'success' },
  [SupplierStatus.INACTIVE]: { label: 'Ngừng giao dịch', color: 'neutral' },
};

export const purchaseOrderStatusPresentation: Record<PurchaseOrderStatus, StatusPresentation> = {
  [PurchaseOrderStatus.DRAFT]: { label: 'Nháp', color: 'neutral' },
  [PurchaseOrderStatus.SUBMITTED]: { label: 'Chờ duyệt', color: 'warning' },
  [PurchaseOrderStatus.APPROVED]: { label: 'Đã duyệt', color: 'info' },
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: { label: 'Nhận một phần', color: 'progress' },
  [PurchaseOrderStatus.RECEIVED]: { label: 'Đã nhận đủ', color: 'success' },
  [PurchaseOrderStatus.CLOSED]: { label: 'Đã đóng', color: 'neutral' },
  [PurchaseOrderStatus.CANCELLED]: { label: 'Đã huỷ', color: 'neutral' },
};

export const goodsReceiptStatusPresentation: Record<GoodsReceiptStatus, StatusPresentation> = {
  [GoodsReceiptStatus.DRAFT]: { label: 'Nháp', color: 'neutral' },
  [GoodsReceiptStatus.POSTED]: { label: 'Đã ghi sổ', color: 'success' },
  [GoodsReceiptStatus.CANCELLED]: { label: 'Đã huỷ', color: 'neutral' },
};

export const supplierReturnStatusPresentation: Record<SupplierReturnStatus, StatusPresentation> = {
  [SupplierReturnStatus.DRAFT]: { label: 'Nháp', color: 'neutral' },
  [SupplierReturnStatus.APPROVED]: { label: 'Đã duyệt', color: 'info' },
  [SupplierReturnStatus.SHIPPED]: { label: 'Đã xuất trả', color: 'progress' },
  [SupplierReturnStatus.CLOSED]: { label: 'Đã đóng', color: 'neutral' },
  [SupplierReturnStatus.CANCELLED]: { label: 'Đã huỷ', color: 'neutral' },
};

export const goodsReceiptTypeLabels: Record<GoodsReceiptType, string> = {
  [GoodsReceiptType.WITH_PO]: 'Nhập theo PO',
  [GoodsReceiptType.DIRECT_RECEIPT]: 'Nhập trực tiếp',
};

export const approvalLevelLabels: Record<PurchaseOrderApprovalLevel, string> = {
  [PurchaseOrderApprovalLevel.BRANCH_MANAGER]: 'Quản lý chi nhánh',
  [PurchaseOrderApprovalLevel.OWNER]: 'Chủ sở hữu',
  [PurchaseOrderApprovalLevel.OWNER_FINANCE]: 'Chủ sở hữu + tài chính',
};

export const directReceiptReasonLabels: Record<DirectReceiptReason, string> = {
  [DirectReceiptReason.SPOT_PURCHASE]: 'Mua phát sinh',
  [DirectReceiptReason.URGENT_PURCHASE]: 'Mua khẩn cấp',
  [DirectReceiptReason.WARRANTY_REPLACEMENT]: 'Hàng đổi bảo hành',
  [DirectReceiptReason.SUPPLIER_GIFT]: 'Nhà cung cấp tặng',
  [DirectReceiptReason.OTHER]: 'Khác',
};

export const costAllocationLabels: Record<GoodsReceiptCostAllocation, string> = {
  [GoodsReceiptCostAllocation.VALUE]: 'Theo giá trị hàng',
  [GoodsReceiptCostAllocation.QUANTITY]: 'Theo số lượng',
};

export const receiptCostTypeLabels: Record<GoodsReceiptCostType, string> = {
  [GoodsReceiptCostType.FREIGHT]: 'Vận chuyển',
  [GoodsReceiptCostType.HANDLING]: 'Bốc xếp',
  [GoodsReceiptCostType.DUTY]: 'Thuế/phí nhập',
  [GoodsReceiptCostType.OTHER]: 'Chi phí khác',
};

export const supplierStatusOptions = toOptions(supplierStatusPresentation);
export const purchaseOrderStatusOptions = toOptions(purchaseOrderStatusPresentation);
export const goodsReceiptStatusOptions = toOptions(goodsReceiptStatusPresentation);
export const supplierReturnStatusOptions = toOptions(supplierReturnStatusPresentation);
export const goodsReceiptTypeOptions = toOptions(goodsReceiptTypeLabels);
export const directReceiptReasonOptions = toOptions(directReceiptReasonLabels);
export const costAllocationOptions = toOptions(costAllocationLabels);
export const receiptCostTypeOptions = toOptions(receiptCostTypeLabels);

interface LabelOption {
  value: string;
  label: string;
}

/** Nhãn tiếng Việt của một enum contract; giá trị lạ (contract mới hơn UI) hiển thị nguyên mã. */
export const enumLabel = <T extends string>(labels: Record<T, string>, value?: T | null, empty = '—'): string =>
  value ? labels[value] ?? value : empty;

/** `MÃ · Tên` cho nhà cung cấp, kho và các tham chiếu cùng dạng. */
export const partyLabel = (party: { code: string; name: string }): string => `${party.code} · ${party.name}`;

/**
 * Danh sách lookup chỉ tải trang đầu/bản ghi ACTIVE, nên bản ghi đang sửa có thể không nằm trong đó.
 * Chèn nó lên đầu để Select hiển thị đúng tên thay vì ID trần.
 */
export const withSelectedOption = (options: LabelOption[], selected?: LabelOption | null): LabelOption[] =>
  selected && !options.some((option) => option.value === selected.value) ? [selected, ...options] : options;

export const withSelectedParty = (
  options: LabelOption[],
  party?: { id: string; code: string; name: string } | null,
): LabelOption[] => withSelectedOption(options, party ? { value: party.id, label: partyLabel(party) } : null);

/** `Người thực hiện · thời điểm`; `empty` là câu trạng thái khi bước đó chưa xảy ra. */
export const actorAt = (displayName?: string | null, at?: string | null, empty = 'Chưa thực hiện'): string =>
  displayName ? `${displayName}${at ? ` · ${formatDateTime(at)}` : ''}` : empty;

/** Số ký tự tối thiểu của lý do huỷ chứng từ (khớp validate của API). */
export const CANCEL_REASON_MIN_LENGTH = 3;
