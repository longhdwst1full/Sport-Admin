import { RedoOutlined } from '@ant-design/icons';
import { Button, Tag, Tooltip, Typography } from 'antd';
import { AdminTable } from '@/foundation/table';
import type { AdminNotificationDto } from '@/generated/api/notifications/notifications.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import {
  notificationEventLabels,
  notificationStatusPresentation,
} from '../constants/notification.constants';

export function NotificationTable({
  rows,
  loading,
  page,
  pageSize,
  total,
  canRequeue,
  requeueingId,
  onPageChange,
  onRequeue,
}: {
  rows: AdminNotificationDto[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  canRequeue: boolean;
  requeueingId?: string;
  onPageChange: (page: number, pageSize: number) => void;
  onRequeue: (row: AdminNotificationDto) => void;
}) {
  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      emptyEntity="lần gửi thông báo"
      scroll={{ x: 1380 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (value) => `${value} lần gửi`,
        onChange: onPageChange,
      }}
      columns={[
        {
          title: 'Thời gian tạo',
          dataIndex: 'createdAt',
          fixed: 'left',
          width: 170,
          render: formatDateTime,
        },
        {
          title: 'Nghiệp vụ',
          dataIndex: 'eventType',
          width: 220,
          render: (value: string, row) => (
            <div className="min-w-0">
              <Typography.Text strong>{notificationEventLabels[value] ?? value}</Typography.Text>
              <div className="truncate text-xs text-slate-500" title={value}>
                {value}
              </div>
              <div className="text-xs text-slate-400">
                {row.aggregateType} #{row.aggregateId}
              </div>
            </div>
          ),
        },
        {
          title: 'Người nhận',
          dataIndex: 'recipientMasked',
          width: 200,
          render: (value?: string | null) => value ?? 'Chưa tạo email',
        },
        {
          title: 'Outbox',
          dataIndex: 'status',
          width: 130,
          render: (value: AdminNotificationDto['status']) => {
            const presentation = notificationStatusPresentation[value];
            return <Tag color={presentation.color}>{presentation.label}</Tag>;
          },
        },
        {
          title: 'Kết quả gửi',
          dataIndex: 'deliveryStatus',
          width: 150,
          render: (value?: string | null) => value ?? '—',
        },
        {
          title: 'Số lần thử',
          dataIndex: 'attempts',
          align: 'center',
          width: 110,
          render: (value: number, row) => `${row.deliveryAttempts ?? value}`,
        },
        {
          title: 'Lỗi gần nhất',
          dataIndex: 'lastError',
          width: 280,
          ellipsis: true,
          render: (value: string | null | undefined, row) => (
            <Tooltip title={value ?? row.errorCode ?? undefined}>
              <span className="text-xs text-slate-600">{value ?? row.errorCode ?? '—'}</span>
            </Tooltip>
          ),
        },
        {
          title: 'Đã gửi lúc',
          dataIndex: 'sentAt',
          width: 170,
          render: formatDateTime,
        },
        {
          title: '',
          key: 'actions',
          fixed: 'right',
          width: 64,
          render: (_, row) =>
            row.status === 'DEAD' && canRequeue ? (
              <Tooltip title="Đưa lại vào hàng đợi">
                <Button
                  type="text"
                  aria-label={`Gửi lại thông báo ${row.id}`}
                  icon={<RedoOutlined />}
                  loading={requeueingId === row.id}
                  onClick={() => onRequeue(row)}
                />
              </Tooltip>
            ) : null,
        },
      ]}
    />
  );
}
