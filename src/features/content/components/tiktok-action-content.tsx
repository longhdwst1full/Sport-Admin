import { useState } from 'react';
import { Alert, App, Descriptions, Form, Typography } from 'antd';
import { StatusTag } from '@/foundation/management';
import { FormModal } from '@/foundation/overlay';
import { useGetAdminTikTokCreatorInfo } from '@/generated/api/content/content';
import { AnyContentPostType, FacebookPublicationStatus } from '@/generated/api/content/content.schemas';
import {
  TIKTOK_ACTION_META,
  TIKTOK_DELETE_META,
  TIKTOK_RECONCILE_COPY,
  type TikTokModalAction,
} from '../constants/social-action-meta';
import { fbStatusPresentation, tiktokPrivacyLabels } from '../constants/social.constants';
import {
  SOCIAL_ACTION_DIRTY_FIELDS,
  SOCIAL_ACTION_INITIAL_VALUES,
  toSocialCommand,
  type ActionFormValues,
} from '../model/social-action-command';
import { tiktokDeleteMode } from '../model/social-actions.policy';
import { socialCommandErrorMessage } from '../model/social-command-error';
import { commercialContentBlocker, effectiveCommercialContent, TIKTOK_COMMERCIAL_TEXT } from '../model/tiktok-post-settings';
import { SocialReasonField, SocialReconcileFields } from './social-action-fields';
import type { SocialActionModalPost, SocialPostCommand } from './social-action-modal';
import { TikTokConsentDeclaration } from './tiktok-consent-declaration';

/** Duyệt/đăng cần đúng một video, quyền riêng tư và phần nội dung thương mại hợp lệ (API 400 nếu thiếu). */
function tiktokPublishBlocker(
  action: TikTokModalAction,
  tiktok: NonNullable<SocialActionModalPost['tiktok']>,
  commercialIssue: string | undefined,
): string | undefined {
  if (action !== 'approve' && action !== 'retry' && action !== 'submit') return undefined;
  if (tiktok.mediaCount !== 1) return 'Bản TikTok chưa có video. Sửa nháp TikTok và chọn đúng 1 video.';
  if (action === 'submit') return undefined;
  if (!tiktok.privacyLevel) {
    return 'Chưa chọn quyền riêng tư TikTok. Sửa nháp TikTok và chọn "Ai có thể xem video này".';
  }
  return commercialIssue ? `${commercialIssue} Sửa nháp TikTok ở mục "Công bố nội dung thương mại".` : undefined;
}

/**
 * Nội dung modal cho lệnh TikTok (dùng chung mutation với modal Facebook). Duyệt trả 200 với PUBLISHING —
 * job tải video lên tiếp, nên báo "đang đăng" thay vì "đã đăng".
 */
export function TikTokActionContent({
  post,
  tiktok,
  action,
  command,
  onClose,
}: {
  post: SocialActionModalPost;
  tiktok: NonNullable<SocialActionModalPost['tiktok']>;
  action: TikTokModalAction;
  command: SocialPostCommand;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ActionFormValues>();
  const reconcileMode = Form.useWatch('reconcileMode', form);
  const deleteMode = action === 'delete' ? tiktokDeleteMode(tiktok.status) : undefined;
  const meta = deleteMode && deleteMode !== 'NONE' ? TIKTOK_DELETE_META[deleteMode] : TIKTOK_ACTION_META[action];
  const publishing = action === 'approve' || action === 'retry';
  const commercial = effectiveCommercialContent(tiktok.commercialContent);
  // Guideline TikTok: trang đăng hiện tên tài khoản sẽ nhận video.
  const creator = useGetAdminTikTokCreatorInfo({ query: { enabled: publishing, retry: false, staleTime: 60_000 } });
  // Guideline TikTok: người duyệt đồng ý tường minh trước khi gửi video — nút đăng khoá tới khi tích.
  const [consented, setConsented] = useState(false);
  // Chặn sớm và chỉ dẫn sửa nháp thay vì để API trả 400.
  const publishBlocker = tiktokPublishBlocker(
    action,
    tiktok,
    commercialContentBlocker({ privacyLevel: tiktok.privacyLevel ?? undefined, commercialContent: commercial }),
  );
  const blocked = deleteMode === 'RECONCILE_FIRST' || publishBlocker !== undefined;
  const awaitingConsent = publishing && !consented;

  const submit = (values: ActionFormValues) => {
    if (blocked || awaitingConsent) return;
    command.mutate(
      toSocialCommand(action, values, post.postType === AnyContentPostType.SOCIAL, {
        brandedContent: commercial.brandedContent,
      }),
      {
        onSuccess: (saved) => {
          const status = saved.tiktok?.status;
          if (status === FacebookPublicationStatus.FAILED) {
            void message.error(`TikTok chưa nhận video: ${saved.tiktok?.lastError ?? 'lỗi không rõ'}`);
          } else if (status === FacebookPublicationStatus.UNCERTAIN) {
            void message.warning('Chưa rõ video đã lên TikTok hay chưa. Đối soát trước khi đăng lại.');
          } else if (status === FacebookPublicationStatus.PUBLISHING) {
            void message.success('Đã gửi video lên TikTok. Hệ thống đang tải lên và sẽ cập nhật trạng thái.');
          } else {
            void message.success(`${meta.okText} thành công`);
          }
          onClose();
        },
        onError: (error) => void message.error(socialCommandErrorMessage(error)),
      },
    );
  };

  return (
    <FormModal
      open
      size="sm"
      title={meta.title}
      okText={meta.okText}
      // UX: bị chặn (thiếu video/quyền riêng tư, phải Đối soát) thì modal chỉ để đọc.
      cancelText={blocked ? 'Đóng' : 'Huỷ'}
      okButtonProps={{ danger: meta.danger, hidden: blocked, disabled: awaitingConsent }}
      submitting={command.isPending}
      onSubmit={() => form.submit()}
      onClose={onClose}
      isDirty={() => form.isFieldsTouched(SOCIAL_ACTION_DIRTY_FIELDS)}
    >
      <Descriptions size="small" column={1} className="mb-3">
        <Descriptions.Item label="Bài viết">{post.title}</Descriptions.Item>
        {publishing && (
          <Descriptions.Item label="Đăng lên tài khoản">
            {creator.data?.nickname ?? creator.data?.username ?? (creator.isLoading ? 'Đang tải…' : 'Không tải được')}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Quyền riêng tư">
          {tiktok.privacyLevel ? tiktokPrivacyLabels[tiktok.privacyLevel] : 'Chưa chọn'}
        </Descriptions.Item>
        {publishing && (
          <Descriptions.Item label="Nội dung thương mại">
            {commercial.enabled
              ? [
                  commercial.yourBrand ? TIKTOK_COMMERCIAL_TEXT.YOUR_BRAND_TITLE : undefined,
                  commercial.brandedContent ? TIKTOK_COMMERCIAL_TEXT.BRANDED_TITLE : undefined,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Chưa chọn'
              : 'Không'}
            {tiktok.isAigc ? ' · Video do AI tạo' : ''}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Trạng thái TikTok hiện tại">
          <StatusTag status={tiktok.status} presentations={fbStatusPresentation} />
        </Descriptions.Item>
      </Descriptions>
      {publishBlocker ? (
        <Alert className="mb-3" type="warning" showIcon message={publishBlocker} />
      ) : deleteMode === 'RECONCILE_FIRST' || deleteMode === 'LIVE' ? (
        <Alert className="mb-3" type="warning" showIcon message={meta.consequence} />
      ) : (
        <Typography.Paragraph type="secondary">{meta.consequence}</Typography.Paragraph>
      )}
      {publishing && !publishBlocker && (
        <TikTokConsentDeclaration
          className="mb-3"
          brandedContent={commercial.brandedContent}
          checked={consented}
          onCheckedChange={setConsented}
          disabled={command.isPending}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={command.isPending}
        initialValues={SOCIAL_ACTION_INITIAL_VALUES}
      >
        {(action === 'reject' || deleteMode === 'LIVE') && <SocialReasonField mode="required" />}
        {action === 'cancel' && <SocialReasonField mode="optional" />}
        {deleteMode === 'LOCAL' && <SocialReasonField mode="minWhenFilled" />}
        {action === 'reconcile' && <SocialReconcileFields copy={TIKTOK_RECONCILE_COPY} mode={reconcileMode} />}
      </Form>
    </FormModal>
  );
}
