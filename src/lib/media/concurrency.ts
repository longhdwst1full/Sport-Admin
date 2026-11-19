/**
 * Giới hạn số tác vụ bất đồng bộ chạy cùng lúc; tác vụ dư xếp hàng theo thứ tự gọi. `signal` đã huỷ
 * khi tới lượt (hoặc lúc đang xếp hàng) thì tác vụ không chạy và promise bị từ chối bằng lý do huỷ.
 */
export function createConcurrencyLimiter(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= limit) return;
    const start = queue.shift();
    if (start) start();
  };

  function run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const abortReason = () => signal?.reason ?? new DOMException('Aborted', 'AbortError');
      const onAbort = () => {
        const index = queue.indexOf(start);
        if (index >= 0) {
          queue.splice(index, 1);
          reject(abortReason());
        }
      };
      function start() {
        signal?.removeEventListener('abort', onAbort);
        if (signal?.aborted) {
          reject(abortReason());
          next();
          return;
        }
        active += 1;
        let promise: Promise<T>;
        try {
          promise = task();
        } catch (error) {
          promise = Promise.reject(error);
        }
        promise.then(resolve, reject).finally(() => {
          active -= 1;
          next();
        });
      }
      if (signal?.aborted) {
        reject(abortReason());
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });
      queue.push(start);
      next();
    });
  }

  return { run, get active() { return active; }, get queued() { return queue.length; } };
}

/** Số ảnh tải lên song song tối đa (nén + xin chữ ký + POST Cloudinary), dùng chung toàn app. */
export const IMAGE_UPLOAD_CONCURRENCY = 3;
export const imageUploadQueue = createConcurrencyLimiter(IMAGE_UPLOAD_CONCURRENCY);
