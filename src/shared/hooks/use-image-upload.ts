import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UploadProps } from 'antd';
import { invalidateReferenceData } from '@/shared/constants/query-cache-policy';

type CustomRequestOptions = Parameters<NonNullable<UploadProps['customRequest']>>[0];

interface ImageUploadHandlers<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export interface ImageUploadProgressOptions {
  /** Tiến độ 0..1 của một ảnh. */
  onProgress?: (fraction: number) => void;
}

/**
 * Bọc phần lặp lại của mọi `Upload customRequest` tải ảnh: kiểm tra đúng là `File`, đếm số ảnh đang
 * tải (chọn nhiều ảnh thì chạy song song, hàng đợi trong `lib/media` giới hạn 3), gộp tiến độ, huỷ mọi
 * lượt đang tải khi component unmount, và chuẩn hoá lỗi không phải `Error`. Phần khác nhau giữa các
 * màn — cập nhật state nào, gọi thêm mutation nào, hiện thông báo gì — vẫn do nơi gọi quyết định qua
 * `onSuccess`/`onError` của `customRequest`. Lượt bị huỷ do unmount không gọi `onError`.
 *
 * Không dùng cho `EvidenceImageUpload`: ở đó còn giới hạn số ảnh theo phiếu nên tự quản bộ đếm.
 */
export function useImageUpload<T>(
  upload: (file: File, signal?: AbortSignal, options?: ImageUploadProgressOptions) => Promise<T>,
) {
  const [pendingCount, setPendingCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const controllers = useRef(new Set<AbortController>());
  const fractions = useRef(new Map<AbortController, number>());

  useEffect(() => {
    const active = controllers.current;
    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);

  const publishProgress = () => {
    const values = [...fractions.current.values()];
    setProgress(values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) : 0);
  };

  function customRequest(options: CustomRequestOptions, handlers: ImageUploadHandlers<T> = {}): void {
    const { file, onError, onSuccess, onProgress } = options;
    if (!(file instanceof File)) {
      const error = new Error('Tệp tải lên không hợp lệ.');
      onError?.(error);
      handlers.onError?.(error);
      return;
    }
    const controller = new AbortController();
    controllers.current.add(controller);
    fractions.current.set(controller, 0);
    setPendingCount((count) => count + 1);
    publishProgress();

    void upload(file, controller.signal, {
      onProgress: (fraction) => {
        fractions.current.set(controller, fraction);
        onProgress?.({ percent: Math.round(fraction * 100) });
        publishProgress();
      },
    })
      .then((result) => {
        // Ảnh mới nằm trong Thư viện media mà picker cache lâu: đánh dấu cũ để lần mở sau thấy ngay.
        void invalidateReferenceData(queryClient, 'media');
        onSuccess?.(result);
        handlers.onSuccess?.(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const uploadError = error instanceof Error ? error : new Error('Upload ảnh thất bại.');
        onError?.(uploadError);
        handlers.onError?.(uploadError);
      })
      .finally(() => {
        controllers.current.delete(controller);
        fractions.current.delete(controller);
        setPendingCount((count) => Math.max(0, count - 1));
        publishProgress();
      });
  }

  return { uploading: pendingCount > 0, pendingCount, progress, customRequest };
}
