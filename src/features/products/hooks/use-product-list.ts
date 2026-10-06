import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import {
  useListAdminCategories,
  useListAdminProducts,
} from '@/generated/api/catalog/catalog';
import { SEARCH_DEBOUNCE_MS, useSearchState } from '@/shared/hooks/use-search-state';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { PRODUCT_LIST_DEFAULT_PAGE_SIZE } from '../constants/product-list.constants';
import { toProductListRow } from '../model/product-list.mapper';

/**
 * Sở hữu toàn bộ query/filter/pagination của danh sách sản phẩm.
 * TanStack Query vẫn là nguồn server state; hook chỉ giữ state điều khiển của màn hình.
 *
 * Bộ lọc và trang nằm trên URL (`name`, `sku`, `code`, `category`, `page`) để F5/Back/gửi link giữ
 * nguyên. Ô tìm kiếm giữ chữ đang gõ ở state cục bộ, ghi giá trị đã debounce lên URL; query đọc URL.
 * Đổi bộ lọc thì xoá `page` (về trang 1). Kích thước trang chỉ sống trong màn.
 */
export function useProductList() {
  const url = useUrlFilters();
  const name = useSearchState(url.get('name') ?? '');
  const sku = useSearchState(url.get('sku') ?? '');
  const productNo = useSearchState(url.get('code') ?? '');
  const category = url.get('category');
  const page = url.getNumber('page', 1);
  const [pageSize, setPageSize] = useState(PRODUCT_LIST_DEFAULT_PAGE_SIZE);
  // Gọi lúc hết debounce với closure mới nhất nên đọc đúng giá trị cả ba ô.
  const commitSearch = useDebouncedCallback(
    () =>
      url.patch({
        name: name.value.trim(),
        sku: sku.value.trim(),
        code: productNo.value.trim(),
        page: undefined,
      }),
    SEARCH_DEBOUNCE_MS,
  );
  const typed = (setValue: (value: string) => void) => (value: string) => {
    setValue(value);
    commitSearch();
  };

  const query = useListAdminProducts({
    page,
    limit: pageSize,
    name: url.get('name'),
    sku: url.get('sku'),
    productNo: url.get('code'),
    category,
  });
  const categories = useListAdminCategories();

  const rows = useMemo(
    () => (query.data?.items ?? []).map(toProductListRow),
    [query.data?.items],
  );
  const categoryOptions = useMemo(
    () =>
      (categories.data?.items ?? [])
        .filter((item) => item.status === 'ACTIVE')
        .map((item) => ({
          value: item.slug,
          label: `${'\u00A0\u00A0'.repeat(item.depth)}${item.name}`,
        })),
    [categories.data?.items],
  );

  return {
    name: name.value,
    setName: typed(name.setValue),
    sku: sku.value,
    setSku: typed(sku.setValue),
    productNo: productNo.value,
    setProductNo: typed(productNo.setValue),
    category,
    setCategory: (value?: string) => url.patch({ category: value, page: undefined }),
    page,
    pageSize,
    onPageChange: (nextPage: number, nextPageSize: number) => {
      url.set('page', nextPageSize === pageSize && nextPage > 1 ? nextPage : undefined);
      setPageSize(nextPageSize);
    },
    query,
    rows,
    categoryOptions,
    categoriesLoading: categories.isPending,
  };
}
