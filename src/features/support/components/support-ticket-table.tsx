import { EyeOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { Typography, type TableColumnType } from 'antd';
import { AdminTable, col, TableActionButton } from '@/foundation/table';
import {
  SUPPORT_TICKET_PAGE_SIZE,
  supportTicketPriorityPresentation,
  supportTicketStatusPresentation,
} from '../constants/support.constants';
import { useBranchLabels } from '@/features/organization';
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
  const columns = useMemo<TableColumnType<SupportTicketSummary>[]>(
    () => [
      {
        key: 'ticketNo',
        title: 'Mã ticket',
        width: 170,
        fixed: 'left',
        render: (_, row) => <Typography.Text strong>{row.ticketNo}</Typography.Text>,
      },
      { key: 'subject', title: 'Tiêu đề', dataIndex: 'subject', ellipsis: true },
      col.text<SupportTicketSummary>('customerName', 'Khách hàng', { key: 'customer', width: 190 }),
      {
        key: 'branch',
        title: 'Chi nhánh',
        width: 160,
        render: (_, row) => branchLabel(row.branchId) ?? <span className="text-slate-400">—</span>,
      },
      col.status<SupportTicketSummary, SupportTicketSummary['status']>('status', 'Trạng thái', supportTicketStatusPresentation, { width: 140 }),
      col.status<SupportTicketSummary, SupportTicketSummary['priority']>('priority', 'Ưu tiên', supportTicketPriorityPresentation, { width: 130 }),
      {
        key: 'assignee',
        title: 'Người xử lý',
        width: 170,
        render: (_, row) => row.assigneeName ?? <span className="text-slate-400">Chưa giao</span>,
      },
      col.dateTime<SupportTicketSummary>('createdAt', 'Tạo lúc'),
      col.actions<SupportTicketSummary>(
        (row) => <TableActionButton label={`Xem ticket ${row.ticketNo}`} icon={<EyeOutlined />} onClick={() => onOpen(row.id)} />,
        { title: '', width: 72, align: undefined },
      ),
    ],
    [branchLabel, onOpen],
  );

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
