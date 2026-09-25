import { describe, expect, it } from 'vitest';
import { toInitialPriceAmount } from './product-initial-setup';

describe('giá nhập ở màn tạo sản phẩm', () => {
  it('giữ phần nguyên của giá hợp lệ', () => {
    expect(toInitialPriceAmount(' 1890000 ')).toBe('1890000');
    expect(toInitialPriceAmount('2190000.75')).toBe('2190000');
  });

  it('bỏ qua giá trống, 0 hoặc không phải số thay vì gửi lên rồi nhận lỗi', () => {
    expect(toInitialPriceAmount('')).toBeUndefined();
    expect(toInitialPriceAmount(undefined)).toBeUndefined();
    expect(toInitialPriceAmount('0')).toBeUndefined();
    expect(toInitialPriceAmount('abc')).toBeUndefined();
  });
});
