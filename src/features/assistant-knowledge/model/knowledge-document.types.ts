import type {
  KnowledgeAudience,
  KnowledgeSourceType,
  KnowledgeStatus,
} from '@/generated/api/assistant/assistant.schemas';

/**
 * View model của một tài liệu tri thức trợ lý. Page/component chỉ đọc kiểu này;
 * `knowledge-document.mapper.ts` là nơi duy nhất đọc DTO sinh ra (đổi `null` → `undefined`).
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  sourceType: KnowledgeSourceType;
  /** Id bài CMS khi `sourceType = CMS_POST`. */
  sourceId?: string;
  audience: KnowledgeAudience;
  /** Không có nghĩa là áp dụng cho tất cả chi nhánh. */
  branchId?: string;
  status: KnowledgeStatus;
  /** CONCURRENCY: gửi lại làm `expectedVersion` cho publish/archive. */
  version: number;
  /** Số đoạn đã lập chỉ mục của version hiện hành. */
  chunkCount: number;
  reindexedAt?: string;
  archivedAt?: string;
  updatedAt: string;
}

export interface KnowledgeDocumentPage {
  items: KnowledgeDocument[];
  total: number;
}

export interface KnowledgeDocumentFilters {
  page: number;
  limit: number;
  status?: KnowledgeStatus;
  audience?: KnowledgeAudience;
  branchId?: string;
}

export interface AttachKnowledgePostInput {
  postId: string;
  audience: KnowledgeAudience;
  /** Bỏ trống = tất cả chi nhánh. */
  branchId?: string;
}
