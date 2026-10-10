import type { StatusPresentation } from '@/foundation/management';
import type { ActionDraftStatus } from '../model/copilot.types';

/**
 * PERMISSION: nút mở Copilot cần ĐỦ hai mã (khớp `x-required-permissions` của createAdminChatConversation /
 * sendAdminChatMessage). Hai mã này chỉ bật tính năng; dữ liệu mỗi tool vẫn do quyền nghiệp vụ nền
 * (`order.view`, `inventory.stock.view`, ...) và phạm vi chi nhánh của chính nhân viên quyết định ở API (D72).
 */
export const COPILOT_PERMISSION = {
  USE: 'assistant.use',
  TOOL_EXECUTE: 'assistant.tool.execute',
  /** Xác nhận bản nháp chạy điều chỉnh tồn bằng principal của người bấm (`ACTION_DRAFT_PERMISSION`). */
  STOCK_ADJUST: 'inventory.stock.adjust',
} as const;

export const COPILOT_LAUNCH_PERMISSIONS = [COPILOT_PERMISSION.USE, COPILOT_PERMISSION.TOOL_EXECUTE] as const;

export const COPILOT_LIMITS = {
  /** `@maxLength` của SendAdminChatMessageDto; trần hiệu lực là ASSISTANT_MAX_INPUT_CHARS kiểm ở API. */
  MESSAGE_MAX: 8000,
  /** `limit` của listAdminChatMessages (tối đa 100). */
  MESSAGE_PAGE_SIZE: 50,
  /** `RejectAdminActionDraftDto.reason`: 3-500 ký tự, tuỳ chọn. */
  REJECT_REASON_MIN: 3,
  REJECT_REASON_MAX: 500,
} as const;

/**
 * IDEMPOTENCY: `ASSISTANT_TURN_IN_PROGRESS` = lượt cùng khoá đang chạy ở API. Giữ khoá, hỏi lại lịch sử định kỳ tới
 * trần chờ rồi gửi lại CÙNG khoá (API replay lượt gốc, hoặc chạy lại lượt kẹt sau `TURN_REDRIVE_AFTER_MS` = 120 giây).
 */
export const COPILOT_TURN_POLL = {
  INTERVAL_MS: 3_000,
  MAX_WAIT_MS: 120_000,
} as const;

/** Mã lỗi hội thoại (`api/src/modules/assistant/assistant.constants.ts`, `admin/admin-copilot.constants.ts`). */
export const COPILOT_ERROR_CODE = {
  UNAVAILABLE: 'ASSISTANT_UNAVAILABLE',
  QUOTA_EXCEEDED: 'ASSISTANT_QUOTA_EXCEEDED',
  INPUT_TOO_LONG: 'ASSISTANT_INPUT_TOO_LONG',
  INPUT_EMPTY: 'ASSISTANT_INPUT_EMPTY',
  CONTENT_INVALID: 'ASSISTANT_CONTENT_INVALID',
  CONVERSATION_NOT_FOUND: 'ASSISTANT_CONVERSATION_NOT_FOUND',
  CONVERSATION_CLOSED: 'ASSISTANT_CONVERSATION_CLOSED',
  TURN_IN_PROGRESS: 'ASSISTANT_TURN_IN_PROGRESS',
  BRANCH_SCOPE_DENIED: 'ASSISTANT_BRANCH_SCOPE_DENIED',
  STAFF_USER_REQUIRED: 'ASSISTANT_STAFF_USER_REQUIRED',
  IDEMPOTENCY_KEY_REQUIRED: 'IDEMPOTENCY_KEY_REQUIRED',
  IDEMPOTENCY_KEY_REUSED: 'IDEMPOTENCY_KEY_REUSED',
} as const;

/** Mã lỗi lệnh bản nháp (`ADMIN_COPILOT_ERROR_CODE` ở API). */
export const ACTION_DRAFT_ERROR_CODE = {
  NOT_FOUND: 'ASSISTANT_DRAFT_NOT_FOUND',
  EXPIRED: 'ASSISTANT_DRAFT_EXPIRED',
  NOT_PENDING: 'ASSISTANT_DRAFT_NOT_PENDING',
  PAYLOAD_HASH_MISMATCH: 'ASSISTANT_DRAFT_PAYLOAD_HASH_MISMATCH',
  VERSION_CONFLICT: 'ASSISTANT_DRAFT_VERSION_CONFLICT',
  EXECUTION_IN_PROGRESS: 'ASSISTANT_DRAFT_EXECUTION_IN_PROGRESS',
  PERMISSION_DENIED: 'ASSISTANT_DRAFT_PERMISSION_DENIED',
} as const;

/**
 * `errorCode` của bản nháp FAILED (lỗi nghiệp vụ trả 200 kèm draft FAILED, không phải HTTP lỗi).
 * STOCK_CHANGED: tồn thực tế khác `currentOnHand` lúc tạo draft (kiểm `expectedOnHand` trong transaction).
 */
export const ACTION_DRAFT_FAILURE_CODE = {
  STOCK_CHANGED: 'INVENTORY_EXPECTED_ON_HAND_MISMATCH',
} as const;

/**
 * CONCURRENCY: bản nháp đang hiển thị đã cũ (hết hạn, đã xử lý nơi khác, version/hash đổi, đang thực thi) —
 * tải lại bản nháp trước khi cho bấm lại, không tự gửi lại lệnh.
 */
export const ACTION_DRAFT_STALE_ERROR_CODES: ReadonlySet<string> = new Set([
  ACTION_DRAFT_ERROR_CODE.EXPIRED,
  ACTION_DRAFT_ERROR_CODE.NOT_PENDING,
  ACTION_DRAFT_ERROR_CODE.PAYLOAD_HASH_MISMATCH,
  ACTION_DRAFT_ERROR_CODE.VERSION_CONFLICT,
  ACTION_DRAFT_ERROR_CODE.EXECUTION_IN_PROGRESS,
]);

/** `errorCode` mà cách xử lý đúng là hỏi trợ lý lập bản nháp mới theo tồn hiện tại. */
export const ACTION_DRAFT_ASK_AGAIN_CODES: ReadonlySet<string> = new Set([ACTION_DRAFT_FAILURE_CODE.STOCK_CHANGED]);

/** `Record<Enum, …>` bắt lỗi compile khi contract thêm trạng thái mà quên nhãn. */
export const actionDraftStatusPresentation: Record<ActionDraftStatus, StatusPresentation> = {
  PENDING: { label: 'Chờ xác nhận', color: 'warning' },
  CONFIRMED: { label: 'Đang thực hiện', color: 'info' },
  EXECUTED: { label: 'Đã thực hiện', color: 'success' },
  FAILED: { label: 'Thất bại', color: 'danger' },
  REJECTED: { label: 'Đã từ chối', color: 'danger' },
  EXPIRED: { label: 'Hết hạn', color: 'danger' },
};

/** Thông điệp cho `errorCode` của bản nháp FAILED; mã khác hiện nguyên mã để tra cứu. */
export const actionDraftFailureMessages: Record<string, string> = {
  [ACTION_DRAFT_FAILURE_CODE.STOCK_CHANGED]:
    'Tồn kho đã thay đổi so với lúc lập bản nháp nên hệ thống không điều chỉnh. Hãy hỏi lại trợ lý.',
};
