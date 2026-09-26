import type { ReturnDetailDto } from '@/generated/api/returns/returns.schemas';
import { RETURN_PERMISSION } from '../constants/return.constants';

export type ReturnAction =
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'receive'
  | 'requestRefund'
  | 'confirmRefund'
  | 'failRefund'
  | 'close';

/**
 * Thao tác hiển thị cho một phiếu, theo trạng thái và quyền của người dùng.
 *
 * PERMISSION: đây chỉ là affordance. Ma trận chuyển trạng thái gốc nằm ở API (`return.policy.ts`);
 * nếu hai bên lệch, API trả 409 và UI hiển thị lỗi thay vì âm thầm cho qua.
 */
export function availableReturnActions(
  detail: Pick<ReturnDetailDto, 'status' | 'refunds' | 'refundableAmount'>,
  permissions: ReadonlySet<string>,
): ReturnAction[] {
  const can = (code: string) => permissions.has(code);
  const hasPendingRefund = detail.refunds.some((refund) => refund.status === 'PENDING');
  const actions: ReturnAction[] = [];

  if (detail.status === 'REQUESTED' && can(RETURN_PERMISSION.DECIDE)) actions.push('approve', 'reject', 'cancel');
  if (detail.status === 'APPROVED') {
    if (can(RETURN_PERMISSION.RECEIVE)) actions.push('receive');
    if (can(RETURN_PERMISSION.DECIDE)) actions.push('cancel');
  }
  if (detail.status === 'RECEIVED') {
    if (hasPendingRefund) {
      if (can(RETURN_PERMISSION.REFUND_APPROVE)) actions.push('confirmRefund', 'failRefund');
    } else if (Number(detail.refundableAmount) > 0 && can(RETURN_PERMISSION.REFUND_REQUEST)) {
      actions.push('requestRefund');
    }
  }
  // Đóng khi không còn lượt hoàn đang chờ: API cũng từ chối nếu còn PENDING.
  if ((detail.status === 'RECEIVED' || detail.status === 'REFUNDED') && !hasPendingRefund && can(RETURN_PERMISSION.DECIDE)) {
    actions.push('close');
  }
  return actions;
}

/**
 * Khoá idempotency theo nội dung lệnh: bấm lại (hoặc retry sau lỗi mạng) với cùng nội dung thì dùng
 * lại key cũ để API trả kết quả cũ; đổi nội dung thì sinh key mới, tránh bị API coi là xung đột.
 */
export function nextIdempotencyKey(
  previous: { signature: string; key: string } | undefined,
  signature: string,
  generate: () => string = () => crypto.randomUUID(),
): { signature: string; key: string } {
  return previous?.signature === signature ? previous : { signature, key: generate() };
}
