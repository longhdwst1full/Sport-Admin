import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { SEARCH_DEBOUNCE_MS } from '@/shared/hooks/use-search-state';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';

type ParamValue = string | number | null | undefined;

/**
 * Bộ lọc + trang của MỘT tab trên màn tồn kho, ghi lên URL với khoá có tiền tố (`transfer.q`,
 * `transfer.page`…) vì các tab cùng mount trên một màn — dùng chung `q`/`page` thì tab này đè tab kia.
 * Ô tìm giữ chữ đang gõ ở state cục bộ, hết debounce mới ghi URL; đổi bất kỳ bộ lọc nào thì xoá trang.
 */
export function useTabUrlFilters(prefix: string) {
  const url = useUrlFilters();
  const key = (name: string) => `${prefix}.${name}`;
  const pageKey = key('page');
  const searchKey = key('q');
  const [searchValue, setSearchValue] = useState(() => url.get(searchKey) ?? '');
  const commitSearch = useDebouncedCallback(
    (value: string) => url.patch({ [searchKey]: value.trim(), [pageKey]: undefined }),
    SEARCH_DEBOUNCE_MS,
  );

  return {
    search: {
      value: searchValue,
      setValue: (value: string) => {
        setSearchValue(value);
        commitSearch(value);
      },
      /** Giá trị đã debounce + trim đang nằm trên URL; rỗng → `undefined`. */
      debounced: url.get(searchKey),
    },
    get: (name: string) => url.get(key(name)),
    getEnum: <T extends string>(name: string, values: Record<string, T> | readonly T[]) =>
      url.getEnum(key(name), values),
    setFilter: (name: string, value: ParamValue) => url.patch({ [key(name)]: value, [pageKey]: undefined }),
    page: url.getNumber(pageKey, 1),
    setPage: (page: number) => url.set(pageKey, page > 1 ? page : undefined),
  };
}
