import {
  createAdminMediaUpload,
  finalizeAdminMediaUpload,
} from '@/generated/api/media/media';
import type { MediaAssetDto, MediaUploadMimeType } from '@/generated/api/media/media.schemas';
import { assertAllowedImageType, assertWithinMaxBytes, uploadToCloudinary } from './cloudinary';

export async function uploadImage(file: File, signal?: AbortSignal): Promise<MediaAssetDto> {
  assertAllowedImageType(file.type);

  const signed = await createAdminMediaUpload(
    { fileName: file.name, contentType: file.type as MediaUploadMimeType, sizeBytes: file.size },
    signal,
  );
  assertWithinMaxBytes(file, signed.maxBytes);

  const uploaded = await uploadToCloudinary(file, signed, signal);
  return finalizeAdminMediaUpload(
    {
      publicId: uploaded.public_id,
      version: uploaded.version,
      signature: uploaded.signature,
    },
    signal,
  );
}
