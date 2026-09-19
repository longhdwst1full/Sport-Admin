import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import {
  useListAdminCategories,
  useListAdminProducts,
} from '@/generated/api/catalog/catalog';
import { PRODUCT_LIST_DEFAULT_PAGE_SIZE } from '../constants/product-list.constants';
import { toProductListRow } from '../model/product-list.mapper';

/**
 * Sở hữu toàn bộ query/filter/pagination của danh sách sản phẩm.
 * TanStack Query vẫn là nguồn server state; hook chỉ giữ state điều khiển của màn hình.
 */
export function useProductList() {
  const [name, setNameState] = useState('');
  const [sku, setSkuState] = useState('');
  const [productNo, setProductNoState] = useState('');
  const [category, setCategoryState] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PRODUCT_LIST_DEFAULT_PAGE_SIZE);

  const [debouncedName] = useDebounce(name.trim(), 350);
  const [debouncedSku] = useDebounce(sku.trim(), 350);
  const [debouncedProductNo] = useDebounce(productNo.trim(), 350);

  const query = useListAdminProducts({
    page,
    limit: pageSize,
    name: debouncedName || undefined,
    sku: debouncedSku || undefined,
    productNo: debouncedProductNo || undefined,
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

  const resetPage = () => setPage(1);
  return {
    name,
    setName: (value: string) => {
      setNameState(value);
      resetPage();
    },
    sku,
    setSku: (value: string) => {
      setSkuState(value);
      resetPage();
    },
    productNo,
    setProductNo: (value: string) => {
      setProductNoState(value);
      resetPage();
    },
    category,
    setCategory: (value?: string) => {
      setCategoryState(value);
      resetPage();
    },
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
