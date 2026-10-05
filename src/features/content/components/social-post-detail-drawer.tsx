import { useState } from 'react';
import { PlayCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Drawer, Empty, Image, Skeleton, Statistic, Tag, Typography } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management';
import { useGetAdminSocialPost } from '@/generated/api/content/content';
import { FacebookPublicationStatus, SocialMediaDtoKind } from '@/generated/api/content/content.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import {
  fbOriginLabels,
  fbPublishTypeLabels,
  fbStatusPresentation,
  postTypeLabels,
  SOCIAL_PERMISSION,
} from '../constants/social.constants';
import { SOCIAL_ACTION_BUTTON } from '../constants/social-action-buttons';
import { availableSocialActions, type SocialAction } from '../model/social-actions.policy';
import { socialCommandErrorMessage } from '../model/social-command-error';
import { FacebookPermalink, FacebookVideoProcessingTag } from './facebook-publication-badges';
import { SocialActionModal, type SocialModalAction } from './social-action-modal';
import { SocialPostEditorDrawer, type SocialEditorTarget } from './social-post-editor-drawer';
import { IMAGE_FALLBACK_SRC } from '@/features/media';

const metricValue = (value: number | null | undefined) => (value == null ? '—' : value);

/**
 * Chi tiết bài + bản đăng Facebook: media, chỉ số, lỗi gần nhất và mọi lệnh khả dụng.
 * PERMISSION: nút theo `social.post.manage`/`social.post.publish`. "Duyệt là đăng" (D97, 2026-10-03): không
 * maker-checker, người có quyền đăng đăng thẳng từ nháp.
 */
export function SocialPostDetailDrawer({ postId, onClose }: { postId: string; onClose: () => void }) {
  const canManage = useCan(SOCIAL_PERMISSION.MANAGE);
  const canPublish = useCan(SOCIAL_PERMISSION.PUBLISH);
  const detail = useGetAdminSocialPost(postId, { query: { retry: false } });
  const post = detail.data;
  const facebook = post?.facebook;
  const permalinkUrl = facebook?.permalinkUrl;
  const videoProcessing = facebook?.videoProcessing === true;
  const [pendingAction, setPendingAction] = useState<SocialModalAction>();
  const [editor, setEditor] = useState<SocialEditorTarget>();

  const actions = post
    ? availableSocialActions({
        postType: post.postType,
        postStatus: post.status,
        fbStatus: facebook?.status ?? null,
        canManage,
        canPublish,
      })
    : [];

  const runAction = (action: SocialAction) => {
    if (!post) return;
    if (action === 'createDraft') setEditor({ mode: 'createDraft', postId: post.id, version: post.version, title: post.title });
    else if (action === 'editDraft') setEditor({ mode: 'updateDraft', postId: post.id });
    else setPendingAction(action);
  };

  return (
    <Drawer
      title={post ? post.title : 'Chi tiết bài viết'}
      width={760}
      open
      onClose={onClose}
      destroyOnHidden
      extra={
        <Button icon={<SyncOutlined />} loading={detail.isFetching} onClick={() => void detail.refetch()}>
          Tải lại
        </Button>
      }
    >
      {detail.isError && (
        <Alert className="mb-3" type="error" showIcon message="Không tải được bài viết" description={socialCommandErrorMessage(detail.error)} />
      )}
      {!post ? (
        detail.isLoading && <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          {actions.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {actions.map(({ action }) => {
                const button = SOCIAL_ACTION_BUTTON[action];
                // Video đang xử lý: hệ thống tự đối soát, nút Đối soát vẫn dùng được nhưng không là hành động chính.
                const primary = button.primary && !(action === 'reconcile' && videoProcessing);
                return (
                  <Button
                    key={action}
                    icon={button.icon}
                    danger={button.danger}
                    type={primary ? 'primary' : 'default'}
                    onClick={() => runAction(action)}
                  >
                    {button.label}
                  </Button>
                );
              })}
            </div>
          )}

          {facebook?.status === FacebookPublicationStatus.UNCERTAIN && videoProcessing && (
            <Alert
              className="mb-3"
              type="info"
              showIcon
              message="Facebook đang xử lý video"
              description="Hệ thống tự kiểm tra mỗi 5 phút và cập nhật khi Facebook xử lý xong. Có thể bấm Đối soát nếu cần kiểm tra ngay; không đăng lại để tránh bài trùng."
            />
          )}
          {facebook?.status === FacebookPublicationStatus.UNCERTAIN && !videoProcessing && (
            <Alert
              className="mb-3"
              type="warning"
              showIcon
              message="Chưa rõ bài đã lên Facebook hay chưa"
              description="Lần gọi Facebook bị gián đoạn. Đối soát với Page trước; không đăng lại để tránh bài trùng."
            />
          )}
          {facebook?.status === FacebookPublicationStatus.PUBLISHING && (
            <Alert className="mb-3" type="info" showIcon message="Đang gửi bài lên Facebook" description="Tải lại sau ít phút để xem kết quả." />
          )}
          {/* `lastError` mang mã `VIDEO_PROCESSING:` khi video còn đang xử lý: không phải lỗi thật. */}
          {facebook?.lastError && !videoProcessing && (
            <Alert className="mb-3" type="error" showIcon message="Lỗi gần nhất từ Facebook" description={facebook.lastError} />
          )}

          <Descriptions size="small" column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }} bordered className="mb-4">
            <Descriptions.Item label="Loại bài">{postTypeLabels[post.postType]}</Descriptions.Item>
            <Descriptions.Item label="Website">
              {post.isPublished ? <Tag color="green">Đang hiển thị</Tag> : <Tag>Không hiển thị</Tag>}
            </Descriptions.Item>
            {facebook ? (
              <>
                <Descriptions.Item label="Facebook">
                  <div className="flex flex-wrap items-center gap-2">
                    {videoProcessing ? (
                      <FacebookVideoProcessingTag />
                    ) : (
                      <StatusTag status={facebook.status} presentations={fbStatusPresentation} />
                    )}
                    {permalinkUrl && <FacebookPermalink url={permalinkUrl} />}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Loại đăng">{fbPublishTypeLabels[facebook.publishType]}</Descriptions.Item>
                <Descriptions.Item label="Nguồn">{fbOriginLabels[facebook.origin]}</Descriptions.Item>
                <Descriptions.Item label="Người gửi duyệt">{facebook.submittedBy?.displayName ?? '—'}</Descriptions.Item>
                <Descriptions.Item label={facebook.status === FacebookPublicationStatus.SCHEDULED ? 'Giờ hẹn' : 'Giờ đăng'}>
                  {facebook.publishAt ? formatDateTime(facebook.publishAt) : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="ID bài Facebook">
                  <span className="font-mono text-xs">{facebook.postId ?? '—'}</span>
                </Descriptions.Item>
              </>
            ) : (
              <Descriptions.Item label="Facebook" span={2}>
                Chưa đăng Facebook
              </Descriptions.Item>
            )}
          </Descriptions>

          {facebook && (
            <>
              <Typography.Title level={5}>Chỉ số Facebook</Typography.Title>
              <div className="mb-1 grid grid-cols-2 gap-3">
                <Statistic title="Lượt tiếp cận (reach)" value={metricValue(facebook.metrics.reach)} />
                <Statistic title="Tương tác (cảm xúc + bình luận + chia sẻ)" value={metricValue(facebook.metrics.engagements)} />
              </div>
              <Typography.Paragraph type="secondary" className="text-xs">
                "—" = Meta không trả chỉ số hoặc chưa đồng bộ; job đồng bộ định kỳ cập nhật chỉ số.
              </Typography.Paragraph>

              <Typography.Title level={5}>Ảnh / video ({facebook.media.length})</Typography.Title>
              {facebook.media.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không kèm media" />
              ) : (
                <div className="mb-4 flex flex-wrap gap-3">
                  {facebook.media.map((item) => (
                    <div key={item.id} className="relative overflow-hidden rounded-xl border border-slate-200">
                      {item.url ? (
                        <Image fallback={IMAGE_FALLBACK_SRC} width={92} height={92} src={item.thumbnailUrl ?? item.url} className="object-cover" />
                      ) : (
                        <div className="flex h-[92px] w-[92px] items-center justify-center text-[11px] text-slate-400">Đã gỡ</div>
                      )}
                      {item.kind === SocialMediaDtoKind.VIDEO && (
                        <PlayCircleOutlined className="absolute left-1 top-1 rounded-full bg-black/50 p-1 text-white" />
                      )}
                      {!item.active && (
                        <Tag color="red" className="absolute bottom-1 left-1 !m-0">
                          Không dùng được
                        </Tag>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Typography.Title level={5}>Nội dung</Typography.Title>
          <Typography.Paragraph className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">
            {post.body || <span className="text-slate-400">(trống)</span>}
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" className="text-xs">
            Cập nhật lần cuối {formatDateTime(post.updatedAt)}
          </Typography.Paragraph>
        </>
      )}

      <SocialActionModal post={post} action={pendingAction} onClose={() => setPendingAction(undefined)} />
      {editor && <SocialPostEditorDrawer target={editor} onClose={() => setEditor(undefined)} />}
    </Drawer>
  );
}
