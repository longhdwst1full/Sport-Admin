import axios, { isAxiosError, isCancel } from 'axios';

/** Chữ ký upload một lần mà mọi endpoint `.../uploads/signature` của API trả về. */
export interface CloudinarySignedUpload {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  allowedFormats: string[];
  maxBytes: number;
  overwrite: boolean;
  uniqueFilename: boolean;
  /**
   * CONTRACT: các trường dưới đây API mới thêm cho upload video; khai báo tuỳ chọn tới khi SDK sinh lại,
   * để code biên dịch được cả trước lẫn sau khi `src/generated` có chúng.
   */
  resourceType?: CloudinaryResourceType;
  /** Chuỗi `eager` đã ký (vd. tạo ảnh thumbnail cho video); `null` khi không có. */
  eager?: string | null;
  eagerAsync?: boolean;
  /** Kích thước mỗi phần khi tải theo phần; `null` = server không yêu cầu chia phần. */
  chunkSizeBytes?: number | null;
}

export type CloudinaryResourceType = 'IMAGE' | 'VIDEO';

export interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  secure_url: string;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/** Loại ảnh admin cho phép upload; dùng chung cho luồng thư viện media và luồng chữ ký theo mục đích. */
export function assertAllowedImageType(contentType: string): void {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF.');
  }
}

export function assertWithinMaxBytes(file: File, maxBytes: number, label = 'Ảnh'): void {
  if (file.size > maxBytes) {
    throw new Error(`${label} vượt quá giới hạn ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
  }
}

const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);

/** Định dạng video `accept` của ô chọn tệp; khớp `allowedFormats` mp4/mov API cấp cho video. */
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime';

export function assertAllowedVideoType(contentType: string): void {
  if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
    throw new Error('Chỉ hỗ trợ video MP4 hoặc MOV.');
  }
}

/**
 * Tải file thẳng lên Cloudinary bằng chữ ký một lần do API cấp. Dùng chung cho `uploadImage`
 * (thư viện media, có bước finalize) và `uploadSignedImage` (chữ ký theo mục đích, API xác minh
 * ngay trong lệnh nghiệp vụ) — cả hai chỉ khác nhau ở việc lấy chữ ký và ở bước sau khi tải xong.
 */
export async function uploadToCloudinary(
  file: File,
  signed: CloudinarySignedUpload,
  signal?: AbortSignal,
): Promise<CloudinaryUploadResponse> {
  const form = new FormData();
  form.set('file', file);
  form.set('api_key', signed.apiKey);
  form.set('timestamp', String(signed.timestamp));
  form.set('signature', signed.signature);
  form.set('folder', signed.folder);
  form.set('public_id', signed.publicId);
  form.set('allowed_formats', signed.allowedFormats.join(','));
  form.set('overwrite', String(signed.overwrite));
  form.set('unique_filename', String(signed.uniqueFilename));

  const uploaded = await axios.post<CloudinaryUploadResponse>(signed.uploadUrl, form, { signal });
  return uploaded.data;
}

/** Cloudinary yêu cầu mọi phần (trừ phần cuối) tối thiểu 5 MB; dùng khi server không gửi `chunkSizeBytes`. */
const DEFAULT_CHUNK_SIZE_BYTES = 20 * 1024 * 1024;
const CHUNK_MAX_ATTEMPTS = 3;
const CHUNK_RETRY_BASE_DELAY_MS = 1_000;

export interface ChunkedUploadOptions {
  signal?: AbortSignal;
  /** Tiến độ 0..1 trên toàn bộ tệp (gồm các phần đã xong và phần đang gửi). */
  onProgress?: (fraction: number) => void;
}

/** Chỉ thử lại lỗi mạng (không có response) và 5xx; huỷ hoặc 4xx (chữ ký sai, định dạng bị từ chối) dừng ngay. */
function isRetriableChunkError(error: unknown): boolean {
  if (isCancel(error) || !isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

function waitWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function randomUploadId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Tải tệp lớn (video) lên Cloudinary theo từng phần tuần tự (`X-Unique-Upload-Id` + `Content-Range`).
 * Mọi phần gửi cùng bộ trường đã ký; response của phần cuối là kết quả upload hoàn chỉnh.
 * Mỗi phần thử lại tối đa 3 lần (backoff 1s, 2s) khi lỗi mạng/5xx; `signal` huỷ được cả lúc đang chờ thử lại.
 * Ảnh vẫn đi qua `uploadToCloudinary` (một lần gửi) như trước. `chunkSizeBytes` do server cấp; thiếu thì
 * dùng 20 MB (Cloudinary đòi mỗi phần trừ phần cuối tối thiểu 5 MB).
 */
export async function uploadToCloudinaryChunked(
  file: File,
  signed: CloudinarySignedUpload,
  { signal, onProgress }: ChunkedUploadOptions = {},
): Promise<CloudinaryUploadResponse> {
  const total = file.size;
  if (total === 0) throw new Error('Tệp rỗng, không thể tải lên.');
  const chunkSize = signed.chunkSizeBytes && signed.chunkSizeBytes > 0 ? signed.chunkSizeBytes : DEFAULT_CHUNK_SIZE_BYTES;
  const uploadId = randomUploadId();
  let last: CloudinaryUploadResponse | undefined;
  onProgress?.(0);

  for (let start = 0; start < total; start += chunkSize) {
    const end = Math.min(start + chunkSize, total);
    const chunk = file.slice(start, end, file.type);
    const chunkLength = end - start;

    for (let attempt = 1; ; attempt += 1) {
      const form = new FormData();
      form.set('file', chunk, file.name);
      form.set('api_key', signed.apiKey);
      form.set('timestamp', String(signed.timestamp));
      form.set('signature', signed.signature);
      form.set('folder', signed.folder);
      form.set('public_id', signed.publicId);
      form.set('allowed_formats', signed.allowedFormats.join(','));
      form.set('overwrite', String(signed.overwrite));
      form.set('unique_filename', String(signed.uniqueFilename));
      if (signed.eager) form.set('eager', signed.eager);
      if (signed.eager && signed.eagerAsync !== undefined) form.set('eager_async', String(signed.eagerAsync));

      try {
        const response = await axios.post<CloudinaryUploadResponse>(signed.uploadUrl, form, {
          signal,
          headers: {
            'X-Unique-Upload-Id': uploadId,
            'Content-Range': `bytes ${start}-${end - 1}/${total}`,
          },
          onUploadProgress: (event) => {
            if (!onProgress) return;
            // `loaded` đếm cả phần bao multipart nên có thể vượt kích thước phần: chặn trên.
            const sent = Math.min(event.loaded, chunkLength);
            onProgress(Math.min((start + sent) / total, 1));
          },
        });
        last = response.data;
        break;
      } catch (error) {
        if (attempt >= CHUNK_MAX_ATTEMPTS || !isRetriableChunkError(error)) throw error;
        await waitWithAbort(CHUNK_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), signal);
      }
    }
    onProgress?.(end / total);
  }

  if (!last?.public_id) {
    throw new Error('Cloudinary không trả kết quả upload hoàn chỉnh.');
  }
  return last;
}
