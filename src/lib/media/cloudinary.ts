import axios from 'axios';

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
}

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

export function assertWithinMaxBytes(file: File, maxBytes: number): void {
  if (file.size > maxBytes) {
    throw new Error(`Ảnh vượt quá giới hạn ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
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
