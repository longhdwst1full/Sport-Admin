import type {
  TikTokCreatorInfoDto,
  TikTokOptionsInputDto,
  TikTokPrivacyLevel,
  TikTokPublicationDto,
} from '@/generated/api/content/content.schemas';
import { SOCIAL_CHANNEL, type SocialChannel } from '../constants/social.constants';
import type { SocialMediaKind } from './social-post-form.mapper';

/**
 * Thiết lập đăng TikTok ở form soạn bài. `privacyLevel` để trống tới khi người soạn tự chọn: hướng dẫn UX của
 * TikTok Content Posting API yêu cầu người dùng chọn quyền riêng tư, không đặt sẵn giá trị mặc định.
 */
export interface TikTokPostSettingsForm {
  privacyLevel?: TikTokPrivacyLevel;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
}

export const DEFAULT_TIKTOK_SETTINGS: TikTokPostSettingsForm = {
  privacyLevel: undefined,
  disableComment: false,
  disableDuet: false,
  disableStitch: false,
};

export const TIKTOK_RULE_HINT = 'TikTok cần đúng 1 video và không hỗ trợ hẹn giờ. Nội dung bài là caption TikTok (tối đa 2.200 ký tự).';

export const TIKTOK_PRIVACY_REQUIRED = 'Chọn quyền riêng tư cho video TikTok.';

/** Media đăng TikTok: đúng một video, không kèm ảnh. Trả câu lỗi hoặc `undefined` khi hợp lệ. */
export function tiktokMediaViolation(kinds: readonly SocialMediaKind[]): string | undefined {
  const videos = kinds.filter((kind) => kind === 'VIDEO').length;
  if (videos !== 1 || kinds.length !== 1) return 'TikTok cần đúng 1 video, không kèm ảnh.';
  return undefined;
}

/** Form luôn còn ít nhất một kênh; bỏ chọn kênh cuối cùng thì giữ nguyên lựa chọn cũ. */
export function nextSelectedChannels(previous: SocialChannel[], next: SocialChannel[]): SocialChannel[] {
  return next.length ? next : previous.length ? previous : [SOCIAL_CHANNEL.FACEBOOK];
}

/**
 * PROVIDER: áp ràng buộc `creator_info` của tài khoản: quyền riêng tư phải nằm trong danh sách TikTok cho phép
 * (không thì bỏ chọn để người soạn chọn lại), tương tác mà tài khoản đã tắt thì bài cũng phải tắt.
 */
export function applyCreatorConstraints(
  settings: TikTokPostSettingsForm,
  creator: Pick<TikTokCreatorInfoDto, 'privacyLevelOptions' | 'commentDisabled' | 'duetDisabled' | 'stitchDisabled'> | undefined,
): TikTokPostSettingsForm {
  if (!creator) return settings;
  return {
    privacyLevel:
      settings.privacyLevel && creator.privacyLevelOptions.includes(settings.privacyLevel) ? settings.privacyLevel : undefined,
    disableComment: settings.disableComment || creator.commentDisabled,
    disableDuet: settings.disableDuet || creator.duetDisabled,
    disableStitch: settings.disableStitch || creator.stitchDisabled,
  };
}

/** Thiết lập đã lưu của bản nháp TikTok → form. */
export function toTikTokSettingsForm(
  publication: Pick<TikTokPublicationDto, 'privacyLevel' | 'disableComment' | 'disableDuet' | 'disableStitch'> | undefined,
): TikTokPostSettingsForm {
  if (!publication) return { ...DEFAULT_TIKTOK_SETTINGS };
  return {
    privacyLevel: publication.privacyLevel ?? undefined,
    disableComment: publication.disableComment,
    disableDuet: publication.disableDuet,
    disableStitch: publication.disableStitch,
  };
}

export function toTikTokOptionsDto(settings: TikTokPostSettingsForm): TikTokOptionsInputDto {
  return {
    privacyLevel: settings.privacyLevel,
    disableComment: settings.disableComment,
    disableDuet: settings.disableDuet,
    disableStitch: settings.disableStitch,
  };
}
