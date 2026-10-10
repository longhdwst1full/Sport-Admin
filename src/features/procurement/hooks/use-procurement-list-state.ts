import { useCallback, useState } from 'react';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE } from '@/foundation/table';
import { useUrlSearch } from '@/shared/hooks/use-url-search';

/**
 * State chung của bốn tab danh sách: ô tìm (`q`), trang (`page`) và các bộ lọc enum nằm trên URL nên
 * F5/gửi link giữ nguyên; kích thước trang, chứng từ đang xem và form đang mở là state cục bộ.
 * Trang chỉ mount tab đang chọn và đổi tab thì xoá lọc, nên các tab dùng chung tên tham số.
 */
export function useProcurementListState<TEditing>() {
  const search = useUrlSearch(['q']);
  const { url } = search;
  const [pageSize, setPageSize] = useState(ADMIN_TABLE_DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string>();
  const [editing, setEditing] = useState<TEditing>();
  const [createOpen, setCreateOpen] = useState(false);
  const page = url.getNumber('page', 1);
  const openEdit = useCallback((value: TEditing) => {
    setSelectedId(undefined);
    setEditing(value);
  }, []);

  return {
    url,
    searchValue: search.values.q,
    onSearch: search.setter('q'),
    q: url.get('q'),
    page,
    pageSize,
    /** Đổi một bộ lọc thì về trang 1. */
    setFilter: (key: string, value: string | undefined) => url.patch({ [key]: value, page: undefined }),
    pagination: (total: number, unit: string) => ({
      current: page,
      pageSize,
      total,
      showTotal: (count: number) => `${count} ${unit}`,
      onChange: (next: number, size: number) => {
        if (size !== pageSize) {
          setPageSize(size);
          url.set('page', undefined);
        } else url.set('page', next > 1 ? next : undefined);
      },
    }),
    selectedId,
    openDetail: setSelectedId,
    closeDetail: () => setSelectedId(undefined),
    editing,
    formOpen: createOpen || editing !== undefined,
    openCreate: () => {
      setEditing(undefined);
      setCreateOpen(true);
    },
    openEdit,
    closeForm: () => {
      setCreateOpen(false);
      setEditing(undefined);
    },
  };
}
