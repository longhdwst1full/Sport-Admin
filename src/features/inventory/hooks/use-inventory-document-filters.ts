import { useState } from 'react';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE } from '@/foundation/table';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';

/**
 * State bộ lọc chung của danh sách phiếu kho (chuyển kho, kiểm kê): tìm số phiếu, kho, trạng thái và
 * trang hiện tại — trang tự về 1 khi bộ lọc đổi. `params` truyền thẳng vào list query đã sinh.
 */
export function useInventoryDocumentFilters<TStatus extends string>() {
  const search = useSearchState('', 300);
  const [warehouseCode, setWarehouseCode] = useState<string>();
  const [status, setStatus] = useState<TStatus>();
  const [page, setPage] = useListPageReset([search.debounced, warehouseCode, status]);

  return {
    search,
    warehouseCode,
    setWarehouseCode,
    status,
    setStatus,
    params: {
      page,
      limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
      search: search.debounced,
      warehouseCode,
      status,
    },
    pagination: (total: number) => ({
      current: page,
      pageSize: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
      total,
      showSizeChanger: false,
      onChange: setPage,
    }),
  };
}

export type InventoryDocumentFilters<TStatus extends string> = ReturnType<
  typeof useInventoryDocumentFilters<TStatus>
>;
