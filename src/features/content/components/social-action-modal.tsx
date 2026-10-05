import { useEffect } from 'react';
import { Alert, App, Checkbox, DatePicker, Descriptions, Form, Input, Modal, Radio, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { StatusTag } from '@/foundation/management';
import {
  AnyContentPostType,
  FacebookPublicationStatus,
  FacebookPublishType,
  FacebookReconcileResolution,
  type SocialPostDetailDto,
  type SocialPostSummaryDto,
} from '@/generated/api/content/content.schemas';
import { fbPublishTypeLabels, fbStatusPresentation, FB_POST_ID_PATTERN, SOCIAL_LIMITS } from '../constants/social.constants';
import { useSocialPostCommand, type SocialCommand } from '../hooks/use-social-commands';
import { socialDeleteMode, type SocialAction, type SocialDeleteMode } from '../model/social-actions.policy';
import { isFacebookNotConfigured, socialCommandErrorMessage } from '../model/social-command-error';
import { scheduleWindowError } from '../model/social-post-form.mapper';
import { FacebookSettingsHint } from './facebook-settings-hint';

export type SocialModalAction = Exclude<SocialAction, 'createDraft' | 'editDraft'>;

/**
 * Bài cho modal: chi tiết (drawer) hoặc dòng danh sách (nút Xoá ở hàng). Dòng danh sách không có `body`/media —
 * chỉ lệnh không cần chúng (xoá) được mở từ hàng.
 */
export type SocialActionModalPost = Pick<SocialPostDetailDto, 'id' | 'version' | 'title' | 'postType'> & {
  body?: string;
  facebook?: SocialPostSummaryDto['facebook'];
};

interface ActionFormValues {
  timing?: 'now' | 'schedule';
  scheduledAt?: Dayjs;
  asReel?: boolean;
  reason?: string;
  reconcileMode?: 'auto' | 'postId' | 'notPublished';
  externalPostId?: string;
  body?: string;
}

const ACTION_META: Record<SocialModalAction, { title: string; okText: string; consequence: string; danger?: boolean }> = {
  submit: {
    title: 'Gửi duyệt bài Facebook',
    okText: 'Gửi duyệt',
    consequence: 'Bài chuyển sang Chờ duyệt; người có quyền đăng sẽ duyệt, đăng ngay hoặc hẹn giờ.',
  },
  approve: {
    title: 'Đăng bài lên Facebook',
    okText: 'Đăng',
    consequence: 'Bài được đăng lên Facebook Page ngay hoặc vào giờ hẹn. Bài đã đăng sẽ công khai với mọi người.',
  },
  retry: {
    title: 'Đăng lại bài lỗi',
    okText: 'Đăng lại',
    consequence: 'Gửi lại bài lên Facebook Page. Chỉ dùng khi chắc chắn lần trước chưa lên Page.',
  },
  reject: {
    title: 'Từ chối bài Facebook',
    okText: 'Từ chối',
    consequence: 'Bài quay về Nháp để người soạn sửa lại.',
    danger: true,
  },
  reconcile: {
    title: 'Đối soát với Facebook Page',
    okText: 'Đối soát',
    consequence:
      'Lần đăng trước không rõ kết quả. Hệ thống tìm bài trên Page; nếu không tự kết luận được, nhập ID bài tìm thấy hoặc xác nhận chưa đăng.',
  },
  cancel: {
    title: 'Huỷ bản đăng Facebook',
    okText: 'Huỷ bản đăng',
    consequence: 'Bản đăng chưa lên Page chuyển sang Đã xoá. Bài website (nếu có) không bị ảnh hưởng.',
    danger: true,
  },
  delete: {
    title: 'Xoá bài trên Facebook',
    okText: 'Xoá trên Facebook',
    consequence: 'Bài bị xoá khỏi Facebook Page và không khôi phục được. Bài website (nếu có) không bị ảnh hưởng.',
    danger: true,
  },
  editCaption: {
    title: 'Sửa nội dung trên Facebook',
    okText: 'Cập nhật lên Facebook',
    consequence: 'Nội dung bài trên Page được thay bằng nội dung mới.',
  },
};

/** Lệnh xoá đổi tiêu đề/hệ quả theo nhánh (owner 2026-10-03: xoá được mọi trạng thái). */
const DELETE_META: Record<Exclude<SocialDeleteMode, 'FACEBOOK' | 'NONE'>, { title: string; okText: string; consequence: string; danger?: boolean }> = {
  LOCAL: {
    title: 'Xoá bài (chưa đăng lên Facebook)',
    okText: 'Xoá bài',
    consequence:
      'Bài chưa lên Facebook Page nên chỉ bị xoá trong hệ thống. Bài chỉ đăng Facebook sẽ biến khỏi danh sách và nhả ảnh/video; bài website giữ nguyên, chỉ bỏ bản đăng Facebook.',
    danger: true,
  },
  RECONCILE_FIRST: {
    title: 'Xoá bài trên Facebook',
    okText: 'Xoá',
    consequence: 'Chưa rõ bài đã lên Facebook chưa — hãy Đối soát trước khi xoá',
    danger: true,
  },
};

const REASON_RULES = [
  { required: true, whitespace: true, message: 'Nhập lý do (ghi vào nhật ký)' },
  { min: SOCIAL_LIMITS.REASON_MIN, message: `Lý do tối thiểu ${SOCIAL_LIMITS.REASON_MIN} ký tự` },
];

/** CONTRACT: bài website bỏ trống `body` khi sửa caption = API đẩy nội dung bài hiện tại lên Facebook. */
function toCommand(action: SocialModalAction, values: ActionFormValues, isSocial: boolean): SocialCommand {
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
      return { action, body: isSocial ? { body: values.body } : {} };
  }
}

/**
 * Xác nhận một lệnh Facebook: hiện trạng thái hiện tại, hành động, hệ quả (`04-permissions-transitions.md`).
 * Modal chỉ đóng khi lệnh thành công; kết quả FAILED/UNCERTAIN sau duyệt vẫn là "thành công" về HTTP nên
 * báo cảnh báo thay vì chúc mừng. CONCURRENCY: `post` là chi tiết mới nhất từ cache (tự tải lại sau lỗi stale).
 */
export function SocialActionModal({
  post,
  action,
  onClose,
}: {
  post?: SocialActionModalPost;
  action?: SocialModalAction;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ActionFormValues>();
  const command = useSocialPostCommand(post);
  const { reset } = command;
  const timing = Form.useWatch('timing', form);
  const reconcileMode = Form.useWatch('reconcileMode', form);

  useEffect(() => {
    if (!action) return;
    form.resetFields();
    form.setFieldsValue({ timing: 'now', reconcileMode: 'auto', body: post?.body });
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đổ lại khi mở hành động mới
  }, [action, post?.id, form, reset]);

  if (!post?.facebook || !action) return null;
  const facebook = post.facebook;
  const deleteMode = action === 'delete' ? socialDeleteMode(facebook.status) : undefined;
  const meta =
    deleteMode === 'LOCAL' || deleteMode === 'RECONCILE_FIRST' ? DELETE_META[deleteMode] : ACTION_META[action];
  // INVARIANT: PUBLISHING/UNCERTAIN không gửi lệnh xoá (API 409) — modal chỉ nhắc Đối soát.
  const blocked = deleteMode === 'RECONCILE_FIRST';
  const isSocial = post.postType === AnyContentPostType.SOCIAL;
  const canReel =
    facebook.publishType === FacebookPublishType.VIDEO || facebook.publishType === FacebookPublishType.REEL;

  const submit = (values: ActionFormValues) => {
    if (blocked) return;
    command.mutate(toCommand(action, values, isSocial), {
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
    <Modal
      open
      title={meta.title}
      okText={meta.okText}
      cancelText="Đóng"
      okButtonProps={{ danger: meta.danger, hidden: blocked }}
      confirmLoading={command.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
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
      <Form form={form} layout="vertical" onFinish={submit} disabled={command.isPending}>
        {(action === 'approve' || action === 'retry') && (
          <>
            <Form.Item name="timing" label="Thời điểm đăng">
              <Radio.Group
                options={[
                  { value: 'now', label: 'Đăng ngay' },
                  { value: 'schedule', label: 'Hẹn giờ' },
                ]}
              />
            </Form.Item>
            {timing === 'schedule' && (
              <Form.Item
                name="scheduledAt"
                label="Giờ đăng"
                extra="Cách hiện tại từ 10 phút đến 30 ngày; Facebook tự đăng đúng giờ."
                rules={[
                  { required: true, message: 'Chọn giờ đăng' },
                  {
                    validator: (_: unknown, value?: Dayjs) => {
                      const error = scheduleWindowError(value);
                      return error ? Promise.reject(new Error(error)) : Promise.resolve();
                    },
                  },
                ]}
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
        {(action === 'reject' || deleteMode === 'FACEBOOK') && (
          <Form.Item name="reason" label="Lý do" rules={REASON_RULES}>
            <Input.TextArea rows={3} maxLength={SOCIAL_LIMITS.REASON_MAX} showCount />
          </Form.Item>
        )}
        {(action === 'cancel' || deleteMode === 'LOCAL') && (
          <Form.Item
            name="reason"
            label="Lý do (tuỳ chọn)"
            rules={deleteMode === 'LOCAL' ? [{ min: SOCIAL_LIMITS.REASON_MIN, message: `Lý do tối thiểu ${SOCIAL_LIMITS.REASON_MIN} ký tự` }] : undefined}
          >
            <Input.TextArea rows={3} maxLength={SOCIAL_LIMITS.REASON_MAX} showCount />
          </Form.Item>
        )}
        {action === 'reconcile' && (
          <>
            <Form.Item name="reconcileMode" label="Cách đối soát">
              <Radio.Group className="flex flex-col gap-1">
                <Radio value="auto">Tự tìm bài trên Page</Radio>
                <Radio value="postId">Tôi đã tìm thấy bài trên Page — nhập ID bài</Radio>
                <Radio value="notPublished">Tôi đã kiểm tra Page — bài chưa được đăng</Radio>
              </Radio.Group>
            </Form.Item>
            {reconcileMode === 'postId' && (
              <Form.Item
                name="externalPostId"
                label="ID bài trên Facebook"
                rules={[
                  { required: true, message: 'Nhập ID bài' },
                  { pattern: FB_POST_ID_PATTERN, message: 'ID dạng {pageId}_{postId}, ví dụ 1234567890_9876543210' },
                ]}
              >
                <Input placeholder="1234567890_9876543210" />
              </Form.Item>
            )}
            {reconcileMode === 'notPublished' && (
              <Alert type="warning" showIcon className="mb-3" message="Bài sẽ chuyển sang Lỗi để có thể đăng lại." />
            )}
          </>
        )}
        {action === 'editCaption' &&
          (isSocial ? (
            <Form.Item
              name="body"
              label="Nội dung mới"
              rules={[{ required: true, whitespace: true, message: 'Nhập nội dung' }]}
            >
              <Input.TextArea rows={6} maxLength={SOCIAL_LIMITS.MESSAGE_MAX} showCount />
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
    </Modal>
  );
}
