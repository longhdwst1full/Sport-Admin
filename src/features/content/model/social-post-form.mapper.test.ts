// @vitest-environment jsdom
import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { FacebookPublishType as T } from '@/generated/api/content/content.schemas';
import {
  captionLength,
  composeCaption,
  maxMediaFor,
  scheduleWindowError,
  socialMediaRuleViolation,
  toCreateSocialPostDto,
  toSocialFormValues,
  toUpdateFacebookDraftDto,
} from './social-post-form.mapper';
import type { SocialPostDetailDto } from '@/generated/api/content/content.schemas';

describe('socialMediaRuleViolation', () => {
  it('mirrors the API media rules', () => {
    expect(socialMediaRuleViolation(T.FEED, [])).toBeUndefined();
    expect(socialMediaRuleViolation(T.FEED, ['IMAGE'])).toBeDefined();
    expect(socialMediaRuleViolation(T.PHOTOS, [])).toBeDefined();
    expect(socialMediaRuleViolation(T.PHOTOS, Array(10).fill('IMAGE'))).toBeUndefined();
    expect(socialMediaRuleViolation(T.PHOTOS, Array(11).fill('IMAGE'))).toBeDefined();
    expect(socialMediaRuleViolation(T.PHOTOS, ['IMAGE', 'VIDEO'])).toBeDefined();
    expect(socialMediaRuleViolation(T.VIDEO, ['VIDEO'])).toBeUndefined();
    expect(socialMediaRuleViolation(T.REEL, ['VIDEO', 'VIDEO'])).toBeDefined();
    expect(socialMediaRuleViolation(T.REEL, ['IMAGE'])).toBeDefined();
  });

  it('caps the picker per publish type', () => {
    expect([T.FEED, T.PHOTOS, T.VIDEO, T.REEL].map(maxMediaFor)).toEqual([0, 10, 1, 1]);
  });
});

describe('composeCaption', () => {
  it('appends the link once', () => {
    expect(composeCaption(' Xin chào ', 'https://shop.vn/p/1')).toBe('Xin chào\n\nhttps://shop.vn/p/1');
    expect(composeCaption('Xem https://shop.vn/p/1', 'https://shop.vn/p/1')).toBe('Xem https://shop.vn/p/1');
    expect(composeCaption('', 'https://shop.vn')).toBe('https://shop.vn');
    expect(composeCaption('Chỉ chữ')).toBe('Chỉ chữ');
  });
});

describe('DTO mapping', () => {
  const values = {
    title: '  ',
    body: 'Caption',
    link: 'https://shop.vn',
    publishType: T.PHOTOS,
    media: [
      { id: '2', url: 'u2', kind: 'IMAGE' as const },
      { id: '1', url: 'u1', kind: 'IMAGE' as const },
    ],
  };

  it('creates a SOCIAL post with ordered media and link in the caption', () => {
    expect(toCreateSocialPostDto(values)).toEqual({
      title: undefined,
      body: 'Caption\n\nhttps://shop.vn',
      mediaAssetIds: ['2', '1'],
    });
  });

  it('never sends title/body when updating a website post draft', () => {
    expect(toUpdateFacebookDraftDto(values, 4, false)).toEqual({ expectedVersion: 4, mediaAssetIds: ['2', '1'] });
    expect(toUpdateFacebookDraftDto(values, 4, true).body).toBe('Caption\n\nhttps://shop.vn');
  });
});

describe('caption HTML boundary', () => {
  const base = { title: 'T', link: undefined, publishType: T.FEED, media: [] };

  it('sends editor HTML as plain text (<br>, entities)', () => {
    expect(toCreateSocialPostDto({ ...base, body: '<p>Giày &amp; dép<br>Giảm 10% &lt;3</p>' }).body).toBe(
      'Giày & dép\nGiảm 10% <3',
    );
  });

  it('loads a plain caption into editor HTML', () => {
    const detail = { title: 'T', body: 'A & B\n<ok>', facebook: undefined, tiktok: undefined } as unknown as SocialPostDetailDto;
    expect(toSocialFormValues(detail).body).toBe('A &amp; B<br>&lt;ok&gt;');
  });

  it('counts caption length on plain text', () => {
    expect(captionLength('<p>a&amp;b</p>')).toBe(3);
    expect(captionLength('')).toBe(0);
  });
});

describe('scheduleWindowError', () => {
  const now = new Date('2026-10-03T08:00:00Z');
  it('accepts 10 minutes to 30 days ahead', () => {
    expect(scheduleWindowError(undefined, now)).toBeUndefined();
    expect(scheduleWindowError(dayjs(now).add(9, 'minute'), now)).toContain('10 phút');
    expect(scheduleWindowError(dayjs(now).add(10, 'minute'), now)).toBeUndefined();
    expect(scheduleWindowError(dayjs(now).add(30, 'day'), now)).toBeUndefined();
    expect(scheduleWindowError(dayjs(now).add(30, 'day').add(1, 'minute'), now)).toContain('30 ngày');
  });
});
