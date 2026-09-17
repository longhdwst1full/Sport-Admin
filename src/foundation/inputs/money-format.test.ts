import { describe, expect, it } from 'vitest';
import { groupDigits, stripSeparators } from './money-format';

describe('định dạng ô nhập tiền', () => {
  it('nhóm hàng nghìn theo dấu chấm kiểu Việt Nam', () => {
    expect(groupDigits(1890000)).toBe('1.890.000');
    expect(groupDigits(500)).toBe('500');
    expect(groupDigits(1000)).toBe('1.000');
  });

  it('coi rỗng và undefined là chưa nhập', () => {
    expect(groupDigits(undefined)).toBe('');
    expect(groupDigits('')).toBe('');
  });

  it('không nhóm số 0 thành chuỗi rỗng', () => {
    expect(groupDigits(0)).toBe('0');
  });

  it('bóc dấu phân cách để trả lại số thuần cho form', () => {
    expect(stripSeparators('1.890.000')).toBe('1890000');
    expect(stripSeparators('1,890,000')).toBe('1890000');
    expect(stripSeparators('')).toBe('');
    expect(stripSeparators(undefined)).toBe('');
  });
});
