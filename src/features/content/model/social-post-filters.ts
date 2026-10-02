import dayjs from 'dayjs';
import {
  AnyContentPostType,
  FacebookPublicationOrigin,
  FacebookPublicationStatus,
  ListAdminSocialPostsChannel,
  type ListAdminSocialPostsParams,
  type SocialPostSummaryDto,
} from '@/generated/api/content/content.schemas';
import { CONTENT_TAB, type ContentTab } from '../constants/social.constants';

/** Bộ lọc nằm trên URL (gửi link, F5 không mất); ô tìm kiếm debounce và chỉ sống trong màn. */
export interface SocialListFilters {
  tab: ContentTab;
  fbStatus?: FacebookPublicationStatus;
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

export function parseSocialFilters(params: URLSearchParams): SocialListFilters {
  return {
    tab: params.get('tab') === CONTENT_TAB.FACEBOOK ? CONTENT_TAB.FACEBOOK : CONTENT_TAB.ALL,
    fbStatus: parseEnum(FacebookPublicationStatus, params.get('fbStatus')),
    postType: parseEnum(AnyContentPostType, params.get('postType')),
    origin: parseEnum(FacebookPublicationOrigin, params.get('origin')),
    from: parseDate(params.get('from')),
    to: parseDate(params.get('to')),
  };
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
    channel: filters.tab === CONTENT_TAB.FACEBOOK ? ListAdminSocialPostsChannel.FACEBOOK : undefined,
    fbStatus: filters.fbStatus,
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
} as const;
export type PostChannel = (typeof POST_CHANNEL)[keyof typeof POST_CHANNEL];

/**
 * Kênh của một bài: bài SOCIAL không bao giờ lên website; bài website có `facebook` chưa xoá là đăng cả hai.
 * Bản Facebook DELETED vẫn hiện badge (kèm trạng thái "Đã xoá") để thấy lịch sử.
 */
export function postChannels(row: Pick<SocialPostSummaryDto, 'postType' | 'facebook'>): PostChannel[] {
  const channels: PostChannel[] = [];
  if (row.postType !== AnyContentPostType.SOCIAL) channels.push(POST_CHANNEL.WEBSITE);
  if (row.facebook) channels.push(POST_CHANNEL.FACEBOOK);
  return channels;
}
