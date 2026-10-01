import {
  DirectReceiptReason,
  GoodsReceiptCostAllocation,
  GoodsReceiptCostType,
  GoodsReceiptStatus,
  GoodsReceiptType,
  PurchaseOrderStatus,
  SupplierReturnStatus,
  SupplierStatus,
} from '@/generated/api/procurement/procurement.schemas';

export const PROCUREMENT_PAGE_SIZE = 30;

export const supplierStatusOptions = [
  { value: SupplierStatus.ACTIVE, label: 'Đang giao dịch' },
  { value: SupplierStatus.INACTIVE, label: 'Ngừng giao dịch' },
];

export const purchaseOrderStatusOptions = [
  { value: PurchaseOrderStatus.DRAFT, label: 'Nháp' },
  { value: PurchaseOrderStatus.SUBMITTED, label: 'Chờ duyệt' },
  { value: PurchaseOrderStatus.APPROVED, label: 'Đã duyệt' },
  { value: PurchaseOrderStatus.PARTIALLY_RECEIVED, label: 'Nhận một phần' },
  { value: PurchaseOrderStatus.RECEIVED, label: 'Đã nhận đủ' },
  { value: PurchaseOrderStatus.CLOSED, label: 'Đã đóng' },
  { value: PurchaseOrderStatus.CANCELLED, label: 'Đã huỷ' },
];

export const goodsReceiptStatusOptions = [
  { value: GoodsReceiptStatus.DRAFT, label: 'Nháp' },
  { value: GoodsReceiptStatus.POSTED, label: 'Đã ghi sổ' },
  { value: GoodsReceiptStatus.CANCELLED, label: 'Đã huỷ' },
];

export const goodsReceiptTypeOptions = [
  { value: GoodsReceiptType.WITH_PO, label: 'Nhập theo PO' },
  { value: GoodsReceiptType.DIRECT_RECEIPT, label: 'Nhập trực tiếp' },
];

export const supplierReturnStatusOptions = [
  { value: SupplierReturnStatus.DRAFT, label: 'Nháp' },
  { value: SupplierReturnStatus.APPROVED, label: 'Đã duyệt' },
  { value: SupplierReturnStatus.SHIPPED, label: 'Đã xuất trả' },
  { value: SupplierReturnStatus.CLOSED, label: 'Đã đóng' },
  { value: SupplierReturnStatus.CANCELLED, label: 'Đã huỷ' },
];

export const directReceiptReasonOptions = [
  { value: DirectReceiptReason.SPOT_PURCHASE, label: 'Mua phát sinh' },
  { value: DirectReceiptReason.URGENT_PURCHASE, label: 'Mua khẩn cấp' },
  { value: DirectReceiptReason.WARRANTY_REPLACEMENT, label: 'Hàng đổi bảo hành' },
  { value: DirectReceiptReason.SUPPLIER_GIFT, label: 'Nhà cung cấp tặng' },
  { value: DirectReceiptReason.OTHER, label: 'Khác' },
];

export const costAllocationOptions = [
  { value: GoodsReceiptCostAllocation.VALUE, label: 'Theo giá trị hàng' },
  { value: GoodsReceiptCostAllocation.QUANTITY, label: 'Theo số lượng' },
];

export const receiptCostTypeOptions = [
  { value: GoodsReceiptCostType.FREIGHT, label: 'Vận chuyển' },
  { value: GoodsReceiptCostType.HANDLING, label: 'Bốc xếp' },
  { value: GoodsReceiptCostType.DUTY, label: 'Thuế/phí nhập' },
  { value: GoodsReceiptCostType.OTHER, label: 'Chi phí khác' },
];

interface LabelOption {
  value: string;
  label: string;
}

/** Nhãn tiếng Việt của một enum contract; giá trị lạ (contract mới hơn UI) hiển thị nguyên mã. */
export const optionLabel = (options: LabelOption[], value?: string | null, empty = '—'): string =>
  value ? options.find((option) => option.value === value)?.label ?? value : empty;

/** `MÃ · Tên` cho nhà cung cấp, kho và các tham chiếu cùng dạng. */
export const partyLabel = (party: { code: string; name: string }): string => `${party.code} · ${party.name}`;

/**
 * Danh sách lookup chỉ tải trang đầu/bản ghi ACTIVE, nên bản ghi đang sửa có thể không nằm trong đó.
 * Chèn nó lên đầu để Select hiển thị đúng tên thay vì ID trần.
 */
export const withSelectedParty = (
  options: LabelOption[],
  party?: { id: string; code: string; name: string } | null,
): LabelOption[] =>
  party && !options.some((option) => option.value === party.id)
    ? [{ value: party.id, label: partyLabel(party) }, ...options]
    : options;

export const formatDate = (value?: string | null, empty = '—'): string =>
  value ? new Date(value).toLocaleDateString('vi-VN') : empty;

export const formatDateTime = (value?: string | null, empty = '—'): string =>
  value ? new Date(value).toLocaleString('vi-VN') : empty;

/** `Người thực hiện · thời điểm`; `empty` là câu trạng thái khi bước đó chưa xảy ra. */
export const actorAt = (displayName?: string | null, at?: string | null, empty = 'Chưa thực hiện'): string =>
  displayName ? `${displayName}${at ? ` · ${formatDateTime(at)}` : ''}` : empty;

export const statusLabel = (value: string): string =>
  [
    ...supplierStatusOptions,
    ...purchaseOrderStatusOptions,
    ...goodsReceiptStatusOptions,
    ...supplierReturnStatusOptions,
  ].find((option) => option.value === value)?.label ?? value;

export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

