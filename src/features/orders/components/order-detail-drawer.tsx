import { Alert, Avatar, Button, Descriptions, Drawer, Space, Spin, Table, Tag, Timeline, Typography } from 'antd';
import { useGetAdminOrder } from '@/generated/api/orders/orders';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  moneyFormatter,
  orderStatusPresentation,
  paymentStatusPresentation,
} from '../constants/order.constants';

interface OrderDetailDrawerProps {
  orderId?: string;
  onClose: () => void;
}

export function OrderDetailDrawer({ orderId, onClose }: OrderDetailDrawerProps) {
  const detail = useGetAdminOrder(orderId ?? '', {
    query: { enabled: Boolean(orderId) },
  });
  const order = detail.data;

  return (
    <Drawer
      width={760}
      open={Boolean(orderId)}
      title={order ? `Đơn hàng ${order.orderNo}` : 'Chi tiết đơn hàng'}
      onClose={onClose}
      destroyOnClose
    >
      {detail.isLoading && (
        <div className="flex min-h-72 items-center justify-center"><Spin size="large" /></div>
      )}
      {detail.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được chi tiết đơn hàng"
          description={getApiErrorMessage(detail.error, 'Vui lòng thử lại.')}
          action={<Button onClick={() => void detail.refetch()}>Thử lại</Button>}
        />
      )}
      {order && (
        <Space direction="vertical" size="large" className="w-full">
          <div className="rounded-2xl bg-gradient-to-r from-slate-950 to-blue-950 p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-blue-200">Mã đơn hàng</div>
                <Typography.Title level={3} className="!mb-1 !mt-2 !text-white">{order.orderNo}</Typography.Title>
                <div className="text-sm text-slate-300">{new Date(order.placedAt).toLocaleString('vi-VN')}</div>
              </div>
              <Tag color={orderStatusPresentation[order.status]?.color ?? 'default'}>
                {orderStatusPresentation[order.status]?.label ?? order.status}
              </Tag>
            </div>
          </div>

          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Người nhận">{order.recipient.name}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{order.recipient.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{order.recipient.email || 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">{order.branchName}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>
              {[order.recipient.addressLine, order.recipient.ward, order.recipient.district, order.recipient.province]
                .filter(Boolean).join(', ')}
            </Descriptions.Item>
            <Descriptions.Item label="Thanh toán">
              <Tag color={paymentStatusPresentation[order.paymentStatus]?.color ?? 'default'}>
                {paymentStatusPresentation[order.paymentStatus]?.label ?? order.paymentStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Hình thức">
              {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản'}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5}>Sản phẩm</Typography.Title>
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
                    <Space>
                      <Avatar shape="square" size={44} src={item.imageUrl ?? undefined}>{item.productName[0]}</Avatar>
                      <div>
                        <strong>{item.productName}</strong>
                        <div className="text-xs text-slate-500">{item.variantName} · {item.sku}</div>
                      </div>
                    </Space>
                  ),
                },
                { title: 'SL', dataIndex: 'quantity', width: 60, align: 'center' },
                { title: 'Đơn giá', dataIndex: 'unitPrice', width: 130, align: 'right', render: (value) => moneyFormatter.format(Number(value)) },
                { title: 'Thành tiền', dataIndex: 'lineTotal', width: 140, align: 'right', render: (value) => <strong>{moneyFormatter.format(Number(value))}</strong> },
              ]}
            />
          </div>

          <div className="ml-auto w-full max-w-sm rounded-2xl bg-slate-50 p-4">
            <div className="flex justify-between py-1"><span>Tạm tính</span><span>{moneyFormatter.format(Number(order.subtotal))}</span></div>
            <div className="flex justify-between py-1"><span>Phí giao hàng</span><span>{moneyFormatter.format(Number(order.shippingTotal))}</span></div>
            <div className="mt-2 flex justify-between border-t pt-3 text-lg font-semibold"><span>Tổng thanh toán</span><span className="text-blue-700">{moneyFormatter.format(Number(order.grandTotal))}</span></div>
            <div className="mt-1 text-right text-xs text-slate-500">Giá đã bao gồm VAT</div>
          </div>

          <div>
            <Typography.Title level={5}>Lịch sử trạng thái</Typography.Title>
            <Timeline
              items={order.statusHistory.map((history) => ({
                color: 'blue',
                children: (
                  <div>
                    <strong>{orderStatusPresentation[history.toStatus]?.label ?? history.toStatus}</strong>
                    <div className="text-xs text-slate-500">{new Date(history.createdAt).toLocaleString('vi-VN')} · {history.actorType}</div>
                    {history.reason && <div className="mt-1 text-sm">{history.reason}</div>}
                  </div>
                ),
              }))}
            />
          </div>
        </Space>
      )}
    </Drawer>
  );
}

