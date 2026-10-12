import type { PosPaymentMethod } from '@/generated/api/orders/orders.schemas';
import { isValidPhone } from '@/lib/validation/phone';

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

/** Ô trên phiếu bán có thể báo lỗi tại chỗ; khoá khớp prop của từng Form.Item. */
export type PosCheckoutField =
  | 'branchId'
  | 'customerName'
  | 'customerPhone'
  | 'customerEmail'
  | 'deliveryRecipient'
  | 'deliveryPhone'
  | 'deliveryProvinceCode'
  | 'deliveryDistrictCode'
  | 'deliveryWardCode'
  | 'deliveryAddressLine';

export type PosCheckoutErrors = Partial<Record<PosCheckoutField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lỗi theo từng ô của phiếu bán, theo thứ tự hiển thị. Địa chỉ giao chỉ bắt buộc khi chọn giao tận
 * nơi; mã quận/phường bắt buộc vì hãng vận chuyển định tuyến bằng mã, thiếu là không tạo được vận đơn.
 */
export function validatePosCheckout(values: PosCheckoutValues): PosCheckoutErrors {
  const errors: PosCheckoutErrors = {};
  if (!values.branchId) errors.branchId = 'Chọn chi nhánh đang đứng quầy.';

  const phone = values.customerPhone.trim();
  if (!phone) errors.customerPhone = 'Nhập số điện thoại khách hàng.';
  else if (!isValidPhone(phone)) errors.customerPhone = 'Số điện thoại không hợp lệ.';

  if (!values.customerName.trim()) errors.customerName = 'Nhập tên khách hàng.';

  const email = values.customerEmail.trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.customerEmail = 'Email không hợp lệ.';

  if (values.deliveryMode === 'DELIVERY') {
    const delivery = values.delivery;
    if (!delivery.recipient.trim()) errors.deliveryRecipient = 'Nhập tên người nhận.';
    const deliveryPhone = delivery.phone.trim();
    if (!deliveryPhone) errors.deliveryPhone = 'Nhập số điện thoại người nhận.';
    else if (!isValidPhone(deliveryPhone)) {
      errors.deliveryPhone = 'Số điện thoại không hợp lệ.';
    }
    if (!delivery.provinceCode) errors.deliveryProvinceCode = 'Chọn tỉnh/thành.';
    if (!delivery.districtCode) errors.deliveryDistrictCode = 'Chọn quận/huyện.';
    if (!delivery.wardCode) errors.deliveryWardCode = 'Chọn phường/xã.';
    if (!delivery.addressLine.trim()) errors.deliveryAddressLine = 'Nhập địa chỉ chi tiết.';
  }
  return errors;
}
