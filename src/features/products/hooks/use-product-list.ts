import { useMemo, useState } from 'react';
import {
  useListAdminCategories,
  useListAdminProducts,
} from '@/generated/api/catalog/catalog';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { PRODUCT_LIST_DEFAULT_PAGE_SIZE } from '../constants/product-list.constants';
import { toProductListRow } from '../model/product-list.mapper';

/**
 * Sở hữu toàn bộ query/filter/pagination của danh sách sản phẩm.
 * TanStack Query vẫn là nguồn server state; hook chỉ giữ state điều khiển của màn hình.
 */
export function useProductList() {
  const name = useSearchState();
  const sku = useSearchState();
  const productNo = useSearchState();
  const [category, setCategory] = useState<string>();
  const [pageSize, setPageSize] = useState(PRODUCT_LIST_DEFAULT_PAGE_SIZE);
  const [page, setPage] = useListPageReset([name.debounced, sku.debounced, productNo.debounced, category]);

  const query = useListAdminProducts({
    page,
    limit: pageSize,
    name: name.debounced,
    sku: sku.debounced,
    productNo: productNo.debounced,
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
    setName: name.setValue,
    sku: sku.value,
    setSku: sku.setValue,
    productNo: productNo.value,
    setProductNo: productNo.setValue,
    category,
    setCategory,
    page,
    pageSize,
    onPageChange: (nextPage: number, nextPageSize: number) => {
      setPage(nextPageSize === pageSize ? nextPage : 1);
      setPageSize(nextPageSize);
    },
    query,
    rows,
    categoryOptions,
    categoriesLoading: categories.isPending,
  };
}
