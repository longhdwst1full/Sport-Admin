import { describe, expect, it } from 'vitest';
import type { ProductDetailDto } from '@/generated/api/catalog/models';
import { toInitialPriceCommands } from './product-initial-setup';

const created = (variantIds: string[]) =>
  ({ variants: variantIds.map((id) => ({ id })) }) as ProductDetailDto;

describe('giá nhập ở màn tạo sản phẩm', () => {
  it('ghép giá với SKU thật theo đúng thứ tự backend trả về', () => {
    const commands = toInitialPriceCommands(
      [
        { name: 'Đen', openingQuantity: 0, price: '1890000' },
        { name: 'Trắng', openingQuantity: 0, price: '2190000' },
      ],
      created(['11', '12']),
    );

    expect(commands).toEqual([
      { variantId: '11', amount: '1890000' },
      { variantId: '12', amount: '2190000' },
    ]);
  });

  it('bỏ qua biến thể chưa chốt giá thay vì gửi lên rồi nhận lỗi', () => {
    const commands = toInitialPriceCommands(
      [
        { name: 'Đen', openingQuantity: 0, price: '' },
        { name: 'Trắng', openingQuantity: 0 },
        { name: 'Xanh', openingQuantity: 0, price: '0' },
      ],
      created(['11', '12', '13']),
    );

    expect(commands).toEqual([]);
  });

  it('không tạo giá cho biến thể không có SKU tương ứng', () => {
    const commands = toInitialPriceCommands(
      [{ name: 'Đen', openingQuantity: 0, price: '1890000' }],
      created([]),
    );

    expect(commands).toEqual([]);
  });
});
