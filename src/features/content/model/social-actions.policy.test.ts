import { describe, expect, it } from 'vitest';
import {
  AnyContentPostType,
  ContentPostStatus,
  FacebookPublicationStatus as S,
} from '@/generated/api/content/content.schemas';
import {
  availableSocialActions,
  needsAttention,
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
    [S.DRAFT, ['editDraft', 'approve', 'cancel']],
    [S.PENDING_APPROVAL, ['approve', 'reject', 'cancel']],
    [S.FAILED, ['retry', 'reject', 'cancel']],
    [S.UNCERTAIN, ['reconcile']],
    [S.PUBLISHING, ['reconcile']],
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
  it('social.post.manage only: draft/submit/cancel, no publish commands', () => {
    expect(actionsOf({ canPublish: false, fbStatus: S.DRAFT })).toEqual(['editDraft', 'submit', 'cancel']);
    expect(actionsOf({ canPublish: false, fbStatus: S.PENDING_APPROVAL })).toEqual(['cancel']);
    expect(actionsOf({ canPublish: false, fbStatus: S.PUBLISHED })).toEqual([]);
  });

  it('social.post.publish only: approve/reject/retry/delete, no drafting', () => {
    expect(actionsOf({ canManage: false, fbStatus: S.DRAFT })).toEqual(['approve']);
    expect(actionsOf({ canManage: false, fbStatus: S.PENDING_APPROVAL })).toEqual(['approve', 'reject']);
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

describe('needsAttention', () => {
  it('flags failed and uncertain only', () => {
    expect(needsAttention(S.FAILED)).toBe(true);
    expect(needsAttention(S.UNCERTAIN)).toBe(true);
    expect(needsAttention(S.PUBLISHED)).toBe(false);
    expect(needsAttention(undefined)).toBe(false);
  });
});
