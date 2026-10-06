import { EditOutlined, PlusOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { Alert, App, Button, Popconfirm, Select, Tag, Tooltip } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { SearchInput } from '@/foundation/inputs/search-input';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionGate, useCan } from '@/core/auth/permissions';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import {
  getListSuppliersQueryKey,
  useListSuppliers,
  useSetSupplierStatus,
} from '@/generated/api/procurement/procurement';
import { SupplierStatus, type SupplierDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { PROCUREMENT_PAGE_SIZE, supplierStatusOptions } from '../constants/procurement.constants';
import { SupplierFormDrawer } from './supplier-form-drawer';

const SUPPLIER_DATA_COLUMNS: ColumnsType<SupplierDto> = [
  { title: 'Mã NCC', dataIndex: 'code', width: 150 },
  { title: 'Tên nhà cung cấp', dataIndex: 'name', width: 260 },
  col.text<SupplierDto>('contactName', 'Người liên hệ', { width: 180 }),
  col.text<SupplierDto>('phone', 'Điện thoại', { width: 150 }),
  col.text<SupplierDto>('email', 'Email', { width: 220 }),
  { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (value) => <Tag color={value === SupplierStatus.ACTIVE ? 'green' : 'default'}>{value === SupplierStatus.ACTIVE ? 'Đang giao dịch' : 'Ngừng giao dịch'}</Tag> },
];

export function SupplierPanel() {
  const [pageSize, setPageSize] = useState(PROCUREMENT_PAGE_SIZE);
  const [status, setStatus] = useState<string>();
  const [editing, setEditing] = useState<SupplierDto>();
  const [formOpen, setFormOpen] = useState(false);
  const search = useSearchState();
  const [page, setPage] = useListPageReset([search.debounced, status, pageSize]);
  const query = useListSuppliers({ page, limit: pageSize, search: search.debounced, status: status as never });
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const canManage = useCan('supplier.manage');
  const statusMutation = useSetSupplierStatus({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        void message.success('Đã cập nhật trạng thái nhà cung cấp.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không đổi được trạng thái nhà cung cấp.')),
    },
  });

  const { mutate: setSupplierStatus } = statusMutation;
  const toggleStatus = useCallback(
    (row: SupplierDto) =>
      setSupplierStatus({ id: row.id, data: { expectedVersion: row.version, status: row.status === SupplierStatus.ACTIVE ? SupplierStatus.INACTIVE : SupplierStatus.ACTIVE } }),
    [setSupplierStatus],
  );
  const columns = useMemo<ColumnsType<SupplierDto>>(
    () => [
      ...SUPPLIER_DATA_COLUMNS,
      col.actions<SupplierDto>(
        (row) =>
          canManage ? (
            <>
              <TableActionButton label={`Sửa ${row.name}`} icon={<EditOutlined />} onClick={() => { setEditing(row); setFormOpen(true); }} />
              <Tooltip title={row.status === SupplierStatus.ACTIVE ? 'Ngừng giao dịch' : 'Mở lại giao dịch'}>
                <Popconfirm title="Xác nhận đổi trạng thái nhà cung cấp?" onConfirm={() => toggleStatus(row)}>
                  <TableActionButton label="Đổi trạng thái" icon={row.status === SupplierStatus.ACTIVE ? <StopOutlined /> : <UndoOutlined />} />
                </Popconfirm>
              </Tooltip>
            </>
          ) : null,
        { title: '', width: 100 },
      ),
    ],
    [canManage, toggleStatus],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search.value} onChange={search.setValue} placeholder="Tìm mã hoặc tên nhà cung cấp" />
        <Select allowClear className="!w-48" value={status} onChange={setStatus} placeholder="Trạng thái" options={supplierStatusOptions} />
        <PermissionGate permission="supplier.manage">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setFormOpen(true); }}>Thêm nhà cung cấp</Button>
        </PermissionGate>
      </div>
      {query.isError && <Alert type="error" showIcon message="Không tải được nhà cung cấp" description={getApiErrorMessage(query.error)} />}
      <AdminTable<SupplierDto>
        rowKey="id"
        emptyEntity="nhà cung cấp"
        loading={query.isLoading || query.isFetching}
        dataSource={query.data?.items ?? []}
        columns={columns}
        pagination={{ current: page, pageSize, total: query.data?.meta.total ?? 0, onChange: (next, size) => { setPage(next); setPageSize(size); }, showTotal: (total) => `${total} nhà cung cấp` }}
      />
      <SupplierFormDrawer open={formOpen} editing={editing} onClose={() => { setFormOpen(false); setEditing(undefined); }} />
    </div>
  );
}
