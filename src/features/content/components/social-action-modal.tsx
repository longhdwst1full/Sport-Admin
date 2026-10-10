import { Alert, App, Checkbox, DatePicker, Descriptions, Form, Radio, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { StatusTag } from '@/foundation/management';
import { plainTextToHtml } from '@/shared/utils';
import { FormModal } from '@/foundation/overlay';
import {
  AnyContentPostType,
  FacebookPublicationStatus,
  FacebookPublishType,
  type SocialPostDetailDto,
  type SocialPostSummaryDto,
} from '@/generated/api/content/content.schemas';
import {
  FACEBOOK_ACTION_META,
  FACEBOOK_DELETE_META,
  FACEBOOK_RECONCILE_COPY,
  type SocialModalAction,
} from '../constants/social-action-meta';
import {
  fbPublishTypeLabels,
  fbStatusPresentation,
  SOCIAL_CHANNEL,
  SOCIAL_LIMITS,
  type SocialChannel,
} from '../constants/social.constants';
import { useSocialPostCommand } from '../hooks/use-social-commands';
import {
  SOCIAL_ACTION_DIRTY_FIELDS,
  SOCIAL_ACTION_INITIAL_VALUES,
  toSocialCommand,
  type ActionFormValues,
} from '../model/social-action-command';
import { socialDeleteMode } from '../model/social-actions.policy';
import { isFacebookNotConfigured, socialCommandErrorMessage } from '../model/social-command-error';
import { captionRules, scheduleWindowError } from '../model/social-post-form.mapper';
import { FacebookSettingsHint } from './facebook-settings-hint';
import { SocialReasonField, SocialReconcileFields } from './social-action-fields';
import { SocialCaptionInput } from './social-caption-input';
import { TikTokActionContent } from './tiktok-action-content';

export type { SocialModalAction } from '../constants/social-action-meta';

/**
 * Bài cho modal: chi tiết (drawer) hoặc dòng danh sách (nút Xoá ở hàng). Dòng danh sách không có `body`/media —
 * chỉ lệnh không cần chúng (xoá) được mở từ hàng.
 */
export type SocialActionModalPost = Pick<SocialPostDetailDto, 'id' | 'version' | 'title' | 'postType'> & {
  body?: string;
  facebook?: SocialPostSummaryDto['facebook'];
  tiktok?: SocialPostSummaryDto['tiktok'];
};

export type SocialPostCommand = ReturnType<typeof useSocialPostCommand>;

const EDIT_CAPTION_RULES = captionRules({ max: SOCIAL_LIMITS.MESSAGE_MAX, required: 'Nhập nội dung' });

const TIMING_OPTIONS = [
  { value: 'now', label: 'Đăng ngay' },
  { value: 'schedule', label: 'Hẹn giờ' },
];

const SCHEDULE_RULES = [
  { required: true, message: 'Chọn giờ đăng' },
  {
    validator: (_: unknown, value?: Dayjs) => {
      const error = scheduleWindowError(value);
      return error ? Promise.reject(new Error(error)) : Promise.resolve();
    },
  },
];

/**
 * Xác nhận một lệnh Facebook/TikTok: hiện trạng thái hiện tại, hành động, hệ quả (`04-permissions-transitions.md`).
 * Modal chỉ đóng khi lệnh thành công; kết quả FAILED/UNCERTAIN sau duyệt vẫn là "thành công" về HTTP nên
 * báo cảnh báo thay vì chúc mừng. CONCURRENCY: `post` là chi tiết mới nhất từ cache (tự tải lại sau lỗi stale).
 *
 * Nội dung modal được key theo bài + kênh + lệnh nên form luôn mới khi mở lệnh khác. IDEMPOTENCY: mutation
 * (giữ `Idempotency-Key`) sống ở đây, ngoài phần được key, để mở lại cùng lệnh sau lỗi mạng vẫn dùng key cũ;
 * chỉ trạng thái lỗi/kết quả được `reset()` khi đóng.
 */
export function SocialActionModal({
  post,
  action,
  channel = SOCIAL_CHANNEL.FACEBOOK,
  onClose,
}: {
  post?: SocialActionModalPost;
  action?: SocialModalAction;
  /** Kênh của bản đăng nhận lệnh (mặc định Facebook). */
  channel?: SocialChannel;
  onClose: () => void;
}) {
  const command = useSocialPostCommand(post, channel);
  if (!post || !action) return null;

  const close = () => {
    command.reset();
    onClose();
  };
  const key = `${post.id}:${channel}:${action}`;

  if (channel === SOCIAL_CHANNEL.TIKTOK) {
    return post.tiktok && action !== 'editCaption' ? (
      <TikTokActionContent key={key} post={post} tiktok={post.tiktok} action={action} command={command} onClose={close} />
    ) : null;
  }
  return post.facebook ? (
    <FacebookActionContent key={key} post={post} facebook={post.facebook} action={action} command={command} onClose={close} />
  ) : null;
}

function FacebookActionContent({
  post,
  facebook,
  action,
  command,
  onClose,
}: {
  post: SocialActionModalPost;
  facebook: NonNullable<SocialActionModalPost['facebook']>;
  action: SocialModalAction;
  command: SocialPostCommand;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ActionFormValues>();
  const timing = Form.useWatch('timing', form);
  const reconcileMode = Form.useWatch('reconcileMode', form);
  const deleteMode = action === 'delete' ? socialDeleteMode(facebook.status) : undefined;
  const meta =
    deleteMode === 'LOCAL' || deleteMode === 'RECONCILE_FIRST' ? FACEBOOK_DELETE_META[deleteMode] : FACEBOOK_ACTION_META[action];
  // INVARIANT: PUBLISHING/UNCERTAIN không gửi lệnh xoá (API 409) — modal chỉ nhắc Đối soát.
  const blocked = deleteMode === 'RECONCILE_FIRST';
  const isSocial = post.postType === AnyContentPostType.SOCIAL;
  const canReel =
    facebook.publishType === FacebookPublishType.VIDEO || facebook.publishType === FacebookPublishType.REEL;

  const submit = (values: ActionFormValues) => {
    if (blocked) return;
    command.mutate(toSocialCommand(action, values, isSocial), {
      onSuccess: (saved) => {
        const status = saved.facebook?.status;
        if (status === FacebookPublicationStatus.FAILED) {
          void message.error(`Facebook chưa nhận bài: ${saved.facebook?.lastError ?? 'lỗi không rõ'}`);
        } else if (status === FacebookPublicationStatus.UNCERTAIN) {
          void message.warning('Chưa rõ bài đã lên Page hay chưa. Đối soát trước khi đăng lại.');
        } else {
          void message.success(`${meta.okText} thành công`);
        }
        onClose();
      },
      onError: (error) => {
        if (!isFacebookNotConfigured(error)) void message.error(socialCommandErrorMessage(error));
      },
    });
  };

  return (
    <FormModal
      open
      size="sm"
      title={meta.title}
      okText={meta.okText}
      // UX: bị chặn (phải Đối soát trước) thì modal chỉ để đọc.
      cancelText={blocked ? 'Đóng' : 'Huỷ'}
      okButtonProps={{ danger: meta.danger, hidden: blocked }}
      submitting={command.isPending}
      onSubmit={() => form.submit()}
      onClose={onClose}
      isDirty={() => form.isFieldsTouched(SOCIAL_ACTION_DIRTY_FIELDS)}
    >
      <Descriptions size="small" column={1} className="mb-3">
        <Descriptions.Item label="Bài viết">{post.title}</Descriptions.Item>
        <Descriptions.Item label="Loại đăng">{fbPublishTypeLabels[facebook.publishType]}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái hiện tại">
          <StatusTag status={facebook.status} presentations={fbStatusPresentation} />
        </Descriptions.Item>
      </Descriptions>
      {blocked ? (
        <Alert className="mb-3" type="warning" showIcon message={meta.consequence} />
      ) : (
        <Typography.Paragraph type="secondary">{meta.consequence}</Typography.Paragraph>
      )}
      {isFacebookNotConfigured(command.error) && <FacebookSettingsHint />}
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={command.isPending}
        initialValues={{ ...SOCIAL_ACTION_INITIAL_VALUES, body: plainTextToHtml(post.body) }}
      >
        {(action === 'approve' || action === 'retry') && (
          <>
            <Form.Item name="timing" label="Thời điểm đăng">
              <Radio.Group options={TIMING_OPTIONS} />
            </Form.Item>
            {timing === 'schedule' && (
              <Form.Item
                name="scheduledAt"
                label="Giờ đăng"
                extra="Cách hiện tại từ 10 phút đến 30 ngày; Facebook tự đăng đúng giờ."
                rules={SCHEDULE_RULES}
              >
                <DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" className="w-full" />
              </Form.Item>
            )}
            {canReel && (
              <Form.Item name="asReel" valuePropName="checked">
                <Checkbox>Đăng dạng Reel</Checkbox>
              </Form.Item>
            )}
          </>
        )}
        {(action === 'reject' || deleteMode === 'FACEBOOK') && <SocialReasonField mode="required" />}
        {action === 'cancel' && <SocialReasonField mode="optional" />}
        {deleteMode === 'LOCAL' && <SocialReasonField mode="minWhenFilled" />}
        {action === 'reconcile' && <SocialReconcileFields copy={FACEBOOK_RECONCILE_COPY} mode={reconcileMode} />}
        {action === 'editCaption' &&
          (isSocial ? (
            <Form.Item name="body" label="Nội dung mới" rules={EDIT_CAPTION_RULES}>
              <SocialCaptionInput max={SOCIAL_LIMITS.MESSAGE_MAX} disabled={command.isPending} />
            </Form.Item>
          ) : (
            <Alert
              type="info"
              showIcon
              className="mb-3"
              message="Nội dung hiện tại của bài website sẽ được đẩy lên Facebook."
              description="Muốn đổi nội dung, sửa bài website trước rồi cập nhật lên Facebook."
            />
          ))}
      </Form>
    </FormModal>
  );
}
