import type { ColumnType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { StatusTag, type StatusPresentation } from '@/foundation/management/status-tag';
import { CurrencyAmount } from '@/foundation/typography/currency-amount';
import { formatDate, formatDateTime } from '@/lib/format/datetime';
import { TableActions } from './table-actions';

/**
 * Preset cột cho `AdminTable`: gom phần lặp (căn lề, độ rộng, ô trống, định dạng) để feature chỉ khai
 * "cột này là gì". Mọi preset nhận `extra` để ghi đè bất kỳ thuộc tính antd nào (width, fixed, sorter…).
 *
 * Giá trị đọc theo `dataIndex` trên row view model (RULE-DT-03): cột dẫn xuất từ nhiều trường thì
 * mapper tính sẵn một key riêng, preset chỉ hiển thị.
 */
type Key<T> = Extract<keyof T, string>;
type Extra<T> = Omit<ColumnType<T>, 'dataIndex'>;

export const EMPTY_CELL = '—';

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export const col = {
  /** Văn bản thường; rỗng hiện `—`. */
  text<T>(dataIndex: Key<T>, title: ReactNode, extra?: Extra<T>): ColumnType<T> {
    return {
      key: dataIndex,
      dataIndex,
      title,
      render: (value: unknown) => (isEmpty(value) ? EMPTY_CELL : (value as ReactNode)),
      ...extra,
    };
  },

  /** Số lượng: căn phải, phân tách hàng nghìn kiểu vi-VN. */
  number<T>(dataIndex: Key<T>, title: ReactNode, extra?: Extra<T>): ColumnType<T> {
    return {
      key: dataIndex,
      dataIndex,
      title,
      align: 'right',
      width: 120,
      // Chữ số đều bề ngang để số xếp thẳng cột.
      className: 'tabular-nums',
      render: (value: unknown) =>
        isEmpty(value) ? EMPTY_CELL : Number(value).toLocaleString('vi-VN'),
      ...extra,
    };
  },

  /** Tiền VND: căn phải, qua `CurrencyAmount`. */
  money<T>(dataIndex: Key<T>, title: ReactNode, extra?: Extra<T>): ColumnType<T> {
    return {
      key: dataIndex,
      dataIndex,
      title,
      align: 'right',
      width: 140,
      className: 'tabular-nums',
      render: (value: number | string | null | undefined) =>
        isEmpty(value) ? EMPTY_CELL : <CurrencyAmount amount={value} />,
      ...extra,
    };
  },

  /** Ngày giờ ISO → `dd/MM/yyyy HH:mm`. */
  dateTime<T>(dataIndex: Key<T>, title: ReactNode, extra?: Extra<T>): ColumnType<T> {
    return {
      key: dataIndex,
      dataIndex,
      title,
      width: 160,
      render: (value: string | null | undefined) => (value ? formatDateTime(value) : EMPTY_CELL),
      ...extra,
    };
  },

  /** Ngày ISO → `dd/MM/yyyy`. */
  date<T>(dataIndex: Key<T>, title: ReactNode, extra?: Extra<T>): ColumnType<T> {
    return {
      key: dataIndex,
      dataIndex,
      title,
      width: 120,
      render: (value: string | null | undefined) => (value ? formatDate(value) : EMPTY_CELL),
      ...extra,
    };
  },

  /** Trạng thái qua `StatusTag` với bảng presentation của feature. */
  status<T, TStatus extends string>(
    dataIndex: Key<T>,
    title: ReactNode,
    presentations: Record<TStatus, StatusPresentation>,
    extra?: Extra<T>,
  ): ColumnType<T> {
    return {
      key: dataIndex,
      dataIndex,
      title,
      width: 150,
      render: (value: TStatus | null | undefined) =>
        value ? <StatusTag status={value} presentations={presentations} /> : EMPTY_CELL,
      ...extra,
    };
  },

  /** Cột thao tác cố định bên phải; `render` trả các `TableActionButton`. */
  actions<T>(render: (row: T) => ReactNode, extra?: Extra<T>): ColumnType<T> {
    return {
      key: 'actions',
      title: 'Thao tác',
      fixed: 'right',
      align: 'right',
      width: 120,
      // Chữ số đều bề ngang để số xếp thẳng cột.
      className: 'tabular-nums',
      render: (_: unknown, row: T) => <TableActions>{render(row)}</TableActions>,
      ...extra,
    };
  },
};
