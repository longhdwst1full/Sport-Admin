import { describe, expect, it } from 'vitest';
import type { AdminCustomerDetailDto } from '@/generated/api/customers/customers.schemas';
import {
  toAddressPayload,
  toCustomerFormValues,
  toUpdateCustomerDto,
  type CustomerAddressFormValues,
} from './customer-form.mapper';

const address = (values: Partial<CustomerAddressFormValues> = {}): CustomerAddressFormValues => ({
  recipient: 'Nguyễn Văn An',
  phone: '0912345678',
  addressLine: '12 Nguyễn Trãi',
  provinceCode: '79',
  isDefault: false,
  ...values,
});

describe('toAddressPayload', () => {
  it('lấy địa chỉ đầu tiên làm mặc định khi không ai được đánh dấu', () => {
    const payload = toAddressPayload([address(), address({ recipient: 'B' })]);

    expect(payload.map((item) => item.isDefault)).toEqual([true, false]);
  });

  it('giữ nguyên lựa chọn mặc định của người nhập', () => {
    const payload = toAddressPayload([address(), address({ recipient: 'B', isDefault: true })]);

    expect(payload.map((item) => item.isDefault)).toEqual([false, true]);
  });

  /**
   * Hãng vận chuyển định tuyến bằng mã, không bằng tên. Bản cũ chỉ gửi tên nên địa chỉ lưu xong
   * không tạo được vận đơn và mở lại form thì hai ô quận/phường trống.
   */
  it('gửi cả tên lẫn mã quận/phường lên Backend', () => {
    const [payload] = toAddressPayload([
      address({ districtCode: '1442', district: 'Quận 1', wardCode: '21012', ward: 'Bến Thành' }),
    ]);

    expect(payload).toMatchObject({
      district: 'Quận 1',
      districtCode: '1442',
      ward: 'Bến Thành',
      wardCode: '21012',
    });
  });

  it('bỏ qua mã rỗng thay vì gửi chuỗi trống', () => {
    const [payload] = toAddressPayload([address({ districtCode: '', wardCode: '  ' })]);

    expect(payload).not.toHaveProperty('districtCode');
    expect(payload).not.toHaveProperty('wardCode');
  });
});

describe('toUpdateCustomerDto', () => {
  const detail = {
    id: '7',
    customerNo: 'KH-000007',
    name: 'Nguyễn Minh Anh',
    email: 'minh.anh@example.com',
    phone: '0912345678',
    status: 'ACTIVE',
    kind: 'GUEST',
    marketingConsent: false,
    avatarAssetId: '55',
    avatarUrl: 'https://cdn/x.png',
    orderCount: 0,
    lifetimeValue: '0.00',
    lastOrderAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    version: 3,
    addresses: [],
    recentOrders: [],
  } as unknown as AdminCustomerDetailDto;

  it('không gửi avatarAssetId khi ảnh không đổi, để không gỡ mất ảnh đang dùng', () => {
    const values = toCustomerFormValues(detail);

    expect(toUpdateCustomerDto(values, 3, '55')).not.toHaveProperty('avatarAssetId');
  });

  it('gửi null khi người dùng gỡ ảnh đại diện', () => {
    const values = { ...toCustomerFormValues(detail), avatarAssetId: undefined, avatarUrl: '' };

    expect(toUpdateCustomerDto(values, 3, '55').avatarAssetId).toBeNull();
  });
});
