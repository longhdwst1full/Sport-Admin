import axios from 'axios';
import {
  createAdminMediaUpload,
  finalizeAdminMediaUpload,
} from '@/generated/api/media/media';
import type { ImageMimeType } from '@/generated/api/media/media.schemas';
import type { MediaAssetDto } from '@/generated/api/media/media.schemas';

const allowedTypes = new Set<ImageMimeType>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
}

function isAllowedContentType(value: string): value is ImageMimeType {
  return allowedTypes.has(value as ImageMimeType);
}

export async function uploadImage(file: File, signal?: AbortSignal): Promise<MediaAssetDto> {
  if (!isAllowedContentType(file.type)) {
    throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF.');
  }

  const signed = await createAdminMediaUpload(
    { fileName: file.name, contentType: file.type, sizeBytes: file.size },
    signal,
  );
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
  return finalizeAdminMediaUpload(
    {
      publicId: uploaded.data.public_id,
      version: uploaded.data.version,
      signature: uploaded.data.signature,
    },
    signal,
  );
}
