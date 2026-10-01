import { EditOutlined, PlusOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Popconfirm, Select, Tag, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/core/auth/permissions';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import {
  getListSuppliersQueryKey,
  useListSuppliers,
  useSetSupplierStatus,
} from '@/generated/api/procurement/procurement';
import { SupplierStatus, type SupplierDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { PROCUREMENT_PAGE_SIZE, supplierStatusOptions } from '../constants/procurement.constants';
import { SupplierFormDrawer } from './supplier-form-drawer';

export function SupplierPanel() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PROCUREMENT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [editing, setEditing] = useState<SupplierDto>();
  const [formOpen, setFormOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  useEffect(() => setPage(1), [debouncedSearch, status, pageSize]);
  const query = useListSuppliers({ page, limit: pageSize, search: debouncedSearch || undefined, status: status as never });
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const statusMutation = useSetSupplierStatus({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        void message.success('Đã cập nhật trạng thái nhà cung cấp.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không đổi được trạng thái nhà cung cấp.')),
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input.Search allowClear className="!w-80" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã hoặc tên nhà cung cấp" />
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
        columns={[
          { title: 'Mã NCC', dataIndex: 'code', width: 150 },
          { title: 'Tên nhà cung cấp', dataIndex: 'name', width: 260 },
          { title: 'Người liên hệ', dataIndex: 'contactName', width: 180, render: (value) => value || '—' },
          { title: 'Điện thoại', dataIndex: 'phone', width: 150, render: (value) => value || '—' },
          { title: 'Email', dataIndex: 'email', width: 220, render: (value) => value || '—' },
          { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (value) => <Tag color={value === SupplierStatus.ACTIVE ? 'green' : 'default'}>{value === SupplierStatus.ACTIVE ? 'Đang giao dịch' : 'Ngừng giao dịch'}</Tag> },
          {
            title: '', key: 'actions', width: 100, fixed: 'right', align: 'right',
            render: (_, row) => (
              <PermissionGate permission="supplier.manage">
                <TableActions>
                  <TableActionButton label={`Sửa ${row.name}`} icon={<EditOutlined />} onClick={() => { setEditing(row); setFormOpen(true); }} />
                  <Tooltip title={row.status === SupplierStatus.ACTIVE ? 'Ngừng giao dịch' : 'Mở lại giao dịch'}>
                    <Popconfirm title="Xác nhận đổi trạng thái nhà cung cấp?" onConfirm={() => statusMutation.mutate({ id: row.id, data: { expectedVersion: row.version, status: row.status === SupplierStatus.ACTIVE ? SupplierStatus.INACTIVE : SupplierStatus.ACTIVE } })}>
                      <TableActionButton label="Đổi trạng thái" icon={row.status === SupplierStatus.ACTIVE ? <StopOutlined /> : <UndoOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                </TableActions>
              </PermissionGate>
            ),
          },
        ]}
        pagination={{ current: page, pageSize, total: query.data?.meta.total ?? 0, onChange: (next, size) => { setPage(next); setPageSize(size); }, showTotal: (total) => `${total} nhà cung cấp` }}
      />
      <SupplierFormDrawer open={formOpen} editing={editing} onClose={() => { setFormOpen(false); setEditing(undefined); }} />
    </div>
  );
}
