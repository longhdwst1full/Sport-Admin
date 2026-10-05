import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { AnyContentPostType, FacebookPublicationStatus } from '@/generated/api/content/content.schemas';
import { CONTENT_TAB } from '../constants/social.constants';
import {
  parseSocialFilters,
  postChannels,
  socialChannels,
  toSocialListParams,
} from './social-post-filters';

describe('parseSocialFilters', () => {
  it('reads known values and drops invalid ones', () => {
    const filters = parseSocialFilters(
      new URLSearchParams('tab=facebook&fbStatus=FAILED&postType=BOGUS&origin=FACEBOOK_IMPORT&from=2026-10-01&to=nope'),
    );
    expect(filters).toEqual({
      tab: CONTENT_TAB.SOCIAL,
      channel: undefined,
      fbStatus: FacebookPublicationStatus.FAILED,
      tiktokStatus: undefined,
      postType: undefined,
      origin: 'FACEBOOK_IMPORT',
      from: '2026-10-01',
      to: undefined,
    });
  });

  it('accepts the new tab value and the channel filter only on the social tab', () => {
    expect(parseSocialFilters(new URLSearchParams('tab=social&channel=facebook'))).toMatchObject({
      tab: CONTENT_TAB.SOCIAL,
      channel: 'facebook',
    });
    expect(parseSocialFilters(new URLSearchParams('channel=facebook')).channel).toBeUndefined();
  });

  it('accepts TikTok and the TikTok status filter', () => {
    expect(parseSocialFilters(new URLSearchParams('tab=social&channel=tiktok&tiktokStatus=PUBLISHING'))).toMatchObject({
      channel: 'tiktok',
      tiktokStatus: FacebookPublicationStatus.PUBLISHING,
    });
  });

  it('defaults to the "Tất cả" tab', () => {
    expect(parseSocialFilters(new URLSearchParams('tab=other')).tab).toBe(CONTENT_TAB.ALL);
  });
});

describe('toSocialListParams', () => {
  it('maps the social tab channel filter (ALL/FACEBOOK/TIKTOK)', () => {
    const paging = { page: 1, limit: 20 };
    expect(toSocialListParams({ tab: CONTENT_TAB.SOCIAL, channel: 'facebook' }, paging).channel).toBe('FACEBOOK');
    expect(toSocialListParams({ tab: CONTENT_TAB.SOCIAL, channel: 'tiktok' }, paging).channel).toBe('TIKTOK');
    expect(
      toSocialListParams({ tab: CONTENT_TAB.SOCIAL, tiktokStatus: FacebookPublicationStatus.FAILED }, paging),
    ).toMatchObject({ channel: 'ALL', tiktokStatus: 'FAILED' });
  });

  it('maps the social tab without channel to ALL and makes the end date inclusive', () => {
    const params = toSocialListParams(
      { tab: CONTENT_TAB.SOCIAL, from: '2026-10-01', to: '2026-10-03' },
      { page: 2, limit: 20, search: 'giày' },
    );
    expect(params.channel).toBe('ALL');
    expect(params.page).toBe(2);
    expect(params.search).toBe('giày');
    expect(params.from).toBe(dayjs('2026-10-01').startOf('day').toISOString());
    expect(params.to).toBe(dayjs('2026-10-04').startOf('day').toISOString());
  });

  it('omits channel and empty search on the "Tất cả" tab', () => {
    const params = toSocialListParams({ tab: CONTENT_TAB.ALL }, { page: 1, limit: 20, search: '' });
    expect(params.channel).toBeUndefined();
    expect(params.search).toBeUndefined();
    expect(params.from).toBeUndefined();
  });
});

describe('postChannels', () => {
  const facebook = {
    status: FacebookPublicationStatus.PUBLISHED,
    publishType: 'FEED' as const,
    origin: 'ADMIN' as const,
    mediaCount: 0,
    metrics: { reach: null, engagements: null },
    videoProcessing: false,
  };

  it('website-only, both, and Facebook-only posts', () => {
    expect(postChannels({ postType: AnyContentPostType.NEWS })).toEqual(['WEBSITE']);
    expect(postChannels({ postType: AnyContentPostType.NEWS, facebook })).toEqual(['WEBSITE', 'FACEBOOK']);
    expect(postChannels({ postType: AnyContentPostType.SOCIAL, facebook })).toEqual(['FACEBOOK']);
  });

  it('socialChannels drops the website channel', () => {
    expect(socialChannels({ postType: AnyContentPostType.NEWS })).toEqual([]);
    expect(socialChannels({ postType: AnyContentPostType.NEWS, facebook })).toEqual(['FACEBOOK']);
  });
});
