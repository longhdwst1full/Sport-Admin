/**
 * Gộp nhiều tín hiệu liên tiếp thành tối đa một lần chạy mỗi `minIntervalMs`.
 *
 * Chạy NGAY nếu lần trước đã đủ lâu (tín hiệu đơn mới phải thấy tức thì); nếu chưa đủ thì hẹn đúng MỘT lần chạy
 * ở cuối khoảng chờ. SECURITY: kênh Realtime là kênh công khai — ai có anon key (nằm trong bundle) cũng gửi
 * được tín hiệu giả; bộ gộp chặn việc đó thành bão refetch (tối đa 1 lần/`minIntervalMs` mỗi tab).
 */
export function createCoalescedTrigger(run: () => void, minIntervalMs: number) {
  let lastRunAt = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const execute = () => {
    timer = undefined;
    lastRunAt = Date.now();
    run();
  };

  return {
    trigger(): void {
      if (timer !== undefined) return;
      const wait = lastRunAt + minIntervalMs - Date.now();
      if (wait <= 0) execute();
      else timer = setTimeout(execute, wait);
    },
    cancel(): void {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
