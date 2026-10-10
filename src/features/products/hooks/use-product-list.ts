import { useMemo, useState } from 'react';
import {
  useListAdminCategories,
  useListAdminProducts,
} from '@/generated/api/catalog/catalog';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { PRODUCT_LIST_DEFAULT_PAGE_SIZE } from '../constants/product-list.constants';
import { toProductListRow } from '../model/product-list.mapper';

const SEARCH_KEYS = ['name', 'sku', 'code'] as const;

/**
 * Sở hữu toàn bộ query/filter/pagination của danh sách sản phẩm.
 * TanStack Query vẫn là nguồn server state; hook chỉ giữ state điều khiển của màn hình.
 *
 * Bộ lọc và trang nằm trên URL (`name`, `sku`, `code`, `category`, `page`) để F5/Back/gửi link giữ
 * nguyên. Ô tìm kiếm giữ chữ đang gõ ở state cục bộ, ghi giá trị đã debounce lên URL; query đọc URL.
 * Đổi bộ lọc thì xoá `page` (về trang 1). Kích thước trang chỉ sống trong màn.
 */
export function useProductList() {
  const search = useUrlSearch(SEARCH_KEYS);
  const { url } = search;
  const category = url.get('category');
  const page = url.getNumber('page', 1);
  const [pageSize, setPageSize] = useState(PRODUCT_LIST_DEFAULT_PAGE_SIZE);

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
    name: search.values.name,
    setName: search.setter('name'),
    sku: search.values.sku,
    setSku: search.setter('sku'),
    productNo: search.values.code,
    setProductNo: search.setter('code'),
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
