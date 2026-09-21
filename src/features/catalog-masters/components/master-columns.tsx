import type { ColumnType } from 'antd/es/table';
import { StatusTag } from '@/foundation/management';

/** Brand và Category dùng chung một họ trạng thái ACTIVE/INACTIVE ở backend. */
export const MASTER_STATUSES: Record<string, { label: string; color: string }> = {
  ACTIVE: { color: 'green', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Đã ngừng' },
};

/**
 * Cột mã và cột trạng thái giống hệt nhau ở hai màn. Giữ chung một chỗ để khi đổi cách hiển thị
 * mã (hoặc thêm trạng thái mới) không phải sửa hai bảng rồi quên một bảng.
 */
export function masterCodeColumn<T>(): ColumnType<T> {
  return {
    title: 'Mã',
    dataIndex: 'code',
    width: 140,
    render: (value: string) => (
      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
        {value}
      </span>
    ),
  };
}

export function masterStatusColumn<T>(): ColumnType<T> {
  return {
    title: 'Trạng thái',
    dataIndex: 'status',
    width: 150,
    render: (value: string) => <StatusTag status={value} presentations={MASTER_STATUSES} />,
  };
}
