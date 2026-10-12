import { describe, expect, it } from 'vitest';
import { isValidPhone } from './phone';

describe('isValidPhone', () => {
  it('chấp nhận đầu 0, 84, +84 và ký tự phân cách', () => {
    for (const value of ['0912345678', '84912345678', '+84 912 345 678', '091.234.5678', '091-234-5678']) {
      expect(isValidPhone(value)).toBe(true);
    }
  });

  it('rỗng là hợp lệ (bắt buộc do rule riêng)', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone(undefined)).toBe(true);
  });

  it('từ chối số sai đầu hoặc sai độ dài', () => {
    for (const value of ['912345678', '0912', '09123456789012', 'abc0912345678']) {
      expect(isValidPhone(value)).toBe(false);
    }
  });
});
