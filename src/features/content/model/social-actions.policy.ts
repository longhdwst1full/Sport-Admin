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
 * "Duyệt là đăng" (D97, owner 2026-10-03): không maker-checker; approve đi từ DRAFT hoặc PENDING_APPROVAL.
 * `hideForPublisher`: người có quyền đăng không cần gửi duyệt — đăng thẳng từ nháp.
 */
export const SOCIAL_ACTION_RULES: Record<
  SocialAction,
  {
    from: ReadonlyArray<FacebookPublicationStatus | null>;
    permission: SocialPermissionLevel;
    hideForPublisher?: boolean;
    /** Từ các trạng thái này lệnh còn cần thêm quyền đăng (xoá bài đã lên Page). */
    alsoPublishFrom?: ReadonlyArray<FacebookPublicationStatus>;
  }
> = {
  createDraft: { from: [null, FbStatus.DELETED], permission: 'manage' },
  editDraft: { from: [FbStatus.DRAFT], permission: 'manage' },
  submit: { from: [FbStatus.DRAFT], permission: 'manage', hideForPublisher: true },
  approve: { from: [FbStatus.DRAFT, FbStatus.PENDING_APPROVAL], permission: 'publish' },
  reject: { from: [FbStatus.PENDING_APPROVAL, FbStatus.FAILED], permission: 'publish' },
  retry: { from: [FbStatus.FAILED], permission: 'publish' },
  reconcile: { from: [FbStatus.UNCERTAIN, FbStatus.PUBLISHING], permission: 'publish' },
  cancel: { from: [FbStatus.DRAFT, FbStatus.PENDING_APPROVAL, FbStatus.FAILED], permission: 'manage' },
  // Owner 2026-10-03: xoá được mọi trạng thái còn bản Facebook. PUBLISHING/UNCERTAIN vẫn hiện nút nhưng modal chỉ
  // nhắc Đối soát (API trả 409 SOCIAL_DELETE_NEEDS_RECONCILE). Guard API là `social.post.manage`; bài đã lên Page
  // còn cần `social.post.publish` (kiểm trong service).
  delete: {
    from: [
      FbStatus.DRAFT,
      FbStatus.PENDING_APPROVAL,
      FbStatus.FAILED,
      FbStatus.PUBLISHING,
      FbStatus.UNCERTAIN,
      FbStatus.PUBLISHED,
      FbStatus.SCHEDULED,
    ],
    permission: 'manage',
    alsoPublishFrom: [FbStatus.PUBLISHED, FbStatus.SCHEDULED],
  },
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

export interface SocialActionContext {
  postType: AnyContentPostType;
  postStatus: ContentPostStatus;
  fbStatus: FacebookPublicationStatus | null;
  canManage: boolean;
  canPublish: boolean;
}

export interface AvailableSocialAction {
  action: SocialAction;
}

/**
 * Hành động khả dụng cho một bài theo trạng thái Facebook + quyền. Thiếu quyền thì ẩn hẳn. Người có
 * `social.post.publish` thấy "Đăng ngay / Hẹn giờ" ngay trên nháp; người chỉ có `social.post.manage` thấy "Gửi duyệt".
 */
export function availableSocialActions(context: SocialActionContext): AvailableSocialAction[] {
  return availableFrom(SOCIAL_ACTION_RULES, context.fbStatus, context);
}

type ActionRules = Partial<Record<SocialAction, (typeof SOCIAL_ACTION_RULES)[SocialAction]>>;

function availableFrom(
  rules: ActionRules,
  status: FacebookPublicationStatus | null,
  context: Pick<SocialActionContext, 'postStatus' | 'canManage' | 'canPublish'>,
): AvailableSocialAction[] {
  if (context.postStatus === ContentPostStatus.ARCHIVED) return [];
  return ACTION_ORDER.flatMap((action) => {
    const rule = rules[action];
    if (!rule || !rule.from.includes(status)) return [];
    const allowed = rule.permission === 'manage' ? context.canManage : context.canPublish;
    if (!allowed) return [];
    if (status && rule.alsoPublishFrom?.includes(status) && !context.canPublish) return [];
    if (rule.hideForPublisher && context.canPublish) return [];
    return [{ action }];
  });
}

/** Lệnh TikTok (không có sửa caption sau khi đăng — TikTok không cho sửa). */
export type TikTokAction = Exclude<SocialAction, 'editCaption'>;

/**
 * INVARIANT: bản sao `TT_TRANSITIONS` của API (`cms/social/social-tiktok.policy.ts`); `null` = bài chưa có bản
 * đăng TikTok. Khác Facebook: không SCHEDULED, đối soát chỉ từ UNCERTAIN, xoá luôn cục bộ (TikTok không có API
 * xoá — bài PUBLISHED chỉ thôi theo dõi, cần thêm quyền đăng + lý do). PUBLISHING/UNCERTAIN vẫn hiện nút Xoá nhưng
 * modal chỉ nhắc Đối soát (API 409 SOCIAL_DELETE_NEEDS_RECONCILE).
 */
export const TIKTOK_ACTION_RULES: Record<TikTokAction, (typeof SOCIAL_ACTION_RULES)[SocialAction]> = {
  createDraft: { from: [null, FbStatus.DELETED], permission: 'manage' },
  editDraft: { from: [FbStatus.DRAFT], permission: 'manage' },
  submit: { from: [FbStatus.DRAFT], permission: 'manage', hideForPublisher: true },
  approve: { from: [FbStatus.DRAFT, FbStatus.PENDING_APPROVAL], permission: 'publish' },
  reject: { from: [FbStatus.PENDING_APPROVAL, FbStatus.FAILED], permission: 'publish' },
  retry: { from: [FbStatus.FAILED], permission: 'publish' },
  reconcile: { from: [FbStatus.UNCERTAIN], permission: 'publish' },
  cancel: { from: [FbStatus.DRAFT, FbStatus.PENDING_APPROVAL, FbStatus.FAILED], permission: 'manage' },
  delete: {
    from: [
      FbStatus.DRAFT,
      FbStatus.PENDING_APPROVAL,
      FbStatus.FAILED,
      FbStatus.PUBLISHING,
      FbStatus.UNCERTAIN,
      FbStatus.PUBLISHED,
    ],
    permission: 'manage',
    alsoPublishFrom: [FbStatus.PUBLISHED],
  },
};

export interface TikTokActionContext extends Omit<SocialActionContext, 'fbStatus'> {
  tiktokStatus: FacebookPublicationStatus | null;
}

export function availableTikTokActions(context: TikTokActionContext): Array<{ action: TikTokAction }> {
  return availableFrom(TIKTOK_ACTION_RULES, context.tiktokStatus, context) as Array<{ action: TikTokAction }>;
}

/**
 * Nhánh xoá TikTok (khớp `classifyTikTokDelete` của API): LIVE = video đã lên TikTok — chỉ thôi theo dõi trong hệ
 * thống, video vẫn còn trên TikTok; LOCAL = chưa đăng, xoá trong hệ thống; RECONCILE_FIRST = đang đăng/chưa rõ.
 */
export type TikTokDeleteMode = 'LIVE' | 'LOCAL' | 'RECONCILE_FIRST' | 'NONE';

export function tiktokDeleteMode(status: FacebookPublicationStatus | null | undefined): TikTokDeleteMode {
  switch (status) {
    case FbStatus.PUBLISHED:
      return 'LIVE';
    case FbStatus.DRAFT:
    case FbStatus.PENDING_APPROVAL:
    case FbStatus.FAILED:
      return 'LOCAL';
    case FbStatus.PUBLISHING:
    case FbStatus.UNCERTAIN:
      return 'RECONCILE_FIRST';
    default:
      return 'NONE';
  }
}

/**
 * Nhánh của lệnh xoá (khớp `classifyDelete` của API): FACEBOOK = gỡ bài trên Page; LOCAL = bài chưa lên Page,
 * chỉ xoá trong hệ thống; RECONCILE_FIRST = chưa rõ đã lên Page chưa, phải đối soát trước; NONE = không còn gì để xoá.
 */
export type SocialDeleteMode = 'FACEBOOK' | 'LOCAL' | 'RECONCILE_FIRST' | 'NONE';

export function socialDeleteMode(fbStatus: FacebookPublicationStatus | null | undefined): SocialDeleteMode {
  switch (fbStatus) {
    case FbStatus.PUBLISHED:
    case FbStatus.SCHEDULED:
      return 'FACEBOOK';
    case FbStatus.DRAFT:
    case FbStatus.PENDING_APPROVAL:
    case FbStatus.FAILED:
      return 'LOCAL';
    case FbStatus.PUBLISHING:
    case FbStatus.UNCERTAIN:
      return 'RECONCILE_FIRST';
    default:
      return 'NONE';
  }
}

/** Trạng thái cần người xử lý tay: lỗi (đăng lại/từ chối) hoặc chưa rõ kết quả (đối soát). */
export function needsAttention(fbStatus: FacebookPublicationStatus | undefined): boolean {
  return fbStatus === FbStatus.FAILED || fbStatus === FbStatus.UNCERTAIN;
}
