import { describe, expect, it } from 'vitest';
import type { PosCatalogItemDto } from '@/generated/api/orders/models';
import {
  addLine,
  dropFlashPrice,
  effectivePrice,
  cartQuantity,
  cartTotal,
  linesOverStock,
  linesWithoutPrice,
  removeLine,
  setQuantity,
  toOrderItems,
} from './pos-cart';

const gianTa: PosCatalogItemDto = {
  id: '1554',
  sku: 'HQ-909S',
  name: 'Giàn tạ đa năng HQ-909S',
  unitPrice: '16000000.00',
  isBundle: false,
  components: [],
  availableQuantity: 21,
  flashPrice: null,
  flashSaleAvailableQuantity: null,
};
const gheTap: PosCatalogItemDto = {
  id: '1555',
  sku: 'T059',
  name: 'Ghế tập tạ đa năng T059',
  unitPrice: '4100000.00',
  isBundle: false,
  components: [],
  availableQuantity: 20,
  flashPrice: null,
  flashSaleAvailableQuantity: null,
};
const chuaCoGia: PosCatalogItemDto = {
  id: '1556',
  sku: 'JL-065',
  name: 'Xà đơn JL-065',
  unitPrice: null,
  isBundle: false,
  components: [],
  availableQuantity: 2,
  flashPrice: null,
  flashSaleAvailableQuantity: null,
};
const combo: PosCatalogItemDto = {
  id: '20',
  sku: 'COMBO-GYM',
  name: 'Combo gym tại nhà',
  unitPrice: '20000000.00',
  isBundle: true,
  components: [
    { productVariantId: '1554', sku: 'HQ-909S', name: 'Giàn tạ', quantity: 2 },
    { productVariantId: '1557', sku: 'THAM-YOGA', name: 'Thảm', quantity: 1 },
  ],
  availableQuantity: 3,
  flashPrice: null,
  flashSaleAvailableQuantity: null,
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

  it('giữ lại thành phần combo để nhân viên biết đang bán gì', () => {
    const lines = addLine([], combo);
    expect(lines[0].isBundle).toBe(true);
    expect(lines[0].components.map((component) => component.sku)).toEqual(['HQ-909S', 'THAM-YOGA']);
  });

  /**
   * Backend từ chối cả đơn khi thiếu hàng chứ không cắt bớt dòng, nên bấm thêm quá tồn
   * phải dừng ngay ở nút bấm.
   */
  it('bấm chọn thêm không vượt quá tồn khả dụng', () => {
    let lines = addLine([], combo);
    for (let index = 0; index < 5; index += 1) lines = addLine(lines, combo);
    expect(lines[0].quantity).toBe(3);
  });

  it('gõ tay số lượng vượt tồn thì bị chỉ mặt để chặn trước khi thu tiền', () => {
    const lines = setQuantity(addLine([], combo), '20', 9);
    expect(linesOverStock(lines).map((line) => line.sku)).toEqual(['COMBO-GYM']);
  });

  it('gửi lên Backend đúng mã biến thể và số lượng', () => {
    const lines = setQuantity(addLine(addLine([], gianTa), gheTap), '1555', 3);
    expect(toOrderItems(lines)).toEqual([
      { productVariantId: '1554', quantity: 1 },
      { productVariantId: '1555', quantity: 3 },
    ]);
  });
});

/**
 * Khách tới quầy được cùng giá flash với web. Màn này không phải nguồn giá, nhưng con số hiện ở
 * đây là con số nhân viên đọc cho khách — nó phải bằng con số Backend sẽ thu.
 */
describe('giá flash sale tại quầy', () => {
  const flashItem: PosCatalogItemDto = {
    ...gianTa,
    flashPrice: '13900000.00',
    flashSaleAvailableQuantity: 4,
  };

  it('thu theo giá flash khi có chương trình, không phải giá gốc', () => {
    const [line] = addLine([], flashItem);

    expect(line.unitPrice).toBe(16000000);
    expect(line.flashPrice).toBe(13900000);
    expect(effectivePrice(line)).toBe(13900000);
  });

  it('tổng giỏ tính theo giá flash', () => {
    const lines = addLine(addLine([], flashItem), flashItem);

    expect(cartQuantity(lines)).toBe(2);
    expect(cartTotal(lines)).toBe(27800000);
  });

  it('không có chương trình thì thu giá gốc', () => {
    const [line] = addLine([], gianTa);

    expect(line.flashPrice).toBeNull();
    expect(effectivePrice(line)).toBe(16000000);
  });

  /** Backend báo hết suất: dòng đó phải quay về giá gốc trước khi nhân viên xác nhận lại. */
  it('bỏ giá flash của đúng dòng Backend báo hết suất', () => {
    const lines = addLine(addLine([], flashItem), {
      ...gheTap,
      flashPrice: '3900000.00',
      flashSaleAvailableQuantity: 2,
    });

    const repriced = dropFlashPrice(lines, [flashItem.id]);

    expect(effectivePrice(repriced[0])).toBe(16000000);
    expect(repriced[0].flashSaleAvailableQuantity).toBeNull();
    // Dòng khác không bị đụng tới: suất của nó vẫn còn.
    expect(effectivePrice(repriced[1])).toBe(3900000);
  });

  it('Backend không nói rõ dòng nào thì bỏ giá flash của tất cả', () => {
    const lines = addLine(addLine([], flashItem), {
      ...gheTap,
      flashPrice: '3900000.00',
      flashSaleAvailableQuantity: 2,
    });

    const repriced = dropFlashPrice(lines, []);

    expect(repriced.every((line) => line.flashPrice === null)).toBe(true);
    expect(cartTotal(repriced)).toBe(16000000 + 4100000);
  });
});
