import { createBrowserStore, LocalStorageKey, type BrowserStore } from '@/core/storage';
import type { ColumnItem } from './column-settings-modal';

/** Tăng khi đổi dạng lưu; bản cũ khác version bị bỏ qua (về mặc định). */
export const COLUMN_VISIBILITY_STORAGE_VERSION = 1;

/**
 * Chỉ lưu danh sách cột BỊ ẨN: cột mới thêm sau này mặc định hiện, id cột đã bỏ khỏi bảng bị lờ đi.
 */
export interface StoredColumnVisibility {
  v: typeof COLUMN_VISIBILITY_STORAGE_VERSION;
  hidden: string[];
}

export function parseStoredColumnVisibility(raw: unknown): StoredColumnVisibility | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const { v, hidden } = raw as Partial<Record<keyof StoredColumnVisibility, unknown>>;
  if (v !== COLUMN_VISIBILITY_STORAGE_VERSION || !Array.isArray(hidden)) return undefined;
  return { v, hidden: hidden.filter((id): id is string => typeof id === 'string') };
}

/** Mặc định: hiện mọi cột. */
export function defaultColumnVisibility<TId extends string>(
  items: readonly ColumnItem<TId>[],
): Record<TId, boolean> {
  return Object.fromEntries(items.map((item) => [item.id, true])) as Record<TId, boolean>;
}

/**
 * Dựng visibility từ bản đã lưu: bỏ id lạ, không ẩn cột `fixed`, và nếu bản lưu ẩn hết cột thì
 * quay về mặc định (giữ bất biến "ít nhất một cột hiện" như modal).
 */
export function restoreColumnVisibility<TId extends string>(
  items: readonly ColumnItem<TId>[],
  stored: StoredColumnVisibility | undefined,
): Record<TId, boolean> {
  const visibility = defaultColumnVisibility(items);
  if (!stored || stored.hidden.length === 0) return visibility;
  const hidden = new Set(stored.hidden);
  let visibleCount = 0;
  for (const item of items) {
    const visible = item.fixed === true || !hidden.has(item.id);
    visibility[item.id] = visible;
    if (visible) visibleCount += 1;
  }
  return visibleCount > 0 ? visibility : defaultColumnVisibility(items);
}

export function toStoredColumnVisibility<TId extends string>(
  items: readonly ColumnItem<TId>[],
  visibility: Record<TId, boolean>,
): StoredColumnVisibility {
  return {
    v: COLUMN_VISIBILITY_STORAGE_VERSION,
    hidden: items.filter((item) => visibility[item.id] === false).map((item) => item.id),
  };
}

export function createColumnVisibilityStore(storageKey: string): BrowserStore<StoredColumnVisibility> {
  return createBrowserStore(`${LocalStorageKey.TABLE_COLUMNS_PREFIX}${storageKey}`, {
    parse: parseStoredColumnVisibility,
  });
}
