import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAdminChatConversation,
  getGetAdminActionDraftQueryKey,
  getListAdminChatMessagesQueryKey,
  listAdminChatMessages,
  sendAdminChatMessage,
  useListAdminChatMessages,
} from '@/generated/api/assistant/assistant';
import type {
  AdminChatMessageListDto,
  ListAdminChatMessagesParams,
  SendAdminChatMessageResponseDto,
} from '@/generated/api/assistant/assistant.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { COPILOT_ERROR_CODE, COPILOT_LIMITS, COPILOT_TURN_POLL } from '../constants/copilot.constants';
import { copilotErrorKind } from '../model/copilot-error';
import { appendChatMessages, toCopilotMessagePage, toSendAdminChatMessageBody } from '../model/copilot.mapper';
import type { CopilotPageHints } from '../model/copilot.types';

export interface SendCopilotMessageInput {
  content: string;
  hints?: CopilotPageHints;
}

const MESSAGE_PARAMS: ListAdminChatMessagesParams = { limit: COPILOT_LIMITS.MESSAGE_PAGE_SIZE };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Trang mới nhất đã có câu trả lời cho tin USER cuối cùng (Copilot chỉ gửi tuần tự từng tin). */
function lastUserMessageAnswered(page: AdminChatMessageListDto): boolean {
  const lastUser = page.items.map((item) => item.role).lastIndexOf('USER');
  return lastUser >= 0 && page.items.slice(lastUser + 1).some((item) => item.role === 'ASSISTANT');
}

/**
 * Một hội thoại Copilot: tạo hội thoại lười ở tin đầu tiên, tải trang tin mới nhất, gửi tin.
 *
 * IDEMPOTENCY: `sendAdminChatMessage` bắt buộc `Idempotency-Key`; gửi lại đúng nội dung sau lỗi mạng dùng lại
 * key để API trả lượt cũ (không gọi LLM/tool lần nữa); đổi nội dung sinh key mới; thành công xoá key.
 * `IDEMPOTENCY_KEY_REUSED` (cùng key, khác nội dung) → bỏ key. `ASSISTANT_TURN_IN_PROGRESS` → GIỮ key, hỏi lại lịch sử
 * tới khi có câu trả lời (hoặc hết `COPILOT_TURN_POLL.MAX_WAIT_MS`) rồi gửi lại cùng key.
 *
 * CACHE: cache giữ DTO thô (query `select` sang view model). Tin vừa gửi/nhận nối vào cache (bỏ trùng theo
 * id); `actionDrafts` của lượt ghi thẳng vào key chi tiết bản nháp để thẻ không phải tải lại.
 */
export function useCopilotChat() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string>();
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);

  const messages = useListAdminChatMessages(conversationId ?? '', MESSAGE_PARAMS, {
    query: { enabled: Boolean(conversationId), select: toCopilotMessagePage, retry: false },
  });

  const send = useMutation<SendAdminChatMessageResponseDto, unknown, SendCopilotMessageInput>({
    retry: false,
    mutationFn: async ({ content, hints }) => {
      const id = conversationId ?? (await createAdminChatConversation()).id;
      if (id !== conversationId) setConversationId(id);
      const body = toSendAdminChatMessageBody(content, hints);
      idempotencyRef.current = nextIdempotencyKey(idempotencyRef.current, JSON.stringify({ conversationId: id, body }));
      const headers = { 'Idempotency-Key': idempotencyRef.current.key };
      const submit = () => sendAdminChatMessage(id, body, { headers });
      try {
        return await submit();
      } catch (error) {
        if (getApiErrorPayload(error)?.code !== COPILOT_ERROR_CODE.TURN_IN_PROGRESS) throw error;
      }
      const deadline = Date.now() + COPILOT_TURN_POLL.MAX_WAIT_MS;
      while (Date.now() < deadline) {
        await wait(COPILOT_TURN_POLL.INTERVAL_MS);
        try {
          if (lastUserMessageAnswered(await listAdminChatMessages(id, MESSAGE_PARAMS))) break;
        } catch {
          // Lỗi tạm thời khi hỏi lịch sử: thử lại ở vòng sau, trần chờ giữ nguyên.
        }
      }
      return submit();
    },
    onSuccess: (response) => {
      idempotencyRef.current = undefined;
      for (const draft of response.actionDrafts) {
        queryClient.setQueryData(getGetAdminActionDraftQueryKey(draft.id), draft);
      }
      queryClient.setQueryData<AdminChatMessageListDto>(
        getListAdminChatMessagesQueryKey(response.conversation.id, MESSAGE_PARAMS),
        (page) => appendChatMessages(page, [response.userMessage, response.assistantMessage]),
      );
    },
    onError: (error) => {
      const code = getApiErrorPayload(error)?.code;
      if (code === COPILOT_ERROR_CODE.IDEMPOTENCY_KEY_REUSED) idempotencyRef.current = undefined;
      // Hội thoại đã đóng/mất: bỏ id để lần gửi sau tạo hội thoại mới thay vì lặp lại lỗi.
      if (copilotErrorKind(error) === 'conversation-gone') {
        idempotencyRef.current = undefined;
        setConversationId(undefined);
      }
    },
  });

  const reset = () => {
    idempotencyRef.current = undefined;
    setConversationId(undefined);
    send.reset();
  };

  return { conversationId, messages, send, reset };
}
