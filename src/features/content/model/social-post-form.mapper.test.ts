import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { FacebookPublishType as T } from '@/generated/api/content/content.schemas';
import {
  composeCaption,
  maxMediaFor,
  scheduleWindowError,
  socialMediaRuleViolation,
  toCreateSocialPostDto,
  toUpdateFacebookDraftDto,
} from './social-post-form.mapper';

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
