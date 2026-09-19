import { CheckCircleFilled, PrinterOutlined } from '@ant-design/icons';
import { Button, Descriptions, Modal, Table, Tag } from 'antd';
import { AdminTable } from '@/foundation/table';
import type { OrderDetailDto } from '@/generated/api/orders/models';
import { moneyFormatter, posPaymentMethodLabels } from '../constants/pos.constants';

/**
 * Biên lai in ra từ chính dữ liệu đơn Backend trả về, không dựng lại từ giỏ hàng trên
 * màn hình: những gì khách cầm về phải khớp đúng đơn đã ghi sổ.
 */
export function PosReceiptModal({
  order,
  onClose,
  onNewOrder,
}: {
  order?: OrderDetailDto;
  onClose: () => void;
  onNewOrder: () => void;
}) {
  const paymentLabel =
    posPaymentMethodLabels[order?.paymentMethod as keyof typeof posPaymentMethodLabels] ??
    order?.paymentMethod;

  return (
    <Modal
      open={Boolean(order)}
      width={720}
      onCancel={onClose}
      title={
        <span className="flex items-center gap-2">
          <CheckCircleFilled className="text-emerald-600" />
          Đã bán xong
        </span>
      }
      footer={[
        <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>
          In biên lai
        </Button>,
        <Button key="new" type="primary" onClick={onNewOrder}>
          Bán đơn tiếp theo
        </Button>,
      ]}
    >
      {order && (
        <div id="pos-receipt">
          <Descriptions column={2} size="small" bordered className="mb-4">
            <Descriptions.Item label="Mã đơn" span={2}>
              <span className="font-mono text-base font-bold">{order.orderNo}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng">{order.recipient.name}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{order.recipient.phone}</Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">{order.branchName}</Descriptions.Item>
            <Descriptions.Item label="Thanh toán">
              {paymentLabel} <Tag color="green">Đã thu</Tag>
            </Descriptions.Item>
            {order.customerNote && (
              <Descriptions.Item label="Ghi chú" span={2}>
                {order.customerNote}
              </Descriptions.Item>
            )}
          </Descriptions>

          <AdminTable
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={order.items}
            columns={[
              {
                title: 'Sản phẩm',
                render: (_value, item) => (
                  <div>
                    <div className="font-semibold">{item.productName}</div>
                    <div className="font-mono text-xs text-slate-500">{item.sku}</div>
                  </div>
                ),
              },
              { title: 'SL', dataIndex: 'quantity', width: 60, align: 'center' },
              {
                title: 'Đơn giá',
                width: 130,
                align: 'right',
                render: (_value, item) => moneyFormatter.format(Number(item.unitPrice)),
              },
              {
                title: 'Thành tiền',
                width: 140,
                align: 'right',
                render: (_value, item) => moneyFormatter.format(Number(item.lineTotal)),
              },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3} align="right">
                  <span className="font-semibold">Tổng cộng</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span className="text-base font-bold text-emerald-700">
                    {moneyFormatter.format(Number(order.grandTotal))}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </div>
      )}
    </Modal>
  );
}
