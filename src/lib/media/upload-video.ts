import { createAdminMediaUpload, finalizeAdminMediaUpload } from '@/generated/api/media/media';
import type { MediaAssetDto, MediaUploadMimeType } from '@/generated/api/media/media.schemas';
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
      // `assertAllowedVideoType` ở trên đã chặn MIME ngoài danh sách; ép kiểu chỉ để thu hẹp `string`.
      contentType: file.type as MediaUploadMimeType,
      sizeBytes: file.size,
    },
    signal,
  );
  if (signed.resourceType !== undefined && signed.resourceType !== 'VIDEO') {
    throw new Error('Máy chủ chưa hỗ trợ tải video.');
  }
  assertWithinMaxBytes(file, signed.maxBytes, 'Video');

  const uploaded = await uploadToCloudinaryChunked(file, signed, options);
  // Không truyền `signal`: video đã nằm trên Cloudinary, huỷ finalize lúc này (đóng modal/unmount)
  // sẽ để lại tệp mồ côi không có bản ghi media. Finalize luôn chạy hết; nơi gọi tự bỏ qua kết quả nếu đã huỷ.
  return finalizeAdminMediaUpload({
    publicId: uploaded.public_id,
    version: uploaded.version,
    signature: uploaded.signature,
  });
}
