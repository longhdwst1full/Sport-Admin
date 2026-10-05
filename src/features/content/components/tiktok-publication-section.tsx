import { ExportOutlined, PlayCircleOutlined, TikTokOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Image, Progress, Statistic, Tag, Typography } from 'antd';
import { IMAGE_FALLBACK_SRC } from '@/features/media';
import { StatusTag } from '@/foundation/management';
import {
  FacebookPublicationStatus,
  type SocialPostDetailDto,
  type TikTokPublicationDto,
} from '@/generated/api/content/content.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import {
  fbStatusPresentation,
  TIKTOK_LIMITS,
  tiktokPrivacyLabels,
  tiktokPublishPhaseLabels,
} from '../constants/social.constants';
import { TIKTOK_ACTION_BUTTON } from '../constants/social-action-buttons';
import type { TikTokAction } from '../model/social-actions.policy';

const metricValue = (value: number | null | undefined) => (value == null ? '—' : value);

/** Tiến độ đẩy video (chỉ có khi PUBLISHING): pha, số chunk đã gửi, số lần init. */
function TikTokUploadProgress({ tiktok }: { tiktok: TikTokPublicationDto }) {
  const progress = tiktok.progress;
  if (!progress) return null;
  const percent = progress.totalChunks > 0 ? Math.round((progress.uploadedChunks / progress.totalChunks) * 100) : 0;
  return (
    <div className="mt-2 space-y-1 text-xs text-slate-600">
      <div>
        Bước: <strong>{tiktokPublishPhaseLabels[progress.phase]}</strong>
        {progress.totalChunks > 0 && ` · ${progress.uploadedChunks}/${progress.totalChunks} phần`}
        {progress.initCount > 1 && ` · khởi tạo lại lần ${progress.initCount}/${TIKTOK_LIMITS.MAX_INITS}`}
      </div>
      {progress.totalChunks > 0 && <Progress percent={percent} size="small" aria-label="Tiến độ tải video lên TikTok" />}
    </div>
  );
}

/**
 * Khối bản đăng TikTok trong drawer chi tiết: trạng thái, tiến độ, lỗi, link, chỉ số, video và nút lệnh theo
 * trạng thái (đã lọc quyền ở `availableTikTokActions`). `lastError` khi PUBLISHING là lỗi tạm (job tự thử lại)
 * nên chỉ hiện như ghi chú, không phải lỗi.
 */
export function TikTokPublicationSection({
  post,
  actions,
  onAction,
}: {
  post: SocialPostDetailDto;
  actions: Array<{ action: TikTokAction }>;
  onAction: (action: TikTokAction) => void;
}) {
  const tiktok = post.tiktok;
  const publishing = tiktok?.status === FacebookPublicationStatus.PUBLISHING;

  return (
    <section aria-labelledby="tiktok-section-title" className="mb-4 rounded-lg border border-slate-200 p-4">
      <Typography.Title level={5} id="tiktok-section-title" className="!mb-3 flex items-center gap-2">
        <TikTokOutlined aria-hidden /> TikTok
      </Typography.Title>

      {actions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {actions.map(({ action }) => {
            const button = TIKTOK_ACTION_BUTTON[action];
            return (
              <Button
                key={action}
                icon={button.icon}
                danger={button.danger}
                type={button.primary ? 'primary' : 'default'}
                onClick={() => onAction(action)}
              >
                {button.label}
              </Button>
            );
          })}
        </div>
      )}

      {!tiktok ? (
        <Typography.Text type="secondary">Chưa đăng TikTok.</Typography.Text>
      ) : (
        <>
          {publishing && (
            <Alert
              className="mb-3"
              type="info"
              showIcon
              message="Đang đăng video lên TikTok"
              description={
                <>
                  Hệ thống tải video lên theo từng phần rồi chờ TikTok xử lý; tải lại sau ít phút để xem kết quả.
                  <TikTokUploadProgress tiktok={tiktok} />
                  {tiktok.lastError && (
                    <div className="mt-1 text-xs text-slate-500">Đang thử lại sau lỗi tạm thời: {tiktok.lastError}</div>
                  )}
                </>
              }
            />
          )}
          {tiktok.status === FacebookPublicationStatus.UNCERTAIN && (
            <Alert
              className="mb-3"
              type="warning"
              showIcon
              message="Chưa rõ video đã lên TikTok hay chưa"
              description={`TikTok chưa kết luận sau thời gian dài. Đối soát trước; không đăng lại để tránh video trùng.${
                tiktok.lastError ? ` Ghi chú: ${tiktok.lastError}` : ''
              }`}
            />
          )}
          {tiktok.lastError && tiktok.status === FacebookPublicationStatus.FAILED && (
            <Alert className="mb-3" type="error" showIcon message="Lỗi gần nhất từ TikTok" description={tiktok.lastError} />
          )}
          {tiktok.status === FacebookPublicationStatus.PUBLISHED && !tiktok.postId && (
            <Alert
              className="mb-3"
              type="info"
              showIcon
              message="TikTok chưa trả id video công khai"
              description="Video riêng tư hoặc còn đang kiểm duyệt: link và chỉ số sẽ có khi TikTok công khai video (hệ thống tự hỏi lại trong 7 ngày)."
            />
          )}

          <Descriptions size="small" column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }} bordered className="mb-3">
            <Descriptions.Item label="Trạng thái">
              <div className="flex flex-wrap items-center gap-2">
                <StatusTag status={tiktok.status} presentations={fbStatusPresentation} />
                {tiktok.permalinkUrl && (
                  <a href={tiktok.permalinkUrl} target="_blank" rel="noopener noreferrer" className="text-xs">
                    <ExportOutlined aria-hidden /> Xem trên TikTok
                  </a>
                )}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Quyền riêng tư">
              {tiktok.privacyLevel ? tiktokPrivacyLabels[tiktok.privacyLevel] : <Tag color="orange">Chưa chọn</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Tương tác">
              {[
                tiktok.disableComment && 'Tắt bình luận',
                tiktok.disableDuet && 'Tắt Duet',
                tiktok.disableStitch && 'Tắt Stitch',
              ]
                .filter(Boolean)
                .join(', ') || 'Cho phép tất cả'}
            </Descriptions.Item>
            <Descriptions.Item label="Người gửi duyệt">{tiktok.submittedBy?.displayName ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Giờ đăng">{tiktok.publishAt ? formatDateTime(tiktok.publishAt) : '—'}</Descriptions.Item>
            <Descriptions.Item label="ID video">
              <span className="font-mono text-xs">{tiktok.postId ?? '—'}</span>
            </Descriptions.Item>
          </Descriptions>

          <div className="mb-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Statistic title="Lượt xem" value={metricValue(tiktok.metrics.views)} />
            <Statistic title="Lượt thích" value={metricValue(tiktok.metrics.likes)} />
            <Statistic title="Bình luận" value={metricValue(tiktok.metrics.comments)} />
            <Statistic title="Chia sẻ" value={metricValue(tiktok.metrics.shares)} />
          </div>
          <Typography.Paragraph type="secondary" className="text-xs">
            {tiktok.metrics.syncedAt
              ? `Đồng bộ chỉ số lúc ${formatDateTime(tiktok.metrics.syncedAt)}.`
              : '"—" = chưa đồng bộ (cần id video công khai); job đồng bộ định kỳ cập nhật chỉ số.'}
          </Typography.Paragraph>

          {tiktok.media.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {tiktok.media.map((item) => (
                <div key={item.id} className="relative overflow-hidden rounded-xl border border-slate-200">
                  {item.url ? (
                    <Image fallback={IMAGE_FALLBACK_SRC} width={92} height={92} src={item.thumbnailUrl ?? item.url} className="object-cover" />
                  ) : (
                    <div className="flex h-[92px] w-[92px] items-center justify-center text-[11px] text-slate-400">Đã gỡ</div>
                  )}
                  <PlayCircleOutlined className="absolute left-1 top-1 rounded-full bg-black/50 p-1 text-white" />
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
    </section>
  );
}
