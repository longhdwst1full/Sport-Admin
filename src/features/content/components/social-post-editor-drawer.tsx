import { useEffect, useState } from 'react';
import { Alert, App, Checkbox, Form, Input, Radio, Tooltip, Typography } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { DetailSkeleton } from '@/foundation/feedback/page-skeleton';
import { htmlToPlainText } from '@/shared/utils';
import { useGetAdminSocialPost, useGetAdminTikTokCreatorInfo } from '@/generated/api/content/content';
import {
  AnyContentPostType,
  FacebookPublicationStatus,
  FacebookPublishType,
  type SocialPostDetailDto,
  TikTokPrivacyLevel,
} from '@/generated/api/content/content.schemas';
import { getApiErrorPayload, getApiFieldErrors } from '@/lib/api/error';
import {
  API_SOCIAL_CHANNEL,
  composablePublishTypeOptions,
  isSocialChannelEnabled,
  SOCIAL_CHANNEL,
  type SocialChannel,
  socialChannelLabels,
  SOCIAL_LIMITS,
  SOCIAL_STALE_ERROR_CODES,
  TIKTOK_DISABLED_HINT,
  TIKTOK_LIMITS,
} from '../constants/social.constants';
import { useSaveSocialPost, type SocialSaveTarget } from '../hooks/use-social-commands';
import { isFacebookNotConfigured, socialCommandErrorMessage } from '../model/social-command-error';
import {
  captionRules,
  EMPTY_SOCIAL_FORM,
  socialMediaRuleViolation,
  toSocialFormValues,
  type SocialMediaValue,
  type SocialPostFormValues,
} from '../model/social-post-form.mapper';
import {
  applyCreatorConstraints,
  DEFAULT_TIKTOK_SETTINGS,
  TIKTOK_COMMERCIAL_TEXT,
  nextSelectedChannels,
  tiktokMediaViolation,
  toTikTokOptionsDto,
  toTikTokSettingsForm,
  type TikTokPostSettingsForm,
} from '../model/tiktok-post-settings';
import { FacebookSettingsHint } from './facebook-settings-hint';
import { SocialCaptionInput } from './social-caption-input';
import { SocialMediaField } from './social-media-field';
import { TikTokSettingsPanel } from './tiktok-settings-panel';
import { FormDrawer } from '@/foundation/overlay';

/**
 * Drawer mở theo một trong ba ngữ cảnh; chỉ cần id + version, bản đầy đủ được tải lại khi sửa. `channel` (mặc định
 * Facebook) là kênh của bản nháp đang mở/sửa với bài đã có; bài mới chọn kênh bằng checkbox.
 */
export type SocialEditorTarget =
  | { mode: 'createSocial' }
  | {
      mode: 'createDraft';
      channel?: SocialChannel;
      postId: string;
      version: number;
      title: string;
      postType?: AnyContentPostType;
    }
  | { mode: 'updateDraft'; channel?: SocialChannel; postId: string };

const VIDEO_PUBLISH_TYPES: readonly FacebookPublishType[] = [FacebookPublishType.VIDEO, FacebookPublishType.REEL];

/** Trạng thái còn cho sửa caption chung: chưa có bản đăng, nháp hoặc đã xoá. */
const isCaptionEditable = (status: FacebookPublicationStatus | undefined) =>
  !status || status === FacebookPublicationStatus.DRAFT || status === FacebookPublicationStatus.DELETED;

/** INVARIANT (API): caption là `posts.body` dùng chung — kênh còn lại đã rời nháp thì caption bị khoá. */
function captionLockedFor(post: SocialPostDetailDto | undefined, channel: SocialChannel): boolean {
  if (!post) return false;
  const other = channel === SOCIAL_CHANNEL.TIKTOK ? post.facebook?.status : post.tiktok?.status;
  return !isCaptionEditable(other);
}

const API_FIELD_TO_FORM: Record<string, keyof SocialPostFormValues> = {
  title: 'title',
  body: 'body',
  mediaAssetIds: 'media',
};

const HTTPS_URL = /^https?:\/\/\S+$/;

/** Checkbox "Kênh đăng"; kênh chưa nối API bị khoá kèm tooltip. Chỉ còn một kênh bật thì khoá luôn kênh đó. */
const channelOptions = (selected: SocialChannel[]) =>
  Object.values(SOCIAL_CHANNEL).map((channel) => {
    const enabled = isSocialChannelEnabled(channel);
    const onlyChoice = selected.length === 1 && selected[0] === channel;
    return {
      value: channel,
      disabled: !enabled || onlyChoice,
      label: enabled ? (
        socialChannelLabels[channel]
      ) : (
        <Tooltip title={TIKTOK_DISABLED_HINT}>
          <span>{socialChannelLabels[channel]}</span>
        </Tooltip>
      ),
    };
  });

/**
 * Soạn bài mạng xã hội ở trạng thái Nháp:
 * - `createSocial`: bài chỉ đăng mạng xã hội (SOCIAL) — chọn kênh (Facebook/TikTok), tiêu đề nội bộ, caption, link,
 *   media; TikTok kèm thiết lập theo `creator_info` (`createAdminSocialPost` với `channels` + `tiktok`).
 * - `createDraft`: mở bản đăng một kênh cho bài đã có — caption là nội dung bài, chỉ chọn media (+ thiết lập TikTok).
 * - `updateDraft`: sửa bản nháp một kênh; bài website vẫn chỉ đổi media (nội dung sửa ở màn bài viết).
 * Drawer chỉ đóng khi lưu thành công; lỗi "stale" tải lại chi tiết và đổ lại form.
 */
export function SocialPostEditorDrawer({ target, onClose }: { target: SocialEditorTarget; onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<SocialPostFormValues>();
  const isUpdate = target.mode === 'updateDraft';
  const targetChannel = target.mode === 'createSocial' ? undefined : (target.channel ?? SOCIAL_CHANNEL.FACEBOOK);
  const detail = useGetAdminSocialPost(isUpdate ? target.postId : '', { query: { enabled: isUpdate, retry: false } });
  const editing = isUpdate ? detail.data : undefined;
  const isSocial =
    target.mode === 'createSocial' ||
    (target.mode === 'createDraft' ? target.postType === AnyContentPostType.SOCIAL : editing?.postType === AnyContentPostType.SOCIAL);
  // CONTRACT: lệnh mở nháp một kênh không nhận tiêu đề/caption; sửa nháp chỉ đổi caption với bài SOCIAL.
  const editableCaption = target.mode === 'createSocial' || (isUpdate && isSocial);
  const captionLocked = isUpdate && targetChannel ? captionLockedFor(editing, targetChannel) : false;

  const saveTarget: SocialSaveTarget =
    target.mode === 'createSocial'
      ? target
      : target.mode === 'createDraft'
        ? { mode: 'createDraft', channel: targetChannel!, postId: target.postId, version: target.version }
        : {
            mode: 'updateDraft',
            channel: targetChannel!,
            postId: target.postId,
            version: editing?.version ?? 0,
            isSocial,
            captionLocked,
          };
  const save = useSaveSocialPost(saveTarget);
  const [selectedChannels, setSelectedChannels] = useState<SocialChannel[]>([SOCIAL_CHANNEL.FACEBOOK]);
  const channels = targetChannel ? [targetChannel] : selectedChannels;
  const [tiktokSettings, setTiktokSettings] = useState<TikTokPostSettingsForm>(DEFAULT_TIKTOK_SETTINGS);
  const [privacyTouched, setPrivacyTouched] = useState(false);
  const facebookSelected = channels.includes(SOCIAL_CHANNEL.FACEBOOK);
  const tiktokSelected = channels.includes(SOCIAL_CHANNEL.TIKTOK);
  const publishType = Form.useWatch('publishType', form) ?? FacebookPublishType.FEED;
  // TikTok chỉ đăng video: không có kênh Facebook thì ô media làm việc như bài Video.
  const mediaPublishType = facebookSelected ? publishType : FacebookPublishType.VIDEO;
  const creator = useGetAdminTikTokCreatorInfo({ query: { enabled: tiktokSelected, retry: false, staleTime: 60_000 } });

  // Đổ form khi bản chi tiết đổi (mở lần đầu, hoặc tải lại sau lỗi stale). TanStack Query giữ nguyên tham chiếu
  // `editing` khi refetch trả dữ liệu không đổi (structural sharing), nên không ghi đè dữ liệu đang gõ.
  useEffect(() => {
    if (isUpdate && !editing) return;
    form.resetFields();
    form.setFieldsValue(editing ? toSocialFormValues(editing, targetChannel) : EMPTY_SOCIAL_FORM);
  }, [isUpdate, editing, targetChannel, form]);

  // Thiết lập TikTok là state cục bộ (không thuộc form): đổ lại trong lúc render khi bản chi tiết đổi version,
  // theo mẫu "điều chỉnh state khi prop đổi" (RULE-HOOK-01) thay cho setState trong effect.
  const editingKey = editing ? `${editing.id}:${editing.version}` : undefined;
  const [seededKey, setSeededKey] = useState<string>();
  if (editing && editingKey !== seededKey) {
    setSeededKey(editingKey);
    if (targetChannel === SOCIAL_CHANNEL.TIKTOK) setTiktokSettings(toTikTokSettingsForm(editing.tiktok));
  }

  const changeChannels = (next: SocialChannel[]) => {
    const resolved = nextSelectedChannels(selectedChannels, next);
    // TikTok cần đúng một video: chọn thêm TikTok khi Facebook đang là bài chữ/ảnh thì chuyển sang Video.
    if (resolved.includes(SOCIAL_CHANNEL.TIKTOK) && !VIDEO_PUBLISH_TYPES.includes(form.getFieldValue('publishType'))) {
      form.setFieldsValue({ publishType: FacebookPublishType.VIDEO, media: [] });
    }
    setSelectedChannels(resolved);
  };

  const submit = (values: SocialPostFormValues) => {
    const creatorInfo = creator.data;
    const tiktok = tiktokSelected ? toTikTokOptionsDto(applyCreatorConstraints(tiktokSettings, creatorInfo)) : undefined;
    // TikTok bắt buộc người soạn tự chọn quyền riêng tư (không có giá trị mặc định); chỉ chặn khi đã tải được
    // creator info — chưa kết nối tài khoản thì vẫn lưu được nháp, API kiểm lại lúc đăng.
    if (tiktokSelected && creatorInfo && !tiktok?.privacyLevel) {
      setPrivacyTouched(true);
      void message.warning('Chọn quyền riêng tư cho video TikTok trước khi lưu.');
      return;
    }
    // API 400 TIKTOK_BRANDED_CONTENT_PRIVATE ngay cả khi lưu nháp; "bật mà chưa chọn" vẫn lưu nháp được (chặn lúc đăng).
    if (tiktokSelected && tiktokSettings.privacyLevel === TikTokPrivacyLevel.SELF_ONLY && tiktok?.commercialContent?.brandedContent) {
      void message.warning(TIKTOK_COMMERCIAL_TEXT.BRANDED_PRIVATE);
      return;
    }
    save.mutate(
      {
        values: { ...values, media: values.media ?? [] },
        channels: channels.map((channel) => API_SOCIAL_CHANNEL[channel]),
        tiktok,
      },
      {
        onSuccess: () => {
          const label = channels.map((channel) => socialChannelLabels[channel]).join(' + ');
          void message.success(isUpdate ? `Đã lưu bản nháp ${label}` : `Đã tạo bản nháp ${label}`);
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
          else if (!isFacebookNotConfigured(error)) void message.error(socialCommandErrorMessage(error));
        },
      },
    );
  };

  const channelLabel = targetChannel ? socialChannelLabels[targetChannel] : '';
  const title =
    target.mode === 'createSocial'
      ? 'Soạn bài mạng xã hội'
      : target.mode === 'createDraft'
        ? `Đăng ${channelLabel}: ${target.title}`
        : `Sửa nháp ${channelLabel}${editing ? `: ${editing.title}` : ''}`;
  const captionMax = tiktokSelected ? TIKTOK_LIMITS.CAPTION_MAX : SOCIAL_LIMITS.MESSAGE_MAX;

  return (
    <FormDrawer
      title={title}
      open
      onClose={onClose}
      onSubmit={() => form.submit()}
      submitting={save.isPending}
      submitDisabled={isUpdate && !editing}
      submitText="Lưu nháp"
      isDirty={() => form.isFieldsTouched()}
    >
      {isUpdate && detail.isError && (
        <QueryErrorAlert
          error={detail.error}
          message="Không tải được bài viết"
          description={socialCommandErrorMessage(detail.error)}
          retry={() => void detail.refetch()}
        />
      )}
      {isUpdate && !editing ? (
        detail.isError ? null : <DetailSkeleton />
      ) : (
        <>
          {isFacebookNotConfigured(save.error) && <FacebookSettingsHint />}
          {target.mode === 'createSocial' && (
            <fieldset className="mb-4">
              <legend className="mb-2 text-sm font-medium text-slate-800">Kênh đăng</legend>
              <Checkbox.Group<SocialChannel>
                value={selectedChannels}
                disabled={save.isPending}
                options={channelOptions(selectedChannels)}
                onChange={changeChannels}
              />
            </fieldset>
          )}
          <Typography.Paragraph type="secondary" className="text-xs">
            Bài được lưu ở trạng thái Nháp. Người có quyền đăng bấm "Đăng ngay" (Facebook có thể hẹn giờ, TikTok
            không); người chỉ có quyền soạn bấm "Gửi duyệt" để người có quyền đăng duyệt.
          </Typography.Paragraph>
          <Form form={form} layout="vertical" onFinish={submit} disabled={save.isPending} initialValues={EMPTY_SOCIAL_FORM}>
            {/* Loại đăng là thiết lập riêng của Facebook; ẩn (vẫn giữ giá trị) khi bỏ chọn kênh Facebook. */}
            <Form.Item
              name="publishType"
              hidden={!facebookSelected}
              label="Loại đăng"
              extra={
                publishType === FacebookPublishType.REEL
                  ? 'Reel dùng đúng một video; chọn "Đăng dạng Reel" khi duyệt. Sau khi đăng, Reel hiển thị là Video.'
                  : undefined
              }
            >
              <Radio.Group
                optionType="button"
                options={composablePublishTypeOptions(editing?.facebook?.publishType).filter(
                  (option) => !tiktokSelected || VIDEO_PUBLISH_TYPES.includes(option.value),
                )}
                onChange={() => form.setFieldValue('media', [])}
              />
            </Form.Item>
            {editableCaption ? (
              <>
                {captionLocked && (
                  <Alert
                    className="mb-4"
                    type="info"
                    showIcon
                    message="Nội dung đang khoá"
                    description={`Nội dung là caption dùng chung các kênh và kênh ${
                      targetChannel === SOCIAL_CHANNEL.TIKTOK ? 'Facebook' : 'TikTok'
                    } đã rời nháp, nên không sửa được nữa.`}
                  />
                )}
                <Form.Item
                  name="title"
                  label="Tiêu đề nội bộ"
                  extra="Bỏ trống = lấy dòng đầu của nội dung."
                  rules={[{ max: SOCIAL_LIMITS.TITLE_MAX }]}
                >
                  <Input
                    maxLength={SOCIAL_LIMITS.TITLE_MAX}
                    disabled={captionLocked && targetChannel === SOCIAL_CHANNEL.TIKTOK}
                  />
                </Form.Item>
                <Form.Item
                  name="body"
                  label={tiktokSelected ? 'Nội dung (caption chung các kênh)' : 'Nội dung'}
                  rules={
                    captionLocked
                      ? []
                      : [
                          ...captionRules({
                            max: captionMax,
                            maxMessage: tiktokSelected
                              ? `Caption TikTok tối đa ${captionMax.toLocaleString('vi-VN')} ký tự.`
                              : undefined,
                          }),
                          ({ getFieldValue }) => ({
                            validator: (_: unknown, value?: string) =>
                              facebookSelected &&
                              getFieldValue('publishType') === FacebookPublishType.FEED &&
                              !htmlToPlainText(value) &&
                              !String(getFieldValue('link') ?? '').trim()
                                ? Promise.reject(new Error('Bài viết dạng chữ cần nội dung hoặc link.'))
                                : Promise.resolve(),
                          }),
                        ]
                  }
                >
                  <SocialCaptionInput max={captionMax} disabled={captionLocked || save.isPending} />
                </Form.Item>
                {!captionLocked && (
                  <Form.Item
                    name="link"
                    label="Link (tuỳ chọn)"
                    extra="Link được thêm vào cuối nội dung; Facebook tự tạo bản xem trước. Có thể dán link sản phẩm trên website."
                    rules={[{ pattern: HTTPS_URL, message: 'Nhập URL bắt đầu bằng http:// hoặc https://' }]}
                  >
                    <Input placeholder="https://..." />
                  </Form.Item>
                )}
              </>
            ) : (
              <Alert
                className="mb-4"
                type="info"
                showIcon
                message={isSocial ? `Caption ${channelLabel} là nội dung hiện tại của bài` : `Nội dung ${channelLabel} là nội dung bài website`}
                description={
                  isSocial
                    ? 'Sau khi tạo nháp có thể sửa nội dung ở "Sửa nháp" (khi các kênh còn ở Nháp); ở đây chỉ chọn media.'
                    : 'Sửa tiêu đề/nội dung ở màn soạn bài viết; ở đây chỉ chọn ảnh/video đăng kèm.'
                }
              />
            )}
            <Form.Item
              name="media"
              label="Ảnh / video"
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_: unknown, value?: SocialMediaValue[]) => {
                    const kinds = (value ?? []).map((item) => item.kind);
                    const violation =
                      (facebookSelected ? socialMediaRuleViolation(getFieldValue('publishType'), kinds) : undefined) ??
                      (tiktokSelected ? tiktokMediaViolation(kinds) : undefined);
                    return violation ? Promise.reject(new Error(violation)) : Promise.resolve();
                  },
                }),
              ]}
            >
              <SocialMediaField publishType={mediaPublishType} disabled={save.isPending} />
            </Form.Item>
          </Form>
          {tiktokSelected && (
            <TikTokSettingsPanel
              value={tiktokSettings}
              onChange={setTiktokSettings}
              creator={creator.data}
              creatorLoading={creator.isLoading}
              creatorError={creator.error}
              showPrivacyError={privacyTouched}
              disabled={save.isPending}
            />
          )}
        </>
      )}
    </FormDrawer>
  );
}
