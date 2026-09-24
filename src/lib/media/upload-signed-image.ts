import axios from 'axios';

/** Hình dạng chữ ký upload mà mọi endpoint `.../uploads/signature` của API trả về. */
export interface SignedImageUpload {
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

export type SignedImageContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

/** Kết quả tải lên, đúng các trường API cần để xác minh lại (`ReturnEvidenceInputDto`). */
export interface UploadedSignedImage {
  publicId: string;
  providerVersion: number;
  providerSignature: string;
  previewUrl: string;
}

interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  secure_url: string;
}

const allowedTypes = new Set<string>(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/**
 * Tải ảnh thẳng lên Cloudinary bằng chữ ký do API cấp cho một mục đích cụ thể (ảnh minh chứng phiếu
 * trả, chứng từ hoàn tiền...). Khác `uploadImage` của thư viện media: không có bước finalize, vì API
 * xác minh ảnh ngay trong lệnh nghiệp vụ nhận `publicId/providerVersion/providerSignature`.
 */
export async function uploadSignedImage(
  file: File,
  sign: (request: { fileName: string; contentType: SignedImageContentType; sizeBytes: number }) => Promise<SignedImageUpload>,
  signal?: AbortSignal,
): Promise<UploadedSignedImage> {
  if (!allowedTypes.has(file.type)) throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF.');
  const signed = await sign({
    fileName: file.name,
    contentType: file.type as SignedImageContentType,
    sizeBytes: file.size,
  });
  if (file.size > signed.maxBytes) {
    throw new Error(`Ảnh vượt quá giới hạn ${Math.floor(signed.maxBytes / 1024 / 1024)} MB.`);
  }
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
  return {
    publicId: uploaded.data.public_id,
    providerVersion: uploaded.data.version,
    providerSignature: uploaded.data.signature,
    previewUrl: uploaded.data.secure_url,
  };
}
