import type { Dayjs } from 'dayjs';
import { FacebookReconcileResolution } from '@/generated/api/content/content.schemas';
import { htmlToPlainText } from '@/shared/utils';
import type { SocialModalAction } from '../constants/social-action-meta';
import type { SocialCommand } from '../hooks/use-social-commands';

/** Giá trị form của modal lệnh mạng xã hội (Facebook và TikTok dùng chung). */
export interface ActionFormValues {
  timing?: 'now' | 'schedule';
  scheduledAt?: Dayjs;
  asReel?: boolean;
  reason?: string;
  reconcileMode?: 'auto' | 'postId' | 'notPublished';
  externalPostId?: string;
  /** HTML của editor caption (sửa caption bài SOCIAL). */
  body?: string;
}

export const SOCIAL_ACTION_INITIAL_VALUES: ActionFormValues = { timing: 'now', reconcileMode: 'auto' };

/** Các ô người dùng tự gõ/chọn; còn nội dung thì hỏi lại trước khi đóng modal. */
export const SOCIAL_ACTION_DIRTY_FIELDS: Array<keyof ActionFormValues> = ['reason', 'externalPostId', 'body', 'scheduledAt'];

/**
 * CONTRACT: bài website bỏ trống `body` khi sửa caption = API đẩy nội dung bài hiện tại lên Facebook.
 * TikTok approve/retry chỉ gửi `consent` (người duyệt đã tích câu đồng ý; API trả 400 SOCIAL_TIKTOK_CONSENT_REQUIRED nếu thiếu).
 */
export function toSocialCommand(
  action: SocialModalAction,
  values: ActionFormValues,
  isSocial: boolean,
  tiktok?: { brandedContent: boolean },
): SocialCommand {
  if (tiktok && (action === 'approve' || action === 'retry')) {
    return {
      action,
      body: {
        consent: {
          musicUsageConfirmed: true,
          ...(tiktok.brandedContent ? { brandedContentPolicyConfirmed: true } : {}),
        },
      },
    };
  }
  switch (action) {
    case 'submit':
      return { action };
    case 'approve':
    case 'retry':
      return {
        action,
        body: {
          scheduledAt: values.timing === 'schedule' ? values.scheduledAt?.toISOString() : undefined,
          asReel: values.asReel || undefined,
        },
      };
    case 'reject':
      return { action, body: { reason: values.reason?.trim() ?? '' } };
    case 'delete':
      return { action, body: { reason: values.reason?.trim() || undefined } };
    case 'cancel':
      return { action, body: { reason: values.reason?.trim() || undefined } };
    case 'reconcile':
      return {
        action,
        body:
          values.reconcileMode === 'postId'
            ? { externalPostId: values.externalPostId?.trim() }
            : values.reconcileMode === 'notPublished'
              ? { resolution: FacebookReconcileResolution.NOT_PUBLISHED }
              : {},
      };
    case 'editCaption':
      // CONTRACT: `values.body` là HTML của editor; caption gửi API là văn bản thuần.
      return { action, body: isSocial ? { body: htmlToPlainText(values.body) } : {} };
  }
}
