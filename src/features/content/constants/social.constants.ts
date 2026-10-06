import type { StatusPresentation } from '@/foundation/management';
import {
  AnyContentPostType,
  FacebookPublicationOrigin,
  FacebookPublicationStatus,
  FacebookPublishType,
  SocialChannel as ApiSocialChannel,
  TikTokPrivacyLevel,
  TikTokPublishPhase,
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
  SOCIAL: 'social',
} as const;
export type ContentTab = (typeof CONTENT_TAB)[keyof typeof CONTENT_TAB];

/** Giá trị `?tab=` cũ của tab "Facebook"; link đã gửi trước đây được chuyển sang tab Mạng xã hội. */
export const LEGACY_SOCIAL_TAB = 'facebook';

export const contentTabs: Array<{ key: ContentTab; label: string }> = [
  { key: CONTENT_TAB.ALL, label: 'Tất cả' },
  { key: CONTENT_TAB.SOCIAL, label: 'Mạng xã hội' },
];

/**
 * Công tắc kênh TikTok ở Admin (lọc kênh, soạn bài, dashboard). Contract TikTok đã có (API D99 phase 2b);
 * giữ hằng này để tắt nhanh UI nếu cần mà không gỡ code.
 */
export const TIKTOK_ENABLED = true;
export const TIKTOK_DISABLED_HINT = 'Kênh TikTok đang tắt';

/** Kênh mạng xã hội; giá trị URL viết thường (`?channel=`). */
export const SOCIAL_CHANNEL = {
  FACEBOOK: 'facebook',
  TIKTOK: 'tiktok',
} as const;
export type SocialChannel = (typeof SOCIAL_CHANNEL)[keyof typeof SOCIAL_CHANNEL];

export const socialChannelLabels: Record<SocialChannel, string> = {
  [SOCIAL_CHANNEL.FACEBOOK]: 'Facebook',
  [SOCIAL_CHANNEL.TIKTOK]: 'TikTok',
};

/** Kênh URL (viết thường) → enum kênh của contract. */
export const API_SOCIAL_CHANNEL: Record<SocialChannel, ApiSocialChannel> = {
  [SOCIAL_CHANNEL.FACEBOOK]: ApiSocialChannel.FACEBOOK,
  [SOCIAL_CHANNEL.TIKTOK]: ApiSocialChannel.TIKTOK,
};

/** Enum kênh của contract → kênh URL (viết thường). */
export const fromApiSocialChannel = (channel: ApiSocialChannel): SocialChannel =>
  channel === ApiSocialChannel.TIKTOK ? SOCIAL_CHANNEL.TIKTOK : SOCIAL_CHANNEL.FACEBOOK;

/** Kênh bật được ở thời điểm build; TikTok chỉ có khi `TIKTOK_ENABLED`. */
export const isSocialChannelEnabled = (channel: SocialChannel) => channel !== SOCIAL_CHANNEL.TIKTOK || TIKTOK_ENABLED;

/** Nhãn quyền riêng tư TikTok (enum `TikTokPrivacyLevel` của contract). */
export const tiktokPrivacyLabels: Record<TikTokPrivacyLevel, string> = {
  [TikTokPrivacyLevel.PUBLIC_TO_EVERYONE]: 'Công khai',
  [TikTokPrivacyLevel.MUTUAL_FOLLOW_FRIENDS]: 'Bạn bè (theo dõi lẫn nhau)',
  [TikTokPrivacyLevel.FOLLOWER_OF_CREATOR]: 'Người theo dõi',
  [TikTokPrivacyLevel.SELF_ONLY]: 'Chỉ mình tôi',
};

export const tiktokPublishPhaseLabels: Record<TikTokPublishPhase, string> = {
  [TikTokPublishPhase.INIT]: 'Khởi tạo',
  [TikTokPublishPhase.UPLOADING]: 'Đang tải video lên',
  [TikTokPublishPhase.PROCESSING]: 'TikTok đang xử lý',
};

/** Khớp `SOCIAL_TIKTOK_LIMIT`/policy của API. */
export const TIKTOK_LIMITS = {
  /** Caption TikTok (posts.body dùng chung các kênh). */
  CAPTION_MAX: 2200,
  /** Số lần init tối đa (1 + 2 lần init lại). */
  MAX_INITS: 3,
} as const;

/** Id video TikTok nhập tay khi đối soát (chỉ chữ số). */
export const TIKTOK_POST_ID_PATTERN = /^\d+$/;

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

/**
 * Loại đăng chọn được khi soạn. Video/Reel dùng video tải lên ngay trong picker (tải theo phần);
 * `current` giữ lại loại của bài đang sửa nếu sau này có loại bị ẩn khỏi danh sách soạn.
 */
const COMPOSABLE_PUBLISH_TYPES: readonly FacebookPublishType[] = [
  FacebookPublishType.FEED,
  FacebookPublishType.PHOTOS,
  FacebookPublishType.VIDEO,
  FacebookPublishType.REEL,
];

export const composablePublishTypeOptions = (current?: FacebookPublishType) =>
  fbPublishTypeOptions.filter((option) => COMPOSABLE_PUBLISH_TYPES.includes(option.value) || option.value === current);

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
  [AnyContentPostType.SOCIAL]: 'Chỉ mạng xã hội',
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
  DELETE_NEEDS_RECONCILE: 'SOCIAL_DELETE_NEEDS_RECONCILE',
  DELETE_REASON_REQUIRED: 'SOCIAL_DELETE_REASON_REQUIRED',
  PUBLISH_PERMISSION_REQUIRED: 'SOCIAL_PUBLISH_PERMISSION_REQUIRED',
  STORAGE_DISABLED: 'SOCIAL_STORAGE_DISABLED',
  CONTENT_EDIT_NOT_ALLOWED: 'SOCIAL_CONTENT_EDIT_NOT_ALLOWED',
  ALREADY_TIKTOK_POST: 'SOCIAL_ALREADY_TIKTOK_POST',
  TIKTOK_NOT_CONFIGURED: 'SOCIAL_TIKTOK_NOT_CONFIGURED',
  TIKTOK_NOT_CONNECTED: 'SOCIAL_TIKTOK_NOT_CONNECTED',
  TIKTOK_ERROR: 'SOCIAL_TIKTOK_ERROR',
  TIKTOK_STATE_INVALID: 'SOCIAL_TIKTOK_STATE_INVALID',
  TIKTOK_OPTIONS_INVALID: 'SOCIAL_TIKTOK_OPTIONS_INVALID',
  TIKTOK_CAPTION_TOO_LONG: 'SOCIAL_TIKTOK_CAPTION_TOO_LONG',
  TIKTOK_CONSENT_REQUIRED: 'SOCIAL_TIKTOK_CONSENT_REQUIRED',
  DASHBOARD_RANGE_INVALID: 'SOCIAL_DASHBOARD_RANGE_INVALID',
  SYNC_RUNNING: 'SOCIAL_SYNC_RUNNING',
} as const;

/** Mã chi tiết của SOCIAL_TIKTOK_OPTIONS_INVALID cho phần công bố nội dung thương mại (khớp `TIKTOK_OPTIONS_DETAIL` API). */
export const TIKTOK_OPTIONS_DETAIL = {
  COMMERCIAL_CONTENT_UNSPECIFIED: 'TIKTOK_COMMERCIAL_CONTENT_UNSPECIFIED',
  BRANDED_CONTENT_PRIVATE: 'TIKTOK_BRANDED_CONTENT_PRIVATE',
} as const;

/** Mã chi tiết của SOCIAL_CONTENT_EDIT_NOT_ALLOWED: kênh còn lại đã rời nháp nên caption chung bị khoá. */
export const SOCIAL_CONTENT_EDIT_DETAIL = {
  FACEBOOK_NOT_DRAFT: 'FACEBOOK_NOT_DRAFT',
  TIKTOK_NOT_DRAFT: 'TIKTOK_NOT_DRAFT',
} as const;

/** CONCURRENCY: dữ liệu đang hiển thị đã cũ — tải lại danh sách/chi tiết trước khi cho thao tác tiếp. */
export const SOCIAL_STALE_ERROR_CODES: ReadonlySet<string> = new Set([
  SOCIAL_ERROR_CODE.VERSION_STALE,
  SOCIAL_ERROR_CODE.INVALID_TRANSITION,
  SOCIAL_ERROR_CODE.POST_NOT_FOUND,
  SOCIAL_ERROR_CODE.IDEMPOTENCY_CONFLICT,
  // Danh sách hiện trạng thái chưa đăng nhưng bài vừa vào PUBLISHING/UNCERTAIN → tải lại để hiện nút Đối soát.
  SOCIAL_ERROR_CODE.DELETE_NEEDS_RECONCILE,
]);

/** Cấu hình Facebook nằm ở tham số hệ thống (nhóm INTEGRATION), không có màn riêng. */
export const FACEBOOK_SETTINGS_PATH = '/system-parameters';
export const FACEBOOK_PARAMETER_CODES = ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'] as const;
/** App TikTok cấu hình ở Tham số hệ thống; token do API tự ghi khi kết nối. */
export const TIKTOK_PARAMETER_CODES = ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'] as const;

/**
 * Trang Admin nhận redirect OAuth của TikTok (`code` + `state`). PHẢI trùng tham số `TIKTOK_REDIRECT_URI`
 * (origin Admin + đường dẫn này) và Redirect URI khai ở TikTok Developer Portal.
 */
export const TIKTOK_CALLBACK_PATH = '/content/social/tiktok/callback';
/** sessionStorage: nơi quay về sau khi kết nối TikTok xong. */
export const TIKTOK_CONNECT_RETURN_KEY = 'dctd.admin.tiktok-connect-return';
export const TIKTOK_CONNECT_DEFAULT_RETURN = '/content?tab=social';
