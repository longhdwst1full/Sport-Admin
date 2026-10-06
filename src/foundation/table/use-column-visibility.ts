import { useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { ColumnItem } from './column-settings-modal';

/**
 * State ẩn/hiện cột cho `ColumnSettingsModal`: mặc định hiện tất cả, `apply` lọc mảng cột theo `key`.
 *
 * ```tsx
 * const columnsState = useColumnVisibility(ORDER_COLUMN_ITEMS);
 * <AdminTable columns={columnsState.apply(columns)} />
 * <ColumnSettingsModal {...columnsState.modalProps} columns={ORDER_COLUMN_ITEMS} />
 * ```
 */
export function useColumnVisibility<TId extends string>(items: readonly ColumnItem<TId>[]) {
  const initial = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, true])) as Record<TId, boolean>,
    [items],
  );
  const [visibility, setVisibility] = useState(initial);
  const [open, setOpen] = useState(false);

  return {
    visibility,
    open: () => setOpen(true),
    apply: <T,>(columns: ColumnsType<T>) =>
      columns.filter((column) => column.key === undefined || visibility[column.key as TId] !== false),
    modalProps: {
      isOpen: open,
      onClose: () => setOpen(false),
      visibility,
      onChange: setVisibility,
      onReset: () => setVisibility(initial),
    },
  };
}
