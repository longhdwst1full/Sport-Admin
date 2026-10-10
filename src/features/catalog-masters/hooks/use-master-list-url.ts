import { ADMIN_TABLE_DEFAULT_PAGE_SIZE } from '@/foundation/table';
import { useUrlSearch } from '@/shared/hooks/use-url-search';

/**
 * Ô tìm (`q`) và trang (`page`) của danh sách lọc client-side nằm trên URL: API trả trọn danh sách nên
 * lọc/phân trang tại chỗ, nhưng F5/gửi link vẫn giữ nguyên. Gõ tìm thì về trang 1.
 */
export function useMasterListUrl() {
  const search = useUrlSearch(['q']);
  const { url } = search;
  return {
    searchValue: search.values.q,
    onSearch: search.setter('q'),
    keyword: url.get('q') ?? '',
    pagination: {
      current: url.getNumber('page', 1),
      pageSize: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
      hideOnSinglePage: true,
      onChange: (page: number) => url.set('page', page > 1 ? page : undefined),
    },
  };
}
