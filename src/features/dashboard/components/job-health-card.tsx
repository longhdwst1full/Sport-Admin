import { WarningOutlined } from '@ant-design/icons';
import { Alert, Card, Skeleton, Tag, Tooltip, Typography } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable } from '@/foundation/table';
import { useListJobHealth } from '@/generated/api/system/system';
import { formatDateTime } from '@/lib/format/datetime';
import type { JobHealthDto } from '@/generated/api/system/system.schemas';

const healthMeta = {
  HEALTHY: { label: 'Bình thường', color: 'green' },
  DOWN: { label: 'Đang chết', color: 'red' },
  DISABLED: { label: 'Đã tắt', color: 'default' },
  UNKNOWN: { label: 'Chưa rõ', color: 'orange' },
} as const;

const jobLabel: Record<string, string> = {
  'reservation-expiry': 'Nhả giữ chỗ hết hạn',
  'flash-sale-quota-expiry': 'Thu hồi suất flash sale',
  'order-maintenance': 'Bảo trì đơn hàng',
  'notification-dispatch': 'Gửi thông báo',
};


const JOB_HEALTH_COLUMNS: ColumnsType<JobHealthDto> = [
  {
    title: 'Tác vụ',
    dataIndex: 'name',
    render: (value: string) => (
      <Tooltip title={value}>
        <span>{jobLabel[value] ?? value}</span>
      </Tooltip>
    ),
  },
  {
    title: 'Trạng thái',
    dataIndex: 'health',
    width: 130,
    render: (value: JobHealthDto['health']) => (
      <Tag color={healthMeta[value].color}>{healthMeta[value].label}</Tag>
    ),
  },
  {
    title: 'Thành công gần nhất',
    width: 160,
    render: (_, row) => (
      <span>
        {formatDateTime(row.lastSuccessAt)}
        {typeof row.minutesSinceSuccess === 'number' && (
          <Typography.Text type="secondary"> ({row.minutesSinceSuccess}′)</Typography.Text>
        )}
      </span>
    ),
  },
  {
    title: 'Lỗi liên tiếp',
    dataIndex: 'consecutiveFailures',
    width: 110,
    align: 'right',
    render: (value: number) => value > 0
      ? <Typography.Text type="danger">{value}</Typography.Text>
      : '—',
  },
];

/**
 * Sức khoẻ các job nền, đặt ngay ở Bảng điều khiển.
 *
 * Hệ thống vốn đã tự phát hiện job chết và ghi vào `audit_logs`, nhưng khi kênh gửi cảnh báo chưa
 * cấu hình thì tín hiệu đó không tới ai: một job từng chết hơn 12 giờ với 28 lần tự cảnh báo mà
 * không ai biết. Thẻ này không thay thế cảnh báo chủ động, nó chỉ bảo đảm tín hiệu nằm ở màn đầu
 * tiên người dùng mở thay vì trong bảng audit không ai tra.
 */
export function JobHealthCard() {
  const query = useListJobHealth({ query: { refetchInterval: 60_000 } });
  const items = query.data?.items ?? [];
  const down = items.filter((item) => item.health === 'DOWN');
  const alertedButUnseen = items.filter((item) => item.health === 'DOWN' && item.lastStaleAlertAt);

  return (
    <Card
      variant="borderless"
      title="Tác vụ nền"
      extra={down.length > 0
        ? <Tag color="red" icon={<WarningOutlined />}>{down.length} đang chết</Tag>
        : <Tag color="green">Tất cả bình thường</Tag>}
    >
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      {query.isPending && <Skeleton active paragraph={{ rows: 4 }} />}

      {alertedButUnseen.length > 0 && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          message="Hệ thống đã tự cảnh báo nhưng không ai nhận được"
          description="Có job đã ghi cảnh báo vào nhật ký mà vẫn chết. Kênh gửi cảnh báo (Telegram) nhiều khả năng chưa cấu hình."
        />
      )}

      {!query.isPending && !query.isError && (
        <AdminTable
          rowKey="name"
          dataSource={items}
          pagination={false}
          size="small"
          locale={{ emptyText: 'Chưa có tác vụ nền nào.' }}
          columns={JOB_HEALTH_COLUMNS}
        />
      )}
    </Card>
  );
}
