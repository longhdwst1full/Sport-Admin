import type { StatusPresentation } from '@/foundation/management';
import { toOptions } from '@/shared/utils/options';
import type { MediaAssetStatus, MediaUsageType } from '@/generated/api/media/media.schemas';

export const MEDIA_LIBRARY_PAGE_SIZE = 30;

/** PERMISSION: khớp `x-required-permissions` của listAdminMediaAssets / deleteAdminMediaAsset. */
export const MEDIA_PERMISSION = {
  VIEW: 'media.asset.view',
  MANAGE: 'media.asset.manage',
} as const;

/** `DeleteMediaAssetDto.reason`: 3-255 ký tự. */
export const MEDIA_DELETE_REASON = { MIN: 3, MAX: 255 } as const;

/** Mã lỗi xoá ảnh (`api/src/modules/media/media.constants.ts`). */
export const MEDIA_ERROR_CODE = {
  IN_USE: 'MEDIA_ASSET_IN_USE',
} as const;

export const mediaStatusPresentation: Record<MediaAssetStatus, StatusPresentation> = {
  ACTIVE: { label: 'Đang lưu', color: 'green' },
  DELETE_PENDING: { label: 'Đang xoá', color: 'gold' },
  INACTIVE: { label: 'Đã xoá khỏi Cloudinary', color: 'default' },
};

export const mediaStatusOptions = toOptions(mediaStatusPresentation);

export const mediaUsageLabels: Record<MediaUsageType, string> = {
  PRODUCT: 'Sản phẩm',
  BRAND_LOGO: 'Logo thương hiệu',
  CATEGORY_IMAGE: 'Ảnh danh mục',
  CONTENT_POST: 'Bài viết',
  CUSTOMER_AVATAR: 'Ảnh đại diện khách',
  PAYMENT_EVIDENCE: 'Bằng chứng thanh toán',
  PRODUCT_REVIEW: 'Đánh giá sản phẩm',
  BANNER: 'Banner',
  FACEBOOK_POST: 'Bài Facebook',
  TIKTOK_POST: 'Bài TikTok',
};

/**
 * Ảnh thay thế khi URL ảnh rỗng hoặc tải lỗi (antd `Image fallback`): khung xám có biểu tượng ảnh, nhúng sẵn
 * dạng data URI để không phụ thuộc mạng/CDN.
 */
export const IMAGE_FALLBACK_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f1f5f9"/>' +
      '<path d="M18 44l10-12 8 9 6-7 8 10z" fill="#cbd5e1"/><circle cx="40" cy="24" r="4" fill="#cbd5e1"/></svg>',
  );
