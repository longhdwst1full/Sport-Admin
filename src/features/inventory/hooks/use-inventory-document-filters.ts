import { ADMIN_TABLE_DEFAULT_PAGE_SIZE } from '@/foundation/table';
import { useTabUrlFilters } from './use-tab-url-filters';

/**
 * State bộ lọc chung của danh sách phiếu kho (chuyển kho, kiểm kê): tìm số phiếu, kho, trạng thái và
 * trang hiện tại, nằm trên URL theo tiền tố của tab — trang tự về 1 khi bộ lọc đổi. `params` truyền
 * thẳng vào list query đã sinh.
 */
export function useInventoryDocumentFilters<TStatus extends string>(
  prefix: string,
  statuses: Record<string, TStatus>,
) {
  const filters = useTabUrlFilters(prefix);
  const warehouseCode = filters.get('warehouse');
  const status = filters.getEnum('status', statuses);

  return {
    search: filters.search,
    warehouseCode,
    setWarehouseCode: (value?: string) => filters.setFilter('warehouse', value),
    status,
    setStatus: (value?: TStatus) => filters.setFilter('status', value),
    params: {
      page: filters.page,
      limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
      search: filters.search.debounced,
      warehouseCode,
      status,
    },
    pagination: (total: number) => ({
      current: filters.page,
      pageSize: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
      total,
      showSizeChanger: false,
      onChange: filters.setPage,
    }),
  };
}

export type InventoryDocumentFilters<TStatus extends string> = ReturnType<
  typeof useInventoryDocumentFilters<TStatus>
>;
