import type { ReactNode } from 'react';

export interface PageTabItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: number | string;
}

export interface PageTabsProps {
  items: PageTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  extra?: ReactNode;
}

/**
 * Level 3 Navigation — Page-level Tabs
 * Phân cấp điều hướng nhỏ bên trong từng page (khác với Workspace Navbar tabs ở trên).
 * Thiết kế gọn gàng, thanh lịch với active indicator rõ ràng.
 */
export function PageTabs({
  items,
  activeKey,
  onChange,
  className = '',
  extra,
}: PageTabsProps) {
  return (
    <div
      className={`flex items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 ${className}`}
      role="tablist"
      aria-label="Page navigation tabs"
    >
      <div className="flex items-center gap-1 sm:gap-2 -mb-[1px]">
        {items.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={`group relative flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-[13px] font-medium transition-all focus-visible:outline-none ${
                isActive
                  ? 'text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 rounded-t'
              }`}
            >
              {tab.icon && (
                <span
                  className={`text-sm transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>

              {tab.badge !== undefined && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}

              {/* Active Underline Indicator */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-blue-600 shadow-xs"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {extra && <div className="flex items-center py-2">{extra}</div>}
    </div>
  );
}
