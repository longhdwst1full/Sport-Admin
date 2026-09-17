import { useRef } from 'react';
import { App, Button, Card, Empty, Popconfirm, Skeleton, Table, Tag, Typography } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import {
  confirmAdminOrder,
  getListAdminOrdersQueryKey,
  useListAdminOrders,
} from '@/generated/api/orders/orders';
import {
  ListAdminOrdersStatusGroup,
  type AdminOrderSummaryDto,
} from '@/generated/api/orders/models';
import { getApiErrorMessage } from '@/lib/api/error';

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/**
 * Đơn đang chờ Admin xác nhận, duyệt ngay tại Bảng điều khiển.
 *
 * Đây là việc đầu ca: kho chỉ bắt đầu xử lý sau khi đơn được xác nhận, nên để nó nằm ở màn đầu
 * tiên người dùng mở, thay vì bắt họ sang màn Đơn hàng rồi lọc trạng thái.
 */
export function PendingOrdersCard() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // Khoá chống trùng theo từng đơn: duyệt lại cùng một đơn phải trả kết quả cũ chứ không
  // tạo thêm một lần chuyển trạng thái nữa. Giữ theo id nên mỗi đơn có khoá riêng.
  const idempotencyKeys = useRef<Record<string, string>>({});

  const query = useListAdminOrders({
    statusGroup: ListAdminOrdersStatusGroup.PENDING_CONFIRMATION,
    limit: 10,
  });

  // Dùng thẳng hàm SDK thay vì hook sinh sẵn: tuỳ chọn `request` của hook là cấp hook, không
  // đặt được header riêng cho từng đơn, mà khoá chống trùng thì bắt buộc phải khác nhau.
  const confirmOrder = useMutation({
    mutationFn: ({ id, expectedVersion }: { id: string; expectedVersion: number }) => {
      idempotencyKeys.current[id] ??= crypto.randomUUID();
      return confirmAdminOrder(
        id,
        { expectedVersion },
        { headers: { 'Idempotency-Key': idempotencyKeys.current[id] } },
      );
    },
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      void message.success(`Đã xác nhận đơn ${order.orderNo}.`);
    },
    onError: (error) => {
      void message.error(
        getApiErrorMessage(error, 'Không xác nhận được đơn. Tải lại rồi thử lại.'),
      );
    },
  });

  const rows = query.data?.items ?? [];

  return (
    <Card
      className="!rounded-2xl !border-slate-100 !shadow-soft"
      title="Đơn chờ xác nhận"
      extra={
        rows.length > 0 ? (
          <Tag color="orange">{query.data?.total ?? rows.length} đơn</Tag>
        ) : undefined
      }
    >
      {query.isError ? (
        <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton active />
      ) : rows.length === 0 ? (
        <Empty description="Không còn đơn nào chờ xác nhận" />
      ) : (
        <Table<AdminOrderSummaryDto>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={rows}
          scroll={{ x: 760 }}
          columns={[
            {
              title: 'Mã đơn',
              dataIndex: 'orderNo',
              width: 160,
              render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
            },
            {
              title: 'Khách hàng',
              key: 'recipient',
              width: 200,
              ellipsis: true,
              render: (_: unknown, row) => (
                <div className="min-w-0">
                  <div className="truncate">{row.recipient.name}</div>
                  <div className="text-xs text-slate-500">{row.recipient.phone}</div>
                </div>
              ),
            },
            {
              title: 'Tổng tiền',
              dataIndex: 'grandTotal',
              width: 150,
              align: 'right',
              render: (value: string) => money.format(Number(value)),
            },
            {
              title: 'Đặt lúc',
              dataIndex: 'placedAt',
              width: 150,
              render: (value: string) =>
                new Intl.DateTimeFormat('vi-VN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(value)),
            },
            {
              title: 'Duyệt',
              key: 'actions',
              width: 120,
              align: 'right',
              fixed: 'right',
              render: (_: unknown, row) => (
                <PermissionGate permission="order.manage">
                  <Popconfirm
                    title="Xác nhận đơn này?"
                    description="Kho sẽ bắt đầu lấy hàng sau khi xác nhận."
                    okText="Xác nhận"
                    cancelText="Để sau"
                    onConfirm={() =>
                      confirmOrder.mutate({ id: row.id, expectedVersion: row.version })
                    }
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      loading={confirmOrder.isPending && confirmOrder.variables?.id === row.id}
                    >
                      Duyệt
                    </Button>
                  </Popconfirm>
                </PermissionGate>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}
