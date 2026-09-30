import type {
  AdminActionDraftDto,
  AdminChatMessageDto,
  AdminChatMessageListDto,
  SendAdminChatMessageDto,
} from '@/generated/api/assistant/assistant.schemas';
import type { CopilotMessage, CopilotMessagePage, CopilotPageHints, StockAdjustmentDraft } from './copilot.types';

const optional = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

export function toStockAdjustmentDraft(dto: AdminActionDraftDto): StockAdjustmentDraft {
  const { preview } = dto;
  return {
    id: dto.id,
    conversationId: dto.conversationId,
    actionType: dto.actionType,
    status: dto.status,
    version: dto.version,
    payloadHash: dto.payloadHash,
    branchId: optional(preview.branchId),
    branchName: optional(preview.branchName),
    warehouseCode: preview.warehouseCode,
    sku: preview.sku,
    productName: preview.productName,
    currentOnHand: preview.currentOnHand,
    requestedOnHand: preview.requestedOnHand,
    delta: preview.delta,
    // INVARIANT: delta hiển thị phải khớp hiệu số mới/cũ; lệch nghĩa là preview hỏng, không cho xác nhận.
    consistent: preview.requestedOnHand - preview.currentOnHand === preview.delta,
    reason: preview.reason,
    resultRef: optional(dto.resultRef),
    errorCode: optional(dto.errorCode),
    expiresAt: dto.expiresAt,
    decidedAt: optional(dto.decidedAt),
    executedAt: optional(dto.executedAt),
    createdAt: dto.createdAt,
  };
}

export function toCopilotMessage(dto: AdminChatMessageDto): CopilotMessage {
  return {
    id: dto.id,
    role: dto.role,
    content: dto.content,
    actionDraftIds: dto.actionDraftIds,
    createdAt: dto.createdAt,
  };
}

export function toCopilotMessagePage(dto: AdminChatMessageListDto): CopilotMessagePage {
  return { items: dto.items.map(toCopilotMessage), hasMore: dto.meta.hasMore };
}

/**
 * Gộp tin vừa gửi/nhận vào trang tin đã cache (DTO thô), bỏ trùng theo `id` để replay idempotent không nhân
 * đôi tin nhắn.
 */
export function appendChatMessages(
  page: AdminChatMessageListDto | undefined,
  messages: AdminChatMessageDto[],
): AdminChatMessageListDto {
  const current = page ?? { items: [], meta: { limit: messages.length, hasMore: false, nextCursor: null } };
  const known = new Set(current.items.map((item) => item.id));
  return { ...current, items: [...current.items, ...messages.filter((message) => !known.has(message.id))] };
}

/** Bỏ khoá rỗng; không có gợi ý nào thì không gửi `pageContext`. */
export function toSendAdminChatMessageBody(
  content: string,
  hints: CopilotPageHints | undefined,
): SendAdminChatMessageDto {
  const pageContext = {
    ...(hints?.orderId ? { orderId: hints.orderId } : {}),
    ...(hints?.sku ? { sku: hints.sku } : {}),
    ...(hints?.warehouseCode ? { warehouseCode: hints.warehouseCode } : {}),
  };
  return {
    content: content.trim(),
    ...(Object.keys(pageContext).length > 0 ? { pageContext } : {}),
  };
}
