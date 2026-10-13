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
  const readUrl = () =>
    Object.fromEntries(keys.map((key) => [key, url.get(key) ?? ''])) as Record<TKey, string>;
  const [values, setValues] = useState(readUrl);
  const commit = useDebouncedCallback((next: Record<TKey, string>) => {
    const patch: Record<string, string | undefined> = { page: undefined };
    for (const key of keys) patch[key] = next[key].trim();
    url.patch(patch);
  }, delay);

  /**
   * URL đổi từ bên ngoài (bấm lại mục menu/tab của chính màn này làm mất query, Back/Forward) thì ô
   * nhập phải theo URL; không thì ô còn chữ cũ trong khi danh sách đã hết lọc. Điều chỉnh ngay lúc
   * render (RULE-HOOK-01). Chỉ ghi đè khi giá trị đã trim khác URL, để lần ghi debounce của chính ô
   * này không cắt mất khoảng trắng người dùng đang gõ dở.
   */
  const fromUrl = readUrl();
  const [syncedUrl, setSyncedUrl] = useState(fromUrl);
  if (keys.some((key) => fromUrl[key] !== syncedUrl[key])) {
    setSyncedUrl(fromUrl);
    if (keys.some((key) => values[key].trim() !== fromUrl[key])) setValues(fromUrl);
  }

  return {
    values,
    setter: (key: TKey) => (value: string) => {
      const next = { ...values, [key]: value };
      setValues(next);
      commit(next);
      // UX: bấm nút xoá (allowClear) thì bỏ lọc ngay, không bắt người dùng chờ hết debounce.
      if (value === '') commit.flush();
    },
    url,
  };
}
