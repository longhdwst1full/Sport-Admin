import { EyeOutlined } from '@ant-design/icons';
import { Typography, type TableColumnType } from 'antd';
import { StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton } from '@/foundation/table';
import { formatDateTime } from '@/lib/format/datetime';
import {
  SUPPORT_TICKET_PAGE_SIZE,
  supportTicketPriorityPresentation,
  supportTicketStatusPresentation,
} from '../constants/support.constants';
import { useBranchLabels } from '../hooks/use-branch-labels';
import type { SupportTicketSummary } from '../model/support-ticket.types';

export function SupportTicketTable({
  rows,
  loading,
  page,
  total,
  emptyText,
  onPageChange,
  onOpen,
}: {
  rows: SupportTicketSummary[];
  loading: boolean;
  page: number;
  total: number;
  emptyText: string;
  onPageChange: (page: number) => void;
  onOpen: (ticketId: string) => void;
}) {
  const branchLabel = useBranchLabels();
  const columns: TableColumnType<SupportTicketSummary>[] = [
    {
      key: 'ticketNo',
      title: 'Mã ticket',
      width: 170,
      fixed: 'left',
      render: (_, row) => <Typography.Text strong>{row.ticketNo}</Typography.Text>,
    },
    { key: 'subject', title: 'Tiêu đề', dataIndex: 'subject', ellipsis: true },
    {
      key: 'customer',
      title: 'Khách hàng',
      width: 190,
      dataIndex: 'customerName',
    },
    {
      key: 'branch',
      title: 'Chi nhánh',
      width: 160,
      render: (_, row) => branchLabel(row.branchId) ?? <span className="text-slate-400">—</span>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 140,
      render: (_, row) => <StatusTag status={row.status} presentations={supportTicketStatusPresentation} />,
    },
    {
      key: 'priority',
      title: 'Ưu tiên',
      width: 130,
      render: (_, row) => <StatusTag status={row.priority} presentations={supportTicketPriorityPresentation} />,
    },
    {
      key: 'assignee',
      title: 'Người xử lý',
      width: 170,
      render: (_, row) => row.assigneeName ?? <span className="text-slate-400">Chưa giao</span>,
    },
    { key: 'createdAt', title: 'Tạo lúc', width: 160, render: (_, row) => formatDateTime(row.createdAt) },
    {
      key: 'action',
      title: '',
      width: 72,
      fixed: 'right',
      render: (_, row) => (
        <TableActionButton label={`Xem ticket ${row.ticketNo}`} icon={<EyeOutlined />} onClick={() => onOpen(row.id)} />
      ),
    },
  ];

  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
      scroll={{ x: 1300 }}
      locale={{ emptyText }}
      onRow={(row) => ({ onDoubleClick: () => onOpen(row.id) })}
      pagination={{
        current: page,
        pageSize: SUPPORT_TICKET_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} ticket`,
        onChange: onPageChange,
      }}
      columns={columns}
    />
  );
}
