export const SYSTEM_PARAMETER_PAGE_SIZE = 20;

/** Nhãn nhóm tách khỏi mã (`08-enums-constants.md`). */
export const parameterGroupLabels: Record<string, string> = {
  SHIPPING: 'Giao hàng',
  CHECKOUT: 'Đặt hàng',
  ORDER: 'Đơn hàng',
  PAYMENT: 'Thanh toán',
  CART: 'Giỏ hàng',
  PROMOTION: 'Khuyến mãi',
};

export const parameterValueTypeLabels: Record<string, string> = {
  INTEGER: 'Số nguyên',
  DECIMAL: 'Số thập phân',
  BOOLEAN: 'Đúng/Sai',
  STRING: 'Chuỗi',
};

export const parameterStatusPresentation: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Đang dùng', color: 'success' },
  INACTIVE: { label: 'Ngừng dùng', color: 'default' },
};
