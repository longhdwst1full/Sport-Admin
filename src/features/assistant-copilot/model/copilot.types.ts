import type {
  AdminChatMessageRole,
  AssistantActionDraftStatus,
  AssistantActionDraftType,
} from '@/generated/api/assistant/assistant.schemas';

/**
 * View model của Copilot. Component chỉ đọc các kiểu này; `copilot.mapper.ts` là nơi duy nhất đọc DTO
 * sinh ra (đổi `null` → `undefined`, làm phẳng `preview`).
 */

/** Gợi ý ngữ cảnh của trang đang mở; chỉ là gợi ý cho trợ lý, không phải bằng chứng quyền. */
export interface CopilotPageHints {
  orderId?: string;
  sku?: string;
  warehouseCode?: string;
}

export interface CopilotMessage {
  id: string;
  role: AdminChatMessageRole;
  content: string;
  /** Bản nháp thao tác tạo trong lượt trả lời này; thẻ đọc trạng thái hiện tại qua `getAdminActionDraft`. */
  actionDraftIds: string[];
  createdAt: string;
}

export interface CopilotMessagePage {
  items: CopilotMessage[];
  hasMore: boolean;
}

export type ActionDraftStatus = AssistantActionDraftStatus;

export interface StockAdjustmentDraft {
  id: string;
  conversationId: string;
  actionType: AssistantActionDraftType;
  status: ActionDraftStatus;
  /** CONCURRENCY: gửi nguyên văn làm `expectedVersion` khi xác nhận/từ chối. */
  version: number;
  /** SHA-256 payload; xác nhận gửi lại đúng hash đang hiển thị. */
  payloadHash: string;
  branchId?: string;
  branchName?: string;
  warehouseCode: string;
  sku: string;
  productName: string;
  currentOnHand: number;
  requestedOnHand: number;
  delta: number;
  /** false khi `requestedOnHand - currentOnHand` khác `delta`: UI khoá xác nhận. */
  consistent: boolean;
  reason: string;
  /** Số phiếu điều chỉnh khi EXECUTED. */
  resultRef?: string;
  /** Mã lỗi ổn định khi FAILED, vd `INVENTORY_EXPECTED_ON_HAND_MISMATCH`. */
  errorCode?: string;
  expiresAt: string;
  decidedAt?: string;
  executedAt?: string;
  createdAt: string;
}
