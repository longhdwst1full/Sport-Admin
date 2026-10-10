import { createPortal } from 'react-dom';
import type { OrderDetailDto } from '@/generated/api/orders/orders.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import { formatMoney } from '@/lib/format/money';
import {
  RECEIPT_PAYMENT_METHOD_LABELS,
  RECEIPT_PAYMENT_STATUS_LABELS,
  RECEIPT_STORE_NAME,
  RECEIPT_TAX_NOTICE,
} from '../constants/receipt.constants';

/**
 * Biên lai nội bộ (D16) dựng từ đúng dữ liệu đơn Backend trả về. Render qua portal vào body và ẩn trên
 * màn hình; chỉ hiện khi in bằng `printOrderReceipt()`, nên không đổi giao diện đang dùng.
 */
export function PrintableOrderReceipt({ order }: { order?: OrderDetailDto }) {
  if (!order) return null;
  // CONTRACT: API cũ (trước khi deploy branchContact) không trả field này; biên lai vẫn in được, chỉ thiếu liên hệ.
  const contact = (order as Partial<Pick<OrderDetailDto, 'branchContact'>>).branchContact;
  const discount = Number(order.discountTotal);
  const shipping = Number(order.shippingTotal);

  return createPortal(
    <div className="print-receipt-root" aria-hidden="true">
      <div className="print-receipt">
        <header className="print-receipt__header">
          <div className="print-receipt__store">{RECEIPT_STORE_NAME}</div>
          <div>{order.branchName}</div>
          {contact?.address && <div>{contact.address}</div>}
          {contact?.phone && <div>ĐT: {contact.phone}</div>}
          <div className="print-receipt__title">BIÊN LAI BÁN HÀNG</div>
        </header>

        <dl className="print-receipt__meta">
          <div><dt>Mã đơn</dt><dd>{order.orderNo}</dd></div>
          <div><dt>Ngày</dt><dd>{formatDateTime(order.placedAt)}</dd></div>
          <div><dt>Khách hàng</dt><dd>{order.recipient.name}</dd></div>
          <div><dt>Điện thoại</dt><dd>{order.recipient.phone}</dd></div>
        </dl>

        <table className="print-receipt__items">
          <thead>
            <tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.productName}
                  {item.variantName && <div className="print-receipt__muted">{item.variantName} · {item.sku}</div>}
                </td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.unitPrice)}</td>
                <td>{formatMoney(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="print-receipt__totals">
          <div><dt>Tạm tính</dt><dd>{formatMoney(order.subtotal)}</dd></div>
          {discount > 0 && <div><dt>Giảm giá</dt><dd>-{formatMoney(discount)}</dd></div>}
          {shipping > 0 && <div><dt>Phí giao hàng</dt><dd>{formatMoney(shipping)}</dd></div>}
          <div className="print-receipt__grand"><dt>Tổng cộng</dt><dd>{formatMoney(order.grandTotal)}</dd></div>
          <div>
            <dt>Thanh toán</dt>
            <dd>
              {RECEIPT_PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
              {' · '}
              {RECEIPT_PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </dd>
          </div>
        </dl>

        {order.customerNote && <p className="print-receipt__note">Ghi chú: {order.customerNote}</p>}
        <footer className="print-receipt__footer">
          <p>{RECEIPT_TAX_NOTICE}</p>
          <p>Cảm ơn quý khách!</p>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
