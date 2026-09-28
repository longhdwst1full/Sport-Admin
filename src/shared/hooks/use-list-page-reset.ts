import { useRef, useState } from 'react';

/**
 * Trang hiện tại của một danh sách có lọc, tự quay về `initialPage` khi bất kỳ giá trị nào trong
 * `filters` đổi.
 *
 * Không dùng `useEffect(() => setPage(1), [...filters])` (RULE-HOOK-01): effect chạy sau khi
 * component đã commit và fetch với trang cũ + filter mới, nên luôn có một lượt gọi API thừa bằng
 * dữ liệu sai trang trước khi effect kịp sửa lại. Ở đây việc so sánh và đặt lại trang xảy ra ngay
 * trong lúc render — theo mẫu "Adjusting state when a prop changes" của React — nên khi filter đổi,
 * component render lại ngay với trang đã đúng trước khi bất kỳ query nào chạy với trang cũ.
 *
 * `onReset` (tuỳ chọn) chạy cùng lúc trang được đặt lại, cho những màn có thêm state phụ thuộc filter
 * ngoài số trang (ví dụ `cursorHistory` của phân trang kiểu cursor).
 */
export function useListPageReset(
  filters: readonly unknown[],
  options?: { initialPage?: number; onReset?: () => void },
) {
  const initialPage = options?.initialPage ?? 1;
  const [page, setPage] = useState(initialPage);
  const previous = useRef(filters);

  const changed =
    filters.length !== previous.current.length ||
    filters.some((value, index) => !Object.is(value, previous.current[index]));

  if (changed) {
    previous.current = filters;
    if (page !== initialPage) setPage(initialPage);
    options?.onReset?.();
  }

  return [page, setPage] as const;
}
