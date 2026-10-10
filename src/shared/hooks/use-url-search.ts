import { useDebouncedCallback } from 'use-debounce';
import { useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from './use-search-state';
import { useUrlFilters } from './use-url-filters';

/**
 * Các ô tìm kiếm ghi lên URL: giữ chữ đang gõ ở local state (khởi tạo từ URL), hết debounce thì ghi
 * toàn bộ giá trị đã trim lên URL và về trang 1. Query đọc từ `url.get(key)`.
 *
 * ```ts
 * const search = useUrlSearch(['name', 'phone']);
 * <SearchInput value={search.values.name} onChange={search.setter('name')} />
 * ```
 */
export function useUrlSearch<TKey extends string>(keys: readonly TKey[], delay = SEARCH_DEBOUNCE_MS) {
  const url = useUrlFilters();
  const [values, setValues] = useState(
    () => Object.fromEntries(keys.map((key) => [key, url.get(key) ?? ''])) as Record<TKey, string>,
  );
  const commit = useDebouncedCallback((next: Record<TKey, string>) => {
    const patch: Record<string, string | undefined> = { page: undefined };
    for (const key of keys) patch[key] = next[key].trim();
    url.patch(patch);
  }, delay);

  return {
    values,
    setter: (key: TKey) => (value: string) => {
      const next = { ...values, [key]: value };
      setValues(next);
      commit(next);
    },
    url,
  };
}
