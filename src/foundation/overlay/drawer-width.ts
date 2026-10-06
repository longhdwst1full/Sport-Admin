/**
 * Bốn cỡ drawer dùng chung. antd Modal đã tự giới hạn `max-width: calc(100vw - 32px)`, còn Drawer thì
 * không — nên mọi cỡ ở đây đều kẹp theo viewport để không tràn màn hình hẹp.
 *
 * - `sm`: form ngắn, một cột (sửa biến thể, điều chỉnh tồn).
 * - `md`: form/chi tiết thông thường.
 * - `lg`: chi tiết có bảng dòng hàng.
 * - `xl`: chứng từ nhiều dòng (đơn mua, phiếu nhập, POS).
 */
export const DRAWER_WIDTH = {
  sm: 'min(560px, 100vw)',
  md: 'min(720px, 100vw)',
  lg: 'min(880px, 100vw)',
  xl: 'min(1080px, 100vw)',
} as const;
