import type {
  AdminSupportTicketDetailDto,
  AdminSupportTicketListDto,
  AdminSupportTicketMessageDto,
  AdminSupportTicketSummaryDto,
  ListAdminSupportTicketsParams,
} from '@/generated/api/support/support.schemas';
import type {
  SupportTicketDetail,
  SupportTicketFilters,
  SupportTicketMessage,
  SupportTicketPage,
  SupportTicketSummary,
} from './support-ticket.types';

const optional = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

export function toSupportTicketSummary(dto: AdminSupportTicketSummaryDto): SupportTicketSummary {
  return {
    id: dto.id,
    ticketNo: dto.ticketNo,
    subject: dto.subject,
    customerName: dto.customerName,
    isGuest: dto.isGuest,
    branchId: optional(dto.branchId),
    status: dto.status,
    priority: dto.priority,
    assigneeUserId: optional(dto.assigneeUserId),
    assigneeName: optional(dto.assigneeName),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version,
  };
}

export function toSupportTicketPage(dto: AdminSupportTicketListDto): SupportTicketPage {
  return { items: dto.items.map(toSupportTicketSummary), total: dto.meta.total };
}

function toSupportTicketMessage(dto: AdminSupportTicketMessageDto): SupportTicketMessage {
  return {
    id: dto.id,
    authorType: dto.authorType,
    authorName: optional(dto.authorName),
    body: dto.body,
    internal: dto.isInternal,
    createdAt: dto.createdAt,
  };
}

export function toSupportTicketDetail(dto: AdminSupportTicketDetailDto): SupportTicketDetail {
  return {
    ...toSupportTicketSummary(dto),
    // Phiếu tư vấn của khách vãng lai (D100) không gắn hồ sơ khách: không có mã khách.
    customerNo: dto.customerNo ?? undefined,
    customerPhone: optional(dto.customerPhone),
    customerEmail: optional(dto.customerEmail),
    messages: dto.messages.map(toSupportTicketMessage),
    resolutionNote: optional(dto.resolutionNote),
    assignedAt: optional(dto.assignedAt),
    resolvedAt: optional(dto.resolvedAt),
    closedAt: optional(dto.closedAt),
  };
}

/** Bỏ khoá rỗng để query key ổn định và URL gửi đi không mang `search=`. */
export function toListAdminSupportTicketsParams(filters: SupportTicketFilters): ListAdminSupportTicketsParams {
  return {
    page: filters.page,
    limit: filters.limit,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.assigneeUserId ? { assigneeUserId: filters.assigneeUserId } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };
}
