import type {
  SupportMessageAuthorType,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/generated/api/support/support.schemas';

/**
 * View model của hàng đợi hỗ trợ. Page/component chỉ đọc các kiểu này; `support-ticket.mapper.ts` là
 * nơi duy nhất đọc DTO sinh ra (đổi `null` → `undefined`, đổi tên `isInternal`/`assigneeUserId`).
 */
export interface SupportTicketSummary {
  id: string;
  ticketNo: string;
  subject: string;
  customerName: string;
  /** Phiếu tư vấn từ form công khai, không gắn hồ sơ khách (D100). */
  isGuest: boolean;
  /** Không có nghĩa là ticket không gắn chi nhánh nào. */
  branchId?: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assigneeUserId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  /** CONCURRENCY: chuỗi số (bigint) — gửi lại nguyên văn làm `expectedVersion` trên mọi lệnh. */
  version: string;
}

export interface SupportTicketMessage {
  id: string;
  authorType: SupportMessageAuthorType;
  authorName?: string;
  body: string;
  /** Ghi chú nội bộ: chỉ nhân viên thấy, không bao giờ gửi tới khách. */
  internal: boolean;
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  /** Không có khi phiếu do khách vãng lai gửi (`isGuest`). */
  customerNo?: string;
  customerPhone?: string;
  customerEmail?: string;
  messages: SupportTicketMessage[];
  resolutionNote?: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface SupportTicketPage {
  items: SupportTicketSummary[];
  total: number;
}

export interface SupportTicketFilters {
  page: number;
  limit: number;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assigneeUserId?: string;
  branchId?: string;
  search?: string;
}
