import { Avatar, Popconfirm, Tag, Tooltip } from 'antd';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { PermissionGate } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management';
import { CUSTOMER_PAGE_SIZE, customerKindPresentation } from '../constants/customer.constants';
import type { CustomerRowView } from '../model/customer.mapper';
import { getCustomerDeleteBlockReason } from '../model/customer.policy';

export function CustomerTable({
  rows,
  loading,
  page,
  total,
  colVisibility,
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
  colVisibility: Record<string, boolean>;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
  onEdit: (row: CustomerRowView) => void;
  onToggleStatus: (row: CustomerRowView) => void;
  onDelete: (row: CustomerRowView) => void;
  /** Dòng đang chờ kết quả một lệnh ghi; khoá nút để không bấm chồng. */
  busyId?: string;
}) {
  const columns = [
    {
      key: 'customer',
      title: 'Khách hàng',
      width: 260,
      render: (_value: unknown, row: CustomerRowView) => (
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
      render: (_value: unknown, row: CustomerRowView) => (
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
      render: (_value: unknown, row: CustomerRowView) => {
        const view = customerKindPresentation[row.kind];
        return <Tag color={view?.color}>{view?.label ?? row.kind}</Tag>;
      },
    },
    {
      key: 'orderCount',
      title: 'Số đơn',
      width: 90,
      align: 'center' as const,
      render: (_value: unknown, row: CustomerRowView) => row.orderCount,
    },
    {
      key: 'lifetimeValue',
      title: 'Đã chi tiêu',
      width: 150,
      align: 'right' as const,
      render: (_value: unknown, row: CustomerRowView) => (
        <span className="font-semibold text-slate-800">{row.lifetimeValueLabel}</span>
      ),
    },
    {
      key: 'lastOrder',
      title: 'Mua gần nhất',
      width: 130,
      render: (_value: unknown, row: CustomerRowView) => row.lastOrderLabel,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 140,
      render: (_value: unknown, row: CustomerRowView) => {
        return (
          <StatusTag
            status={row.status}
            presentations={{
              ACTIVE: {
                label: 'Hoạt động',
                color: 'green',
                icon: <CheckCircleOutlined className="text-emerald-600" />,
              },
              INACTIVE: {
                label: 'Ngừng hoạt động',
                color: 'default',
                icon: <StopOutlined className="text-slate-500" />,
              },
            }}
          />
        );
      },
    },
    {
      key: 'actions',
      title: '',
      width: 130,
      fixed: 'right' as const,
      align: 'right' as const,
      render: (_value: unknown, row: CustomerRowView) => {
        const deleteBlockReason = getCustomerDeleteBlockReason(row);
        return (
          <PermissionGate permission="customer.manage">
          {/* Chặn onRow mở drawer chi tiết khi người dùng bấm vào nút trong ô. */}
          <div onClick={(event) => event.stopPropagation()}>
          <TableActions>
              <TableActionButton
                label={`Sửa khách hàng ${row.name}`}
                icon={<EditOutlined />}
                disabled={busyId === row.id}
                onClick={() => onEdit(row)}
              />
            <Tooltip title={row.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Mở lại'}>
              <Popconfirm
                title={
                  row.status === 'ACTIVE'
                    ? 'Ngừng hoạt động khách này?'
                    : 'Mở lại hồ sơ khách này?'
                }
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
          </TableActions>
          </div>
          </PermissionGate>
        );
      },
    },
  ].filter((column) => colVisibility[column.key] !== false);

  return (
    <AdminTable<CustomerRowView>
        fillHeight
      rowKey="id"
      dataSource={rows}
      loading={loading}
      columns={columns}
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
