import type { SignedMediaUploadDto } from '@/generated/api/media/media.schemas';
import { assertAllowedImageType, assertWithinMaxBytes, chooseSignedUploadFile, uploadToCloudinary } from './cloudinary';
import { imageUploadQueue } from './concurrency';
import { optimizeImageForUpload, PRODUCT_IMAGE_MAX_EDGE } from './image-optimize';
import type { ImageUploadOptions } from './upload-image';

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
 * Ảnh được thu nhỏ/nén trên trình duyệt trước (lỗi thì gửi bản gốc) và xếp hàng chung với `uploadImage`.
 */
export async function uploadSignedImage(
  file: File,
  sign: (request: { fileName: string; contentType: SignedImageContentType; sizeBytes: number }) => Promise<SignedImageUpload>,
  signal?: AbortSignal,
  { maxEdge = PRODUCT_IMAGE_MAX_EDGE, onProgress }: ImageUploadOptions = {},
): Promise<UploadedSignedImage> {
  assertAllowedImageType(file.type);

  return imageUploadQueue.run(async () => {
    const prepared = await optimizeImageForUpload(file, { maxEdge });
    const signed = await sign({
      fileName: prepared.name,
      contentType: prepared.type as SignedImageContentType,
      sizeBytes: prepared.size,
    });
    const toSend = chooseSignedUploadFile(file, prepared, signed.allowedFormats);
    assertWithinMaxBytes(toSend, signed.maxBytes);

    const uploaded = await uploadToCloudinary(toSend, signed, signal, onProgress);
    return {
      publicId: uploaded.public_id,
      providerVersion: uploaded.version,
      providerSignature: uploaded.signature,
      previewUrl: uploaded.secure_url,
    };
  }, signal);
}
