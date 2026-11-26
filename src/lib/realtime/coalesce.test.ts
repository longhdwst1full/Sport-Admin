import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoalescedTrigger } from './coalesce';

describe('createCoalescedTrigger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T08:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs immediately on the first signal (a new order must show up at once)', () => {
    const run = vi.fn();
    createCoalescedTrigger(run, 5_000).trigger();
    expect(run).toHaveBeenCalledTimes(1);
  });

  // SECURITY: kênh công khai → tín hiệu giả dồn dập chỉ được tạo tối đa một lần chạy mỗi khoảng chờ.
  it('coalesces a burst into one trailing run at the end of the interval', () => {
    const run = vi.fn();
    const coalesced = createCoalescedTrigger(run, 5_000);
    coalesced.trigger();
    for (let i = 0; i < 50; i += 1) coalesced.trigger();
    expect(run).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(4_999);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs immediately again once the interval has passed', () => {
    const run = vi.fn();
    const coalesced = createCoalescedTrigger(run, 5_000);
    coalesced.trigger();
    vi.advanceTimersByTime(6_000);
    coalesced.trigger();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('cancel drops the pending trailing run', () => {
    const run = vi.fn();
    const coalesced = createCoalescedTrigger(run, 5_000);
    coalesced.trigger();
    coalesced.trigger();
    coalesced.cancel();
    vi.advanceTimersByTime(10_000);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
