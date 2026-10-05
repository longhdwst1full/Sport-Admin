import dayjs from 'dayjs';
import {
  AnyContentPostType,
  FacebookPublicationOrigin,
  FacebookPublicationStatus,
  SocialChannelFilter,
  type ListAdminSocialPostsParams,
  type SocialPostSummaryDto,
} from '@/generated/api/content/content.schemas';
import {
  CONTENT_TAB,
  type ContentTab,
  isSocialChannelEnabled,
  LEGACY_SOCIAL_TAB,
  SOCIAL_CHANNEL,
  type SocialChannel,
} from '../constants/social.constants';

/** Bộ lọc nằm trên URL (gửi link, F5 không mất); ô tìm kiếm debounce và chỉ sống trong màn. */
export interface SocialListFilters {
  tab: ContentTab;
  /** Chỉ có nghĩa ở tab Mạng xã hội; bỏ trống = mọi kênh. Kênh chưa bật (TikTok) bị bỏ qua. */
  channel?: SocialChannel;
  fbStatus?: FacebookPublicationStatus;
  /** Trạng thái bản đăng TikTok (cùng tập trạng thái với Facebook). */
  tiktokStatus?: FacebookPublicationStatus;
  postType?: AnyContentPostType;
  origin?: FacebookPublicationOrigin;
  /** Ngày `YYYY-MM-DD` theo giờ trình duyệt, bao gồm cả hai đầu. */
  from?: string;
  to?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseEnum<T extends string>(values: Record<string, T>, value: string | null): T | undefined {
  return value && Object.values(values).includes(value as T) ? (value as T) : undefined;
}

function parseDate(value: string | null): string | undefined {
  return value && DATE_PATTERN.test(value) && dayjs(value).isValid() ? value : undefined;
}

/** `?tab=facebook` (tên cũ) vẫn mở tab Mạng xã hội để link đã gửi không gãy. */
export function parseContentTab(value: string | null): ContentTab {
  return value === CONTENT_TAB.SOCIAL || value === LEGACY_SOCIAL_TAB ? CONTENT_TAB.SOCIAL : CONTENT_TAB.ALL;
}

export function parseSocialChannel(value: string | null): SocialChannel | undefined {
  const channel = parseEnum(SOCIAL_CHANNEL, value);
  return channel && isSocialChannelEnabled(channel) ? channel : undefined;
}

export function parseSocialFilters(params: URLSearchParams): SocialListFilters {
  const tab = parseContentTab(params.get('tab'));
  return {
    tab,
    channel: tab === CONTENT_TAB.SOCIAL ? parseSocialChannel(params.get('channel')) : undefined,
    fbStatus: parseEnum(FacebookPublicationStatus, params.get('fbStatus')),
    tiktokStatus: parseEnum(FacebookPublicationStatus, params.get('tiktokStatus')),
    postType: parseEnum(AnyContentPostType, params.get('postType')),
    origin: parseEnum(FacebookPublicationOrigin, params.get('origin')),
    from: parseDate(params.get('from')),
    to: parseDate(params.get('to')),
  };
}

/**
 * CONTRACT `channel`: tab "Tất cả" bỏ trống (mọi bài); tab Mạng xã hội: "Tất cả kênh" = ALL (bài có ít nhất một
 * bản đăng), Facebook/TikTok = chỉ bài có bản đăng kênh đó.
 */
function toChannelFilter(filters: SocialListFilters): SocialChannelFilter | undefined {
  if (filters.tab !== CONTENT_TAB.SOCIAL) return undefined;
  if (filters.channel === SOCIAL_CHANNEL.FACEBOOK) return SocialChannelFilter.FACEBOOK;
  if (filters.channel === SOCIAL_CHANNEL.TIKTOK) return SocialChannelFilter.TIKTOK;
  return SocialChannelFilter.ALL;
}

/**
 * CONTRACT: `from` bao gồm, `to` không bao gồm — ngày kết thúc người dùng chọn được đổi thành 00:00 ngày
 * hôm sau để cả ngày đó nằm trong kết quả.
 */
export function toSocialListParams(
  filters: SocialListFilters,
  paging: { page: number; limit: number; search?: string },
): ListAdminSocialPostsParams {
  return {
    page: paging.page,
    limit: paging.limit,
    channel: toChannelFilter(filters),
    fbStatus: filters.fbStatus,
    tiktokStatus: filters.tiktokStatus,
    postType: filters.postType,
    origin: filters.origin,
    from: filters.from ? dayjs(filters.from).startOf('day').toISOString() : undefined,
    to: filters.to ? dayjs(filters.to).add(1, 'day').startOf('day').toISOString() : undefined,
    search: paging.search || undefined,
  };
}

export const POST_CHANNEL = {
  WEBSITE: 'WEBSITE',
  FACEBOOK: 'FACEBOOK',
  TIKTOK: 'TIKTOK',
} as const;
export type PostChannel = (typeof POST_CHANNEL)[keyof typeof POST_CHANNEL];

type ChannelRow = Pick<SocialPostSummaryDto, 'postType' | 'facebook' | 'tiktok'>;

/**
 * Kênh của một bài: bài SOCIAL không bao giờ lên website; bài có `facebook`/`tiktok` là có bản đăng kênh đó.
 * Bản đăng DELETED vẫn hiện badge (kèm trạng thái "Đã xoá") để thấy lịch sử.
 */
export function postChannels(row: ChannelRow): PostChannel[] {
  const channels: PostChannel[] = [];
  if (row.postType !== AnyContentPostType.SOCIAL) channels.push(POST_CHANNEL.WEBSITE);
  if (row.facebook) channels.push(POST_CHANNEL.FACEBOOK);
  if (row.tiktok) channels.push(POST_CHANNEL.TIKTOK);
  return channels;
}

/** Kênh mạng xã hội của một bài (cột "Kênh"). */
export function socialChannels(row: ChannelRow): PostChannel[] {
  return postChannels(row).filter((channel) => channel !== POST_CHANNEL.WEBSITE);
}
