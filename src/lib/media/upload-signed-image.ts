import type { SignedMediaUploadDto } from '@/generated/api/media/media.schemas';
import { assertAllowedImageType, assertWithinMaxBytes, uploadToCloudinary } from './cloudinary';

export type SignedImageUpload = SignedMediaUploadDto;

export type SignedImageContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

/** Kết quả tải lên, đúng các trường API cần để xác minh lại (`ReturnEvidenceInputDto`). */
export interface UploadedSignedImage {
  publicId: string;
  providerVersion: number;
  providerSignature: string;
  previewUrl: string;
}

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
  assertAllowedImageType(file.type);
  const signed = await sign({
    fileName: file.name,
    contentType: file.type as SignedImageContentType,
    sizeBytes: file.size,
  });
  assertWithinMaxBytes(file, signed.maxBytes);

  const uploaded = await uploadToCloudinary(file, signed, signal);
  return {
    publicId: uploaded.public_id,
    providerVersion: uploaded.version,
    providerSignature: uploaded.signature,
    previewUrl: uploaded.secure_url,
  };
}
