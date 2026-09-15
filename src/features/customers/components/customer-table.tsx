import { Table, Tag } from 'antd';
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
}: {
  rows: CustomerRowView[];
  loading: boolean;
  page: number;
  total: number;
  colVisibility: Record<string, boolean>;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
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
  ].filter((column) => colVisibility[column.key] !== false);

  return (
    <Table<CustomerRowView>
      rowKey="id"
      dataSource={rows}
      loading={loading}
      columns={columns}
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
