import {
  TikTokPrivacyLevel,
  type TikTokCommercialContentDto,
  type TikTokCreatorInfoDto,
  type TikTokOptionsInputDto,
  type TikTokPublicationDto,
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
  /** Công bố nội dung thương mại (mặc định tắt theo Content Sharing Guidelines). */
  commercialContent: TikTokCommercialContentDto;
  /** Video do AI tạo (`is_aigc`). */
  isAigc: boolean;
}

export const NO_COMMERCIAL_CONTENT: TikTokCommercialContentDto = { enabled: false, yourBrand: false, brandedContent: false };

export const DEFAULT_TIKTOK_SETTINGS: TikTokPostSettingsForm = {
  privacyLevel: undefined,
  disableComment: false,
  disableDuet: false,
  disableStitch: false,
  commercialContent: NO_COMMERCIAL_CONTENT,
  isAigc: false,
};

/**
 * Văn bản bắt buộc theo TikTok Content Sharing Guidelines (developers.tiktok.com/doc/content-sharing-guidelines).
 * Câu tiếng Anh giữ nguyên văn của TikTok; câu tiếng Việt chỉ là bản dịch hiển thị kèm.
 */
export const TIKTOK_LEGAL_LINK = {
  MUSIC_USAGE: 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en',
  BRANDED_CONTENT_POLICY: 'https://www.tiktok.com/legal/page/global/bc-policy/en',
} as const;

export const TIKTOK_COMMERCIAL_TEXT = {
  TOGGLE_HINT: 'Bật nếu video quảng bá cho bạn, cho bên thứ ba, hoặc cả hai.',
  YOUR_BRAND_TITLE: 'Thương hiệu của bạn (Your brand)',
  YOUR_BRAND_DESCRIPTION:
    'Bạn đang quảng bá chính mình hoặc doanh nghiệp của mình. Nội dung được phân loại là Brand Organic. (You are promoting yourself or your own business. This content will be classified as Brand Organic.)',
  BRANDED_TITLE: 'Nội dung có thương hiệu (Branded content)',
  BRANDED_DESCRIPTION:
    'Bạn đang quảng bá cho một thương hiệu khác hoặc bên thứ ba. Nội dung được phân loại là Branded Content. (You are promoting another brand or a third party. This content will be classified as Branded Content.)',
  LABEL_PROMOTIONAL: 'Video sẽ được gắn nhãn "Promotional content" (Your photo/video will be labeled as \'Promotional content\').',
  LABEL_PAID_PARTNERSHIP: 'Video sẽ được gắn nhãn "Paid partnership" (Your photo/video will be labeled as \'Paid partnership\').',
  UNSPECIFIED:
    'Cần cho biết nội dung quảng bá cho bạn, cho bên thứ ba, hay cả hai. (You need to indicate if your content promotes yourself, a third party, or both.)',
  BRANDED_PRIVATE: 'Nội dung có thương hiệu không thể để chế độ riêng tư. (Branded content visibility cannot be set to private.)',
  AIGC: 'Video do AI tạo (TikTok gắn nhãn nội dung AI)',
} as const;

/**
 * Câu đồng ý phải hiện trước khi đăng: chỉ Music Usage Confirmation, hoặc thêm Branded Content Policy khi có
 * "Branded content" (kể cả khi chọn cả hai). `en` là nguyên văn TikTok yêu cầu.
 */
export function tiktokConsentDeclaration(brandedContent: boolean): {
  en: string;
  vi: string;
  links: Array<{ label: string; href: string }>;
} {
  const music = { label: 'Music Usage Confirmation', href: TIKTOK_LEGAL_LINK.MUSIC_USAGE };
  if (!brandedContent) {
    return {
      en: "By posting, you agree to TikTok's Music Usage Confirmation.",
      vi: 'Khi đăng, bạn đồng ý với Xác nhận sử dụng âm nhạc (Music Usage Confirmation) của TikTok.',
      links: [music],
    };
  }
  return {
    en: "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation.",
    vi: 'Khi đăng, bạn đồng ý với Chính sách nội dung có thương hiệu (Branded Content Policy) và Xác nhận sử dụng âm nhạc (Music Usage Confirmation) của TikTok.',
    links: [{ label: 'Branded Content Policy', href: TIKTOK_LEGAL_LINK.BRANDED_CONTENT_POLICY }, music],
  };
}

/** Lựa chọn hiệu lực: công tắc tắt thì không công bố gì. */
export function effectiveCommercialContent(value: TikTokCommercialContentDto | undefined): TikTokCommercialContentDto {
  return value?.enabled ? { enabled: true, yourBrand: value.yourBrand, brandedContent: value.brandedContent } : NO_COMMERCIAL_CONTENT;
}

/**
 * Lý do chưa được đăng vì phần công bố nội dung thương mại (khớp `SOCIAL_TIKTOK_OPTIONS_INVALID` của API):
 * bật mà chưa chọn gì, hoặc "Branded content" với quyền riêng tư "Chỉ mình tôi".
 */
export function commercialContentBlocker(
  settings: Pick<TikTokPostSettingsForm, 'privacyLevel' | 'commercialContent'>,
): string | undefined {
  const commercial = effectiveCommercialContent(settings.commercialContent);
  if (commercial.enabled && !commercial.yourBrand && !commercial.brandedContent) return TIKTOK_COMMERCIAL_TEXT.UNSPECIFIED;
  if (commercial.brandedContent && settings.privacyLevel === TikTokPrivacyLevel.SELF_ONLY) return TIKTOK_COMMERCIAL_TEXT.BRANDED_PRIVATE;
  return undefined;
}

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
    ...settings,
    privacyLevel:
      settings.privacyLevel && creator.privacyLevelOptions.includes(settings.privacyLevel) ? settings.privacyLevel : undefined,
    disableComment: settings.disableComment || creator.commentDisabled,
    disableDuet: settings.disableDuet || creator.duetDisabled,
    disableStitch: settings.disableStitch || creator.stitchDisabled,
  };
}

/** Thiết lập đã lưu của bản nháp TikTok → form. */
export function toTikTokSettingsForm(
  publication:
    | Pick<
        TikTokPublicationDto,
        'privacyLevel' | 'disableComment' | 'disableDuet' | 'disableStitch' | 'commercialContent' | 'isAigc'
      >
    | undefined,
): TikTokPostSettingsForm {
  if (!publication) return { ...DEFAULT_TIKTOK_SETTINGS };
  return {
    privacyLevel: publication.privacyLevel ?? undefined,
    disableComment: publication.disableComment,
    disableDuet: publication.disableDuet,
    disableStitch: publication.disableStitch,
    commercialContent: effectiveCommercialContent(publication.commercialContent),
    isAigc: publication.isAigc,
  };
}

export function toTikTokOptionsDto(settings: TikTokPostSettingsForm): TikTokOptionsInputDto {
  return {
    privacyLevel: settings.privacyLevel,
    disableComment: settings.disableComment,
    disableDuet: settings.disableDuet,
    disableStitch: settings.disableStitch,
    commercialContent: effectiveCommercialContent(settings.commercialContent),
    isAigc: settings.isAigc,
  };
}
