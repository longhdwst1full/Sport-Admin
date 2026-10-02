import dayjs, { type Dayjs } from 'dayjs';
import {
  BannerPlacement,
  type BannerDto,
  type CreateBannerDto,
  type UpdateBannerDto,
} from '@/generated/api/content/content.schemas';

/** Ảnh trong form: `assetId` là thứ API cần; `url` chỉ để xem trước. */
export interface BannerImageValue {
  url: string;
  assetId?: string;
}

export interface BannerFormValues {
  placement: BannerPlacement;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  targetUrl?: string;
  categoryId?: string;
  /** RangePicker cho phép trống từng đầu: bỏ trống bắt đầu = hiệu lực ngay, bỏ trống kết thúc = không hết hạn. */
  schedule?: [Dayjs | null, Dayjs | null];
  sortOrder?: number;
  desktopImage?: BannerImageValue;
  mobileImage?: BannerImageValue;
}

export const EMPTY_BANNER_FORM: BannerFormValues = {
  placement: BannerPlacement.HOME_HERO,
  sortOrder: 0,
};

const toImage = (url: string | null, assetId: string | null): BannerImageValue | undefined =>
  url && assetId ? { url, assetId } : undefined;

export function toBannerFormValues(banner: BannerDto): BannerFormValues {
  return {
    placement: banner.placement,
    title: banner.title ?? undefined,
    subtitle: banner.subtitle ?? undefined,
    ctaText: banner.ctaText ?? undefined,
    targetUrl: banner.targetUrl ?? undefined,
    categoryId: banner.categoryId ?? undefined,
    schedule:
      banner.startsAt || banner.endsAt
        ? [banner.startsAt ? dayjs(banner.startsAt) : null, banner.endsAt ? dayjs(banner.endsAt) : null]
        : undefined,
    sortOrder: banner.sortOrder,
    desktopImage: toImage(banner.desktopImageUrl, banner.desktopAssetId),
    mobileImage: toImage(banner.mobileImageUrl, banner.mobileAssetId),
  };
}

const text = (value?: string) => value?.trim() || undefined;

/** CONTRACT: danh mục chỉ hợp lệ với CATEGORY_TOP (API trả 400 CMS_BANNER_CATEGORY_NOT_ALLOWED). */
const categoryFor = (values: BannerFormValues) =>
  values.placement === BannerPlacement.CATEGORY_TOP ? values.categoryId : undefined;

export function toCreateBannerDto(values: BannerFormValues): CreateBannerDto {
  const [startsAt, endsAt] = values.schedule ?? [null, null];
  return {
    placement: values.placement,
    title: text(values.title),
    subtitle: text(values.subtitle),
    ctaText: text(values.ctaText),
    targetUrl: text(values.targetUrl),
    desktopAssetId: values.desktopImage?.assetId ?? '',
    mobileAssetId: values.mobileImage?.assetId,
    categoryId: categoryFor(values),
    startsAt: startsAt?.toISOString(),
    endsAt: endsAt?.toISOString(),
    sortOrder: values.sortOrder ?? 0,
  };
}

/**
 * CONTRACT (PATCH): gửi đủ mọi trường form quản lý; trường tuỳ chọn bị xoá gửi `null` (API hiểu là
 * xoá giá trị), không gửi `undefined` vì như thế API giữ nguyên giá trị cũ.
 */
export function toUpdateBannerDto(values: BannerFormValues, expectedVersion: string): UpdateBannerDto {
  const [startsAt, endsAt] = values.schedule ?? [null, null];
  return {
    expectedVersion,
    placement: values.placement,
    title: text(values.title) ?? null,
    subtitle: text(values.subtitle) ?? null,
    ctaText: text(values.ctaText) ?? null,
    targetUrl: text(values.targetUrl) ?? null,
    desktopAssetId: values.desktopImage?.assetId,
    mobileAssetId: values.mobileImage?.assetId ?? null,
    categoryId: categoryFor(values) ?? null,
    startsAt: startsAt?.toISOString() ?? null,
    endsAt: endsAt?.toISOString() ?? null,
    sortOrder: values.sortOrder ?? 0,
  };
}
