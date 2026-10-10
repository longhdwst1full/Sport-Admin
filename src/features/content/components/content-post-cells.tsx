import { TikTokOutlined, WarningOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { StatusTag } from '@/foundation/management';
import { FacebookPublicationStatus, type SocialPostSummaryDto } from '@/generated/api/content/content.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import {
  fbOriginLabels,
  fbPublishTypeLabels,
  fbStatusPresentation,
  tiktokPrivacyLabels,
  tiktokPublishPhaseLabels,
} from '../constants/social.constants';
import { formatMetric } from '../model/social-dashboard';
import { FacebookPermalink, FacebookVideoProcessingTag } from './facebook-publication-badges';

type Row = SocialPostSummaryDto;

function LastErrorIcon({ error }: { error: string }) {
  return (
    <Tooltip title={error}>
      <WarningOutlined className="text-rose-500" aria-label="Lỗi gần nhất" />
    </Tooltip>
  );
}

export function FacebookCell({ row }: { row: Row }) {
  const facebook = row.facebook;
  if (!facebook) return <span className="text-xs text-slate-400">Chưa đăng</span>;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {facebook.videoProcessing ? (
          <FacebookVideoProcessingTag />
        ) : (
          <StatusTag status={facebook.status} presentations={fbStatusPresentation} />
        )}
        {/* Khi Facebook đang xử lý video, `lastError` là mã `VIDEO_PROCESSING:` chứ không phải lỗi thật. */}
        {facebook.lastError && !facebook.videoProcessing && <LastErrorIcon error={facebook.lastError} />}
      </div>
      <span className="text-[11px] text-slate-500">
        {fbPublishTypeLabels[facebook.publishType]} · {fbOriginLabels[facebook.origin]}
        {facebook.publishAt ? ` · ${formatDateTime(facebook.publishAt)}` : ''}
      </span>
      {facebook.permalinkUrl && <FacebookPermalink url={facebook.permalinkUrl} />}
    </div>
  );
}

export function TikTokCell({ row }: { row: Row }) {
  const tiktok = row.tiktok;
  if (!tiktok) return <span className="text-xs text-slate-400">Chưa đăng</span>;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        <StatusTag status={tiktok.status} presentations={fbStatusPresentation} />
        {/* Khi PUBLISHING, `lastError` là lỗi tạm (job tự thử lại), không phải lỗi thật. */}
        {tiktok.lastError && tiktok.status === FacebookPublicationStatus.FAILED && <LastErrorIcon error={tiktok.lastError} />}
      </div>
      <span className="text-[11px] text-slate-500">
        {tiktok.progress
          ? tiktokPublishPhaseLabels[tiktok.progress.phase]
          : tiktok.privacyLevel
            ? tiktokPrivacyLabels[tiktok.privacyLevel]
            : 'Chưa chọn quyền riêng tư'}
        {tiktok.publishAt ? ` · ${formatDateTime(tiktok.publishAt)}` : ''}
      </span>
      {tiktok.metrics.views != null && (
        <span className="text-[11px] text-slate-500">{formatMetric(tiktok.metrics.views)} lượt xem</span>
      )}
      {tiktok.permalinkUrl && (
        <a href={tiktok.permalinkUrl} target="_blank" rel="noopener noreferrer" className="text-xs">
          <TikTokOutlined aria-hidden /> Xem trên TikTok
        </a>
      )}
    </div>
  );
}
