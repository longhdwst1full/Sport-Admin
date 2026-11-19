import { describe, expect, it } from 'vitest';
import { chooseSignedUploadFile } from './cloudinary';

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
