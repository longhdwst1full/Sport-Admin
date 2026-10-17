import {
  OrderFulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  type OrderDetailDto,
} from '@/generated/api/orders/orders.schemas';

export type OrderAction = 'confirm' | 'cancel' | 'complete' | 'cancelAfterFailedDelivery';

type OrderGateFields = Pick<OrderDetailDto, 'status' | 'paymentStatus' | 'paymentMethod' | 'fulfillmentStatus'>;

/** Khớp `PREPAID_PAYMENT_METHODS` phía API: đơn trả trước chỉ xác nhận khi tiền đã về. */
const PREPAID_PAYMENT_METHODS: ReadonlySet<string> = new Set(['BANK_TRANSFER', 'VNPAY']);
const CANCELLABLE_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.PENDING,
  PaymentStatus.FAILED,
]);

/**
 * Gương điều kiện của `order-transition.service.ts` (API là nguồn quyết định cuối cùng):
 * - cancel: PENDING_CONFIRMATION + payment PENDING|FAILED + fulfillment PENDING.
 * - confirm: PENDING_CONFIRMATION + fulfillment PENDING + (không trả trước hoặc payment SUCCESS).
 * - complete: DELIVERED + fulfillment DELIVERED + payment SUCCESS.
 * - cancelAfterFailedDelivery: SHIPPED + fulfillment RETURNED (hàng giao thất bại đã nhận về kho,
 *   `cancelAfterFailedDeliveryAdmin`). Payment SUCCESS vẫn huỷ được nhưng phát sinh hoàn tiền thủ công.
 */
export function getOrderActionAvailability(
  order: OrderGateFields | undefined,
  canManage: boolean,
): Record<OrderAction, boolean> {
  if (!order || !canManage) {
    return { cancel: false, confirm: false, complete: false, cancelAfterFailedDelivery: false };
  }
  const awaitingConfirmation =
    order.status === OrderStatus.PENDING_CONFIRMATION &&
    order.fulfillmentStatus === OrderFulfillmentStatus.PENDING;
  return {
    cancel: awaitingConfirmation && CANCELLABLE_PAYMENT_STATUSES.has(order.paymentStatus),
    confirm:
      awaitingConfirmation &&
      (!PREPAID_PAYMENT_METHODS.has(order.paymentMethod) || order.paymentStatus === PaymentStatus.SUCCESS),
    complete:
      order.status === OrderStatus.DELIVERED &&
      order.fulfillmentStatus === OrderFulfillmentStatus.DELIVERED &&
      order.paymentStatus === PaymentStatus.SUCCESS,
    cancelAfterFailedDelivery:
      order.status === OrderStatus.SHIPPED && order.fulfillmentStatus === OrderFulfillmentStatus.RETURNED,
  };
}

/**
 * Huỷ sau giao thất bại với đơn đã thu tiền (payment SUCCESS): API giữ payment SUCCESS và gắn cờ
 * `MANUAL_REFUND_REQUIRED`; kế toán hoàn ngoài hệ thống rồi ghi nhận ở màn Thanh toán.
 */
export function requiresManualRefund(order: Pick<OrderDetailDto, 'paymentStatus'>): boolean {
  return order.paymentStatus === PaymentStatus.SUCCESS;
}

export interface OrderProgress {
  cancelled: boolean;
  /** Chỉ số bước trong `ORDER_PROGRESS_STEP_LABELS`. */
  current: number;
  /** Đơn đã COMPLETED: mọi bước, kể cả bước cuối, đều xong. */
  done: boolean;
}

const PROGRESS_STEP_BY_STATUS: Record<OrderStatus, number> = {
  PENDING_CONFIRMATION: 0,
  CONFIRMED: 1,
  PICKING: 2,
  PACKED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  COMPLETED: 4,
  CANCELLED: -1,
};

export function getOrderProgress(status: OrderStatus): OrderProgress {
  return {
    cancelled: status === OrderStatus.CANCELLED,
    current: PROGRESS_STEP_BY_STATUS[status] ?? 0,
    done: status === OrderStatus.COMPLETED,
  };
}

export function getProgressStepStatus(
  index: number,
  progress: OrderProgress,
): 'finish' | 'process' | 'wait' {
  if (index < progress.current || (progress.done && index === progress.current)) return 'finish';
  return index === progress.current ? 'process' : 'wait';
}
