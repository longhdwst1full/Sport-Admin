import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  InboxOutlined,
  PrinterOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Drawer,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import { useCan } from '@/core/auth/permissions';
import {
  cancelAdminOrder,
  completeAdminOrder,
  confirmAdminOrder,
  getGetAdminOrderQueryKey,
  getListAdminOrdersQueryKey,
  useGetAdminOrder,
} from '@/generated/api/orders/orders';
import { getApiErrorMessage } from '@/lib/api/error';
import { CurrencyAmount } from '@/foundation/typography/currency-amount';
import { StatusTag } from '@/foundation/management';
import {
  orderStatusPresentation,
  paymentStatusPresentation,
} from '../constants/order.constants';
import { OrderActionConfirmation, type OrderAction } from './order-action-confirmation';
import { FulfillmentWorkflowPanel } from './fulfillment-workflow-panel';

interface OrderDetailDrawerProps {
  orderId?: string;
  onClose: () => void;
}

const ORDER_STEPS = [
  { title: 'Đặt hàng', key: 'PENDING_CONFIRMATION' },
  { title: 'Xác nhận', key: 'CONFIRMED' },
  { title: 'Xử lý & Đóng gói', key: 'PACKED' },
  { title: 'Đang vận chuyển', key: 'SHIPPED' },
  { title: 'Hoàn thành', key: 'DELIVERED' },
];

function getOrderCurrentStep(status: string): number {
  switch (status) {
    case 'PENDING_CONFIRMATION':
      return 0;
    case 'CONFIRMED':
      return 1;
    case 'PICKING':
    case 'PACKED':
      return 2;
    case 'SHIPPED':
      return 3;
    case 'DELIVERED':
    case 'COMPLETED':
      return 4;
    case 'CANCELLED':
      return -1;
    default:
      return 0;
  }
}

export function OrderDetailDrawer({ orderId, onClose }: OrderDetailDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('order.manage');
  const [action, setAction] = useState<OrderAction>();
  const [reason, setReason] = useState('');
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const detail = useGetAdminOrder(orderId ?? '', {
    query: { enabled: Boolean(orderId) },
  });
  const order = detail.data;

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!order || !action) throw new Error('Thiếu thông tin thao tác đơn hàng');
      const normalizedReason = reason.trim();
      const signature = `${action}:${order.id}:${order.version}:${normalizedReason}`;
      if (idempotencyRef.current?.signature !== signature) {
        idempotencyRef.current = { signature, key: crypto.randomUUID() };
      }
      const request = { headers: { 'Idempotency-Key': idempotencyRef.current.key } };
      if (action === 'cancel') {
        return cancelAdminOrder(order.id, { expectedVersion: order.version, reason: normalizedReason }, request);
      }
      if (action === 'confirm') {
        return confirmAdminOrder(order.id, { expectedVersion: order.version, note: normalizedReason }, request);
      }
      return completeAdminOrder(order.id, { expectedVersion: order.version, reason: normalizedReason }, request);
    },
    retry: false,
    onSuccess: async (updated) => {
      queryClient.setQueryData(getGetAdminOrderQueryKey(updated.id), updated);
      await queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      idempotencyRef.current = undefined;
      setAction(undefined);
      setReason('');
      void message.success(
        action === 'cancel'
          ? 'Đã hủy đơn hàng'
          : action === 'confirm'
            ? 'Đã xác nhận đơn hàng thành công'
            : 'Đã hoàn tất đơn hàng thành công',
      );
    },
  });

  const canCancel =
    canManage &&
    order?.status === 'PENDING_CONFIRMATION' &&
    order.paymentStatus === 'PENDING' &&
    order.fulfillmentStatus === 'PENDING';
  const canConfirm =
    canManage &&
    order?.status === 'PENDING_CONFIRMATION' &&
    (order.paymentMethod === 'COD' || order.paymentStatus === 'SUCCESS') &&
    order.fulfillmentStatus === 'PENDING';
  const canComplete =
    canManage &&
    order?.status === 'DELIVERED' &&
    order.paymentStatus === 'SUCCESS' &&
    order.fulfillmentStatus === 'DELIVERED';

  const closeAction = () => {
    if (actionMutation.isPending) return;
    actionMutation.reset();
    idempotencyRef.current = undefined;
    setAction(undefined);
    setReason('');
  };

  const closeDrawer = () => {
    if (actionMutation.isPending) return;
    closeAction();
    onClose();
  };

  const copyOrderNo = () => {
    if (order?.orderNo) {
      navigator.clipboard.writeText(order.orderNo);
      message.success(`Đã sao chép mã: ${order.orderNo}`);
    }
  };

  const currentStep = order ? getOrderCurrentStep(order.status) : 0;
  const isCancelled = order?.status === 'CANCELLED';

  return (
    <Drawer
      width={780}
      open={Boolean(orderId)}
      title={null}
      onClose={closeDrawer}
      destroyOnClose
      styles={{ body: { padding: 0 } }}
    >
      {detail.isLoading && (
        <div className="flex min-h-80 items-center justify-center">
          <Spin size="large" />
        </div>
      )}

      {detail.isError && (
        <div className="p-6">
          <Alert
            type="error"
            showIcon
            message="Không tải được chi tiết đơn hàng"
            description={getApiErrorMessage(detail.error, 'Vui lòng thử lại.')}
            action={<Button onClick={() => void detail.refetch()}>Thử lại</Button>}
          />
        </div>
      )}

      {order && (
        <div className="flex flex-col min-h-full bg-slate-50/50">
          {/* Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 pt-7 pb-6 text-white">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/15 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                    Đơn hàng chi tiết
                  </span>
                  <Tooltip title="Sao chép mã đơn">
                    <button
                      type="button"
                      aria-label="Sao chép mã đơn"
                      onClick={copyOrderNo}
                      className="text-white/60 hover:text-white cursor-pointer"
                    >
                      <CopyOutlined className="text-xs" />
                    </button>
                  </Tooltip>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mt-1 mb-0 font-mono">
                  {order.orderNo}
                </h2>
                <div className="mt-1 text-xs text-slate-300">
                  Thời gian đặt: {new Date(order.placedAt).toLocaleString('vi-VN')}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusTag
                  status={order.status}
                  presentations={orderStatusPresentation as Record<string, { label: string; color: string }>}
                />
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={() => window.print()}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
                >
                  In phiếu
                </Button>
              </div>
            </div>

            {/* Order Progress Tracker */}
            <div className="mt-6 rounded-xl bg-white/10 backdrop-blur-md p-4 border border-white/10">
              {isCancelled ? (
                <div className="flex items-center gap-2 text-rose-300 text-sm font-medium">
                  <CloseCircleOutlined className="text-base" />
                  <span>Đơn hàng đã hủy</span>
                </div>
              ) : (
                <Steps
                  size="small"
                  current={currentStep}
                  items={ORDER_STEPS.map((s, idx) => ({
                    title: <span className="text-xs text-white/90">{s.title}</span>,
                    status: idx < currentStep ? 'finish' : idx === currentStep ? 'process' : 'wait',
                  }))}
                  className="order-steps-custom"
                />
              )}
            </div>
          </div>

          {/* Drawer Body Sections */}
          <div className="flex-1 p-6 space-y-5">
            {/* Customer & Shipping Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                size="small"
                title={
                  <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                    <UserOutlined className="text-emerald-600" />
                    Người nhận hàng
                  </div>
                }
                className="rounded-xl border-slate-200 shadow-xs"
              >
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-slate-800 text-sm">
                    {order.recipient.name}
                  </div>
                  <div className="font-mono text-slate-600">{order.recipient.phone}</div>
                  <div className="text-slate-500">{order.recipient.email || 'Không có email'}</div>
                  <div className="mt-2 text-slate-700 leading-relaxed border-t border-slate-100 pt-2 flex items-start gap-1.5">
                    <EnvironmentOutlined className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>
                      {[
                        order.recipient.addressLine,
                        order.recipient.ward,
                        order.recipient.district,
                        order.recipient.province,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                </div>
              </Card>

              <Card
                size="small"
                title={
                  <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                    <CreditCardOutlined className="text-emerald-600" />
                    Thanh toán & Chi nhánh
                  </div>
                }
                className="rounded-xl border-slate-200 shadow-xs"
              >
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Trạng thái thanh toán:</span>
                    <Tag
                      color={paymentStatusPresentation[order.paymentStatus]?.color ?? 'default'}
                      className="m-0 font-medium text-[11px]"
                    >
                      {paymentStatusPresentation[order.paymentStatus]?.label ?? order.paymentStatus}
                    </Tag>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phương thức:</span>
                    <span className="font-medium text-slate-700">
                      {order.paymentMethod === 'COD' ? 'Tiền mặt khi nhận (COD)' : 'Chuyển khoản trực tuyến'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-slate-500">Chi nhánh xuất:</span>
                    <span className="font-medium text-slate-800">{order.branchName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kho thực xuất:</span>
                    <span className="text-slate-600">{order.warehouseName}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Products Table */}
            <Card
              size="small"
              title={
                <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  <ShoppingOutlined className="text-emerald-600" />
                  Danh sách sản phẩm ({order.items.length})
                </div>
              }
              className="rounded-xl border-slate-200 shadow-xs"
            >
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={order.items}
                columns={[
                  {
                    title: 'Sản phẩm',
                    key: 'product',
                    render: (_, item) => (
                      <div className="flex items-center gap-3">
                        <Avatar
                          shape="square"
                          size={46}
                          src={item.imageUrl ?? undefined}
                          className="rounded-lg bg-slate-100 flex-shrink-0 text-slate-600 font-bold border border-slate-200"
                        >
                          {item.productName[0]}
                        </Avatar>
                        <div className="min-w-0">
                          <span className="font-medium text-slate-800 text-xs block truncate">
                            {item.productName}
                          </span>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.variantName} · {item.sku}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'SL',
                    dataIndex: 'quantity',
                    width: 60,
                    align: 'center' as const,
                    render: (q: number) => (
                      <span className="font-semibold text-slate-700">{q}</span>
                    ),
                  },
                  {
                    title: 'Đơn giá',
                    dataIndex: 'unitPrice',
                    width: 120,
                    align: 'right' as const,
                    render: (val: number | string) => <CurrencyAmount amount={val} />,
                  },
                  {
                    title: 'Thành tiền',
                    dataIndex: 'lineTotal',
                    width: 130,
                    align: 'right' as const,
                    render: (val: number | string) => (
                      <span className="font-semibold text-slate-800">
                        <CurrencyAmount amount={val} />
                      </span>
                    ),
                  },
                ]}
              />
            </Card>

            {/* Financial Breakdown */}
            <div className="ml-auto w-full max-w-sm rounded-xl bg-white p-4 border border-slate-200 shadow-xs space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính tiền hàng</span>
                <CurrencyAmount amount={order.subtotal} />
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <CurrencyAmount amount={order.shippingTotal} />
              </div>
              <div className="border-t border-dashed border-slate-200 pt-2.5 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Tổng thanh toán</span>
                <span className="text-base font-extrabold text-emerald-600">
                  <CurrencyAmount amount={order.grandTotal} />
                </span>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                Đã bao gồm thuế GTGT (VAT)
              </div>
            </div>

            {/* Status History Timeline */}
            {order.statusHistory?.length > 0 && (
              <Card
                size="small"
                title={
                  <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                    <HistoryOutlined className="text-emerald-600" />
                    Nhật ký xử lý đơn hàng
                  </div>
                }
                className="rounded-xl border-slate-200 shadow-xs"
              >
                <Timeline
                  className="mt-2 text-xs"
                  items={order.statusHistory.map((history) => ({
                    color: 'green',
                    children: (
                      <div>
                        <span className="font-semibold text-slate-800">
                          {orderStatusPresentation[history.toStatus]?.label ?? history.toStatus}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          {new Date(history.createdAt).toLocaleString('vi-VN')} · {history.actorType}
                        </div>
                        {history.reason && (
                          <div className="mt-1 text-slate-600 bg-slate-50 p-2 rounded text-[11px] border border-slate-100">
                            Ghi chú: {history.reason}
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              </Card>
            )}

            {/* Fulfillment workflow panel */}
            <FulfillmentWorkflowPanel orderId={order.id} />
          </div>

          {/* Sticky Bottom Action Footer */}
          {canManage && (
            <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 shadow-lg">
              <Button
                danger
                disabled={!canCancel}
                onClick={() => setAction('cancel')}
                className="font-medium"
              >
                Hủy đơn
              </Button>
              <Space>
                <Button onClick={closeDrawer}>Đóng</Button>
                <Button
                  disabled={!canConfirm}
                  onClick={() => setAction('confirm')}
                  className="font-medium"
                >
                  Xác nhận đơn
                </Button>
                <Button
                  type="primary"
                  disabled={!canComplete}
                  onClick={() => setAction('complete')}
                  className="font-medium bg-emerald-600 hover:bg-emerald-500"
                >
                  Hoàn tất đơn
                </Button>
              </Space>
            </div>
          )}
        </div>
      )}

      <OrderActionConfirmation
        action={action}
        reason={reason}
        pending={actionMutation.isPending}
        errorMessage={
          actionMutation.isError
            ? getApiErrorMessage(actionMutation.error, 'Không thực hiện được thao tác đơn hàng.')
            : undefined
        }
        onReasonChange={setReason}
        onCancel={closeAction}
        onConfirm={() => actionMutation.mutate()}
      />
    </Drawer>
  );
}
