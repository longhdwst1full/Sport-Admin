import { useGetAdminSupportTicket, useListAdminSupportTickets } from '@/generated/api/support/support';
import {
  toListAdminSupportTicketsParams,
  toSupportTicketDetail,
  toSupportTicketPage,
} from '../model/support-ticket.mapper';
import type { SupportTicketFilters } from '../model/support-ticket.types';

/** Danh sách ticket theo bộ lọc server-side (trang, trạng thái, ưu tiên, người nhận, chi nhánh, từ khoá). */
export function useSupportTickets(filters: SupportTicketFilters) {
  return useListAdminSupportTickets(toListAdminSupportTicketsParams(filters), {
    query: { select: toSupportTicketPage, retry: false },
  });
}

/** Chi tiết ticket kèm luồng tin nhắn (khách/nhân viên/hệ thống, gồm cả ghi chú nội bộ). */
export function useSupportTicket(ticketId: string | undefined) {
  return useGetAdminSupportTicket(ticketId ?? '', {
    query: { enabled: Boolean(ticketId), retry: false, select: toSupportTicketDetail },
  });
}
