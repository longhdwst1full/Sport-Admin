import { select, takeEvery } from 'redux-saga/effects';
import {
  closeNavigationTab,
  openNavigationTab,
  setSidebarCollapsed,
  toggleSidebar,
  type LayoutState,
  type NavigationTab,
} from './layout.slice';
import type { RootState } from './store';
import { createBrowserStore, LocalStorageKey } from '@/core/storage';

const LAYOUT_STORAGE_KEY = LocalStorageKey.LAYOUT;

// Hydration phải loại bỏ field lạ và chịu được bản ghi cũ/hỏng (RULE-CORE-01).
const layoutStore = createBrowserStore<LayoutState>(LAYOUT_STORAGE_KEY, {
  parse: (parsed) => (isPersistedLayout(parsed) ? normalizePersistedLayout(parsed) : undefined),
});

function* persistLayout() {
  const layout: LayoutState = yield select((state: RootState) => state.layout);
  layoutStore.write(layout);
}

function isNavigationTab(value: unknown): value is NavigationTab {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof value.path === 'string' &&
    'label' in value &&
    typeof value.label === 'string'
  );
}

function isPersistedLayout(parsed: unknown): parsed is LayoutState {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'sidebarCollapsed' in parsed &&
    typeof parsed.sidebarCollapsed === 'boolean' &&
    'openTabs' in parsed &&
    Array.isArray(parsed.openTabs) &&
    parsed.openTabs.every(isNavigationTab) &&
    'activePath' in parsed &&
    (typeof parsed.activePath === 'string' || parsed.activePath === null)
  );
}

function normalizePersistedLayout(parsed: LayoutState): LayoutState {
  return {
    sidebarCollapsed: parsed.sidebarCollapsed,
    openTabs: parsed.openTabs.slice(0, 12),
    activePath: parsed.activePath,
  };
}

export function readPersistedLayout(): LayoutState | undefined {
  return layoutStore.read();
}

export function* rootSaga() {
  yield takeEvery(
    [toggleSidebar.type, setSidebarCollapsed.type, openNavigationTab.type, closeNavigationTab.type],
    persistLayout,
  );
}
