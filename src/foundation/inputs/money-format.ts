/**
 * Định dạng số tiền VND cho ô nhập: nhóm hàng nghìn khi hiển thị, bóc dấu phân cách khi đọc ra.
 *
 * Tách khỏi component vì file chứa component chỉ nên export component (fast refresh).
 */
export const groupDigits = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return '';
  // Chỉ nhóm phần nguyên: VND không dùng phần thập phân trong giá niêm yết.
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const stripSeparators = (display: string | undefined): string =>
  (display ?? '').replace(/[^\d]/g, '');
