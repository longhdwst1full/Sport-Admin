import { describe, expect, it } from 'vitest';
import type { OrderDetailDto } from '@/generated/api/orders/orders.schemas';
import {
  getOrderActionAvailability,
  getOrderProgress,
  getProgressStepStatus,
} from './order-actions.policy';

type Gate = Pick<OrderDetailDto, 'status' | 'paymentStatus' | 'paymentMethod' | 'fulfillmentStatus'>;

const pending: Gate = {
  status: 'PENDING_CONFIRMATION',
  paymentStatus: 'PENDING',
  paymentMethod: 'COD',
  fulfillmentStatus: 'PENDING',
};

describe('getOrderActionAvailability', () => {
  it('không có quyền hoặc chưa tải đơn thì tắt hết', () => {
    const none = { cancel: false, confirm: false, complete: false };
    expect(getOrderActionAvailability(pending, false)).toEqual(none);
    expect(getOrderActionAvailability(undefined, true)).toEqual(none);
  });

  it('COD chờ xác nhận: huỷ và xác nhận được, chưa hoàn tất', () => {
    expect(getOrderActionAvailability(pending, true)).toEqual({ cancel: true, confirm: true, complete: false });
  });

  it('đơn trả trước chỉ xác nhận khi đã thu tiền; đã thu thì không huỷ', () => {
    const prepaid: Gate = { ...pending, paymentMethod: 'BANK_TRANSFER' };
    expect(getOrderActionAvailability(prepaid, true)).toMatchObject({ cancel: true, confirm: false });
    expect(getOrderActionAvailability({ ...prepaid, paymentStatus: 'SUCCESS' }, true)).toMatchObject({
      cancel: false,
      confirm: true,
    });
    expect(getOrderActionAvailability({ ...pending, paymentMethod: 'VNPAY', paymentStatus: 'FAILED' }, true))
      .toMatchObject({ cancel: true, confirm: false });
  });

  it('fulfillment đã chạy thì không huỷ/xác nhận', () => {
    expect(getOrderActionAvailability({ ...pending, fulfillmentStatus: 'PICKING' }, true)).toMatchObject({
      cancel: false,
      confirm: false,
    });
  });

  it('hoàn tất cần DELIVERED + giao đủ + đã thu tiền', () => {
    const delivered: Gate = {
      status: 'DELIVERED',
      paymentStatus: 'SUCCESS',
      paymentMethod: 'COD',
      fulfillmentStatus: 'DELIVERED',
    };
    expect(getOrderActionAvailability(delivered, true).complete).toBe(true);
    expect(getOrderActionAvailability({ ...delivered, paymentStatus: 'PENDING' }, true).complete).toBe(false);
    expect(getOrderActionAvailability({ ...delivered, fulfillmentStatus: 'SHIPPED' }, true).complete).toBe(false);
  });
});

describe('getOrderProgress', () => {
  it('map trạng thái về bước', () => {
    expect(getOrderProgress('PENDING_CONFIRMATION').current).toBe(0);
    expect(getOrderProgress('PICKING').current).toBe(2);
    expect(getOrderProgress('PACKED').current).toBe(2);
    expect(getOrderProgress('SHIPPED').current).toBe(3);
    expect(getOrderProgress('CANCELLED')).toMatchObject({ cancelled: true });
  });

  it('COMPLETED đánh dấu xong cả bước cuối; DELIVERED còn đang xử lý', () => {
    expect(getProgressStepStatus(4, getOrderProgress('COMPLETED'))).toBe('finish');
    expect(getProgressStepStatus(4, getOrderProgress('DELIVERED'))).toBe('process');
    expect(getProgressStepStatus(1, getOrderProgress('CONFIRMED'))).toBe('process');
    expect(getProgressStepStatus(0, getOrderProgress('CONFIRMED'))).toBe('finish');
    expect(getProgressStepStatus(2, getOrderProgress('CONFIRMED'))).toBe('wait');
  });
});
