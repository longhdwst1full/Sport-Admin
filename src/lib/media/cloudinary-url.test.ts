import { describe, expect, it } from 'vitest';
import { cloudinaryThumbnailUrl } from './cloudinary-url';

const BASE = 'https://res.cloudinary.com/demo/image/upload';

describe('cloudinaryThumbnailUrl', () => {
  it('inserts a limit/auto-format transformation before the version', () => {
    expect(cloudinaryThumbnailUrl(`${BASE}/v1712/dctd/products/shoe.jpg`, { width: 184 })).toBe(
      `${BASE}/c_limit,w_184,f_auto,q_auto/v1712/dctd/products/shoe.jpg`,
    );
  });

  it('adds height and keeps the query string', () => {
    expect(cloudinaryThumbnailUrl(`${BASE}/dctd/a.png?_a=1`, { width: 100.4, height: 80 })).toBe(
      `${BASE}/c_limit,w_100,h_80,f_auto,q_auto/dctd/a.png?_a=1`,
    );
  });

  it('leaves URLs that already carry a transformation unchanged', () => {
    const url = `${BASE}/c_limit,f_auto,h_320,q_auto,w_320/v1/dctd/a.jpg`;
    expect(cloudinaryThumbnailUrl(url, { width: 100 })).toBe(url);
  });

  it('leaves non-Cloudinary, video, fetch and malformed URLs unchanged', () => {
    for (const url of [
      'https://images.unsplash.com/photo-1?w=800',
      'https://res.cloudinary.com/demo/video/upload/v1/clip.mp4',
      'https://res.cloudinary.com/demo/image/fetch/https://x.test/a.jpg',
      'http://res.cloudinary.com/demo/image/upload/v1/a.jpg',
      `${BASE}/`,
      'blob:https://admin.test/123',
    ]) {
      expect(cloudinaryThumbnailUrl(url, { width: 100 })).toBe(url);
    }
  });

  it('passes empty values through and ignores invalid widths', () => {
    expect(cloudinaryThumbnailUrl(undefined, { width: 100 })).toBeUndefined();
    expect(cloudinaryThumbnailUrl(null, { width: 100 })).toBeUndefined();
    expect(cloudinaryThumbnailUrl('', { width: 100 })).toBe('');
    expect(cloudinaryThumbnailUrl(`${BASE}/a.jpg`, { width: 0 })).toBe(`${BASE}/a.jpg`);
  });
});
