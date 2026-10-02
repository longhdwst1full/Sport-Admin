import {
  AnyContentPostType,
  ContentPostStatus,
  FacebookPublicationStatus as FbStatus,
  type FacebookPublicationStatus,
} from '@/generated/api/content/content.schemas';

/** Lệnh Facebook có tên — mỗi lệnh là một endpoint riêng, không bao giờ PATCH thẳng `fbStatus`. */
export type SocialAction =
  | 'createDraft'
  | 'editDraft'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'retry'
  | 'reconcile'
  | 'cancel'
  | 'delete'
  | 'editCaption';

export type SocialPermissionLevel = 'manage' | 'publish';

/**
 * INVARIANT: bản sao ma trận `FB_TRANSITIONS` của API (`cms/social/social.policy.ts`); `null` = bài chưa
 * có bản đăng Facebook. Chỉ là affordance — API vẫn trả 409 SOCIAL_INVALID_TRANSITION nếu hai bên lệch.
 */
export const SOCIAL_ACTION_RULES: Record<
  SocialAction,
  { from: ReadonlyArray<FacebookPublicationStatus | null>; permission: SocialPermissionLevel; makerChecker?: boolean }
> = {
  createDraft: { from: [null, FbStatus.DELETED], permission: 'manage' },
  editDraft: { from: [FbStatus.DRAFT], permission: 'manage' },
  submit: { from: [FbStatus.DRAFT], permission: 'manage' },
  approve: { from: [FbStatus.PENDING_APPROVAL], permission: 'publish', makerChecker: true },
  reject: { from: [FbStatus.PENDING_APPROVAL, FbStatus.FAILED], permission: 'publish' },
  retry: { from: [FbStatus.FAILED], permission: 'publish', makerChecker: true },
  reconcile: { from: [FbStatus.UNCERTAIN, FbStatus.PUBLISHING], permission: 'publish' },
  cancel: { from: [FbStatus.DRAFT, FbStatus.PENDING_APPROVAL, FbStatus.FAILED], permission: 'manage' },
  delete: { from: [FbStatus.PUBLISHED, FbStatus.SCHEDULED], permission: 'publish' },
  editCaption: { from: [FbStatus.PUBLISHED, FbStatus.SCHEDULED], permission: 'publish' },
};

/** Thứ tự hiển thị nút: hành động chính trước, huỷ/xoá cuối. */
const ACTION_ORDER: SocialAction[] = [
  'createDraft',
  'editDraft',
  'submit',
  'approve',
  'retry',
  'reconcile',
  'editCaption',
  'reject',
  'cancel',
  'delete',
];

export const SELF_APPROVAL_REASON = 'Bạn là người gửi duyệt bài này; người duyệt/đăng phải là người khác.';

export interface SocialActionContext {
  postType: AnyContentPostType;
  postStatus: ContentPostStatus;
  fbStatus: FacebookPublicationStatus | null;
  /** Id người gửi duyệt (chỉ có ở chi tiết); undefined = không biết → không chặn, API vẫn kiểm. */
  submittedById?: string;
  currentUserId?: string;
  canManage: boolean;
  canPublish: boolean;
}

export interface AvailableSocialAction {
  action: SocialAction;
  /** Có giá trị = hiện nút nhưng khoá, kèm tooltip giải thích (maker-checker). */
  disabledReason?: string;
}

/**
 * Hành động khả dụng cho một bài theo trạng thái Facebook + quyền. Thiếu quyền thì ẩn hẳn; người gửi duyệt
 * vẫn thấy Duyệt/Đăng lại nhưng bị khoá (maker-checker D97) để hiểu vì sao không thao tác được.
 */
export function availableSocialActions(context: SocialActionContext): AvailableSocialAction[] {
  if (context.postStatus === ContentPostStatus.ARCHIVED) return [];
  const isSubmitter =
    Boolean(context.submittedById) && Boolean(context.currentUserId) && context.submittedById === context.currentUserId;

  return ACTION_ORDER.flatMap((action) => {
    const rule = SOCIAL_ACTION_RULES[action];
    if (!rule.from.includes(context.fbStatus)) return [];
    const allowed = rule.permission === 'manage' ? context.canManage : context.canPublish;
    if (!allowed) return [];
    if (rule.makerChecker && isSubmitter) return [{ action, disabledReason: SELF_APPROVAL_REASON }];
    return [{ action }];
  });
}

/** Trạng thái cần người xử lý tay: lỗi (đăng lại/từ chối) hoặc chưa rõ kết quả (đối soát). */
export function needsAttention(fbStatus: FacebookPublicationStatus | undefined): boolean {
  return fbStatus === FbStatus.FAILED || fbStatus === FbStatus.UNCERTAIN;
}
