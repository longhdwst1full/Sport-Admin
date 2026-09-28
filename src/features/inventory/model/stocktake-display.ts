/** Nhãn hiển thị dùng chung giữa bảng danh sách và drawer chi tiết phiếu kiểm kê. */
export const stocktakeStatusMeta = {
  DRAFT: { label: 'Đang đếm', color: 'default' },
  SUBMITTED: { label: 'Chờ duyệt', color: 'blue' },
  APPROVED: { label: 'Đã ghi sổ', color: 'green' },
  CANCELLED: { label: 'Đã huỷ', color: 'red' },
} as const;

export const stocktakeScopeLabel = {
  FULL: 'Toàn kho',
  SKU_LIST: 'Theo SKU',
} as const;

export const formatStocktakeTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';
