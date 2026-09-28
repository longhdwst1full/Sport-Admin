import type { StocktakeStatus } from '@/generated/api/inventory/inventory.schemas';

export type StocktakeAction = 'count' | 'submit' | 'approve' | 'cancel';

/**
 * Thao tác hiển thị cho một phiếu kiểm kê theo trạng thái và quyền.
 *
 * PERMISSION: chỉ là affordance. API kiểm lại quyền, branch scope và trạng thái; lệch nhau thì API
 * trả 403/409 và UI hiển thị lỗi.
 * INVARIANT: phiếu APPROVED không có thao tác nào — sổ kho là append-only nên không huỷ được,
 * sai thì phải lập phiếu bù. Nhập đếm chỉ khi còn DRAFT để người duyệt không thấy một phiếu khác
 * với phiếu họ vừa soát.
 */
export function availableStocktakeActions(
  status: StocktakeStatus,
  permissions: ReadonlySet<string>,
): StocktakeAction[] {
  if (!permissions.has('inventory.stocktake.manage')) return [];
  if (status === 'DRAFT') return ['cancel', 'count', 'submit'];
  if (status === 'SUBMITTED') return ['cancel', 'approve'];
  return [];
}
