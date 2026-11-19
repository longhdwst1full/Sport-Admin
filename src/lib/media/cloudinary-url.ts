/**
 * URL giao ảnh Cloudinary đã thu nhỏ cho thumbnail/preview: chèn `c_limit,w_<px>[,h_<px>],f_auto,q_auto`
 * sau `/image/upload/` để CDN trả WebP/AVIF đúng cỡ thay vì ảnh gốc vài MB.
 *
 * Cùng quy ước phân tích với `api/src/integrations/object-storage/cloudinary-url.ts`: một đoạn là
 * transformation khi mọi thành phần (tách bởi `,`) có dạng `<1–3 chữ thường>_<giá trị>`. URL không phải
 * ảnh Cloudinary, hoặc đã có transformation (vd. `thumbnailUrl` server sinh sẵn), được trả nguyên.
 */
const CLOUDINARY_IMAGE_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/?#]+\/image\/upload\/)([^?#]*)(.*)$/;
const TRANSFORMATION_COMPONENT = /^[a-z]{1,3}_[^,/]+$/;

function isTransformationSegment(segment: string): boolean {
  return segment.length > 0 && segment.split(',').every((component) => TRANSFORMATION_COMPONENT.test(component));
}

export interface CloudinaryThumbnailOptions {
  /** Độ rộng tối đa tính bằng pixel thật (đã nhân DPR). */
  width: number;
  height?: number;
}

/** Bội số DPR mặc định cho ảnh nhỏ trên màn hình retina. */
export const THUMBNAIL_DPR = 2;

export function cloudinaryThumbnailUrl(url: string, options: CloudinaryThumbnailOptions): string;
export function cloudinaryThumbnailUrl(url: string | null | undefined, options: CloudinaryThumbnailOptions): string | undefined;
export function cloudinaryThumbnailUrl(url: string | null | undefined, { width, height }: CloudinaryThumbnailOptions) {
  if (!url) return url ?? undefined;
  const match = CLOUDINARY_IMAGE_UPLOAD.exec(url.trim());
  if (!match) return url;
  const segments = match[2].split('/');
  // Đoạn cuối luôn là tên file; chỉ cần có một đoạn transformation đứng đầu là coi như đã biến đổi.
  if (segments.length < 2 ? !segments[0] : isTransformationSegment(segments[0])) return url;
  const w = Math.round(width);
  if (!(w > 0)) return url;
  const parts = ['c_limit', `w_${w}`];
  if (height && height > 0) parts.push(`h_${Math.round(height)}`);
  parts.push('f_auto', 'q_auto');
  return `${match[1]}${parts.join(',')}/${segments.join('/')}${match[3]}`;
}
