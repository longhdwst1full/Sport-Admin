import { Avatar, Popconfirm, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { useCan } from '@/core/auth/permissions';
import type { StatusPresentation } from '@/foundation/management';
import { CUSTOMER_PAGE_SIZE, customerKindPresentation } from '../constants/customer.constants';
import type { CustomerRowView } from '../model/customer.mapper';
import { getCustomerDeleteBlockReason } from '../model/customer.policy';

const CUSTOMER_TABLE_STATUS: Record<'ACTIVE' | 'INACTIVE', StatusPresentation> = {
  ACTIVE: { label: 'Hoạt động', color: 'green', icon: <CheckCircleOutlined className="text-emerald-600" /> },
  INACTIVE: { label: 'Ngừng hoạt động', color: 'default', icon: <StopOutlined className="text-slate-500" /> },
};

interface CustomerColumnHandlers {
  onEdit: (row: CustomerRowView) => void;
  onToggleStatus: (row: CustomerRowView) => void;
  onDelete: (row: CustomerRowView) => void;
  busyId?: string;
}

function useCustomerColumns({ onEdit, onToggleStatus, onDelete, busyId }: CustomerColumnHandlers) {
  const canManage = useCan('customer.manage');
  return useMemo<ColumnsType<CustomerRowView>>(
    () => [
      {
        key: 'customer',
        title: 'Khách hàng',
        width: 260,
        render: (_value: unknown, row) => (
          <div className="flex items-center gap-3">
            <Avatar src={row.avatarUrl} size={36}>
              {row.name.trim().charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div className="font-semibold text-slate-800">{row.name}</div>
              <div className="font-mono text-xs text-slate-500">{row.customerNo}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        title: 'Liên hệ',
        width: 250,
        render: (_value: unknown, row) => (
          <div className="text-xs">
            <div className="text-slate-700">{row.phone}</div>
            <div className="text-slate-400">{row.email}</div>
          </div>
        ),
      },
      {
        key: 'kind',
        title: 'Loại',
        width: 120,
        render: (_value: unknown, row) => {
          const view = customerKindPresentation[row.kind];
          return <Tag color={view?.color}>{view?.label ?? row.kind}</Tag>;
        },
      },
      col.number<CustomerRowView>('orderCount', 'Số đơn', { width: 90, align: 'center' }),
      {
        key: 'lifetimeValue',
        title: 'Đã chi tiêu',
        width: 150,
        align: 'right',
        render: (_value: unknown, row) => (
          <span className="font-semibold text-slate-800">{row.lifetimeValueLabel}</span>
        ),
      },
      col.text<CustomerRowView>('lastOrderLabel', 'Mua gần nhất', { key: 'lastOrder', width: 130 }),
      col.status<CustomerRowView, 'ACTIVE' | 'INACTIVE'>('status', 'Trạng thái', CUSTOMER_TABLE_STATUS, {
        width: 140,
      }),
      col.actions<CustomerRowView>(
        (row) => {
          // PERMISSION: chỉ ẩn nút; backend vẫn chặn khi thiếu customer.manage.
          if (!canManage) return null;
          const deleteBlockReason = getCustomerDeleteBlockReason(row);
          return (
            <>
              <TableActionButton
                label={`Sửa khách hàng ${row.name}`}
                icon={<EditOutlined />}
                disabled={busyId === row.id}
                onClick={() => onEdit(row)}
              />
              <Tooltip title={row.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Mở lại'}>
                <Popconfirm
                  title={row.status === 'ACTIVE' ? 'Ngừng hoạt động khách này?' : 'Mở lại hồ sơ khách này?'}
                  description="Lịch sử mua hàng vẫn được giữ nguyên."
                  onConfirm={() => onToggleStatus(row)}
                >
                  <TableActionButton
                    label={row.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Mở lại'}
                    disabled={busyId === row.id}
                    icon={row.status === 'ACTIVE' ? <StopOutlined /> : <UndoOutlined />}
                  />
                </Popconfirm>
              </Tooltip>
              <Tooltip title={deleteBlockReason ?? 'Xoá hồ sơ'}>
                <Popconfirm
                  title="Xoá hồ sơ khách này?"
                  description="Không khôi phục lại được."
                  okButtonProps={{ danger: true }}
                  disabled={Boolean(deleteBlockReason)}
                  onConfirm={() => onDelete(row)}
                >
                  <TableActionButton
                    label={deleteBlockReason ?? `Xóa khách hàng ${row.name}`}
                    danger
                    icon={<DeleteOutlined />}
                    // Khách đã mua hàng là một phần của lịch sử đơn; Backend cũng từ chối xoá.
                    disabled={Boolean(deleteBlockReason) || busyId === row.id}
                  />
                </Popconfirm>
              </Tooltip>
            </>
          );
        },
        {
          title: '',
          width: 130,
          // Chặn onRow mở drawer chi tiết khi người dùng bấm vào nút trong ô.
          onCell: () => ({ onClick: (event) => event.stopPropagation() }),
        },
      ),
    ],
    [busyId, canManage, onDelete, onEdit, onToggleStatus],
  );
}

export function CustomerTable({
  rows,
  loading,
  page,
  total,
  applyColumns,
  onPageChange,
  onOpen,
  onEdit,
  onToggleStatus,
  onDelete,
  busyId,
}: {
  rows: CustomerRowView[];
  loading: boolean;
  page: number;
  total: number;
  /** Lọc cột theo cài đặt ẩn/hiện (`useColumnVisibility().apply`). */
  applyColumns: (columns: ColumnsType<CustomerRowView>) => ColumnsType<CustomerRowView>;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
  onEdit: (row: CustomerRowView) => void;
  onToggleStatus: (row: CustomerRowView) => void;
  onDelete: (row: CustomerRowView) => void;
  /** Dòng đang chờ kết quả một lệnh ghi; khoá nút để không bấm chồng. */
  busyId?: string;
}) {
  const columns = useCustomerColumns({ onEdit, onToggleStatus, onDelete, busyId });

  return (
    <AdminTable<CustomerRowView>
      rowKey="id"
      dataSource={rows}
      loading={loading}
      columns={applyColumns(columns)}
      tableLayout="fixed"
      scroll={{ x: 1220 }}
      onRow={(row) => ({ onClick: () => onOpen(row.id), style: { cursor: 'pointer' } })}
      pagination={{
        current: page,
        pageSize: CUSTOMER_PAGE_SIZE,
        total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        onChange: onPageChange,
        showTotal: (value) => `${value} khách hàng`,
      }}
    />
  );
}
