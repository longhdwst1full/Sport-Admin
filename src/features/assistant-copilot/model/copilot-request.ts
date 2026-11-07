export const COPILOT_REQUEST_TIMEOUT_MS = 90_000;
export const COPILOT_TURN_TIMEOUT_MS = 180_000;

/** Bound the whole turn, including auth/network waits and 409 polling, even if a transport ignores abort. */
export async function withCopilotDeadline<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Trợ lý phản hồi quá lâu. Bạn có thể gửi lại cùng câu hỏi để kiểm tra kết quả, không tạo lượt trùng.'));
      controller.abort();
    }, COPILOT_TURN_TIMEOUT_MS);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
