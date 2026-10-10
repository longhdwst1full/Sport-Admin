import { useEffect, useRef, useState } from 'react';
import { VideoCameraAddOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Progress, Upload } from 'antd';
import type { MediaAssetDto } from '@/generated/api/media/media.schemas';
import { VIDEO_ACCEPT } from '@/lib/media/cloudinary';
import { getVideoUploadErrorMessage, isUploadAbortError, uploadVideo } from '@/lib/media/upload-video';
import { invalidateReferenceData } from '@/shared/constants/query-cache-policy';

const UPLOAD_VIDEO_FALLBACK = 'Upload video thất bại.';

/**
 * Nút tải một video vào Thư viện media, kèm thanh tiến độ và nút huỷ. Video tải theo phần nên có thể
 * mất vài phút; đóng modal chứa nút (unmount) cũng huỷ lượt tải đang chạy.
 * PERMISSION: cần `media.asset.upload`; nơi gọi truyền `disabled` khi thiếu quyền, API kiểm lại.
 */
export function VideoUploadButton({
  disabled,
  onUploaded,
}: {
  disabled?: boolean;
  onUploaded: (asset: MediaAssetDto) => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const start = (file: File) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setPercent(0);
    void uploadVideo(file, {
      signal: controller.signal,
      onProgress: (fraction) => setPercent(Math.floor(fraction * 100)),
    })
      .then((asset) => {
        void invalidateReferenceData(queryClient, 'media');
        // Đã huỷ (nút Huỷ/unmount) sau khi Cloudinary nhận xong: finalize vẫn chạy hết phía server, bỏ qua UI.
        if (controller.signal.aborted) return;
        onUploaded(asset);
        void message.success('Đã tải video lên.');
      })
      .catch((error: unknown) => {
        if (isUploadAbortError(error, controller.signal)) {
          void message.info('Đã huỷ tải video.');
          return;
        }
        void message.error(getVideoUploadErrorMessage(error, UPLOAD_VIDEO_FALLBACK));
      })
      .finally(() => {
        if (controllerRef.current === controller) controllerRef.current = null;
        setPercent(null);
      });
  };

  const uploading = percent !== null;

  return (
    <>
      <Upload
        accept={VIDEO_ACCEPT}
        showUploadList={false}
        disabled={uploading || disabled}
        beforeUpload={(file) => {
          start(file);
          return false;
        }}
      >
        <Button icon={<VideoCameraAddOutlined />} loading={uploading} disabled={disabled}>
          Tải video lên
        </Button>
      </Upload>
      {uploading && (
        <div className="flex w-full items-center gap-2">
          <Progress className="!mb-0 flex-1" percent={percent} status="active" aria-label="Tiến độ tải video" />
          <Button size="small" onClick={() => controllerRef.current?.abort()}>
            Huỷ tải
          </Button>
        </div>
      )}
    </>
  );
}
