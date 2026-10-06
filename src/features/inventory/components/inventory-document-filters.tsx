import { Select } from 'antd';
import { SearchInput } from '@/foundation/inputs/search-input';
import type { SelectOption } from '@/shared/utils/options';
import type { InventoryDocumentFilters as Filters } from '../hooks/use-inventory-document-filters';
import { useWarehouseOptions } from '../hooks/use-warehouse-options';

/** Hàng lọc dùng chung cho danh sách phiếu kho: ô tìm, chọn kho (tìm phía server) và trạng thái. */
export function InventoryDocumentFilters<TStatus extends string>({
  filters,
  searchPlaceholder,
  warehousePlaceholder,
  statusOptions,
}: {
  filters: Filters<TStatus>;
  searchPlaceholder: string;
  warehousePlaceholder: string;
  statusOptions: SelectOption<TStatus>[];
}) {
  const warehouses = useWarehouseOptions();

  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <SearchInput
        className="max-w-sm"
        value={filters.search.value}
        onChange={filters.search.setValue}
        placeholder={searchPlaceholder}
      />
      <Select
        className="min-w-64"
        allowClear
        showSearch
        filterOption={false}
        value={filters.warehouseCode}
        onSearch={warehouses.onSearch}
        onChange={filters.setWarehouseCode}
        loading={warehouses.query.isFetching}
        placeholder={warehousePlaceholder}
        options={warehouses.options}
      />
      <Select
        className="min-w-44"
        allowClear
        value={filters.status}
        onChange={filters.setStatus}
        placeholder="Tất cả trạng thái"
        options={statusOptions}
      />
    </div>
  );
}
