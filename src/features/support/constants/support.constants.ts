import type { StatusPresentation } from '@/foundation/management';
import { toOptions } from '@/shared/utils/options';
import type {
  SupportMessageAuthorType,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/generated/api/support/support.schemas';

/** Mã quyền dùng để ẩn/hiện màn hình và thao tác. PERMISSION: API vẫn chặn lại mọi lệnh. */
export const SUPPORT_PERMISSION = {
  VIEW: 'support.ticket.view',
  MANAGE: 'support.ticket.manage',
  ASSIGN: 'support.ticket.assign',
  CLOSE: 'support.ticket.close',
} as const;

/** Giới hạn độ dài khớp `@maxLength` trong contract (tin nhắn 4000, ghi chú giải quyết 1000). */
export const SUPPORT_LIMITS = {
  MESSAGE_MAX: 4000,
  RESOLUTION_NOTE_MAX: 1000,
} as const;

/**
 * Mã lỗi ổn định của API support (`api/src/modules/support/support.constants.ts`) mà UI phản ứng riêng.
 *
 * CONCURRENCY: nhóm "stale" nghĩa là dữ liệu đang hiển thị đã cũ (người khác vừa thao tác, ticket vừa
 * đóng, hoặc chuyển trạng thái không còn hợp lệ) — phải tải lại chi tiết trước khi cho bấm lại.
 * IDEMPOTENCY_CONFLICT: key đã dùng cho nội dung khác — bỏ key để lần gửi sau sinh key mới.
 */
export const SUPPORT_ERROR_CODE = {
  VERSION_CONFLICT: 'SUPPORT_VERSION_CONFLICT',
  CONCURRENT_UPDATE: 'SUPPORT_CONCURRENT_UPDATE',
  INVALID_TRANSITION: 'SUPPORT_INVALID_TRANSITION',
  TICKET_CLOSED: 'SUPPORT_TICKET_CLOSED',
  IDEMPOTENCY_CONFLICT: 'SUPPORT_IDEMPOTENCY_CONFLICT',
  ASSIGNEE_INVALID: 'SUPPORT_ASSIGNEE_INVALID',
} as const;

export const SUPPORT_STALE_ERROR_CODES: ReadonlySet<string> = new Set([
  SUPPORT_ERROR_CODE.VERSION_CONFLICT,
  SUPPORT_ERROR_CODE.CONCURRENT_UPDATE,
  SUPPORT_ERROR_CODE.INVALID_TRANSITION,
  SUPPORT_ERROR_CODE.TICKET_CLOSED,
]);

/** Nhãn tách khỏi mã trạng thái; `Record<Enum, …>` bắt lỗi khi contract thêm giá trị mà quên nhãn. */
export const supportTicketStatusPresentation: Record<SupportTicketStatus, StatusPresentation> = {
  OPEN: { label: 'Mới', color: 'warning' },
  ASSIGNED: { label: 'Đang xử lý', color: 'progress' },
  RESOLVED: { label: 'Đã giải quyết', color: 'success' },
  CLOSED: { label: 'Đã đóng', color: 'neutral' },
};

export const supportTicketPriorityPresentation: Record<SupportTicketPriority, StatusPresentation> = {
  LOW: { label: 'Thấp', color: 'neutral' },
  NORMAL: { label: 'Bình thường', color: 'info' },
  HIGH: { label: 'Cao', color: 'warning' },
  URGENT: { label: 'Khẩn cấp', color: 'danger' },
};

export const supportAuthorTypeLabels: Record<SupportMessageAuthorType, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  SYSTEM: 'Hệ thống',
  GUEST: 'Khách vãng lai',
};

export const supportTicketStatusOptions = toOptions(supportTicketStatusPresentation);

export const supportTicketPriorityOptions = toOptions(supportTicketPriorityPresentation);
