/**
 * Thu nhỏ + nén lại ảnh ngay trên trình duyệt trước khi tải lên Cloudinary. Ảnh chụp điện thoại thường
 * 3–8 MB / 4000+ px trong khi admin và storefront chỉ hiển thị tối đa ~2048 px: gửi bản đã thu nhỏ cắt
 * phần lớn thời gian upload (nhất là trên 4G) mà không đổi chất lượng hiển thị.
 *
 * Phần quyết định (`planImageResize`, `isAnimatedImageHeader`, `pickUploadCandidate`) là hàm thuần để
 * test; phần đụng canvas nằm sau `ImageCodec` để tiêm được (jsdom không có canvas). Mọi lỗi — trình
 * duyệt không hỗ trợ, giải mã/mã hoá thất bại, kết quả không nhỏ hơn — đều trả lại tệp gốc.
 */

import { createConcurrencyLimiter } from './concurrency';

export const PRODUCT_IMAGE_MAX_EDGE = 2048;
export const AVATAR_IMAGE_MAX_EDGE = 512;
export const DEFAULT_IMAGE_QUALITY = 0.82;
/** Tệp nhỏ hơn ngưỡng này và đã nằm trong kích thước cho phép thì gửi nguyên. */
export const SKIP_OPTIMIZE_BELOW_BYTES = 300 * 1024;

/** Loại ảnh có thể là kết quả mã hoá lại; đều nằm trong danh sách MIME API cho phép. */
const OUTPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const EXTENSION_BY_TYPE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** Số byte đầu tệp cần đọc để nhận ra ảnh động (chunk `acTL` của APNG nằm trước `IDAT`). */
export const IMAGE_HEADER_BYTES = 64 * 1024;

export interface ImageOptimizeOptions {
  /** Cạnh dài tối đa (px) sau khi thu nhỏ. */
  maxEdge: number;
  quality?: number;
  skipBelowBytes?: number;
}

export interface ImageResizeInput {
  type: string;
  size: number;
  /** Kích thước đã xoay theo EXIF. */
  width: number;
  height: number;
  animated?: boolean;
}

export type ImageResizePlan =
  | { action: 'keep'; reason: 'unsupported-type' | 'animated' | 'invalid-size' | 'already-small' }
  | { action: 'encode'; width: number; height: number; type: string; quality: number };

/**
 * JPEG giữ JPEG; PNG/WebP/AVIF ra WebP (giữ được kênh trong suốt, nhỏ hơn PNG nhiều). Không đổi kích
 * thước nếu ảnh đã nằm trong `maxEdge` — khi đó chỉ nén lại nếu tệp vượt ngưỡng `skipBelowBytes`.
 */
export function planImageResize(input: ImageResizeInput, options: ImageOptimizeOptions): ImageResizePlan {
  if (!INPUT_TYPES.has(input.type)) return { action: 'keep', reason: 'unsupported-type' };
  if (input.animated) return { action: 'keep', reason: 'animated' };
  if (!(input.width > 0 && input.height > 0 && options.maxEdge > 0)) return { action: 'keep', reason: 'invalid-size' };

  const longEdge = Math.max(input.width, input.height);
  const scale = Math.min(1, options.maxEdge / longEdge);
  if (scale === 1 && input.size < (options.skipBelowBytes ?? SKIP_OPTIMIZE_BELOW_BYTES)) {
    return { action: 'keep', reason: 'already-small' };
  }
  return {
    action: 'encode',
    width: Math.max(1, Math.round(input.width * scale)),
    height: Math.max(1, Math.round(input.height * scale)),
    type: input.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp',
    quality: options.quality ?? DEFAULT_IMAGE_QUALITY,
  };
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function indexOfAscii(bytes: Uint8Array, needle: string, from = 0): number {
  const codes = Array.from(needle, (char) => char.charCodeAt(0));
  outer: for (let i = from; i <= bytes.length - codes.length; i += 1) {
    for (let j = 0; j < codes.length; j += 1) if (bytes[i + j] !== codes[j]) continue outer;
    return i;
  }
  return -1;
}

/** Nhận ra ảnh động từ phần đầu tệp: canvas chỉ giữ khung đầu nên ảnh động phải gửi nguyên. */
export function isAnimatedImageHeader(bytes: Uint8Array, type: string): boolean {
  if (type === 'image/gif') return true;
  if (type === 'image/webp') {
    // RIFF....WEBPVP8X, cờ animation là bit 0x02 của byte đầu payload VP8X.
    return ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP' && ascii(bytes, 12, 4) === 'VP8X'
      ? (bytes[20] & 0x02) !== 0
      : false;
  }
  if (type === 'image/png') {
    const actl = indexOfAscii(bytes, 'acTL');
    if (actl < 0) return false;
    const idat = indexOfAscii(bytes, 'IDAT');
    return idat < 0 || actl < idat;
  }
  if (type === 'image/avif') {
    // Hộp `ftyp`: brand `avis` = chuỗi ảnh AVIF.
    if (ascii(bytes, 4, 4) !== 'ftyp') return false;
    return indexOfAscii(bytes.subarray(0, Math.min(bytes.length, 64)), 'avis') >= 0;
  }
  return false;
}

/** Chỉ dùng bản mã hoá lại khi đúng loại cho phép và thật sự nhỏ hơn bản gốc. */
export function pickUploadCandidate(original: File, encoded: Blob | null | undefined): File {
  if (!encoded || !OUTPUT_TYPES.has(encoded.type) || encoded.size <= 0 || encoded.size >= original.size) {
    return original;
  }
  const base = original.name.replace(/\.[^./\\]+$/, '') || 'image';
  return new File([encoded], `${base}.${EXTENSION_BY_TYPE[encoded.type]}`, {
    type: encoded.type,
    lastModified: original.lastModified,
  });
}

export interface DecodedImage {
  width: number;
  height: number;
  close(): void;
}

/** Ranh giới với API canvas của trình duyệt; tiêm bản giả trong test. */
export interface ImageCodec<T extends DecodedImage = DecodedImage> {
  isSupported(): boolean;
  readHeader(file: Blob, bytes: number): Promise<Uint8Array>;
  /** Giải mã đã xoay theo EXIF (`imageOrientation: 'from-image'`). */
  decode(file: Blob): Promise<T>;
  encode(image: T, width: number, height: number, type: string, quality: number): Promise<Blob | null>;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export const browserImageCodec: ImageCodec<ImageBitmap & DecodedImage> = {
  isSupported: () => typeof createImageBitmap === 'function' && typeof document !== 'undefined',
  readHeader: async (file, bytes) => new Uint8Array(await file.slice(0, bytes).arrayBuffer()),
  decode: (file) => createImageBitmap(file, { imageOrientation: 'from-image' }),
  async encode(image, width, height, type, quality) {
    if (typeof OffscreenCanvas === 'function') {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);
      return canvas.convertToBlob({ type, quality });
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, type, quality);
    // Giải phóng bộ nhớ đệm canvas sớm (Safari iOS giới hạn tổng diện tích canvas).
    canvas.width = 0;
    canvas.height = 0;
    return blob;
  },
};

/**
 * Trả tệp đã thu nhỏ/nén lại, hoặc chính `file` khi không cần/không làm được. Không bao giờ ném lỗi.
 * Chạy tuần tự (một ảnh mỗi lúc) để không giải mã nhiều ảnh 12–48 MP cùng lúc trên điện thoại.
 */
export async function optimizeImageForUpload<T extends DecodedImage>(
  file: File,
  options: ImageOptimizeOptions,
  codec: ImageCodec<T> = browserImageCodec as unknown as ImageCodec<T>,
): Promise<File> {
  if (!INPUT_TYPES.has(file.type)) return file;
  try {
    if (!codec.isSupported()) return file;
    return await optimizeQueue.run(async () => {
      const header = await codec.readHeader(file, IMAGE_HEADER_BYTES);
      if (isAnimatedImageHeader(header, file.type)) return file;
      const image = await codec.decode(file);
      try {
        const plan = planImageResize(
          { type: file.type, size: file.size, width: image.width, height: image.height },
          options,
        );
        if (plan.action === 'keep') return file;
        const encoded = await codec.encode(image, plan.width, plan.height, plan.type, plan.quality);
        return pickUploadCandidate(file, encoded);
      } finally {
        image.close();
      }
    });
  } catch {
    return file;
  }
}

const optimizeQueue = createConcurrencyLimiter(1);
