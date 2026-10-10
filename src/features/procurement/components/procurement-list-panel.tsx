import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { ReactNode } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { AdminTable, FilterBar, RefreshButton } from '@/foundation/table';

interface ListQuery {
  isError: boolean;
  error: unknown;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => unknown;
}

interface ProcurementListPanelProps<T extends { id: string }> {
  query: ListQuery;
  rows: T[];
  columns: ColumnsType<T>;
  emptyEntity: string;
  pagination: TablePaginationConfig;
  searchValue: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  /** Select lọc enum đặt sau ô tìm. */
  filters?: ReactNode;
  create: { permission: string; label: string; onClick: () => void };
  /** Bấm dòng mở drawer chi tiết. */
  onOpen?: (id: string) => void;
  /** Drawer chi tiết/form của tab. */
  children?: ReactNode;
}

/**
 * Khung chung của bốn tab nhập hàng: thanh lọc (tìm + lọc bên trái; làm mới + tạo mới bên phải), lỗi
 * tải có "Thử lại" và bảng phân trang server-side.
 */
export function ProcurementListPanel<T extends { id: string }>({
  query,
  rows,
  columns,
  emptyEntity,
  pagination,
  searchValue,
  onSearch,
  searchPlaceholder,
  filters,
  create,
  onOpen,
  children,
}: ProcurementListPanelProps<T>) {
  return (
    <div className="space-y-4">
      <FilterBar
        actions={
          <>
            <RefreshButton onRefresh={query.refetch} loading={query.isFetching} />
            <PermissionGate permission={create.permission}>
              <Button type="primary" icon={<PlusOutlined />} onClick={create.onClick}>
                {create.label}
              </Button>
            </PermissionGate>
          </>
        }
      >
        <SearchInput value={searchValue} onChange={onSearch} placeholder={searchPlaceholder} />
        {filters}
      </FilterBar>
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <AdminTable<T>
        rowKey="id"
        emptyEntity={emptyEntity}
        loading={query.isLoading || query.isFetching}
        dataSource={rows}
        columns={columns}
        onRow={onOpen ? (row) => ({ onClick: () => onOpen(row.id), style: { cursor: 'pointer' } }) : undefined}
        pagination={pagination}
      />
      {children}
    </div>
  );
}
