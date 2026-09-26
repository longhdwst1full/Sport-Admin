import type { PosPaymentMethod } from '@/generated/api/orders/orders.schemas';

export interface PosDeliveryValues {
  recipient: string;
  phone: string;
  addressLine: string;
  province: string;
  provinceCode: string;
  district: string;
  districtCode: string;
  ward: string;
  wardCode: string;
}

export interface PosCheckoutValues {
  branchId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: PosPaymentMethod;
  note: string;
  /** Khách nhận tại quầy hay đơn đi giao hàng. */
  deliveryMode: 'PICKUP' | 'DELIVERY';
  delivery: PosDeliveryValues;
  /** Khách lấy hàng ngay dù đơn có địa chỉ giao. */
  handOverImmediately: boolean;
  /** Tiền mặt khách đưa, chỉ để tính tiền thối tại quầy; không gửi lên Backend. */
  cashReceived: number | null;
}
