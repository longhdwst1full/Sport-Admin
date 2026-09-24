import type { AxiosRequestConfig } from 'axios';
import { apiFetcherWithResponse } from './fetcher';

/**
 * Tải một file từ API rồi lưu xuống máy.
 *
 * Tên file lấy từ header `Content-Disposition` do **server** đặt, không dựng lại ở đây: quy tắc đặt
 * tên (loại báo cáo + khoảng thời gian + đuôi) nằm ở Backend, chép lại một bản thứ hai ở Frontend
 * là để hai bên lệch nhau sau vài lần sửa.
 */
export interface DownloadResult {
  filename: string;
  sizeBytes: number;
}

export async function downloadFile(
  config: AxiosRequestConfig,
  fallbackFilename: string,
): Promise<DownloadResult> {
  const response = await apiFetcherWithResponse<Blob>({ ...config, responseType: 'blob' });
  const filename =
    filenameFromContentDisposition(response.headers['content-disposition']) ?? fallbackFilename;

  saveBlob(response.data, filename);
  return { filename, sizeBytes: response.data.size };
}

/**
 * Đọc tên file từ `Content-Disposition`.
 *
 * Đọc `filename*` (RFC 5987) trước rồi mới tới `filename`: khi tên có ký tự ngoài ASCII thì chỉ
 * dạng có sao mới giữ đúng dấu tiếng Việt.
 */
export function filenameFromContentDisposition(header: unknown): string | undefined {
  if (typeof header !== 'string') return undefined;

  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
    } catch {
      // Header hỏng thì rơi xuống nhánh `filename` thường, không làm hỏng cả lượt tải.
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header)?.[1];
  return plain?.trim() || undefined;
}

/**
 * Lưu blob xuống máy bằng một thẻ `<a download>` tạm.
 *
 * Phải `revokeObjectURL` sau khi bấm: mỗi object URL giữ nguyên blob trong bộ nhớ tab cho tới khi
 * được thu hồi, nên tải vài chục file rồi để tab mở là giữ luôn từng đó dữ liệu.
 */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
