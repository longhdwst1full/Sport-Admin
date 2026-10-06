import { useState } from 'react';
import { useDebounce } from 'use-debounce';

export const SEARCH_DEBOUNCE_MS = 350;

/**
 * State cho ô tìm kiếm gọi server: giá trị đang gõ cho input, giá trị đã trim + debounce cho query
 * (rỗng → `undefined` để không gửi tham số).
 */
export function useSearchState(initial = '', delay = SEARCH_DEBOUNCE_MS) {
  const [value, setValue] = useState(initial);
  const [debounced] = useDebounce(value.trim(), delay);
  return { value, setValue, debounced: debounced || undefined } as const;
}
