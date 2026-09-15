import { describe, expect, it } from 'vitest';
import type { ActiveLookupOptionDto } from '@/generated/api/catalog/models';
import {
  addLine,
  cartQuantity,
  cartTotal,
  linesWithoutPrice,
  removeLine,
  setQuantity,
  toOrderItems,
} from './pos-cart';

const gianTa: ActiveLookupOptionDto = {
  id: '1554',
  code: 'HQ-909S',
  label: 'Giàn tạ đa năng HQ-909S',
  priceAmount: '16000000.00',
};
const gheTap: ActiveLookupOptionDto = {
  id: '1555',
  code: 'T059',
  label: 'Ghế tập tạ đa năng T059',
  priceAmount: '4100000.00',
};
const chuaCoGia: ActiveLookupOptionDto = {
  id: '1556',
  code: 'JL-065',
  label: 'Xà đơn JL-065',
  priceAmount: null,
};

describe('giỏ hàng tại quầy', () => {
  it('chọn lại cùng sản phẩm thì cộng dồn số lượng thay vì thêm dòng mới', () => {
    const lines = addLine(addLine([], gianTa), gianTa);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
  });

  it('cộng tổng theo đơn giá và số lượng', () => {
    const lines = setQuantity(addLine(addLine([], gianTa), gheTap), '1555', 2);
    expect(cartQuantity(lines)).toBe(3);
    expect(cartTotal(lines)).toBe(16_000_000 + 4_100_000 * 2);
  });

  /**
   * Nhân viên quầy giảm số lượng về 0 để bỏ hàng khỏi đơn; giữ lại dòng số lượng 0 sẽ
   * gửi lên Backend một dòng không hợp lệ.
   */
  it('hạ số lượng xuống dưới 1 thì bỏ hẳn dòng hàng', () => {
    const lines = setQuantity(addLine([], gianTa), '1554', 0);
    expect(lines).toHaveLength(0);
  });

  it('bỏ đúng dòng được chọn', () => {
    const lines = removeLine(addLine(addLine([], gianTa), gheTap), '1554');
    expect(lines.map((line) => line.sku)).toEqual(['T059']);
  });

  /**
   * Biến thể chưa có bảng giá hiệu lực phải chặn ngay trên màn hình: để Backend từ chối
   * thì nhân viên đã nhập xong thông tin khách mới biết hỏng.
   */
  it('chỉ ra dòng chưa có giá và không tính vào tổng tiền', () => {
    const lines = addLine(addLine([], gianTa), chuaCoGia);
    expect(linesWithoutPrice(lines).map((line) => line.sku)).toEqual(['JL-065']);
    expect(cartTotal(lines)).toBe(16_000_000);
  });

  it('gửi lên Backend đúng mã biến thể và số lượng', () => {
    const lines = setQuantity(addLine(addLine([], gianTa), gheTap), '1555', 3);
    expect(toOrderItems(lines)).toEqual([
      { productVariantId: '1554', quantity: 1 },
      { productVariantId: '1555', quantity: 3 },
    ]);
  });
});
