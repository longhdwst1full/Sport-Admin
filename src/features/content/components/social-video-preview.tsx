import { useState } from 'react';
import { PlayCircleFilled } from '@ant-design/icons';
import { Image, Modal, Skeleton } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { MODAL_WIDTH } from '@/foundation/overlay';
import { useGetAdminMediaAsset } from '@/generated/api/media/media';
import { IMAGE_FALLBACK_SRC } from '@/features/media';

/**
 * Preview video dùng chung cho form soạn và drawer chi tiết. Form chỉ giữ thumbnail + asset id, vì vậy URL video gốc
 * được tải lazy khi mở modal; drawer chi tiết có thể truyền thẳng `videoUrl` và không phát sinh request.
 */
export function SocialVideoPreview({
  assetId,
  videoUrl,
  posterUrl,
  title = 'Xem trước video',
}: {
  assetId: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const detail = useGetAdminMediaAsset(assetId, {
    query: { enabled: open && !videoUrl, retry: false, staleTime: 60_000 },
  });
  const source = videoUrl ?? detail.data?.secureUrl;

  return (
    <>
      <button
        type="button"
        className="group relative block h-[92px] w-[92px] overflow-hidden bg-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2"
        aria-label={title}
        onClick={() => setOpen(true)}
      >
        {posterUrl ? (
          <Image
            fallback={IMAGE_FALLBACK_SRC}
            preview={false}
            width={92}
            height={92}
            src={posterUrl}
            alt=""
            className="object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-75"
          />
        ) : (
          <span className="block h-full w-full bg-gradient-to-br from-slate-700 to-slate-950" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/15 transition group-hover:bg-black/30">
          <PlayCircleFilled className="text-3xl text-white drop-shadow" aria-hidden />
        </span>
      </button>

      <Modal
        open={open}
        title={title}
        width={MODAL_WIDTH.lg}
        footer={null}
        destroyOnHidden
        onCancel={() => setOpen(false)}
      >
        {detail.isError && !videoUrl ? (
          <QueryErrorAlert
            error={detail.error}
            message="Không tải được video"
            retry={() => void detail.refetch()}
          />
        ) : !source ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <div className="overflow-hidden rounded-xl bg-black shadow-inner">
            <video
              key={source}
              className="max-h-[70vh] w-full"
              src={source}
              poster={posterUrl ?? undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
            >
              Trình duyệt không hỗ trợ phát video.
            </video>
          </div>
        )}
      </Modal>
    </>
  );
}
