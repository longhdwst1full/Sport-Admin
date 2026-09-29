import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addAdminSupportTicketMessage,
  assignAdminSupportTicket,
  closeAdminSupportTicket,
  getGetAdminSupportTicketQueryKey,
  getListAdminSupportTicketsQueryKey,
  resolveAdminSupportTicket,
} from '@/generated/api/support/support';
import type { AdminSupportTicketDetailDto } from '@/generated/api/support/support.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { SUPPORT_ERROR_CODE, SUPPORT_STALE_ERROR_CODES } from '../constants/support.constants';
import type { SupportTicketDetail } from '../model/support-ticket.types';

/** Nội dung lệnh theo đúng field của DTO; `expectedVersion` do hook gắn vào từ ticket đang hiển thị. */
export type SupportTicketCommand =
  | { action: 'assign'; body: { assigneeUserId: string } }
  | { action: 'reply'; body: { body: string; isInternal: boolean } }
  | { action: 'resolve'; body: { resolutionNote: string } }
  | { action: 'close'; body: Record<never, never> };

/**
 * Chạy một lệnh trên ticket (giao việc, trả lời/ghi chú, giải quyết, đóng). Mọi lệnh trả về chi tiết
 * ticket mới (kể cả thêm tin nhắn — mỗi tin nhắn tăng version).
 *
 * CONCURRENCY: body luôn mang `expectedVersion` của lần tải gần nhất; mã lỗi "stale"
 * (`SUPPORT_STALE_ERROR_CODES`) làm tải lại chi tiết để người dùng thấy trạng thái mới.
 *
 * IDEMPOTENCY: API bắt buộc header `Idempotency-Key` (8-120 ký tự). Gửi lại đúng nội dung sau lỗi mạng
 * dùng lại key cũ để API trả kết quả cũ (không nhân đôi tin nhắn); đổi nội dung thì sinh key mới;
 * thành công thì xoá key để lệnh kế tiếp — kể cả tin nhắn trùng chữ — là giao dịch mới.
 */
export function useSupportTicketCommand(ticket: Pick<SupportTicketDetail, 'id' | 'version'> | undefined) {
  const queryClient = useQueryClient();
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);

  return useMutation<AdminSupportTicketDetailDto, unknown, SupportTicketCommand>({
    retry: false,
    mutationFn: (command) => {
      if (!ticket) throw new Error('Chưa tải được ticket');
      const expectedVersion = ticket.version;
      idempotencyRef.current = nextIdempotencyKey(
        idempotencyRef.current,
        JSON.stringify({ ticketId: ticket.id, action: command.action, expectedVersion, body: command.body }),
      );
      const options = { headers: { 'Idempotency-Key': idempotencyRef.current.key } };
      switch (command.action) {
        case 'assign':
          return assignAdminSupportTicket(ticket.id, { ...command.body, expectedVersion }, options);
        case 'reply':
          return addAdminSupportTicketMessage(ticket.id, { ...command.body, expectedVersion }, options);
        case 'resolve':
          return resolveAdminSupportTicket(ticket.id, { ...command.body, expectedVersion }, options);
        case 'close':
          return closeAdminSupportTicket(ticket.id, { expectedVersion }, options);
      }
    },
    onSuccess: async (updated) => {
      idempotencyRef.current = undefined;
      // CACHE: cache giữ DTO thô (hook chi tiết `select` sang view model), nên ghi thẳng response vào key
      // chi tiết; danh sách lọc theo trạng thái/người nhận nên phải invalidate.
      queryClient.setQueryData(getGetAdminSupportTicketQueryKey(updated.id), updated);
      await queryClient.invalidateQueries({ queryKey: getListAdminSupportTicketsQueryKey() });
    },
    onError: async (error) => {
      const code = getApiErrorPayload(error)?.code;
      if (code === SUPPORT_ERROR_CODE.IDEMPOTENCY_CONFLICT) idempotencyRef.current = undefined;
      if (code && SUPPORT_STALE_ERROR_CODES.has(code) && ticket) {
        idempotencyRef.current = undefined;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetAdminSupportTicketQueryKey(ticket.id) }),
          queryClient.invalidateQueries({ queryKey: getListAdminSupportTicketsQueryKey() }),
        ]);
      }
    },
  });
}
