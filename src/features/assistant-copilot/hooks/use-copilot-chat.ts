import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAdminChatConversation,
  getGetAdminActionDraftQueryKey,
  getListAdminChatMessagesQueryKey,
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
import { COPILOT_ERROR_CODE, COPILOT_LIMITS } from '../constants/copilot.constants';
import { copilotErrorKind } from '../model/copilot-error';
import { appendChatMessages, toCopilotMessagePage, toSendAdminChatMessageBody } from '../model/copilot.mapper';
import type { CopilotPageHints } from '../model/copilot.types';

export interface SendCopilotMessageInput {
  content: string;
  hints?: CopilotPageHints;
}

const MESSAGE_PARAMS: ListAdminChatMessagesParams = { limit: COPILOT_LIMITS.MESSAGE_PAGE_SIZE };

/**
 * Một hội thoại Copilot: tạo hội thoại lười ở tin đầu tiên, tải trang tin mới nhất, gửi tin.
 *
 * IDEMPOTENCY: `sendAdminChatMessage` bắt buộc `Idempotency-Key`; gửi lại đúng nội dung sau lỗi mạng dùng lại
 * key để API trả lượt cũ (không gọi LLM/tool lần nữa); đổi nội dung sinh key mới; thành công xoá key.
 * `IDEMPOTENCY_KEY_REUSED` (cùng key, khác nội dung) → bỏ key.
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
      return sendAdminChatMessage(id, body, { headers: { 'Idempotency-Key': idempotencyRef.current.key } });
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
