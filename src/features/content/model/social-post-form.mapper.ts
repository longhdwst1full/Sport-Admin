import type { Dayjs } from 'dayjs';
import {
  FacebookPublishType,
  SocialMediaDtoKind,
  type CreateFacebookDraftDto,
  type CreateSocialPostDto,
  type CreateTikTokDraftDto,
  type SocialChannel as ApiSocialChannel,
  type SocialMediaDto,
  type SocialPostDetailDto,
  type TikTokOptionsInputDto,
  type UpdateFacebookDraftDto,
  type UpdateTikTokDraftDto,
} from '@/generated/api/content/content.schemas';
import { SOCIAL_LIMITS } from '../constants/social.constants';

export type SocialMediaKind = 'IMAGE' | 'VIDEO';

/** Media trong form: `id` là thứ API cần; `url` chỉ để xem trước. */
export interface SocialMediaValue {
  id: string;
  url: string;
  kind: SocialMediaKind;
}

export interface SocialPostFormValues {
  title?: string;
  body: string;
  /** Chèn vào cuối caption khi lưu — contract không có trường link riêng (link đặt trong caption). */
  link?: string;
  publishType: FacebookPublishType;
  media: SocialMediaValue[];
}

export const EMPTY_SOCIAL_FORM: SocialPostFormValues = {
  body: '',
  publishType: FacebookPublishType.FEED,
  media: [],
};

/**
 * INVARIANT: bản sao `mediaRuleViolation` của API để báo lỗi đúng ô: FEED không media, PHOTOS 1–10 ảnh,
 * VIDEO/REEL đúng một video. Trả `undefined` khi hợp lệ.
 */
export function socialMediaRuleViolation(
  publishType: FacebookPublishType,
  kinds: readonly SocialMediaKind[],
): string | undefined {
  switch (publishType) {
    case FacebookPublishType.FEED:
      return kinds.length === 0 ? undefined : 'Bài viết dạng chữ không kèm ảnh/video. Đổi loại đăng sang Ảnh hoặc Video.';
    case FacebookPublishType.PHOTOS:
      if (kinds.length < 1 || kinds.length > SOCIAL_LIMITS.MAX_IMAGES) {
        return `Bài ảnh cần từ 1 đến ${SOCIAL_LIMITS.MAX_IMAGES} ảnh.`;
      }
      return kinds.every((kind) => kind === 'IMAGE') ? undefined : 'Bài ảnh chỉ nhận ảnh, không nhận video.';
    case FacebookPublishType.VIDEO:
    case FacebookPublishType.REEL:
      return kinds.length === 1 && kinds[0] === 'VIDEO' ? undefined : 'Video/Reel cần đúng một video.';
    default:
      return 'Loại bài đăng không hỗ trợ.';
  }
}

/** Số media tối đa người dùng được chọn cho từng loại đăng. */
export function maxMediaFor(publishType: FacebookPublishType): number {
  if (publishType === FacebookPublishType.FEED) return 0;
  if (publishType === FacebookPublishType.PHOTOS) return SOCIAL_LIMITS.MAX_IMAGES;
  return 1;
}

/** Ghép link vào cuối caption (Facebook tự tạo preview); không ghép trùng nếu caption đã có link đó. */
export function composeCaption(body: string, link?: string): string {
  const text = body.trim();
  const url = link?.trim();
  if (!url || text.includes(url)) return text;
  return text ? `${text}\n\n${url}` : url;
}

const optionalText = (value?: string) => value?.trim() || undefined;

/** Tạo bài SOCIAL đa kênh: `tiktok` chỉ gửi khi có kênh TIKTOK. */
export function toCreateSocialPostDto(
  values: SocialPostFormValues,
  channels: ApiSocialChannel[] = [],
  tiktok?: TikTokOptionsInputDto,
): CreateSocialPostDto {
  return {
    title: optionalText(values.title),
    body: composeCaption(values.body, values.link),
    mediaAssetIds: values.media.map((item) => item.id),
    ...(channels.length ? { channels } : {}),
    ...(tiktok && channels.includes('TIKTOK') ? { tiktok } : {}),
  };
}

export function toCreateTikTokDraftDto(
  values: SocialPostFormValues,
  expectedVersion: number,
  options: TikTokOptionsInputDto,
): CreateTikTokDraftDto {
  return { expectedVersion, mediaAssetIds: values.media.map((item) => item.id), options };
}

/**
 * CONTRACT: tiêu đề/caption chỉ gửi với bài SOCIAL và khi caption chung chưa bị khoá (bản Facebook còn nháp);
 * bài website chỉ đổi video + thiết lập.
 */
export function toUpdateTikTokDraftDto(
  values: SocialPostFormValues,
  expectedVersion: number,
  editsCaption: boolean,
  options: TikTokOptionsInputDto,
): UpdateTikTokDraftDto {
  return {
    expectedVersion,
    ...(editsCaption ? { title: optionalText(values.title), body: composeCaption(values.body, values.link) } : {}),
    mediaAssetIds: values.media.map((item) => item.id),
    options,
  };
}

/**
 * CONTRACT: tiêu đề/caption chỉ sửa được với bài SOCIAL; bài website chỉ đổi media (nội dung sửa ở màn
 * bài viết), nên không gửi `title`/`body` cho bài website.
 */
export function toUpdateFacebookDraftDto(
  values: SocialPostFormValues,
  expectedVersion: number,
  isSocial: boolean,
  captionLocked = false,
): UpdateFacebookDraftDto {
  return {
    expectedVersion,
    ...(isSocial ? { title: optionalText(values.title) } : {}),
    ...(isSocial && !captionLocked ? { body: composeCaption(values.body, values.link) } : {}),
    mediaAssetIds: values.media.map((item) => item.id),
  };
}

export function toCreateFacebookDraftDto(values: SocialPostFormValues, expectedVersion: number): CreateFacebookDraftDto {
  return { expectedVersion, mediaAssetIds: values.media.map((item) => item.id) };
}

const toMediaValues = (media: SocialMediaDto[]) =>
  media.flatMap((item): SocialMediaValue[] =>
    item.url
      ? [{ id: item.id, url: item.thumbnailUrl ?? item.url, kind: item.kind === SocialMediaDtoKind.VIDEO ? 'VIDEO' : 'IMAGE' }]
      : [],
  );

/**
 * API suy loại đăng từ media (Reel đã lưu hiển thị là VIDEO); media đã gỡ khỏi thư viện bị bỏ khỏi form.
 * `channel = 'tiktok'`: media của bản TikTok, loại đăng cố định Video.
 */
export function toSocialFormValues(detail: SocialPostDetailDto, channel: 'facebook' | 'tiktok' = 'facebook'): SocialPostFormValues {
  if (channel === 'tiktok') {
    return {
      title: detail.title,
      body: detail.body,
      publishType: FacebookPublishType.VIDEO,
      media: toMediaValues(detail.tiktok?.media ?? []),
    };
  }
  return {
    title: detail.title,
    body: detail.body,
    publishType: detail.facebook?.publishType ?? FacebookPublishType.FEED,
    media: toMediaValues(detail.facebook?.media ?? []),
  };
}

/** PROVIDER: cửa sổ hẹn giờ Graph API (10 phút – 30 ngày); kiểm sớm để không phải đợi 400 từ API. */
export function scheduleWindowError(scheduledAt: Dayjs | null | undefined, now: Date = new Date()): string | undefined {
  if (!scheduledAt) return undefined;
  const lead = scheduledAt.valueOf() - now.getTime();
  if (lead < SOCIAL_LIMITS.SCHEDULE_MIN_LEAD_MS) return 'Giờ hẹn phải cách hiện tại ít nhất 10 phút.';
  if (lead > SOCIAL_LIMITS.SCHEDULE_MAX_LEAD_MS) return 'Giờ hẹn không được quá 30 ngày kể từ bây giờ.';
  return undefined;
}
