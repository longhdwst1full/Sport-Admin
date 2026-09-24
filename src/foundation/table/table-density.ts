import { useSyncExternalStore } from 'react';
import type { TableProps } from 'antd';
import { createBrowserStore, LocalStorageKey } from '@/core/storage';

export const TABLE_DENSITY = {
  COMPACT: 'compact',
  MIDDLE: 'middle',
  COMFORTABLE: 'comfortable',
} as const;

export type TableDensity = (typeof TABLE_DENSITY)[keyof typeof TABLE_DENSITY];

/**
 * `compact` là mặc định vì trùng với `size="small"` mà AdminTable vẫn dùng trước khi có thiết lập
 * này: người chưa chỉnh gì thì bảng không đổi.
 */
export const DEFAULT_TABLE_DENSITY: TableDensity = TABLE_DENSITY.COMPACT;

export const TABLE_DENSITY_SIZE: Record<TableDensity, NonNullable<TableProps['size']>> = {
  compact: 'small',
  middle: 'middle',
  comfortable: 'large',
};

const isTableDensity = (value: unknown): value is TableDensity =>
  Object.values(TABLE_DENSITY).includes(value as TableDensity);

/**
 * CONTRACT: giữ key `PREFERENCES` và dạng object `{ tableDensity }` để đọc được giá trị người dùng
 * đã lưu từ modal Settings cũ; các field cũ không còn dùng bị bỏ qua.
 */
const preferencesStore = createBrowserStore<{ tableDensity: TableDensity }>(
  LocalStorageKey.PREFERENCES,
  {
    parse: (raw) => {
      const density = (raw as { tableDensity?: unknown } | null)?.tableDensity;
      return isTableDensity(density) ? { tableDensity: density } : undefined;
    },
  },
);

let currentDensity: TableDensity = preferencesStore.read()?.tableDensity ?? DEFAULT_TABLE_DENSITY;
const listeners = new Set<() => void>();

export function setTableDensity(density: TableDensity): void {
  currentDensity = density;
  if (density === DEFAULT_TABLE_DENSITY) preferencesStore.clear();
  else preferencesStore.write({ tableDensity: density });
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Mọi AdminTable đang mở cập nhật ngay khi đổi mật độ, không cần tải lại trang. */
export function useTableDensity(): TableDensity {
  return useSyncExternalStore(subscribe, () => currentDensity, () => DEFAULT_TABLE_DENSITY);
}
