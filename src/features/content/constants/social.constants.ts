import type { StatusPresentation } from '@/foundation/management';
import {
  AnyContentPostType,
  FacebookPublicationOrigin,
  FacebookPublicationStatus,
  FacebookPublishType,
} from '@/generated/api/content/content.schemas';

export const SOCIAL_PAGE_SIZE = 20;

/** PERMISSION: chỉ điều khiển affordance; API kiểm lại quyền ở mọi lệnh (D97, không maker-checker). */
export const SOCIAL_PERMISSION = {
  VIEW: 'cms.content.view',
  MANAGE: 'social.post.manage',
  PUBLISH: 'social.post.publish',
} as const;

/** Tab màn bài viết; giá trị nằm trên URL (`?tab=`). */
export const CONTENT_TAB = {
  ALL: 'all',
  FACEBOOK: 'facebook',
} as const;
export type ContentTab = (typeof CONTENT_TAB)[keyof typeof CONTENT_TAB];

export const contentTabs: Array<{ key: ContentTab; label: string }> = [
  { key: CONTENT_TAB.ALL, label: 'Tất cả' },
  { key: CONTENT_TAB.FACEBOOK, label: 'Facebook' },
];

/** Khớp `SOCIAL_LIMIT` của API (`cms/social/social.constants.ts`). */
export const SOCIAL_LIMITS = {
  TITLE_MAX: 255,
  MESSAGE_MAX: 63_206,
  MAX_IMAGES: 10,
  REASON_MIN: 3,
  REASON_MAX: 500,
  SEARCH_MAX: 100,
  /** Cửa sổ hẹn giờ của Graph API: 10 phút – 30 ngày tính từ lúc bấm. */
  SCHEDULE_MIN_LEAD_MS: 10 * 60 * 1000,
  SCHEDULE_MAX_LEAD_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

/** Post id Graph API của Page (`{pageId}_{postId}`) — dùng khi đối soát nhập tay. */
export const FB_POST_ID_PATTERN = /^\d+_\d+$/;

export const fbStatusPresentation: Record<FacebookPublicationStatus, StatusPresentation> = {
  [FacebookPublicationStatus.DRAFT]: { label: 'Nháp', color: 'default' },
  [FacebookPublicationStatus.PENDING_APPROVAL]: { label: 'Chờ duyệt', color: 'gold' },
  [FacebookPublicationStatus.SCHEDULED]: { label: 'Đã hẹn giờ', color: 'blue' },
  [FacebookPublicationStatus.PUBLISHING]: { label: 'Đang đăng', color: 'cyan' },
  [FacebookPublicationStatus.UNCERTAIN]: { label: 'Chưa rõ kết quả', color: 'orange' },
  [FacebookPublicationStatus.PUBLISHED]: { label: 'Đã đăng', color: 'green' },
  [FacebookPublicationStatus.FAILED]: { label: 'Lỗi', color: 'red' },
  [FacebookPublicationStatus.DELETED]: { label: 'Đã xoá', color: 'default' },
};

export const fbStatusOptions = Object.values(FacebookPublicationStatus).map((value) => ({
  value,
  label: fbStatusPresentation[value].label,
}));

export const fbPublishTypeLabels: Record<FacebookPublishType, string> = {
  [FacebookPublishType.FEED]: 'Bài viết',
  [FacebookPublishType.PHOTOS]: 'Ảnh',
  [FacebookPublishType.VIDEO]: 'Video',
  [FacebookPublishType.REEL]: 'Reel',
};

export const fbPublishTypeOptions = Object.values(FacebookPublishType).map((value) => ({
  value,
  label: fbPublishTypeLabels[value],
}));

export const fbOriginLabels: Record<FacebookPublicationOrigin, string> = {
  [FacebookPublicationOrigin.ADMIN]: 'Admin',
  [FacebookPublicationOrigin.FACEBOOK_IMPORT]: 'Nhập từ Facebook',
};

export const fbOriginOptions = Object.values(FacebookPublicationOrigin).map((value) => ({
  value,
  label: fbOriginLabels[value],
}));

export const postTypeLabels: Record<AnyContentPostType, string> = {
  [AnyContentPostType.NEWS]: 'Tin tức',
  [AnyContentPostType.TRAINING_GUIDE]: 'Cẩm nang tập luyện',
  [AnyContentPostType.PRODUCT_GUIDE]: 'Hướng dẫn sản phẩm',
  [AnyContentPostType.ABOUT]: 'Giới thiệu',
  [AnyContentPostType.POLICY]: 'Chính sách',
  [AnyContentPostType.SOCIAL]: 'Chỉ Facebook',
};

export const postTypeOptions = Object.values(AnyContentPostType).map((value) => ({
  value,
  label: postTypeLabels[value],
}));

/** Mã lỗi ổn định của API (`SOCIAL_ERROR` trong `cms/social/social.constants.ts`). */
export const SOCIAL_ERROR_CODE = {
  POST_NOT_FOUND: 'SOCIAL_POST_NOT_FOUND',
  NOT_FACEBOOK_POST: 'SOCIAL_NOT_FACEBOOK_POST',
  ALREADY_FACEBOOK_POST: 'SOCIAL_ALREADY_FACEBOOK_POST',
  POST_ARCHIVED: 'SOCIAL_POST_ARCHIVED',
  INVALID_TRANSITION: 'SOCIAL_INVALID_TRANSITION',
  VERSION_STALE: 'SOCIAL_VERSION_STALE',
  IDEMPOTENCY_KEY_INVALID: 'SOCIAL_IDEMPOTENCY_KEY_INVALID',
  IDEMPOTENCY_CONFLICT: 'SOCIAL_IDEMPOTENCY_CONFLICT',
  MEDIA_INVALID: 'SOCIAL_MEDIA_INVALID',
  MEDIA_NOT_FOUND: 'SOCIAL_MEDIA_NOT_FOUND',
  CONTENT_EMPTY: 'SOCIAL_CONTENT_EMPTY',
  SCHEDULE_OUT_OF_WINDOW: 'SOCIAL_SCHEDULE_OUT_OF_WINDOW',
  NOT_CONFIGURED: 'SOCIAL_FACEBOOK_NOT_CONFIGURED',
  PAGE_MISMATCH: 'SOCIAL_PAGE_MISMATCH',
  FACEBOOK_ERROR: 'SOCIAL_FACEBOOK_ERROR',
  RECONCILE_TOO_EARLY: 'SOCIAL_RECONCILE_TOO_EARLY',
  RECONCILE_INCONCLUSIVE: 'SOCIAL_RECONCILE_INCONCLUSIVE',
  STORAGE_DISABLED: 'SOCIAL_STORAGE_DISABLED',
} as const;

/** CONCURRENCY: dữ liệu đang hiển thị đã cũ — tải lại danh sách/chi tiết trước khi cho thao tác tiếp. */
export const SOCIAL_STALE_ERROR_CODES: ReadonlySet<string> = new Set([
  SOCIAL_ERROR_CODE.VERSION_STALE,
  SOCIAL_ERROR_CODE.INVALID_TRANSITION,
  SOCIAL_ERROR_CODE.POST_NOT_FOUND,
  SOCIAL_ERROR_CODE.IDEMPOTENCY_CONFLICT,
]);

/** Cấu hình Facebook nằm ở tham số hệ thống (nhóm INTEGRATION), không có màn riêng. */
export const FACEBOOK_SETTINGS_PATH = '/system-parameters';
export const FACEBOOK_PARAMETER_CODES = ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'] as const;
