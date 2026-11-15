import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, ADMIN_TABLE_PAGE_SIZE_OPTIONS } from '@/foundation/table';
import { CatalogMasterStatus } from '@/generated/api/catalog/catalog.schemas';
import { useUrlSearch } from '@/shared/hooks/use-url-search';

/**
 * Ô tìm, trạng thái, trang và số dòng nằm trên URL: API trả trọn danh sách nên
 * lọc/phân trang tại chỗ, nhưng F5/gửi link vẫn giữ nguyên. Gõ tìm thì về trang 1.
 */
export function useMasterListUrl() {
  const search = useUrlSearch(['q']);
  const { url } = search;
  const requestedSize = url.getNumber('pageSize', ADMIN_TABLE_DEFAULT_PAGE_SIZE);
  const pageSize = ADMIN_TABLE_PAGE_SIZE_OPTIONS.includes(String(requestedSize)) ? requestedSize : ADMIN_TABLE_DEFAULT_PAGE_SIZE;
  return {
    searchValue: search.values.q,
    onSearch: search.setter('q'),
    keyword: url.get('q') ?? '',
    status: url.getEnum('status', CatalogMasterStatus),
    onStatusChange: (status?: CatalogMasterStatus) => url.patch({ status, page: undefined }),
    pagination: {
      current: url.getNumber('page', 1),
      pageSize,
      // Giữ ô số dòng cả khi chỉ còn một trang để người dùng đổi lại 20/30/50/100.
      hideOnSinglePage: false,
      onChange: (page: number, nextPageSize = pageSize) => url.patch({
        page: nextPageSize === pageSize && page > 1 ? page : undefined,
        pageSize: nextPageSize === ADMIN_TABLE_DEFAULT_PAGE_SIZE ? undefined : nextPageSize,
      }),
    },
    /** Về trang 1, ví dụ sau khi tạo mới để thấy bản ghi vừa thêm. */
    resetPage: () => url.set('page', undefined),
  };
}
