import type { StocktakeStatus } from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';

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

export const STOCKTAKE_SELF_APPROVAL_CODE = 'STOCKTAKE_SELF_APPROVAL';
export const STOCKTAKE_SELF_APPROVAL_TOOLTIP = 'Người tạo phiếu không được tự duyệt — cần người khác duyệt.';
export const STOCKTAKE_SELF_APPROVAL_MESSAGE = 'Người tạo phiếu kiểm kê không được tự duyệt.';

/**
 * Nút Duyệt: bật chỉ khi API báo `canApprove`; phiếu SUBMITTED mà `canApprove=false` thì khoá kèm
 * lý do (người tạo không được tự duyệt, D96). API vẫn kiểm lại và trả 403 STOCKTAKE_SELF_APPROVAL.
 */
export function stocktakeApproveGate(
  status: StocktakeStatus,
  canApprove: boolean | undefined,
): { disabled: boolean; tooltip?: string } {
  if (status !== 'SUBMITTED' || canApprove) return { disabled: false };
  return { disabled: true, tooltip: STOCKTAKE_SELF_APPROVAL_TOOLTIP };
}

export function isSelfApprovalError(error: unknown): boolean {
  return getApiErrorPayload(error)?.code === STOCKTAKE_SELF_APPROVAL_CODE;
}

/** Thông điệp tiếng Việt cố định cho STOCKTAKE_SELF_APPROVAL; lỗi khác dùng message của API. */
export function getStocktakeErrorMessage(error: unknown, fallback: string): string {
  return isSelfApprovalError(error) ? STOCKTAKE_SELF_APPROVAL_MESSAGE : getApiErrorMessage(error, fallback);
}
