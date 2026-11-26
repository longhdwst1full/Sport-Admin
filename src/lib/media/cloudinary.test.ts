import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chooseSignedUploadFile, uploadToCloudinary, type CloudinarySignedUpload } from './cloudinary';

const original = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
const webp = new File([new Uint8Array(5)], 'a.webp', { type: 'image/webp' });
const jpeg = new File([new Uint8Array(5)], 'a.jpg', { type: 'image/jpeg' });

describe('chooseSignedUploadFile', () => {
  it('keeps the optimized file when its format is in the signed allowlist', () => {
    expect(chooseSignedUploadFile(original, webp, ['jpg', 'png', 'webp'])).toBe(webp);
    expect(chooseSignedUploadFile(original, jpeg, ['JPEG'])).toBe(jpeg);
  });

  it('falls back to the original when the signed allowlist excludes the optimized format', () => {
    expect(chooseSignedUploadFile(original, webp, ['jpg', 'png'])).toBe(original);
  });

  it('returns the original when nothing was optimized', () => {
    expect(chooseSignedUploadFile(original, original, [])).toBe(original);
  });
});

describe('uploadToCloudinary', () => {
  const signed: CloudinarySignedUpload = {
    uploadUrl: 'https://api.cloudinary.test/v1_1/demo/image/upload',
    apiKey: 'key-1',
    timestamp: 1_700_000_000,
    signature: 'sig-1',
    folder: 'sport-sys/sport',
    publicId: 'image-1',
    allowedFormats: ['jpg', 'png', 'webp'],
    maxBytes: 1024,
    overwrite: false,
    uniqueFilename: false,
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function sentForm(extra: Partial<CloudinarySignedUpload>): Promise<FormData> {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    await uploadToCloudinary(original, { ...signed, ...extra });
    return post.mock.calls[0]?.[1] as FormData;
  }

  // CONTRACT: API ký thêm `transformation` khi bật thu nhỏ ảnh; thiếu trường này Cloudinary từ chối chữ ký.
  it('sends the signed incoming transformation verbatim', async () => {
    const form = await sentForm({ transformation: 'c_limit,w_2560,h_2560' });
    expect(form.get('transformation')).toBe('c_limit,w_2560,h_2560');
  });

  it('omits transformation when the API did not sign one', async () => {
    const form = await sentForm({ transformation: null });
    expect(form.has('transformation')).toBe(false);
  });
});
