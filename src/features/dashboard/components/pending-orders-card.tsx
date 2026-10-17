import { useMemo, useRef } from 'react';
import { App, Popconfirm, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col, TableActionButton } from '@/foundation/table';
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/core/auth/permissions';
import { TableSkeleton } from '@/foundation/feedback/page-skeleton';
import {
  confirmAdminOrder,
  getListAdminOrdersQueryKey,
  useListAdminOrders,
} from '@/generated/api/orders/orders';
import { OrderStatusGroup, type OrderSummaryDto } from '@/generated/api/orders/orders.schemas';
import { getGetAdminReportOverviewQueryKey } from '@/generated/api/reporting/reporting';
import { getApiErrorMessage } from '@/lib/api/error';
import { ApiError } from '@/lib/api/fetcher';
import { useQueryState } from '../hooks/use-dashboard-report';
import { CardStateBody, DashboardCard } from './dashboard-card';

const PENDING_ORDER_LIMIT = 10;

const PENDING_ORDER_COLUMNS: ColumnsType<OrderSummaryDto> = [
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
  col.money<OrderSummaryDto>('grandTotal', 'Tổng tiền', { width: 150 }),
  col.dateTime<OrderSummaryDto>('placedAt', 'Đặt lúc', { width: 150 }),
];

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
    statusGroup: OrderStatusGroup.PENDING_CONFIRMATION,
    limit: PENDING_ORDER_LIMIT,
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
      // Thẻ KPI và biểu đồ trạng thái đọc báo cáo tổng quan: không làm mới thì lệch với danh sách tới hết staleTime.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminReportOverviewQueryKey() }),
      ]);
      void message.success(`Đã xác nhận đơn ${order.orderNo}.`);
    },
    onError: (error, { id }) => {
      // UX: 4xx là kết luận cuối của server (sai version, sai trạng thái…): bỏ khoá để lần bấm sau
      // (với version mới) là một yêu cầu mới. Mất mạng/5xx giữ khoá để bấm lại vẫn idempotent.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        delete idempotencyKeys.current[id];
      }
      // CONCURRENCY: lỗi thường do đơn đã đổi version (người khác vừa duyệt/huỷ); tải lại danh sách để
      // lần bấm sau gửi version mới thay vì lặp lại cùng một lỗi.
      void queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      void message.error(
        getApiErrorMessage(error, 'Không xác nhận được đơn. Tải lại rồi thử lại.'),
      );
    },
  });

  const state = useQueryState(query);
  const rows = query.data?.items ?? [];

  const { mutate: confirm, isPending: confirming, variables: confirmingVars } = confirmOrder;
  const confirmingId = confirming ? confirmingVars?.id : undefined;
  const columns = useMemo<ColumnsType<OrderSummaryDto>>(
    () => [
      ...PENDING_ORDER_COLUMNS,
      col.actions<OrderSummaryDto>(
        (row) => (
          <PermissionGate permission="order.manage">
            <Popconfirm
              title="Xác nhận đơn này?"
              description="Kho sẽ bắt đầu lấy hàng sau khi xác nhận."
              okText="Xác nhận"
              cancelText="Để sau"
              onConfirm={() => confirm({ id: row.id, expectedVersion: row.version })}
            >
              <TableActionButton
                label={`Duyệt đơn ${row.orderNo}`}
                icon={<CheckOutlined />}
                loading={confirmingId === row.id}
              />
            </Popconfirm>
          </PermissionGate>
        ),
        { title: '', width: 120 },
      ),
    ],
    [confirm, confirmingId],
  );

  return (
    <DashboardCard
      tone="amber"
      icon={<ClockCircleOutlined />}
      title="Đơn chờ xác nhận"
      description={`Duyệt đơn để kho có thể bắt đầu lấy hàng · hiện tối đa ${PENDING_ORDER_LIMIT} đơn`}
      extra={
        rows.length > 0 ? (
          <Tag className="!m-0 !rounded-full !border-amber-200 !bg-amber-100 !px-3 !py-0.5 !font-semibold !text-amber-800">
            {query.data?.total ?? rows.length} đơn cần xử lý
          </Tag>
        ) : undefined
      }
    >
      <CardStateBody
        state={state}
        isEmpty={rows.length === 0}
        emptyText="Không còn đơn nào chờ xác nhận"
        skeleton={<TableSkeleton rows={3} />}
      >
        <AdminTable<OrderSummaryDto>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={rows}
          scroll={{ x: 760 }}
          columns={columns}
        />
      </CardStateBody>
    </DashboardCard>
  );
}
