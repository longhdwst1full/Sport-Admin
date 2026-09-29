import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  archiveAdminKnowledgeDocument,
  attachAdminKnowledgePost,
  getListAdminKnowledgeDocumentsQueryKey,
  publishAdminKnowledgeDocument,
  useListAdminKnowledgeDocuments,
} from '@/generated/api/assistant/assistant';
import type { KnowledgeDocumentDto } from '@/generated/api/assistant/assistant.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { KNOWLEDGE_STALE_ERROR_CODES } from '../constants/knowledge.constants';
import {
  toAttachKnowledgePostDto,
  toKnowledgeDocumentPage,
  toListAdminKnowledgeDocumentsParams,
} from '../model/knowledge-document.mapper';
import type { AttachKnowledgePostInput, KnowledgeDocumentFilters } from '../model/knowledge-document.types';

export function useKnowledgeDocuments(filters: KnowledgeDocumentFilters) {
  return useListAdminKnowledgeDocuments(toListAdminKnowledgeDocumentsParams(filters), {
    query: { select: toKnowledgeDocumentPage, retry: false },
  });
}

export type KnowledgeCommand =
  | { action: 'attach'; body: AttachKnowledgePostInput }
  | { action: 'publish'; documentId: string; expectedVersion: number }
  | { action: 'archive'; documentId: string; expectedVersion: number };

/**
 * Gắn bài CMS / xuất bản / lưu trữ tài liệu tri thức.
 *
 * IDEMPOTENCY: các endpoint này không nhận `Idempotency-Key`. Gắn bài idempotent theo khoá tự nhiên
 * (một bài CMS = một tài liệu): gắn lại cùng đối tượng/chi nhánh trả tài liệu cũ, khác phạm vi trả 409
 * `KNOWLEDGE_ALREADY_ATTACHED`. Publish/archive được bảo vệ bằng `expectedVersion`.
 *
 * CONCURRENCY: mã lỗi "stale" (`KNOWLEDGE_STALE_ERROR_CODES`) làm tải lại danh sách để thấy trạng thái mới.
 */
export function useKnowledgeCommand() {
  const queryClient = useQueryClient();

  return useMutation<KnowledgeDocumentDto, unknown, KnowledgeCommand>({
    retry: false,
    mutationFn: (command) => {
      switch (command.action) {
        case 'attach':
          return attachAdminKnowledgePost(toAttachKnowledgePostDto(command.body));
        case 'publish':
          return publishAdminKnowledgeDocument(command.documentId, { expectedVersion: command.expectedVersion });
        case 'archive':
          return archiveAdminKnowledgeDocument(command.documentId, { expectedVersion: command.expectedVersion });
      }
    },
    onSuccess: async () => {
      // CACHE: trạng thái/phiên bản đổi làm lệch mọi trang lọc theo trạng thái, nên invalidate cả họ list.
      await queryClient.invalidateQueries({ queryKey: getListAdminKnowledgeDocumentsQueryKey() });
    },
    onError: async (error) => {
      const code = getApiErrorPayload(error)?.code;
      if (code && KNOWLEDGE_STALE_ERROR_CODES.has(code)) {
        await queryClient.invalidateQueries({ queryKey: getListAdminKnowledgeDocumentsQueryKey() });
      }
    },
  });
}
