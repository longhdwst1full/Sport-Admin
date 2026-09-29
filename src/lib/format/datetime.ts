/** Định dạng ngày giờ dùng chung cho Admin. Sáu màn từng tự khai lại đúng cặp option này. */
const shortDateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/** Định dạng chỉ ngày (không giờ), dùng chung style 'short' với formatDateTime. */
const shortDate = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' });

/** Định dạng chỉ giờ (không ngày), dùng chung style 'short' với formatDateTime. */
const shortTime = new Intl.DateTimeFormat('vi-VN', { timeStyle: 'short' });

/** Trả `—` cho giá trị rỗng để bảng không hiện `Invalid Date`. */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : shortDateTime.format(date);
}

/** Trả `—` cho giá trị rỗng để bảng không hiện `Invalid Date`. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : shortDate.format(date);
}

/** Trả `—` cho giá trị rỗng để bảng không hiện `Invalid Date`. */
export function formatTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : shortTime.format(date);
}
