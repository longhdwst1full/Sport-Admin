import { useState } from 'react';

/**
 * Phân trang cursor có nút lùi: giữ cursor trang hiện tại và chồng cursor các trang trước.
 * `bind(nextCursor)` trả đúng prop điều hướng cho `CursorPagination`.
 */
export function useCursorPages() {
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<string[]>([]);

  const reset = () => {
    setCursor(undefined);
    setHistory([]);
  };

  return {
    cursor,
    reset,
    bind: (nextCursor: string | null | undefined) => ({
      pageIndex: history.length,
      hasPrevious: history.length > 0,
      hasNext: Boolean(nextCursor),
      onFirst: reset,
      onPrevious: () => {
        const previous = [...history];
        setCursor(previous.pop() || undefined);
        setHistory(previous);
      },
      onNext: () => {
        setHistory((items) => [...items, cursor ?? '']);
        setCursor(nextCursor ?? undefined);
      },
    }),
  };
}
