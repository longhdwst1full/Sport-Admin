import { createAdminMediaUpload, finalizeAdminMediaUpload } from '@/generated/api/media/media';
import type { ImageMimeType, MediaAssetDto } from '@/generated/api/media/media.schemas';
import {
  assertAllowedVideoType,
  assertWithinMaxBytes,
  uploadToCloudinaryChunked,
  type ChunkedUploadOptions,
  type CloudinarySignedUpload,
} from './cloudinary';

/**
 * Tải một video vào Thư viện media: xin chữ ký → tải theo phần lên Cloudinary (có tiến độ, huỷ được)
 * → finalize. Cùng luồng với `uploadImage`; API kiểm lại loại, dung lượng và chữ ký ở bước finalize.
 */
export async function uploadVideo(file: File, options: ChunkedUploadOptions = {}): Promise<MediaAssetDto> {
  const { signal } = options;
  assertAllowedVideoType(file.type);

  const signed: CloudinarySignedUpload = await createAdminMediaUpload(
    {
      fileName: file.name,
      // CONTRACT: SDK hiện tại chỉ khai báo MIME ảnh cho `contentType`; API mới nhận thêm video/mp4 và
      // video/quicktime. Bỏ ép kiểu này sau khi sinh lại SDK (`yarn generate:api`).
      contentType: file.type as ImageMimeType,
      sizeBytes: file.size,
    },
    signal,
  );
  if (signed.resourceType !== undefined && signed.resourceType !== 'VIDEO') {
    throw new Error('Máy chủ chưa hỗ trợ tải video.');
  }
  assertWithinMaxBytes(file, signed.maxBytes, 'Video');

  const uploaded = await uploadToCloudinaryChunked(file, signed, options);
  return finalizeAdminMediaUpload(
    {
      publicId: uploaded.public_id,
      version: uploaded.version,
      signature: uploaded.signature,
    },
    signal,
  );
}
