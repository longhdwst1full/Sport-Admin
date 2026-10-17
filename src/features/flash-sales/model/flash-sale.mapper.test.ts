import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import type { FlashSaleItemDto } from '@/generated/api/promotions/promotions.schemas';
import {
  isItemChanged,
  newEditableItem,
  toEditableItem,
  toUpdateFlashSalePayload,
  toUpsertFlashSaleItemPayload,
  validateItem,
} from './flash-sale.mapper';

const savedItem: FlashSaleItemDto = {
  id: '7',
  productVariantId: '10',
  sku: 'HQ-909S',
  productName: 'Giàn tạ',
  productSlug: 'gian-ta',
  salePrice: '13900000.00',
  regularPrice: '16000000.00',
  quota: 10,
  soldQuantity: 3,
  availableQuantity: 6,
  status: 'ACTIVE',
  version: '2',
} as FlashSaleItemDto;

describe('flash sale mapper', () => {
  it('dòng có sẵn: chưa sửa thì không gửi lại, quota không được thấp hơn đã bán + đang giữ', () => {
    const item = toEditableItem(savedItem);
    expect(item).toMatchObject({ salePrice: 13900000, basePrice: 16000000, committed: 4, inactive: false });
    expect(isItemChanged(item)).toBe(false);
    expect(isItemChanged({ ...item, quota: 12 })).toBe(true);
    expect(validateItem({ ...item, quota: 3 }).quota).toContain('Tối thiểu 4');
  });

  it('dòng mới điền sẵn giá gốc, thiếu số suất thì báo lỗi', () => {
    const item = newEditableItem({ id: '11', code: 'T059', label: 'Ghế tập', priceAmount: '4100000.00' });
    expect(item.salePrice).toBe(4100000);
    expect(isItemChanged(item)).toBe(true);
    expect(validateItem(item).quota).toBe('Nhập số suất');
  });

  it('payload suất gửi giá dạng chuỗi decimal; payload sửa chiến dịch không có mã', () => {
    expect(toUpsertFlashSaleItemPayload(toEditableItem(savedItem))).toEqual({
      productVariantId: '10',
      salePrice: '13900000.00',
      quota: 10,
    });
    const payload = toUpdateFlashSalePayload(
      { code: 'FS-1', name: ' Tháng 9 ', window: [dayjs('2026-10-01T00:00:00Z'), dayjs('2026-10-02T00:00:00Z')] },
      '5',
    );
    expect(payload).not.toHaveProperty('code');
    expect(payload).toMatchObject({ expectedVersion: '5', name: 'Tháng 9' });
  });
});
