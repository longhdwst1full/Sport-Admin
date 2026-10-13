import { CloudServerOutlined } from '@ant-design/icons';
import { Alert, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { TableSkeleton } from '@/foundation/feedback/page-skeleton';
import { StatusTag, type StatusPresentation } from '@/foundation/management';
import { AdminTable, col } from '@/foundation/table';
import { useListJobHealth } from '@/generated/api/system/system';
import { formatDateTime } from '@/lib/format/datetime';
import type { JobHealthDto } from '@/generated/api/system/system.schemas';
import { useQueryState } from '../hooks/use-dashboard-report';
import { CardStateBody, DashboardCard } from './dashboard-card';

const healthPresentation: Record<JobHealthDto['health'], StatusPresentation> = {
  HEALTHY: { label: 'Bình thường', color: 'success' },
  DOWN: { label: 'Đang chết', color: 'danger' },
  DISABLED: { label: 'Đã tắt', color: 'neutral' },
  UNKNOWN: { label: 'Chưa rõ', color: 'warning' },
};

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
  col.status<JobHealthDto, JobHealthDto['health']>('health', 'Trạng thái', healthPresentation, {
    width: 130,
  }),
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
    render: (value: number) =>
      value > 0 ? <Typography.Text type="danger">{value}</Typography.Text> : '—',
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
  const state = useQueryState(query);
  const items = query.data?.items ?? [];
  const down = items.filter((item) => item.health === 'DOWN');
  const alertedButUnseen = down.some((item) => item.lastStaleAlertAt);
  // UX: chỉ kết luận "bình thường" khi đã có dữ liệu; đang tải hoặc lỗi mà hiện xanh là báo sai.
  const ready = !query.isPending && !query.isError;

  return (
    <DashboardCard
      icon={<CloudServerOutlined />}
      title="Tác vụ nền"
      description="Tự làm mới mỗi phút"
      extra={
        ready ? (
          <StatusTag
            status={down.length > 0 ? 'DOWN' : 'HEALTHY'}
            presentations={{
              ...healthPresentation,
              DOWN: { label: `${down.length} đang chết`, color: 'danger' },
              HEALTHY: { label: 'Tất cả bình thường', color: 'success' },
            }}
          />
        ) : undefined
      }
    >
      <CardStateBody
        state={state}
        isEmpty={false}
        emptyText=""
        skeleton={<TableSkeleton rows={4} />}
      >
        {alertedButUnseen && (
          <Alert
            className="!mb-4"
            type="error"
            showIcon
            message="Hệ thống đã tự cảnh báo nhưng không ai nhận được"
            description="Có job đã ghi cảnh báo vào nhật ký mà vẫn chết. Kênh gửi cảnh báo (Telegram) nhiều khả năng chưa cấu hình."
          />
        )}
        <AdminTable
          rowKey="name"
          dataSource={items}
          pagination={false}
          size="small"
          locale={{ emptyText: 'Chưa có tác vụ nền nào.' }}
          columns={JOB_HEALTH_COLUMNS}
        />
      </CardStateBody>
    </DashboardCard>
  );
}
