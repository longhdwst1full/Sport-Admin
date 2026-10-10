import type { StatusPresentation } from '@/foundation/management';
import { toOptions } from '@/shared/utils/options';
import {
  BannerPlacement,
  BannerStatus,
} from '@/generated/api/content/content.schemas';

/** PERMISSION: chỉ điều khiển affordance; API vẫn chặn `cms.content.*` ở mọi endpoint banner. */
export const BANNER_PERMISSION = {
  VIEW: 'cms.content.view',
  MANAGE: 'cms.content.manage',
} as const;

/** Giới hạn độ dài khớp `@maxLength` của `CreateBannerDto`/`SetBannerStatusDto`. */
export const BANNER_LIMITS = {
  TITLE_MAX: 255,
  SUBTITLE_MAX: 500,
  CTA_MAX: 64,
  TARGET_URL_MAX: 2000,
  SORT_ORDER_MAX: 100000,
  REASON_MAX: 500,
  SEARCH_MAX: 100,
} as const;

/**
 * Cùng luật với `BANNER_TARGET_URL_PATTERN` của API: đường dẫn nội bộ `/...` (không phải `//` hay `/\`)
 * hoặc URL https. Kiểm sớm ở form để báo lỗi đúng ô; API vẫn là nơi chặn thật.
 */
export const BANNER_TARGET_URL_PATTERN = /^(?:\/(?![/\\])\S*|https:\/\/\S+)$/;

export const bannerPlacementLabels: Record<BannerPlacement, string> = {
  [BannerPlacement.HOME_HERO]: 'Trang chủ — Hero slider',
  [BannerPlacement.HOME_PROMO]: 'Trang chủ — Thẻ khuyến mãi',
  [BannerPlacement.FOOTER]: 'Chân trang',
  [BannerPlacement.CATEGORY_TOP]: 'Đầu trang danh mục',
};

export const bannerPlacementOptions = toOptions(bannerPlacementLabels);

export const bannerStatusPresentation: Record<BannerStatus, StatusPresentation> = {
  [BannerStatus.DRAFT]: { label: 'Bản nháp', color: 'neutral' },
  [BannerStatus.PUBLISHED]: { label: 'Đã xuất bản', color: 'success' },
  [BannerStatus.ARCHIVED]: { label: 'Đã lưu trữ', color: 'neutral' },
};

export const bannerStatusOptions = toOptions(bannerStatusPresentation);

/** Banner PUBLISHED có đang chạy không (cờ `isLive` do API tính theo khung giờ). */
export const BANNER_LIVENESS = {
  LIVE: 'LIVE',
  OUT_OF_WINDOW: 'OUT_OF_WINDOW',
} as const;
export type BannerLiveness = (typeof BANNER_LIVENESS)[keyof typeof BANNER_LIVENESS];

export const bannerLivenessPresentation: Record<BannerLiveness, StatusPresentation> = {
  [BANNER_LIVENESS.LIVE]: { label: 'Đang chạy', color: 'success' },
  [BANNER_LIVENESS.OUT_OF_WINDOW]: { label: 'Ngoài khung giờ', color: 'neutral' },
};

/** Mã lỗi ổn định của API (`api/src/modules/cms/banners/banner.constants.ts`) mà UI phản ứng riêng. */
export const BANNER_ERROR_CODE = {
  NOT_FOUND: 'CMS_BANNER_NOT_FOUND',
  VERSION_STALE: 'CMS_BANNER_VERSION_STALE',
  MEDIA_INACTIVE: 'CMS_BANNER_MEDIA_INACTIVE',
  INVALID_WINDOW: 'CMS_BANNER_INVALID_WINDOW',
  CATEGORY_NOT_ALLOWED: 'CMS_BANNER_CATEGORY_NOT_ALLOWED',
  CATEGORY_NOT_FOUND: 'CMS_BANNER_CATEGORY_NOT_FOUND',
  ARCHIVED: 'CMS_BANNER_ARCHIVED',
} as const;

/** CONCURRENCY: dữ liệu đang hiển thị đã cũ — phải tải lại trước khi cho thao tác tiếp. */
export const BANNER_STALE_ERROR_CODES: ReadonlySet<string> = new Set([
  BANNER_ERROR_CODE.VERSION_STALE,
  BANNER_ERROR_CODE.ARCHIVED,
  BANNER_ERROR_CODE.NOT_FOUND,
]);
