import { describe, expect, it } from 'vitest';
import {
  AnyContentPostType,
  ContentPostStatus,
  FacebookPublicationStatus as S,
} from '@/generated/api/content/content.schemas';
import {
  availableSocialActions,
  needsAttention,
  socialDeleteMode,
  type SocialActionContext,
} from './social-actions.policy';

const base: SocialActionContext = {
  postType: AnyContentPostType.SOCIAL,
  postStatus: ContentPostStatus.PUBLISHED,
  fbStatus: null,
  canManage: true,
  canPublish: true,
};

const actionsOf = (context: Partial<SocialActionContext>) =>
  availableSocialActions({ ...base, ...context }).map((item) => item.action);

describe('availableSocialActions — transition matrix', () => {
  it.each([
    [null, ['createDraft']],
    [S.DRAFT, ['editDraft', 'approve', 'cancel', 'delete']],
    [S.PENDING_APPROVAL, ['approve', 'reject', 'cancel', 'delete']],
    [S.FAILED, ['retry', 'reject', 'cancel', 'delete']],
    [S.UNCERTAIN, ['reconcile', 'delete']],
    [S.PUBLISHING, ['reconcile', 'delete']],
    [S.PUBLISHED, ['editCaption', 'delete']],
    [S.SCHEDULED, ['editCaption', 'delete']],
    [S.DELETED, ['createDraft']],
  ])('from %s', (fbStatus, expected) => {
    expect(actionsOf({ fbStatus })).toEqual(expected);
  });

  it('offers nothing on archived posts', () => {
    expect(actionsOf({ postStatus: ContentPostStatus.ARCHIVED, fbStatus: S.DRAFT })).toEqual([]);
  });
});

describe('availableSocialActions — permission gating', () => {
  it('social.post.manage only: draft/submit/cancel + local delete, no publish commands', () => {
    expect(actionsOf({ canPublish: false, fbStatus: S.DRAFT })).toEqual(['editDraft', 'submit', 'cancel', 'delete']);
    expect(actionsOf({ canPublish: false, fbStatus: S.PENDING_APPROVAL })).toEqual(['cancel', 'delete']);
    expect(actionsOf({ canPublish: false, fbStatus: S.FAILED })).toEqual(['cancel', 'delete']);
    expect(actionsOf({ canPublish: false, fbStatus: S.UNCERTAIN })).toEqual(['delete']);
    // Xoá bài đã lên Page cần thêm social.post.publish.
    expect(actionsOf({ canPublish: false, fbStatus: S.PUBLISHED })).toEqual([]);
  });

  it('social.post.publish only: approve/reject/retry/caption, no drafting and no delete (API guard is manage)', () => {
    expect(actionsOf({ canManage: false, fbStatus: S.DRAFT })).toEqual(['approve']);
    expect(actionsOf({ canManage: false, fbStatus: S.PENDING_APPROVAL })).toEqual(['approve', 'reject']);
    expect(actionsOf({ canManage: false, fbStatus: S.PUBLISHED })).toEqual(['editCaption']);
    expect(actionsOf({ canManage: false, fbStatus: null })).toEqual([]);
  });

  it('publisher posts straight from DRAFT (no Gửi duyệt step, no maker-checker)', () => {
    const draft = actionsOf({ fbStatus: S.DRAFT });
    expect(draft).toContain('approve');
    expect(draft).not.toContain('submit');
    expect(availableSocialActions({ ...base, fbStatus: S.PENDING_APPROVAL })[0]).toEqual({ action: 'approve' });
    expect(availableSocialActions({ ...base, fbStatus: S.FAILED })[0]).toEqual({ action: 'retry' });
  });
});

describe('socialDeleteMode — matches API classifyDelete', () => {
  it.each([
    [S.PUBLISHED, 'FACEBOOK'],
    [S.SCHEDULED, 'FACEBOOK'],
    [S.DRAFT, 'LOCAL'],
    [S.PENDING_APPROVAL, 'LOCAL'],
    [S.FAILED, 'LOCAL'],
    [S.PUBLISHING, 'RECONCILE_FIRST'],
    [S.UNCERTAIN, 'RECONCILE_FIRST'],
    [S.DELETED, 'NONE'],
    [null, 'NONE'],
  ])('%s → %s', (fbStatus, mode) => {
    expect(socialDeleteMode(fbStatus)).toBe(mode);
  });
});

describe('needsAttention', () => {
  it('flags failed and uncertain only', () => {
    expect(needsAttention(S.FAILED)).toBe(true);
    expect(needsAttention(S.UNCERTAIN)).toBe(true);
    expect(needsAttention(S.PUBLISHED)).toBe(false);
    expect(needsAttention(undefined)).toBe(false);
  });
});
