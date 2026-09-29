import type {
  AttachKnowledgePostDto,
  KnowledgeDocumentDto,
  KnowledgeDocumentListDto,
  ListAdminKnowledgeDocumentsParams,
} from '@/generated/api/assistant/assistant.schemas';
import type {
  AttachKnowledgePostInput,
  KnowledgeDocument,
  KnowledgeDocumentFilters,
  KnowledgeDocumentPage,
} from './knowledge-document.types';

const optional = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

export function toKnowledgeDocument(dto: KnowledgeDocumentDto): KnowledgeDocument {
  return {
    id: dto.id,
    title: dto.title,
    sourceType: dto.sourceType,
    sourceId: optional(dto.sourceId),
    audience: dto.audience,
    branchId: optional(dto.branchId),
    status: dto.status,
    version: dto.version,
    chunkCount: dto.chunkCount,
    reindexedAt: optional(dto.reindexedAt),
    archivedAt: optional(dto.archivedAt),
    updatedAt: dto.updatedAt,
  };
}

export function toKnowledgeDocumentPage(dto: KnowledgeDocumentListDto): KnowledgeDocumentPage {
  return { items: dto.items.map(toKnowledgeDocument), total: dto.meta.total };
}

export function toListAdminKnowledgeDocumentsParams(
  filters: KnowledgeDocumentFilters,
): ListAdminKnowledgeDocumentsParams {
  return {
    page: filters.page,
    limit: filters.limit,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.audience ? { audience: filters.audience } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
  };
}

/** CONTRACT: bỏ trống chi nhánh gửi `null` = áp dụng mọi chi nhánh. */
export function toAttachKnowledgePostDto(input: AttachKnowledgePostInput): AttachKnowledgePostDto {
  return { postId: input.postId, audience: input.audience, branchId: input.branchId ?? null };
}
