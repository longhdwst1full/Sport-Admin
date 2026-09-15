import { Alert, Descriptions, Drawer, Empty, Skeleton, Table, Tag } from 'antd';
import { useGetAdminCustomer } from '@/generated/api/customers/customers';
import { getApiErrorMessage } from '@/lib/api/error';
import { customerKindPresentation, customerStatusPresentation } from '../constants/customer.constants';
import { toCustomerDetailView, type CustomerOrderView } from '../model/customer.mapper';

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
    <Drawer
      open={Boolean(customerId)}
      width={760}
      onClose={onClose}
      title={customer ? customer.name : 'Chi tiết khách hàng'}
    >
      {query.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được chi tiết khách hàng"
          description={getApiErrorMessage(query.error, 'Vui lòng thử lại.')}
        />
      )}

      {query.isLoading && <Skeleton active paragraph={{ rows: 8 }} />}

      {customer && (
        <>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Mã khách">
              <span className="font-mono">{customer.customerNo}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Loại">
              <Tag color={customerKindPresentation[customer.kind]?.color}>
                {customerKindPresentation[customer.kind]?.label ?? customer.kind}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{customer.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{customer.email}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={customerStatusPresentation[customer.status]?.color}>
                {customerStatusPresentation[customer.status]?.label ?? customer.status}
              </Tag>
            </Descriptions.Item>
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
                    {address.isDefault && <Tag color="blue">Mặc định</Tag>}
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
            <Table<CustomerOrderView>
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={customer.recentOrders}
              columns={[
                { title: 'Mã đơn', dataIndex: 'orderNo' },
                { title: 'Trạng thái', dataIndex: 'status', width: 150 },
                { title: 'Thanh toán', dataIndex: 'paymentStatus', width: 130 },
                {
                  title: 'Tổng tiền',
                  dataIndex: 'grandTotalLabel',
                  width: 140,
                  align: 'right',
                },
                { title: 'Ngày đặt', dataIndex: 'placedLabel', width: 120 },
              ]}
            />
          )}
        </>
      )}
    </Drawer>
  );
}
