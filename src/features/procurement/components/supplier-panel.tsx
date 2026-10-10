import { EditOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { App, Popconfirm, Select, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { TableActionButton, col } from '@/foundation/table';
import {
  getListSuppliersQueryKey,
  useListSuppliers,
  useSetSupplierStatus,
} from '@/generated/api/procurement/procurement';
import { SupplierStatus, type SupplierDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { supplierStatusOptions, supplierStatusPresentation } from '../constants/procurement.constants';
import { useProcurementListState } from '../hooks/use-procurement-list-state';
import { ProcurementListPanel } from './procurement-list-panel';
import { SupplierFormDrawer } from './supplier-form-drawer';

const SUPPLIER_DATA_COLUMNS: ColumnsType<SupplierDto> = [
  col.text<SupplierDto>('code', 'Mã NCC', { width: 150 }),
  col.text<SupplierDto>('name', 'Tên nhà cung cấp', { width: 260 }),
  col.text<SupplierDto>('contactName', 'Người liên hệ', { width: 180 }),
  col.text<SupplierDto>('phone', 'Điện thoại', { width: 150 }),
  col.text<SupplierDto>('email', 'Email', { width: 220 }),
  col.status<SupplierDto, SupplierStatus>('status', 'Trạng thái', supplierStatusPresentation),
];

export function SupplierPanel() {
  const list = useProcurementListState<SupplierDto>();
  const { openEdit } = list;
  const status = list.url.getEnum('status', SupplierStatus);
  const query = useListSuppliers({ page: list.page, limit: list.pageSize, search: list.q, status });
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const canManage = useCan('supplier.manage');
  const { mutate: setSupplierStatus } = useSetSupplierStatus({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        void message.success('Đã cập nhật trạng thái nhà cung cấp.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không đổi được trạng thái nhà cung cấp.')),
    },
  });

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
              <TableActionButton label={`Sửa ${row.name}`} icon={<EditOutlined />} onClick={() => openEdit(row)} />
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
    [canManage, openEdit, toggleStatus],
  );

  return (
    <ProcurementListPanel<SupplierDto>
      query={query}
      rows={query.data?.items ?? []}
      columns={columns}
      emptyEntity="nhà cung cấp"
      pagination={list.pagination(query.data?.meta.total ?? 0, 'nhà cung cấp')}
      searchValue={list.searchValue}
      onSearch={list.onSearch}
      searchPlaceholder="Tìm mã hoặc tên nhà cung cấp"
      filters={<Select allowClear className="!w-48" value={status} onChange={(value?: string) => list.setFilter('status', value)} placeholder="Trạng thái" options={supplierStatusOptions} />}
      create={{ permission: 'supplier.manage', label: 'Thêm nhà cung cấp', onClick: list.openCreate }}
    >
      <SupplierFormDrawer open={list.formOpen} editing={list.editing} onClose={list.closeForm} />
    </ProcurementListPanel>
  );
}
