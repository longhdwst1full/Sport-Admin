import { useState } from 'react';
import type { UploadProps } from 'antd';

type CustomRequestOptions = Parameters<NonNullable<UploadProps['customRequest']>>[0];

interface ImageUploadHandlers<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Bọc phần lặp lại của mọi `Upload customRequest` tải một ảnh: kiểm tra đúng là `File`, bật/tắt
 * trạng thái `uploading`, và chuẩn hoá lỗi không phải `Error`. Phần khác nhau giữa các màn — cập
 * nhật state nào, gọi thêm mutation nào, hiện thông báo gì — vẫn do nơi gọi quyết định qua
 * `onSuccess`/`onError` của `customRequest`, nên hành vi hiển thị giữ nguyên như trước khi gộp.
 *
 * Không dùng cho luồng tải nhiều ảnh song song (`EvidenceImageUpload`): ở đó "đang tải" là một bộ
 * đếm chứ không phải cờ bật/tắt, nên gộp vào đây sẽ làm sai UX khi hai ảnh tải chồng lấp.
 */
export function useImageUpload<T>(upload: (file: File, signal?: AbortSignal) => Promise<T>) {
  const [uploading, setUploading] = useState(false);

  function customRequest(options: CustomRequestOptions, handlers: ImageUploadHandlers<T> = {}): void {
    const { file, onError, onSuccess } = options;
    if (!(file instanceof File)) {
      const error = new Error('Tệp tải lên không hợp lệ.');
      onError?.(error);
      handlers.onError?.(error);
      return;
    }
    setUploading(true);
    void upload(file)
      .then((result) => {
        onSuccess?.(result);
        handlers.onSuccess?.(result);
      })
      .catch((error: unknown) => {
        const uploadError = error instanceof Error ? error : new Error('Upload ảnh thất bại.');
        onError?.(uploadError);
        handlers.onError?.(uploadError);
      })
      .finally(() => setUploading(false));
  }

  return { uploading, customRequest };
}
