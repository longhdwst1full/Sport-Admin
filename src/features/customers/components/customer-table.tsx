import { Button, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { PermissionGate } from '@/core/auth/permissions';
import { CUSTOMER_PAGE_SIZE, customerKindPresentation, customerStatusPresentation } from '../constants/customer.constants';
import type { CustomerRowView } from '../model/customer.mapper';

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
      render: (_value: unknown, row: CustomerRowView) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="font-mono text-xs text-slate-500">{row.customerNo}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: 'Liên hệ',
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
        const view = customerStatusPresentation[row.status];
        return <Tag color={view?.color}>{view?.label ?? row.status}</Tag>;
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      width: 150,
      fixed: 'right' as const,
      align: 'right' as const,
      render: (_value: unknown, row: CustomerRowView) => (
        <PermissionGate permission="customer.manage">
          {/* Chặn onRow mở drawer chi tiết khi người dùng bấm vào nút trong ô. */}
          <Space size={0} onClick={(event) => event.stopPropagation()}>
            <Tooltip title="Sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                disabled={busyId === row.id}
                onClick={() => onEdit(row)}
              />
            </Tooltip>
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
                <Button
                  type="text"
                  disabled={busyId === row.id}
                  icon={row.status === 'ACTIVE' ? <StopOutlined /> : <UndoOutlined />}
                />
              </Popconfirm>
            </Tooltip>
            <Tooltip
              title={
                row.orderCount > 0
                  ? 'Khách đã có đơn nên chỉ ngừng được, không xoá'
                  : 'Xoá hồ sơ'
              }
            >
              <Popconfirm
                title="Xoá hồ sơ khách này?"
                description="Không khôi phục lại được."
                okButtonProps={{ danger: true }}
                disabled={row.orderCount > 0}
                onConfirm={() => onDelete(row)}
              >
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  // Khách đã mua hàng là một phần của lịch sử đơn; Backend cũng từ chối xoá.
                  disabled={row.orderCount > 0 || busyId === row.id}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        </PermissionGate>
      ),
    },
  ].filter((column) => colVisibility[column.key] !== false);

  return (
    <Table<CustomerRowView>
      rowKey="id"
      dataSource={rows}
      loading={loading}
      columns={columns}
      scroll={{ x: 1100 }}
      onRow={(row) => ({ onClick: () => onOpen(row.id), style: { cursor: 'pointer' } })}
      pagination={{
        current: page,
        pageSize: CUSTOMER_PAGE_SIZE,
        total,
        showSizeChanger: false,
        onChange: onPageChange,
        showTotal: (value) => `${value} khách hàng`,
      }}
    />
  );
}
