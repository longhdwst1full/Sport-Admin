/**
 * Định dạng tiền VND dùng chung. Sáu chỗ trong `features/` từng tự khai lại đúng cấu hình này
 * (VND không có phần lẻ theo ISO 4217 nên `maximumFractionDigits` mặc định đã là 0 — khai thêm
 * hay không cũng ra cùng một chuỗi).
 */
export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export function formatMoney(value: number | string): string {
  return moneyFormatter.format(typeof value === 'string' ? Number(value) : value);
}
