import { describe, expect, it } from 'vitest';
import { toInitialPriceAmount } from './product-initial-setup';

describe('giá nhập ở màn tạo sản phẩm', () => {
  it('gửi nguyên chuỗi giá hợp lệ, không làm tròn', () => {
    expect(toInitialPriceAmount(' 1890000 ')).toBe('1890000');
    expect(toInitialPriceAmount('2190000.75')).toBe('2190000.75');
    expect(toInitialPriceAmount('0.5')).toBe('0.5');
  });

  it('bỏ qua giá trống, 0 hoặc sai định dạng thay vì gửi lên rồi nhận lỗi', () => {
    expect(toInitialPriceAmount('')).toBeUndefined();
    expect(toInitialPriceAmount(undefined)).toBeUndefined();
    expect(toInitialPriceAmount('0')).toBeUndefined();
    expect(toInitialPriceAmount('0.00')).toBeUndefined();
    expect(toInitialPriceAmount('abc')).toBeUndefined();
    expect(toInitialPriceAmount('1e21')).toBeUndefined();
    expect(toInitialPriceAmount('1.234')).toBeUndefined();
  });
});
