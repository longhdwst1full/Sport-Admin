import { Descriptions, Empty, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { orderStatusPresentation } from '@/features/order-status';
import { paymentStatusPresentation } from '@/features/payments';
import { StatusTag } from '@/foundation/management/status-tag';
import { DetailDrawer } from '@/foundation/overlay';
import { AdminTable, col } from '@/foundation/table';
import { useGetAdminCustomer } from '@/generated/api/customers/customers';
import type { OrderStatus } from '@/generated/api/orders/orders.schemas';
import type { PaymentStatus } from '@/generated/api/payments/payments.schemas';
import { customerKindPresentation, customerStatusPresentation } from '../constants/customer.constants';
import { toCustomerDetailView, type CustomerOrderView } from '../model/customer.mapper';

const RECENT_ORDER_COLUMNS: ColumnsType<CustomerOrderView> = [
  col.text<CustomerOrderView>('orderNo', 'Mã đơn'),
  col.status<CustomerOrderView, OrderStatus>('status', 'Trạng thái', orderStatusPresentation),
  col.status<CustomerOrderView, PaymentStatus>('paymentStatus', 'Thanh toán', paymentStatusPresentation),
  col.text<CustomerOrderView>('grandTotalLabel', 'Tổng tiền', { width: 140, align: 'right' }),
  col.text<CustomerOrderView>('placedLabel', 'Ngày đặt', { width: 120 }),
];

export function CustomerDetailDrawer({
  customerId,
  onClose,
}: {
  customerId?: string;
  onClose: () => void;
}) {
  const query = useGetAdminCustomer(customerId ?? '', {
    query: { enabled: Boolean(customerId) },
  });
  const customer = query.data ? toCustomerDetailView(query.data) : undefined;

  return (
    <DetailDrawer
      open={Boolean(customerId)}
      size="md"
      onClose={onClose}
      title={customer ? customer.name : 'Chi tiết khách hàng'}
      status={customer && <StatusTag status={customer.status} presentations={customerStatusPresentation} />}
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
    >
      {customer && (
        <>
          <Descriptions column={{ xs: 1, md: 2 }} size="small" bordered>
            <Descriptions.Item label="Mã khách">
              <span className="font-mono">{customer.customerNo}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Loại">
              <StatusTag status={customer.kind} presentations={customerKindPresentation} />
            </Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{customer.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{customer.email}</Descriptions.Item>
            <Descriptions.Item label="Nhận tin khuyến mãi">
              {customer.marketingConsent ? 'Có' : 'Không'}
            </Descriptions.Item>
            <Descriptions.Item label="Số đơn">{customer.orderCount}</Descriptions.Item>
            <Descriptions.Item label="Đã chi tiêu">
              <span className="font-semibold">{customer.lifetimeValueLabel}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Mua gần nhất">{customer.lastOrderLabel}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{customer.createdLabel}</Descriptions.Item>
          </Descriptions>

          <h3 className="mb-2 mt-6 text-sm font-bold text-slate-700">Địa chỉ nhận hàng</h3>
          {customer.addresses.length === 0 ? (
            <Empty description="Khách chưa lưu địa chỉ nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <ul className="space-y-2">
              {customer.addresses.map((address) => (
                <li key={address.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    {address.recipient}
                    {address.isDefault && <Tag>Mặc định</Tag>}
                  </div>
                  <div className="text-xs text-slate-500">{address.phone}</div>
                  <div className="text-xs text-slate-600">{address.fullAddress}</div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-2 mt-6 text-sm font-bold text-slate-700">Đơn hàng gần đây</h3>
          {customer.recentOrders.length === 0 ? (
            <Empty description="Khách chưa có đơn nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <AdminTable<CustomerOrderView>
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={customer.recentOrders}
              columns={RECENT_ORDER_COLUMNS}
            />
          )}
        </>
      )}
    </DetailDrawer>
  );
}
