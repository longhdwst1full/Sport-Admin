// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { LocalStorageKey } from '@/core/storage';
import type { ColumnItem } from './column-settings-modal';
import type { StoredColumnVisibility } from './column-visibility.storage';
import {
  COLUMN_VISIBILITY_STORAGE_VERSION,
  createColumnVisibilityStore,
  parseStoredColumnVisibility,
  restoreColumnVisibility,
  toStoredColumnVisibility,
} from './column-visibility.storage';

type Id = 'code' | 'name' | 'status';
const ITEMS: ColumnItem<Id>[] = [
  { id: 'code', label: 'Mã', fixed: true },
  { id: 'name', label: 'Tên' },
  { id: 'status', label: 'Trạng thái' },
];

describe('parseStoredColumnVisibility', () => {
  it('accepts the current version and drops non-string ids', () => {
    expect(parseStoredColumnVisibility({ v: 1, hidden: ['name', 3, null] })).toEqual({ v: 1, hidden: ['name'] });
  });

  it('rejects other versions and malformed shapes', () => {
    expect(parseStoredColumnVisibility({ v: 0, hidden: ['name'] })).toBeUndefined();
    expect(parseStoredColumnVisibility({ v: 1, hidden: 'name' })).toBeUndefined();
    expect(parseStoredColumnVisibility(null)).toBeUndefined();
    expect(parseStoredColumnVisibility(['name'])).toBeUndefined();
  });
});

describe('restoreColumnVisibility', () => {
  it('defaults to all visible without stored data', () => {
    expect(restoreColumnVisibility(ITEMS, undefined)).toEqual({ code: true, name: true, status: true });
  });

  it('hides stored ids, ignores removed ids and never hides fixed columns', () => {
    const stored: StoredColumnVisibility = { v: COLUMN_VISIBILITY_STORAGE_VERSION, hidden: ['status', 'removed', 'code'] };
    expect(restoreColumnVisibility(ITEMS, stored)).toEqual({ code: true, name: true, status: false });
  });

  it('falls back to defaults when the stored data would hide every column', () => {
    const items: ColumnItem<'a' | 'b'>[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    expect(restoreColumnVisibility(items, { v: 1, hidden: ['a', 'b'] })).toEqual({ a: true, b: true });
  });
});

describe('toStoredColumnVisibility', () => {
  it('stores only hidden known ids with the current version', () => {
    expect(toStoredColumnVisibility(ITEMS, { code: true, name: false, status: true })).toEqual({
      v: COLUMN_VISIBILITY_STORAGE_VERSION,
      hidden: ['name'],
    });
  });
});

describe('createColumnVisibilityStore', () => {
  const key = `${LocalStorageKey.TABLE_COLUMNS_PREFIX}test-table`;
  afterEach(() => window.localStorage.removeItem(key));

  it('round-trips per table key and tolerates corrupt storage', () => {
    const store = createColumnVisibilityStore('test-table');
    store.write({ v: 1, hidden: ['status'] });
    expect(store.read()).toEqual({ v: 1, hidden: ['status'] });

    window.localStorage.setItem(key, '{not json');
    expect(store.read()).toBeUndefined();
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});
