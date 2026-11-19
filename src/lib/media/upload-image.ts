import {
  createAdminMediaUpload,
  finalizeAdminMediaUpload,
} from '@/generated/api/media/media';
import type { MediaAssetDto, MediaUploadMimeType } from '@/generated/api/media/media.schemas';
import { assertAllowedImageType, assertWithinMaxBytes, chooseSignedUploadFile, uploadToCloudinary } from './cloudinary';
import { imageUploadQueue } from './concurrency';
import { AVATAR_IMAGE_MAX_EDGE, optimizeImageForUpload, PRODUCT_IMAGE_MAX_EDGE } from './image-optimize';

export interface ImageUploadOptions {
  /** Cạnh dài tối đa khi thu nhỏ trên trình duyệt; mặc định 2048 px (ảnh sản phẩm/nội dung). */
  maxEdge?: number;
  /** Tiến độ 0..1 của bước POST lên Cloudinary. */
  onProgress?: (fraction: number) => void;
}

/**
 * Tải một ảnh vào Thư viện media: thu nhỏ/nén trên trình duyệt (lỗi thì gửi bản gốc) → xin chữ ký →
 * POST Cloudinary → finalize. Tối đa `IMAGE_UPLOAD_CONCURRENCY` ảnh chạy cùng lúc; ảnh dư xếp hàng.
 */
export async function uploadImage(
  file: File,
  signal?: AbortSignal,
  { maxEdge = PRODUCT_IMAGE_MAX_EDGE, onProgress }: ImageUploadOptions = {},
): Promise<MediaAssetDto> {
  assertAllowedImageType(file.type);

  const uploaded = await imageUploadQueue.run(async () => {
    const prepared = await optimizeImageForUpload(file, { maxEdge });
    const signed = await createAdminMediaUpload(
      { fileName: prepared.name, contentType: prepared.type as MediaUploadMimeType, sizeBytes: prepared.size },
      signal,
    );
    const toSend = chooseSignedUploadFile(file, prepared, signed.allowedFormats);
    assertWithinMaxBytes(toSend, signed.maxBytes);
    return uploadToCloudinary(toSend, signed, signal, onProgress);
  }, signal);

  // Không truyền `signal`: ảnh đã nằm trên Cloudinary, huỷ finalize lúc này (đóng form/unmount) sẽ để
  // lại tệp mồ côi không có bản ghi media — cùng lý do với `uploadVideo`.
  return finalizeAdminMediaUpload({
    publicId: uploaded.public_id,
    version: uploaded.version,
    signature: uploaded.signature,
  });
}

/** Ảnh đại diện chỉ hiển thị nhỏ: thu về cạnh dài 512 px trước khi tải. */
export function uploadAvatarImage(file: File, signal?: AbortSignal, options: ImageUploadOptions = {}) {
  return uploadImage(file, signal, { ...options, maxEdge: AVATAR_IMAGE_MAX_EDGE });
}
