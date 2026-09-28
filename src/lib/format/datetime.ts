/** Định dạng ngày giờ dùng chung cho Admin. Sáu màn từng tự khai lại đúng cặp option này. */
const shortDateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/** Trả `—` cho giá trị rỗng để bảng không hiện `Invalid Date`. */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : shortDateTime.format(date);
}
