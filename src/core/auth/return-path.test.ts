import { describe, expect, it } from 'vitest';
import { safeReturnPath, toReturnPath } from './return-path';

describe('toReturnPath', () => {
  it('giữ pathname + query + hash', () => {
    expect(toReturnPath({ pathname: '/content/social/tiktok/callback', search: '?code=abc&state=x.y', hash: '' })).toBe(
      '/content/social/tiktok/callback?code=abc&state=x.y',
    );
  });
});

describe('safeReturnPath', () => {
  it('nhận đường dẫn nội bộ kèm query', () => {
    expect(safeReturnPath('/content/social/tiktok/callback?code=abc&state=x.y')).toBe(
      '/content/social/tiktok/callback?code=abc&state=x.y',
    );
    expect(safeReturnPath('/orders?page=2#top')).toBe('/orders?page=2#top');
  });

  it('từ chối URL ngoài, protocol-relative, backslash, ký tự điều khiển', () => {
    for (const value of ['https://evil.example/x', '//evil.example/x', '/\\evil.example', '/\t/evil.example', 'javascript:alert(1)', 'orders']) {
      expect(safeReturnPath(value)).toBe('/');
    }
  });

  it('không quay về trang đăng nhập/đổi mật khẩu; giá trị lạ dùng fallback', () => {
    expect(safeReturnPath('/login?next=/x')).toBe('/');
    expect(safeReturnPath('/change-password')).toBe('/');
    expect(safeReturnPath(undefined)).toBe('/');
    expect(safeReturnPath(42, '/home')).toBe('/home');
  });
});
