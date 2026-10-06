import type { ColumnItem } from '@/foundation/table';

/** Cột bật/tắt được trong "Tùy chỉnh cột"; `id` trùng `key` của cột trong bảng đánh giá. */
export const REVIEW_COLUMN_ITEMS: ColumnItem[] = [
  { id: 'customer', label: 'Khách hàng', fixed: true },
  { id: 'rating', label: 'Đánh giá sao' },
  { id: 'content', label: 'Nội dung nhận xét' },
  { id: 'comments', label: 'Số phản hồi' },
  { id: 'status', label: 'Trạng thái' },
];
