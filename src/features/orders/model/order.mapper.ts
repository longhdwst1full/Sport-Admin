import type {
  OrderDetailDto,
  OrderStatus,
  OrderSummaryDto,
  PaymentStatus,
} from '@/generated/api/orders/orders.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import {
  orderActorTypeLabels,
  orderPaymentMethodLabels,
  orderStatusPresentation,
} from '../constants/order.constants';

/** Dòng bảng đơn: cột chỉ đọc key của view model (RULE-DT-03). */
export interface OrderRow {
  id: string;
  orderNo: string;
  placedAtLabel: string;
  recipientName: string;
  recipientInitial: string;
  recipientPhone: string;
  branchName: string;
  warehouseName: string;
  itemCount: number;
  /** Chuỗi thập phân của API; `CurrencyAmount` tự định dạng. */
  grandTotal: string;
  paymentStatus: PaymentStatus;
  paymentMethodLabel: string;
  status: OrderStatus;
}

export interface OrderItemView {
  id: string;
  productName: string;
  initial: string;
  imageUrl?: string;
  variantLabel: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface OrderHistoryView {
  key: number;
  statusLabel: string;
  metaLabel: string;
  reason?: string;
}

export interface OrderShipmentView {
  /** Mã fulfillment thô; nhãn/tone thuộc `fulfillments` nên nơi gọi inject. */
  status: string;
  carrierCode?: string;
  trackingNo?: string;
  /** Chỉ có khi `trackingUrl` là http(s), tránh render link `javascript:`. */
  trackingHref?: string;
  shippedAtLabel?: string;
  deliveredAtLabel?: string;
}

export interface OrderTotalsView {
  subtotal: string;
  shippingTotal: string;
  grandTotal: string;
  /** Chỉ có khi khác 0; không thì tổng = tạm tính + phí ship hiện không khớp. */
  discountTotal?: string;
  /** Chỉ có khi giá chưa gồm thuế và thuế khác 0. */
  taxTotal?: string;
  pricesIncludeTax: boolean;
}

export interface OrderDetailView {
  id: string;
  orderNo: string;
  status: OrderStatus;
  placedAtLabel: string;
  recipient: { name: string; phone: string; email: string; address: string; note?: string };
  paymentStatus: PaymentStatus;
  paymentMethodLabel: string;
  paidAtLabel: string;
  shipment?: OrderShipmentView;
  branchName: string;
  warehouseName: string;
  items: OrderItemView[];
  totals: OrderTotalsView;
  history: OrderHistoryView[];
}

function firstLetter(value: string): string {
  return value.trim().charAt(0).toUpperCase();
}

function isNonZero(amount: string | null | undefined): amount is string {
  return Boolean(amount) && Number(amount) !== 0;
}

export function toPaymentMethodLabel(method: string): string {
  return orderPaymentMethodLabels[method] ?? method;
}

/**
 * Ô "Thanh toán lúc": có `paidAt` thì hiện giờ; chưa có thì nói đúng trạng thái thay vì luôn ghi
 * "Chưa thanh toán" (đơn đã hoàn tiền/đã xác nhận nhưng thiếu mốc giờ từng bị hiện sai).
 */
export function toPaidAtLabel(
  order: Pick<OrderDetailDto, 'paidAt' | 'paymentStatus' | 'paymentMethod'>,
): string {
  if (order.paidAt) return formatDateTime(order.paidAt);
  if (order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'REFUNDED') return 'Không ghi nhận thời điểm';
  if (order.paymentStatus === 'PENDING' && order.paymentMethod === 'COD') return 'Thu khi giao hàng';
  return 'Chưa thanh toán';
}

export function toOrderRow(dto: OrderSummaryDto): OrderRow {
  return {
    id: dto.id,
    orderNo: dto.orderNo,
    placedAtLabel: formatDateTime(dto.placedAt),
    recipientName: dto.recipient.name,
    recipientInitial: firstLetter(dto.recipient.name),
    recipientPhone: dto.recipient.phone,
    branchName: dto.branchName,
    warehouseName: dto.warehouseName,
    itemCount: dto.itemCount,
    grandTotal: dto.grandTotal,
    paymentStatus: dto.paymentStatus,
    paymentMethodLabel: toPaymentMethodLabel(dto.paymentMethod),
    status: dto.status,
  };
}

function toShipmentView(shipment: NonNullable<OrderDetailDto['shipment']>): OrderShipmentView {
  const trackingNo = shipment.trackingNo || undefined;
  return {
    status: shipment.status,
    carrierCode: shipment.carrierCode || undefined,
    trackingNo,
    trackingHref:
      trackingNo && shipment.trackingUrl && /^https?:\/\//i.test(shipment.trackingUrl)
        ? shipment.trackingUrl
        : undefined,
    shippedAtLabel: shipment.shippedAt ? formatDateTime(shipment.shippedAt) : undefined,
    deliveredAtLabel: shipment.deliveredAt ? formatDateTime(shipment.deliveredAt) : undefined,
  };
}

export function toOrderDetailView(dto: OrderDetailDto): OrderDetailView {
  const { recipient } = dto;
  return {
    id: dto.id,
    orderNo: dto.orderNo,
    status: dto.status,
    placedAtLabel: formatDateTime(dto.placedAt),
    recipient: {
      name: recipient.name,
      phone: recipient.phone,
      email: recipient.email || 'Không có email',
      address: [recipient.addressLine, recipient.ward, recipient.district, recipient.province]
        .filter(Boolean)
        .join(', '),
      note: dto.customerNote?.trim() || undefined,
    },
    paymentStatus: dto.paymentStatus,
    paymentMethodLabel: toPaymentMethodLabel(dto.paymentMethod),
    paidAtLabel: toPaidAtLabel(dto),
    shipment: dto.shipment ? toShipmentView(dto.shipment) : undefined,
    branchName: dto.branchName,
    warehouseName: dto.warehouseName,
    items: dto.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      initial: firstLetter(item.productName),
      imageUrl: item.imageUrl ?? undefined,
      variantLabel: [item.variantName, item.sku].filter(Boolean).join(' · '),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    totals: {
      subtotal: dto.subtotal,
      shippingTotal: dto.shippingTotal,
      grandTotal: dto.grandTotal,
      discountTotal: isNonZero(dto.discountTotal) ? dto.discountTotal : undefined,
      taxTotal: !dto.pricesIncludeTax && isNonZero(dto.taxTotal) ? dto.taxTotal : undefined,
      pricesIncludeTax: dto.pricesIncludeTax,
    },
    history: (dto.statusHistory ?? []).map((entry) => ({
      key: entry.sequenceNo,
      // CONTRACT: `toStatus` là enum sinh tự động; vẫn đỡ giá trị lạ để timeline không vỡ cả drawer.
      statusLabel: orderStatusPresentation[entry.toStatus]?.label ?? entry.toStatus,
      metaLabel: `${formatDateTime(entry.createdAt)} · ${orderActorTypeLabels[entry.actorType] ?? 'Không xác định'}`,
      reason: entry.reason || undefined,
    })),
  };
}
