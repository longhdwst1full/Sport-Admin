import type { StatusPresentation } from '@/foundation/management';
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

export const mediaStatusOptions = (Object.keys(mediaStatusPresentation) as MediaAssetStatus[]).map((value) => ({
  value,
  label: mediaStatusPresentation[value].label,
}));

export const mediaUsageLabels: Record<MediaUsageType, string> = {
  PRODUCT: 'Sản phẩm',
  BRAND_LOGO: 'Logo thương hiệu',
  CATEGORY_IMAGE: 'Ảnh danh mục',
  CONTENT_POST: 'Bài viết',
  CUSTOMER_AVATAR: 'Ảnh đại diện khách',
  PAYMENT_EVIDENCE: 'Bằng chứng thanh toán',
  PRODUCT_REVIEW: 'Đánh giá sản phẩm',
  BANNER: 'Banner',
};
