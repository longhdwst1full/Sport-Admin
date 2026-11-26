import { describe, expect, it } from 'vitest';
import type { StaffAlertStatus } from '@/lib/realtime/staff-alert-channel';
import {
  ORDER_LIVE_POLL_HEARTBEAT_MS,
  ORDER_LIVE_POLL_HIDDEN_MS,
  ORDER_LIVE_POLL_REALTIME_MS,
  ORDER_LIVE_POLL_VISIBLE_MS,
  orderLivePollInterval,
} from './use-order-live-summary';

describe('orderLivePollInterval', () => {
  it.each<[StaffAlertStatus, boolean, number]>([
    // Có nhịp tim: đường ống đã chứng minh khoẻ, polling chỉ còn đối soát 10 phút bất kể tab ẩn/hiện.
    ['live', false, ORDER_LIVE_POLL_HEARTBEAT_MS],
    ['live', true, ORDER_LIVE_POLL_HEARTBEAT_MS],
    // Nối mà chưa có nhịp tim: không biết tín hiệu có rơi âm thầm không, giữ lưới an toàn 60 giây.
    ['connected', false, ORDER_LIVE_POLL_REALTIME_MS],
    ['connected', true, ORDER_LIVE_POLL_REALTIME_MS],
    // Không có Realtime dùng được: polling như cũ theo độ hiển thị tab.
    ['connecting', false, ORDER_LIVE_POLL_VISIBLE_MS],
    ['connecting', true, ORDER_LIVE_POLL_HIDDEN_MS],
    ['disconnected', false, ORDER_LIVE_POLL_VISIBLE_MS],
    ['disconnected', true, ORDER_LIVE_POLL_HIDDEN_MS],
    ['unavailable', false, ORDER_LIVE_POLL_VISIBLE_MS],
    ['unavailable', true, ORDER_LIVE_POLL_HIDDEN_MS],
  ])('%s (hidden=%s) → %d ms', (status, hidden, expected) => {
    expect(orderLivePollInterval(status, hidden)).toBe(expected);
  });

  it('uses the agreed intervals', () => {
    expect(ORDER_LIVE_POLL_HEARTBEAT_MS).toBe(600_000);
    expect(ORDER_LIVE_POLL_REALTIME_MS).toBe(60_000);
    expect(ORDER_LIVE_POLL_VISIBLE_MS).toBe(30_000);
    expect(ORDER_LIVE_POLL_HIDDEN_MS).toBe(60_000);
  });
});
