import { describe, expect, it } from 'vitest';
import {
  AnyContentPostType,
  ContentPostStatus,
  FacebookPublicationStatus as S,
} from '@/generated/api/content/content.schemas';
import {
  availableSocialActions,
  needsAttention,
  SELF_APPROVAL_REASON,
  type SocialActionContext,
} from './social-actions.policy';

const base: SocialActionContext = {
  postType: AnyContentPostType.SOCIAL,
  postStatus: ContentPostStatus.PUBLISHED,
  fbStatus: null,
  canManage: true,
  canPublish: true,
  currentUserId: '7',
};

const actionsOf = (context: Partial<SocialActionContext>) =>
  availableSocialActions({ ...base, ...context }).map((item) => item.action);

describe('availableSocialActions — transition matrix', () => {
  it.each([
    [null, ['createDraft']],
    [S.DRAFT, ['editDraft', 'submit', 'cancel']],
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
    expect(actionsOf({ canManage: false, fbStatus: S.DRAFT })).toEqual([]);
    expect(actionsOf({ canManage: false, fbStatus: S.PENDING_APPROVAL })).toEqual(['approve', 'reject']);
    expect(actionsOf({ canManage: false, fbStatus: null })).toEqual([]);
  });

  it('disables approve and retry for the submitter (maker-checker) with a reason', () => {
    const pending = availableSocialActions({ ...base, fbStatus: S.PENDING_APPROVAL, submittedById: '7' });
    expect(pending.find((item) => item.action === 'approve')?.disabledReason).toBe(SELF_APPROVAL_REASON);
    expect(pending.find((item) => item.action === 'reject')?.disabledReason).toBeUndefined();
    const failed = availableSocialActions({ ...base, fbStatus: S.FAILED, submittedById: '7' });
    expect(failed.find((item) => item.action === 'retry')?.disabledReason).toBe(SELF_APPROVAL_REASON);
  });

  it('keeps approve enabled for another user or an unknown submitter', () => {
    expect(availableSocialActions({ ...base, fbStatus: S.PENDING_APPROVAL, submittedById: '8' })[0]).toEqual({ action: 'approve' });
    expect(availableSocialActions({ ...base, fbStatus: S.PENDING_APPROVAL })[0]).toEqual({ action: 'approve' });
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
