import { useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { ColumnItem } from './column-settings-modal';
import {
  createColumnVisibilityStore,
  defaultColumnVisibility,
  restoreColumnVisibility,
  toStoredColumnVisibility,
} from './column-visibility.storage';

/**
 * State ẩn/hiện cột cho `ColumnSettingsModal`: mặc định hiện tất cả, `apply` lọc mảng cột theo `key`.
 * Lựa chọn được lưu localStorage theo `storageKey` (ổn định, duy nhất mỗi bảng); "Mặc định" xoá bản lưu.
 *
 * ```tsx
 * const columnsState = useColumnVisibility(ORDER_COLUMN_ITEMS, 'orders');
 * <AdminTable columns={columnsState.apply(columns)} />
 * <ColumnSettingsModal {...columnsState.modalProps} columns={ORDER_COLUMN_ITEMS} />
 * ```
 */
export function useColumnVisibility<TId extends string>(
  items: readonly ColumnItem<TId>[],
  storageKey: string,
) {
  const store = useMemo(() => createColumnVisibilityStore(storageKey), [storageKey]);
  const [visibility, setVisibility] = useState(() => restoreColumnVisibility(items, store.read()));
  const [open, setOpen] = useState(false);

  const change = (next: Record<TId, boolean>) => {
    setVisibility(next);
    const stored = toStoredColumnVisibility(items, next);
    if (stored.hidden.length === 0) store.clear();
    else store.write(stored);
  };

  return {
    visibility,
    open: () => setOpen(true),
    apply: <T,>(columns: ColumnsType<T>) =>
      columns.filter((column) => column.key === undefined || visibility[column.key as TId] !== false),
    modalProps: {
      isOpen: open,
      onClose: () => setOpen(false),
      visibility,
      onChange: change,
      onReset: () => {
        setVisibility(defaultColumnVisibility(items));
        store.clear();
      },
    },
  };
}
