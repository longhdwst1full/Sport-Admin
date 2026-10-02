import type { SystemParameterGroup } from '@/generated/api/system/system.schemas';

export const SYSTEM_PARAMETER_PAGE_SIZE = 20;

/**
 * Nhãn nhóm tách khỏi mã (`08-enums-constants.md`). `Record<SystemParameterGroup, …>` bắt lỗi compile khi contract thêm nhóm mà quên nhãn — trước đây
 * INTEGRATION/ASSISTANT không có nhãn nên không chọn được trong bộ lọc và form.
 */
const groupLabels: Record<SystemParameterGroup, string> = {
  SHIPPING: 'Giao hàng',
  CHECKOUT: 'Đặt hàng',
  ORDER: 'Đơn hàng',
  PAYMENT: 'Thanh toán',
  CART: 'Giỏ hàng',
  PROMOTION: 'Khuyến mãi',
  INTEGRATION: 'Tích hợp',
  ASSISTANT: 'Trợ lý AI',
  PROCUREMENT: 'Mua hàng & nhập kho',
  NOTIFICATION: 'Mẫu email',
  SECURITY: 'Bảo mật',
};

/**
 * Nhóm có giá trị được phép để trống: mẫu email (NOT-02) để trống = dùng nội dung mặc định của API
 * (`allowEmpty` ở catalog tham số). Nhập nhiều dòng vì đoạn mở đầu giữ xuống dòng.
 */
export const EMPTY_ALLOWED_PARAMETER_GROUPS: readonly string[] = ['NOTIFICATION'];

export const parameterGroupLabels: Record<string, string> = groupLabels;

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
