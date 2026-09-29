import { SUPPORT_PERMISSION } from '../constants/support.constants';
import type { SupportTicketSummary } from './support-ticket.types';

export type SupportTicketAction = 'assign' | 'resolve' | 'close';

/**
 * Thao tác hiển thị cho một ticket theo trạng thái và quyền.
 *
 * Luồng: OPEN → ASSIGNED → RESOLVED → CLOSED; giao lại (reassign) được khi đang ASSIGNED.
 *
 * PERMISSION: đây chỉ là affordance. Ma trận chuyển trạng thái gốc nằm ở API; nếu hai bên lệch, API
 * trả 409 và UI hiển thị lỗi thay vì âm thầm cho qua.
 */
export function availableSupportTicketActions(
  ticket: Pick<SupportTicketSummary, 'status'>,
  permissions: ReadonlySet<string>,
): SupportTicketAction[] {
  const can = (code: string) => permissions.has(code);
  const actions: SupportTicketAction[] = [];

  if ((ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') && can(SUPPORT_PERMISSION.ASSIGN)) {
    actions.push('assign');
  }
  if (ticket.status === 'ASSIGNED' && can(SUPPORT_PERMISSION.MANAGE)) actions.push('resolve');
  if (ticket.status === 'RESOLVED' && can(SUPPORT_PERMISSION.CLOSE)) actions.push('close');
  return actions;
}

/** Trả lời/ghi chú được khi ticket chưa đóng; ticket đã đóng là hồ sơ chỉ đọc. */
export function canReplySupportTicket(
  ticket: Pick<SupportTicketSummary, 'status'>,
  permissions: ReadonlySet<string>,
): boolean {
  return ticket.status !== 'CLOSED' && permissions.has(SUPPORT_PERMISSION.MANAGE);
}
