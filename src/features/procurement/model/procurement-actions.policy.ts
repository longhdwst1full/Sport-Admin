import {
  GoodsReceiptStatus,
  PurchaseOrderApprovalLevel,
  PurchaseOrderStatus,
  SupplierReturnStatus,
} from '@/generated/api/procurement/procurement.schemas';

export type ProcurementAction =
  | 'edit'
  | 'submit'
  | 'approve'
  | 'approveFinance'
  | 'post'
  | 'ship'
  | 'close'
  | 'cancel';

export interface PurchaseOrderActionInput {
  status: string;
  approvalLevel?: string | null;
  /** Chỉ có ở detail; list không trả nên coi như chưa ai duyệt. */
  approvals?: { approvedBy?: unknown | null };
}

/**
 * Lifecycle chỉ quyết định affordance; API vẫn kiểm tra quyền, maker-checker, scope và version.
 * SUBMITTED tách hai bước duyệt: PO cấp OWNER_FINANCE cần Owner duyệt trước rồi mới tới tài chính,
 * nên không bao giờ hiện đồng thời hai nút — hiện cả hai sẽ dẫn tới 409 chắc chắn.
 */
const CLOSABLE_PO_STATUSES: readonly string[] = [
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
  PurchaseOrderStatus.RECEIVED,
];

export function purchaseOrderActions(input: PurchaseOrderActionInput | string): ProcurementAction[] {
  const po: PurchaseOrderActionInput = typeof input === 'string' ? { status: input } : input;
  if (po.status === PurchaseOrderStatus.DRAFT) return ['edit', 'submit', 'cancel'];
  if (po.status === PurchaseOrderStatus.SUBMITTED) {
    const needsFinance = po.approvalLevel === PurchaseOrderApprovalLevel.OWNER_FINANCE;
    const ownerApproved = Boolean(po.approvals?.approvedBy);
    return [needsFinance && ownerApproved ? 'approveFinance' : 'approve', 'cancel'];
  }
  if (CLOSABLE_PO_STATUSES.includes(po.status)) {
    return po.status === PurchaseOrderStatus.APPROVED ? ['close', 'cancel'] : ['close'];
  }
  return [];
}

/**
 * SECURITY (maker-checker): người tạo PO không được tự duyệt. Chỉ là affordance — API vẫn chặn; UI disable
 * nút kèm lý do để không dẫn người dùng vào 403/409 chắc chắn. Trả `null` khi được phép.
 * Phiếu trả NCC chưa áp dụng được vì DTO chỉ có `createdByDisplayName`, không có id người tạo.
 */
export function purchaseOrderApprovalBlockedReason(
  po: { createdBy?: { id: string } | null },
  currentUserId: string | undefined,
): string | null {
  if (!currentUserId || !po.createdBy?.id) return null;
  return po.createdBy.id === currentUserId ? 'Người tạo đơn không được tự duyệt' : null;
}

export function goodsReceiptActions(status: string): ProcurementAction[] {
  return status === GoodsReceiptStatus.DRAFT ? ['edit', 'post', 'cancel'] : [];
}

export function supplierReturnActions(status: string): ProcurementAction[] {
  if (status === SupplierReturnStatus.DRAFT) return ['edit', 'approve', 'cancel'];
  if (status === SupplierReturnStatus.APPROVED) return ['ship', 'cancel'];
  if (status === SupplierReturnStatus.SHIPPED) return ['close'];
  return [];
}
