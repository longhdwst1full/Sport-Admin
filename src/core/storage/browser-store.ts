/**
 * Adapter storage duy nhất của Admin (RULE-CORE-01).
 *
 * Lý do tồn tại: mọi truy cập `localStorage`/`sessionStorage` đều phải chịu được
 * ba tình huống thật — không có `window` (SSR/test), storage bị chặn (private mode,
 * quota), và dữ liệu cũ/hỏng không parse được. Feature chỉ khai báo key + schema,
 * không tự bắt try/catch.
 */
export type BrowserStoreArea = 'local' | 'session';

export interface BrowserStore<T> {
  read(): T | undefined;
  write(value: T): void;
  clear(): void;
}

function resolveStorage(area: BrowserStoreArea): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return area === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return undefined;
  }
}

export function createBrowserStore<T>(
  key: string,
  options: { area?: BrowserStoreArea; parse?: (raw: unknown) => T | undefined } = {},
): BrowserStore<T> {
  const { area = 'local', parse } = options;

  return {
    read() {
      const raw = resolveStorage(area)?.getItem(key);
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw) as unknown;
        return parse ? parse(parsed) : (parsed as T);
      } catch {
        // Dữ liệu hỏng hoặc sai schema: dọn để lần sau không lỗi lặp lại.
        resolveStorage(area)?.removeItem(key);
        return undefined;
      }
    },
    write(value: T) {
      try {
        resolveStorage(area)?.setItem(key, JSON.stringify(value));
      } catch {
        // Storage đầy hoặc bị chặn: bỏ qua, state trong bộ nhớ vẫn đúng.
      }
    },
    clear() {
      resolveStorage(area)?.removeItem(key);
    },
  };
}
