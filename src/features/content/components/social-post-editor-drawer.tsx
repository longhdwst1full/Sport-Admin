import { useEffect } from 'react';
import { Alert, App, Button, Drawer, Form, Input, Radio, Skeleton, Typography } from 'antd';
import { useGetAdminSocialPost } from '@/generated/api/content/content';
import { AnyContentPostType, FacebookPublishType } from '@/generated/api/content/content.schemas';
import { getApiErrorPayload, getApiFieldErrors } from '@/lib/api/error';
import { composablePublishTypeOptions, SOCIAL_LIMITS, SOCIAL_STALE_ERROR_CODES } from '../constants/social.constants';
import { useSaveSocialPost, type SocialSaveTarget } from '../hooks/use-social-commands';
import { isFacebookNotConfigured, socialCommandErrorMessage } from '../model/social-command-error';
import {
  EMPTY_SOCIAL_FORM,
  socialMediaRuleViolation,
  toSocialFormValues,
  type SocialMediaValue,
  type SocialPostFormValues,
} from '../model/social-post-form.mapper';
import { FacebookSettingsHint } from './facebook-settings-hint';
import { SocialMediaField } from './social-media-field';

/** Drawer mở theo một trong ba ngữ cảnh; chỉ cần id + version, bản đầy đủ được tải lại khi sửa. */
export type SocialEditorTarget =
  | { mode: 'createSocial' }
  | { mode: 'createDraft'; postId: string; version: number; title: string }
  | { mode: 'updateDraft'; postId: string };

const API_FIELD_TO_FORM: Record<string, keyof SocialPostFormValues> = {
  title: 'title',
  body: 'body',
  mediaAssetIds: 'media',
};

const HTTPS_URL = /^https?:\/\/\S+$/;

/**
 * Soạn bài Facebook ở trạng thái Nháp:
 * - `createSocial`: bài chỉ đăng Facebook (SOCIAL) — tiêu đề nội bộ, caption, link, media.
 * - `createDraft`: mở bản đăng Facebook cho bài website — caption là nội dung bài, chỉ chọn media.
 * - `updateDraft`: sửa bản nháp; bài website vẫn chỉ đổi media (nội dung sửa ở màn bài viết).
 * Drawer chỉ đóng khi lưu thành công; lỗi "stale" tải lại chi tiết và đổ lại form.
 */
export function SocialPostEditorDrawer({ target, onClose }: { target: SocialEditorTarget; onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<SocialPostFormValues>();
  const isUpdate = target.mode === 'updateDraft';
  const detail = useGetAdminSocialPost(isUpdate ? target.postId : '', { query: { enabled: isUpdate, retry: false } });
  const editing = isUpdate ? detail.data : undefined;
  const isSocial = target.mode === 'createSocial' || editing?.postType === AnyContentPostType.SOCIAL;

  const saveTarget: SocialSaveTarget =
    target.mode === 'createSocial'
      ? target
      : target.mode === 'createDraft'
        ? { mode: 'createDraft', postId: target.postId, version: target.version }
        : { mode: 'updateDraft', postId: target.postId, version: editing?.version ?? 0, isSocial };
  const save = useSaveSocialPost(saveTarget);
  const publishType = Form.useWatch('publishType', form) ?? FacebookPublishType.FEED;

  // Đổ form theo id:version để không ghi đè dữ liệu đang gõ khi query refetch mà bài không đổi.
  const editingKey = editing ? `${editing.id}:${editing.version}` : undefined;
  useEffect(() => {
    if (isUpdate && !editing) return;
    form.resetFields();
    form.setFieldsValue(editing ? toSocialFormValues(editing) : EMPTY_SOCIAL_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editingKey đại diện cho editing
  }, [isUpdate, editingKey, form]);

  const submit = (values: SocialPostFormValues) => {
    save.mutate(
      { ...values, media: values.media ?? [] },
      {
        onSuccess: () => {
          void message.success(isUpdate ? 'Đã lưu bản nháp Facebook' : 'Đã tạo bản nháp Facebook');
          onClose();
        },
        onError: (error) => {
          const fields = Object.entries(getApiFieldErrors(error)).flatMap(([name, err]) => {
            const field = API_FIELD_TO_FORM[name];
            return field ? [{ name: field, errors: [err] }] : [];
          });
          if (fields.length) form.setFields(fields);
          const code = getApiErrorPayload(error)?.code;
          if (code && SOCIAL_STALE_ERROR_CODES.has(code)) void message.warning(socialCommandErrorMessage(error));
        },
      },
    );
  };

  const title =
    target.mode === 'createSocial'
      ? 'Soạn bài Facebook'
      : target.mode === 'createDraft'
        ? `Đăng Facebook: ${target.title}`
        : `Sửa nháp Facebook${editing ? `: ${editing.title}` : ''}`;

  return (
    <Drawer
      title={title}
      width={720}
      open
      onClose={onClose}
      destroyOnHidden
      extra={
        <Button type="primary" loading={save.isPending} disabled={isUpdate && !editing} onClick={() => form.submit()}>
          Lưu nháp
        </Button>
      }
    >
      {isUpdate && detail.isError && (
        <Alert className="mb-3" type="error" showIcon message="Không tải được bài viết" description={socialCommandErrorMessage(detail.error)} />
      )}
      {isUpdate && !editing ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          {isFacebookNotConfigured(save.error) && <FacebookSettingsHint />}
          {Boolean(save.error) && !isFacebookNotConfigured(save.error) && (
            <Alert className="mb-3" type="error" showIcon message="Không lưu được" description={socialCommandErrorMessage(save.error)} />
          )}
          <Typography.Paragraph type="secondary" className="text-xs">
            Bài được lưu ở trạng thái Nháp. Người có quyền đăng bấm "Đăng ngay / Hẹn giờ"; người chỉ có quyền soạn
            bấm "Gửi duyệt" để người có quyền đăng duyệt.
          </Typography.Paragraph>
          <Form form={form} layout="vertical" onFinish={submit} disabled={save.isPending} initialValues={EMPTY_SOCIAL_FORM}>
            <Form.Item
              name="publishType"
              label="Loại đăng"
              extra={
                publishType === FacebookPublishType.REEL
                  ? 'Reel dùng đúng một video; chọn "Đăng dạng Reel" khi duyệt. Sau khi đăng, Reel hiển thị là Video.'
                  : undefined
              }
            >
              <Radio.Group
                optionType="button"
                options={composablePublishTypeOptions(editing?.facebook?.publishType)}
                onChange={() => form.setFieldValue('media', [])}
              />
            </Form.Item>
            {isSocial ? (
              <>
                <Form.Item
                  name="title"
                  label="Tiêu đề nội bộ"
                  extra="Bỏ trống = lấy dòng đầu của nội dung."
                  rules={[{ max: SOCIAL_LIMITS.TITLE_MAX }]}
                >
                  <Input maxLength={SOCIAL_LIMITS.TITLE_MAX} />
                </Form.Item>
                <Form.Item
                  name="body"
                  label="Nội dung"
                  rules={[
                    { max: SOCIAL_LIMITS.MESSAGE_MAX },
                    ({ getFieldValue }) => ({
                      validator: (_: unknown, value?: string) =>
                        getFieldValue('publishType') === FacebookPublishType.FEED &&
                        !value?.trim() &&
                        !String(getFieldValue('link') ?? '').trim()
                          ? Promise.reject(new Error('Bài viết dạng chữ cần nội dung hoặc link.'))
                          : Promise.resolve(),
                    }),
                  ]}
                >
                  <Input.TextArea rows={6} maxLength={SOCIAL_LIMITS.MESSAGE_MAX} showCount />
                </Form.Item>
                <Form.Item
                  name="link"
                  label="Link (tuỳ chọn)"
                  extra="Link được thêm vào cuối nội dung; Facebook tự tạo bản xem trước. Có thể dán link sản phẩm trên website."
                  rules={[{ pattern: HTTPS_URL, message: 'Nhập URL bắt đầu bằng http:// hoặc https://' }]}
                >
                  <Input placeholder="https://..." />
                </Form.Item>
              </>
            ) : (
              <Alert
                className="mb-4"
                type="info"
                showIcon
                message="Nội dung Facebook là nội dung bài website"
                description="Sửa tiêu đề/nội dung ở màn soạn bài viết; ở đây chỉ chọn ảnh/video đăng kèm."
              />
            )}
            <Form.Item
              name="media"
              label="Ảnh / video"
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_: unknown, value?: SocialMediaValue[]) => {
                    const violation = socialMediaRuleViolation(
                      getFieldValue('publishType'),
                      (value ?? []).map((item) => item.kind),
                    );
                    return violation ? Promise.reject(new Error(violation)) : Promise.resolve();
                  },
                }),
              ]}
            >
              <SocialMediaField publishType={publishType} disabled={save.isPending} />
            </Form.Item>
          </Form>
        </>
      )}
    </Drawer>
  );
}
