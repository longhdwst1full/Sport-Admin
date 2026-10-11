/** Định dạng ngày giờ dùng chung cho Admin. Sáu màn từng tự khai lại đúng cặp option này. */
// `dd/MM/yyyy`: `dateStyle: 'short'` của vi-VN cho năm 2 chữ số (`26/9/26`), dễ đọc nhầm.
const DATE_PARTS = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;

/** `HH:mm dd/MM/yyyy`, ví dụ `21:43 26/09/2026`. */
const shortDateTime = new Intl.DateTimeFormat('vi-VN', {
  ...DATE_PARTS,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** `dd/MM/yyyy`, ví dụ `26/09/2026`. */
const shortDate = new Intl.DateTimeFormat('vi-VN', DATE_PARTS);

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
