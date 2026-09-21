// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetIdentifier,
  readRememberedIdentifier,
  rememberIdentifier,
} from './remembered-identifier';

describe('remembered identifier', () => {
  beforeEach(() => window.localStorage.clear());

  it('ghi nhớ và đọc lại tên đăng nhập', () => {
    rememberIdentifier('  admin@dctd.vn  ');

    expect(readRememberedIdentifier()).toBe('admin@dctd.vn');
  });

  it('bỏ ghi nhớ khi lưu giá trị rỗng', () => {
    rememberIdentifier('admin@dctd.vn');
    rememberIdentifier('   ');

    expect(readRememberedIdentifier()).toBe('');
  });

  it('xoá được khi người dùng bỏ chọn ghi nhớ', () => {
    rememberIdentifier('admin@dctd.vn');
    forgetIdentifier();

    expect(readRememberedIdentifier()).toBe('');
  });

  /** Chế độ riêng tư làm localStorage ném lỗi ngay khi đọc; đăng nhập vẫn phải chạy được. */
  it('không ném lỗi khi trình duyệt chặn storage', () => {
    vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(readRememberedIdentifier()).toBe('');
    vi.restoreAllMocks();
  });

  it('không bao giờ lưu mật khẩu kèm theo', () => {
    rememberIdentifier('admin@dctd.vn');

    expect(JSON.stringify(window.localStorage)).not.toContain('password');
  });
});
