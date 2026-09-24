import { describe, expect, it } from 'vitest';
import { DECIMAL_SEPARATOR, THOUSAND_SEPARATOR, groupDigits, stripSeparators } from './money-format';

describe('định dạng ô nhập tiền', () => {
  it('nhóm hàng nghìn theo dấu chấm kiểu Việt Nam', () => {
    expect(groupDigits(1000)).toBe('1.000');
    expect(groupDigits(1500000)).toBe('1.500.000');
    expect(groupDigits(12500000)).toBe('12.500.000');
    expect(groupDigits(500)).toBe('500');
  });

  /**
   * Dấu chấm dùng cho hàng nghìn nên dấu thập phân phải là dấu phẩy, và `MoneyInput` phải truyền
   * `decimalSeparator` này xuống antd. Để antd giữ mặc định `.` thì nó đọc "1.500.000" như số thập
   * phân và giá trị sụp về 1.5 — đúng hiện tượng "ô nhập không format" ở màn tạo sản phẩm.
   */
  it('hai dấu phân cách không được trùng nhau', () => {
    expect(THOUSAND_SEPARATOR).toBe('.');
    expect(DECIMAL_SEPARATOR).toBe(',');
    expect(THOUSAND_SEPARATOR).not.toBe(DECIMAL_SEPARATOR);
  });

  it('coi rỗng và undefined là chưa nhập', () => {
    expect(groupDigits(undefined)).toBe('');
    expect(groupDigits('')).toBe('');
  });

  it('không nhóm số 0 thành chuỗi rỗng', () => {
    expect(groupDigits(0)).toBe('0');
  });

  it('bóc dấu phân cách để trả lại số thuần cho form', () => {
    expect(stripSeparators('1.500.000')).toBe('1500000');
    expect(stripSeparators('1,500,000')).toBe('1500000');
    expect(stripSeparators('')).toBe('');
    expect(stripSeparators(undefined)).toBe('');
  });

  it('vòng tròn hiển thị rồi đọc lại giữ nguyên con số', () => {
    expect(stripSeparators(groupDigits(16000000))).toBe('16000000');
  });
});
