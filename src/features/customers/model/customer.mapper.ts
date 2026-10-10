import type {
  AdminCustomerDetailDto,
  AdminCustomerSummaryDto,
  CustomerKind,
  CustomerStatus,
} from '@/generated/api/customers/customers.schemas';
import { OrderStatus } from '@/generated/api/orders/orders.schemas';
import { PaymentStatus } from '@/generated/api/payments/payments.schemas';
import { formatDate } from '@/lib/format/datetime';
import { parseEnum } from '@/shared/utils/parse-enum';
import { moneyFormatter } from '../constants/customer.constants';

export interface CustomerRowView {
  id: string;
  customerNo: string;
  name: string;
  phone: string;
  email: string;
  /** Mã ổn định để so sánh; nhãn hiển thị tra riêng. */
  kind: CustomerKind;
  status: CustomerStatus;
  marketingConsent: boolean;
  /** Ảnh đại diện để nhận diện nhanh trong bảng; rỗng thì hiện chữ cái đầu của tên. */
  avatarUrl?: string;
  orderCount: number;
  lifetimeValueLabel: string;
  lastOrderLabel: string;
  createdLabel: string;
  /** Gửi lại làm expectedVersion khi sửa, ngừng hoạt động hoặc xoá. */
  version: number;
}

function dateLabel(value: string | null | undefined, fallback: string): string {
  return value ? formatDate(value) : fallback;
}

export function toCustomerRowView(dto: AdminCustomerSummaryDto): CustomerRowView {
  return {
    id: dto.id,
    customerNo: dto.customerNo,
    name: dto.name,
    avatarUrl: dto.avatarUrl ?? undefined,
    version: dto.version,
    phone: dto.phone ?? '—',
    email: dto.email ?? '—',
    kind: dto.kind,
    status: dto.status,
    marketingConsent: dto.marketingConsent,
    orderCount: dto.orderCount,
    lifetimeValueLabel: moneyFormatter.format(Number(dto.lifetimeValue)),
    lastOrderLabel: dateLabel(dto.lastOrderAt, 'Chưa mua'),
    createdLabel: dateLabel(dto.createdAt, '—'),
  };
}

export interface CustomerAddressView {
  id: string;
  recipient: string;
  phone: string;
  /** Một dòng địa chỉ đã ghép sẵn; bảng chỉ lưu mã tỉnh nên không có tên tỉnh để hiện. */
  fullAddress: string;
  isDefault: boolean;
}

export interface CustomerOrderView {
  id: string;
  orderNo: string;
  /** CONTRACT: DTO khách hàng trả chuỗi; mã lạ (contract mới hơn UI) thành `undefined` → ô trống. */
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  grandTotalLabel: string;
  placedLabel: string;
}

export interface CustomerDetailView extends CustomerRowView {
  addresses: CustomerAddressView[];
  recentOrders: CustomerOrderView[];
}

export function toCustomerDetailView(dto: AdminCustomerDetailDto): CustomerDetailView {
  return {
    ...toCustomerRowView(dto),
    addresses: dto.addresses.map((address) => ({
      id: address.id,
      recipient: address.recipient,
      phone: address.phone,
      fullAddress: [address.addressLine, address.ward, address.district]
        .filter(Boolean)
        .join(', '),
      isDefault: address.isDefault,
    })),
    recentOrders: dto.recentOrders.map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      status: parseEnum(OrderStatus, order.status),
      paymentStatus: parseEnum(PaymentStatus, order.paymentStatus),
      grandTotalLabel: moneyFormatter.format(Number(order.grandTotal)),
      placedLabel: dateLabel(order.placedAt, '—'),
    })),
  };
}
