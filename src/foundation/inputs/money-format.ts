/**
 * Định dạng số tiền VND cho ô nhập: nhóm hàng nghìn khi hiển thị, bóc dấu phân cách khi đọc ra.
 *
 * Tách khỏi component vì file chứa component chỉ nên export component (fast refresh).
 */

/**
 * Quy ước Việt Nam: dấu CHẤM phân cách hàng nghìn, dấu PHẨY phân cách thập phân — `1.500.000 ₫`.
 *
 * Vì dấu chấm đã dùng cho hàng nghìn, `MoneyInput` phải khai `decimalSeparator=","` cho antd.
 * Để antd giữ mặc định `.` thì nó đọc "1.500.000" như một số thập phân và giá trị sụp về 1.5 —
 * ô nhập trông như không format được.
 *
 * Tiền lưu và truyền vẫn là số nguyên VND; nhóm hàng nghìn chỉ là chuyện hiển thị.
 */
export const THOUSAND_SEPARATOR = '.';
export const DECIMAL_SEPARATOR = ',';

export const groupDigits = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return '';
  // Chỉ nhóm phần nguyên: VND không dùng phần thập phân trong giá niêm yết.
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEPARATOR);
};

/** Bóc mọi thứ không phải chữ số, nên nhận được cả chuỗi người dùng gõ kèm dấu phẩy hay khoảng trắng. */
export const stripSeparators = (display: string | undefined): string =>
  (display ?? '').replace(/[^\d]/g, '');
