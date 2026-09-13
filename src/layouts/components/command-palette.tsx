import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import type { NavigationItem } from '@/app/navigation/navigation.config';
import { NAVIGATION_ITEMS } from '@/app/navigation/navigation.config';
import { usePermissions } from '@/core/auth/permissions';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const permissions = usePermissions();

  const visibleItems = useMemo(
    () =>
      NAVIGATION_ITEMS.filter(
        (item) => !item.permission || permissions.has(item.permission),
      ),
    [permissions],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return visibleItems;
    const q = query.trim().toLowerCase();
    return visibleItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q),
    );
  }, [query, visibleItems]);

  const execute = useCallback(
    (item: NavigationItem) => {
      navigate(item.path);
      setOpen(false);
      setQuery('');
    },
    [navigate],
  );

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection on query change
  useEffect(() => setSelectedIndex(0), [query]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && filtered[selectedIndex]) {
      execute(filtered[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={() => {
          setOpen(false);
          setQuery('');
        }}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg animate-scale-in rounded-2xl border border-slate-200 bg-white shadow-elevated">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <SearchOutlined className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm trang, chức năng..."
            className="h-14 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Không tìm thấy kết quả cho "{query}"
            </div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.path}
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-admin-50 text-admin-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => execute(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-base ${
                    index === selectedIndex
                      ? 'bg-admin-100 text-admin-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="truncate text-xs text-slate-400">
                    {item.path}
                  </div>
                </div>
                {index === selectedIndex && (
                  <span className="text-xs text-admin-500">↵</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
          <span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>{' '}
            di chuyển
          </span>
          <span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>{' '}
            mở trang
          </span>
          <span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">esc</kbd>{' '}
            đóng
          </span>
        </div>
      </div>
    </div>
  );
}
