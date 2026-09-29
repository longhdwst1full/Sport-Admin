import type { StatusPresentation } from '@/foundation/management';
import type { KnowledgeAudience, KnowledgeSourceType, KnowledgeStatus } from '@/generated/api/assistant/assistant.schemas';
import type { ContentPostType } from '@/generated/api/content/content.schemas';

export const KNOWLEDGE_PAGE_SIZE = 20;

/** PERMISSION: một mã cho cả màn và mọi thao tác; API vẫn chặn lại mọi lệnh. */
export const KNOWLEDGE_PERMISSION = {
  MANAGE: 'assistant.knowledge.manage',
} as const;

/** Bài CMS được đọc qua `listAdminPosts`, operation này đòi quyền xem nội dung. */
export const CMS_POST_VIEW_PERMISSION = 'cms.content.view';

/**
 * Mã lỗi ổn định của API tri thức (`api/src/modules/assistant/assistant.constants.ts`) mà UI phản ứng riêng.
 *
 * CONCURRENCY: VERSION_CONFLICT / INVALID_TRANSITION nghĩa là dòng đang hiển thị đã cũ — tải lại danh sách.
 */
export const KNOWLEDGE_ERROR_CODE = {
  VERSION_CONFLICT: 'KNOWLEDGE_VERSION_CONFLICT',
  INVALID_TRANSITION: 'KNOWLEDGE_INVALID_TRANSITION',
  ALREADY_ATTACHED: 'KNOWLEDGE_ALREADY_ATTACHED',
  SOURCE_NOT_VISIBLE: 'KNOWLEDGE_SOURCE_NOT_VISIBLE',
  SOURCE_EMPTY: 'KNOWLEDGE_SOURCE_EMPTY',
} as const;

export const KNOWLEDGE_STALE_ERROR_CODES: ReadonlySet<string> = new Set([
  KNOWLEDGE_ERROR_CODE.VERSION_CONFLICT,
  KNOWLEDGE_ERROR_CODE.INVALID_TRANSITION,
]);

export const knowledgeAudiencePresentation: Record<KnowledgeAudience, StatusPresentation & { hint: string }> = {
  PUBLIC: { label: 'Công khai', color: 'green', hint: 'Mọi khách truy cập, kể cả chưa đăng nhập.' },
  CUSTOMER: { label: 'Khách hàng', color: 'cyan', hint: 'Chỉ khách đã đăng nhập.' },
  STAFF: { label: 'Nhân viên', color: 'blue', hint: 'Nhân viên cửa hàng/hỗ trợ.' },
  ADMIN: { label: 'Quản trị', color: 'purple', hint: 'Chỉ quản trị viên.' },
};

export const knowledgeStatusPresentation: Record<KnowledgeStatus, StatusPresentation> = {
  DRAFT: { label: 'Nháp', color: 'gold' },
  PUBLISHED: { label: 'Đang dùng', color: 'green' },
  ARCHIVED: { label: 'Đã lưu trữ', color: 'default' },
};

export const knowledgeAudienceOptions = Object.entries(knowledgeAudiencePresentation).map(
  ([value, { label }]) => ({ value, label }),
);

export const knowledgeStatusOptions = Object.entries(knowledgeStatusPresentation).map(
  ([value, { label }]) => ({ value, label }),
);

/** Nhãn loại bài CMS cho bộ lọc của ô chọn bài; enum lấy từ SDK content đã sinh. */
export const contentPostTypeLabels: Record<ContentPostType, string> = {
  NEWS: 'Tin tức',
  TRAINING_GUIDE: 'Hướng dẫn tập luyện',
  PRODUCT_GUIDE: 'Hướng dẫn sản phẩm',
  ABOUT: 'Giới thiệu',
  POLICY: 'Chính sách',
};

export const knowledgeSourceTypeLabels: Record<KnowledgeSourceType, string> = {
  CMS_POST: 'Bài CMS',
  MANUAL: 'Nhập tay',
};

export const ALL_BRANCHES_LABEL = 'Tất cả chi nhánh';
