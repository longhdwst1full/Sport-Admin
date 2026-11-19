import { describe, expect, it, vi } from 'vitest';
import {
  isAnimatedImageHeader,
  optimizeImageForUpload,
  pickUploadCandidate,
  planImageResize,
  type DecodedImage,
  type ImageCodec,
} from './image-optimize';

const MB = 1024 * 1024;
const file = (size: number, type: string, name = 'photo.jpg') => new File([new Uint8Array(size)], name, { type });
const bytes = (...parts: Array<string | number[]>) =>
  new Uint8Array(parts.flatMap((part) => (typeof part === 'string' ? Array.from(part, (c) => c.charCodeAt(0)) : part)));

describe('planImageResize', () => {
  const options = { maxEdge: 2048 };

  it('downscales a large JPEG to the max long edge, keeping aspect ratio and JPEG', () => {
    expect(planImageResize({ type: 'image/jpeg', size: 5 * MB, width: 4032, height: 3024 }, options)).toEqual({
      action: 'encode',
      width: 2048,
      height: 1536,
      type: 'image/jpeg',
      quality: 0.82,
    });
  });

  it('handles portrait images by the long edge', () => {
    const plan = planImageResize({ type: 'image/jpeg', size: 3 * MB, width: 3000, height: 6000 }, { maxEdge: 512 });
    expect(plan).toMatchObject({ action: 'encode', width: 256, height: 512 });
  });

  it('re-encodes PNG/WebP/AVIF as WebP so transparency survives', () => {
    for (const type of ['image/png', 'image/webp', 'image/avif']) {
      expect(planImageResize({ type, size: 2 * MB, width: 3000, height: 3000 }, options)).toMatchObject({ type: 'image/webp' });
    }
  });

  it('keeps small files already within the dimensions', () => {
    expect(planImageResize({ type: 'image/jpeg', size: 200 * 1024, width: 1200, height: 800 }, options)).toEqual({
      action: 'keep',
      reason: 'already-small',
    });
  });

  it('re-encodes a heavy file even when dimensions already fit', () => {
    expect(planImageResize({ type: 'image/jpeg', size: 2 * MB, width: 1600, height: 1200 }, options)).toMatchObject({
      action: 'encode',
      width: 1600,
      height: 1200,
    });
  });

  it('keeps GIF, animated and unreadable images', () => {
    expect(planImageResize({ type: 'image/gif', size: 5 * MB, width: 4000, height: 4000 }, options)).toMatchObject({ action: 'keep' });
    expect(
      planImageResize({ type: 'image/webp', size: 5 * MB, width: 4000, height: 4000, animated: true }, options),
    ).toMatchObject({ action: 'keep', reason: 'animated' });
    expect(planImageResize({ type: 'image/jpeg', size: 5 * MB, width: 0, height: 0 }, options)).toMatchObject({
      action: 'keep',
      reason: 'invalid-size',
    });
  });
});

describe('isAnimatedImageHeader', () => {
  const webp = (flags: number) => bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8X', [10, 0, 0, 0], [flags, 0, 0, 0]);

  it('reads the VP8X animation flag of WebP', () => {
    expect(isAnimatedImageHeader(webp(0x02), 'image/webp')).toBe(true);
    expect(isAnimatedImageHeader(webp(0x10), 'image/webp')).toBe(false);
    expect(isAnimatedImageHeader(bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8 '), 'image/webp')).toBe(false);
  });

  it('detects APNG by an acTL chunk before IDAT', () => {
    expect(isAnimatedImageHeader(bytes([0x89], 'PNG', 'IHDR', 'acTL', 'IDAT'), 'image/png')).toBe(true);
    expect(isAnimatedImageHeader(bytes([0x89], 'PNG', 'IHDR', 'IDAT'), 'image/png')).toBe(false);
  });

  it('detects AVIF image sequences by the avis brand', () => {
    expect(isAnimatedImageHeader(bytes([0, 0, 0, 32], 'ftyp', 'avis'), 'image/avif')).toBe(true);
    expect(isAnimatedImageHeader(bytes([0, 0, 0, 32], 'ftyp', 'avif'), 'image/avif')).toBe(false);
  });

  it('treats GIF as animated and JPEG as still', () => {
    expect(isAnimatedImageHeader(new Uint8Array(), 'image/gif')).toBe(true);
    expect(isAnimatedImageHeader(new Uint8Array(16), 'image/jpeg')).toBe(false);
  });
});

describe('pickUploadCandidate', () => {
  const original = file(1000, 'image/png', 'logo.final.png');

  it('uses a smaller allowed encoding and renames the extension', () => {
    const picked = pickUploadCandidate(original, new Blob([new Uint8Array(300)], { type: 'image/webp' }));
    expect(picked).not.toBe(original);
    expect(picked.name).toBe('logo.final.webp');
    expect(picked.type).toBe('image/webp');
    expect(picked.size).toBe(300);
  });

  it('falls back to the original when the encoding is missing, larger or of another type', () => {
    expect(pickUploadCandidate(original, null)).toBe(original);
    expect(pickUploadCandidate(original, new Blob([new Uint8Array(2000)], { type: 'image/webp' }))).toBe(original);
    expect(pickUploadCandidate(original, new Blob([new Uint8Array(10)], { type: 'image/bmp' }))).toBe(original);
  });
});

describe('optimizeImageForUpload', () => {
  function fakeCodec(overrides: Partial<ImageCodec> = {}): ImageCodec & { closed: number } {
    const codec = {
      closed: 0,
      isSupported: () => true,
      readHeader: async () => new Uint8Array(16),
      decode: vi.fn(async (): Promise<DecodedImage> => ({ width: 4000, height: 3000, close: () => void (codec.closed += 1) })),
      encode: vi.fn(async (_image: DecodedImage, width: number, height: number, type: string) =>
        new Blob([new Uint8Array(100)], { type }),
      ),
      ...overrides,
    };
    return codec;
  }

  it('returns the re-encoded file and releases the bitmap', async () => {
    const codec = fakeCodec();
    const result = await optimizeImageForUpload(file(4 * MB, 'image/jpeg'), { maxEdge: 2048 }, codec);
    expect(result.size).toBe(100);
    expect(result.type).toBe('image/jpeg');
    expect(codec.encode).toHaveBeenCalledWith(expect.anything(), 2048, 1536, 'image/jpeg', 0.82);
    expect(codec.closed).toBe(1);
  });

  it('returns the original file on unsupported browsers, animated images or codec failures', async () => {
    const original = file(4 * MB, 'image/webp', 'a.webp');
    expect(await optimizeImageForUpload(original, { maxEdge: 2048 }, fakeCodec({ isSupported: () => false }))).toBe(original);
    expect(
      await optimizeImageForUpload(
        original,
        { maxEdge: 2048 },
        fakeCodec({ readHeader: async () => bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8X', [0, 0, 0, 0], [2]) }),
      ),
    ).toBe(original);
    expect(
      await optimizeImageForUpload(original, { maxEdge: 2048 }, fakeCodec({ decode: async () => Promise.reject(new Error('x')) })),
    ).toBe(original);
    const failingEncode = fakeCodec({ encode: async () => Promise.reject(new Error('canvas')) });
    expect(await optimizeImageForUpload(original, { maxEdge: 2048 }, failingEncode)).toBe(original);
  });

  it('skips the codec entirely for types the API does not accept', async () => {
    const codec = fakeCodec();
    const gif = file(4 * MB, 'image/gif', 'a.gif');
    expect(await optimizeImageForUpload(gif, { maxEdge: 2048 }, codec)).toBe(gif);
    expect(codec.decode).not.toHaveBeenCalled();
  });
});
