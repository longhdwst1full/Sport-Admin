import type { StockTransferStatus } from '@/generated/api/inventory/inventory.schemas';

export type StockTransferAction = 'edit' | 'submit' | 'cancel' | 'ship' | 'receive';

/**
 * Thao tác hiển thị cho một phiếu chuyển kho theo trạng thái và quyền.
 *
 * PERMISSION: chỉ là affordance. API kiểm tra lại quyền, branch/warehouse scope và trạng thái;
 * lệch nhau thì API trả 403/409 và UI hiển thị lỗi.
 * INVARIANT: huỷ chỉ trước khi xuất kho (chưa có movement); sửa chỉ khi còn DRAFT.
 */
export function availableStockTransferActions(
  status: StockTransferStatus,
  permissions: ReadonlySet<string>,
): StockTransferAction[] {
  const actions: StockTransferAction[] = [];
  const canCreate = permissions.has('inventory.transfer.create');
  if (status === 'DRAFT' && canCreate) actions.push('cancel', 'edit', 'submit');
  if (status === 'SUBMITTED') {
    if (canCreate) actions.push('cancel');
    if (permissions.has('inventory.transfer.ship')) actions.push('ship');
  }
  if (status === 'SHIPPED' && permissions.has('inventory.transfer.receive')) actions.push('receive');
  return actions;
}
