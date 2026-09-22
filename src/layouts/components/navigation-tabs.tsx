import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, type MenuProps } from 'antd';
import {
  AppstoreOutlined,
  CheckOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  EllipsisOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { NavigationItem } from '@/app/navigation/navigation.config';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  closeAllTabs,
  closeNavigationTab,
  closeOtherTabs,
  openNavigationTab,
} from '@/app/store/layout.slice';

interface NavigationTabsProps {
  navigationItems: NavigationItem[];
}

export function NavigationTabs({ navigationItems }: NavigationTabsProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const openTabs = useAppSelector((state) => state.layout.openTabs);
  const activePath = useAppSelector((state) => state.layout.activePath);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allowedPaths = useMemo(
    () => new Set(navigationItems.map((item) => item.path)),
    [navigationItems],
  );
  const visibleTabs = openTabs.filter((tab) => allowedPaths.has(tab.path));

  useEffect(() => {
    const currentItem = navigationItems.find((item) => item.path === location.pathname);
    if (!currentItem) return;
    if (
      activePath !== currentItem.path ||
      !openTabs.some((tab) => tab.path === currentItem.path && tab.label === currentItem.label)
    ) {
      dispatch(openNavigationTab({ path: currentItem.path, label: currentItem.label }));
    }
  }, [activePath, dispatch, location.pathname, navigationItems, openTabs]);

  // Scroll to active tab on change
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeElem = scrollContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeElem) {
      activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [location.pathname]);

  // Horizontal mouse wheel scroll support
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const handleClose = (closingPath: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const closingIndex = visibleTabs.findIndex((tab) => tab.path === closingPath);
    const remaining = visibleTabs.filter((tab) => tab.path !== closingPath);
    const nextPath = remaining[Math.max(0, closingIndex - 1)]?.path ?? '/';
    dispatch(closeNavigationTab(closingPath));
    if (location.pathname === closingPath) navigate(nextPath);
  };

  const handleCloseOther = (keepPath: string) => {
    dispatch(closeOtherTabs(keepPath));
    if (location.pathname !== keepPath) navigate(keepPath);
  };

  const handleCloseAll = () => {
    dispatch(closeAllTabs());
    navigate('/');
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-full items-center gap-2 px-3 text-xs text-slate-500">
        <span className="inline-block size-1.5 rounded-full bg-amber-500" />
        <span className="font-medium">Bảng điều khiển</span>
      </div>
    );
  }

  // Dropdown menu items for the "..." ellipsis button
  const moreMenu: MenuProps = {
    items: [
      {
        key: 'header',
        type: 'group',
        label: (
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            <span>Tab đang mở</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-mono text-[10px]">
              {visibleTabs.length}
            </span>
          </div>
        ),
      },
      ...visibleTabs.map((tab) => {
        const isActive = tab.path === location.pathname;
        return {
          key: tab.path,
          icon: isActive ? (
            <CheckOutlined className="text-amber-600 font-bold" />
          ) : (
            <span className="inline-block w-3.5" />
          ),
          label: (
            <div className="flex items-center justify-between gap-4 min-w-[160px]">
              <span className={`text-xs ${isActive ? 'font-semibold text-amber-700' : 'text-slate-700'}`}>
                {tab.label}
              </span>
              <span
                role="button"
                className="text-slate-400 hover:text-red-500 transition-colors px-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(tab.path);
                }}
              >
                ✕
              </span>
            </div>
          ),
          onClick: () => navigate(tab.path),
        };
      }),
      { type: 'divider' },
      {
        key: 'closeOther',
        icon: <ClearOutlined />,
        label: 'Đóng các tab khác',
        disabled: visibleTabs.length <= 1,
        onClick: () => handleCloseOther(location.pathname),
      },
      {
        key: 'closeAll',
        icon: <CloseCircleOutlined />,
        label: 'Đóng tất cả tab',
        danger: true,
        onClick: handleCloseAll,
      },
    ],
  };

  const handlePrevTab = () => {
    const currentIndex = visibleTabs.findIndex((tab) => tab.path === location.pathname);
    if (currentIndex > 0) {
      navigate(visibleTabs[currentIndex - 1].path);
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const handleNextTab = () => {
    const currentIndex = visibleTabs.findIndex((tab) => tab.path === location.pathname);
    if (currentIndex >= 0 && currentIndex < visibleTabs.length - 1) {
      navigate(visibleTabs[currentIndex + 1].path);
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex min-w-0 flex-1 items-stretch">
      {/* Navigation Arrows < > */}
      {visibleTabs.length > 1 && (
        <div className="flex items-center gap-1 shrink-0 px-2 self-center">
          <Tooltip title="Tab trước">
            <button
              type="button"
              aria-label="Tab trước"
              onClick={handlePrevTab}
              className="flex size-7.5 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:border-slate-300/80 hover:shadow-xs border border-transparent active:scale-95 transition-all duration-150"
            >
              <LeftOutlined className="text-[11px]" />
            </button>
          </Tooltip>
          <Tooltip title="Tab sau">
            <button
              type="button"
              aria-label="Tab sau"
              onClick={handleNextTab}
              className="flex size-7.5 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:border-slate-300/80 hover:shadow-xs border border-transparent active:scale-95 transition-all duration-150"
            >
              <RightOutlined className="text-[11px]" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Scrollable Tabs Bar */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="dctd-nav-tabs-scroll relative flex min-w-0 flex-1 items-end overflow-x-auto overflow-y-hidden"
        role="tablist"
      >
        {visibleTabs.map((tab) => {
          const active = tab.path === location.pathname;

          // Context menu items for right-clicking each tab
          const contextMenu: MenuProps = {
            items: [
              {
                key: 'navigate',
                icon: <AppstoreOutlined />,
                label: 'Chuyển đến tab này',
                onClick: () => navigate(tab.path),
              },
              {
                key: 'close',
                icon: <CloseOutlined />,
                label: 'Đóng tab này',
                onClick: () => handleClose(tab.path),
              },
              {
                key: 'closeOther',
                icon: <ClearOutlined />,
                label: 'Đóng các tab khác',
                disabled: visibleTabs.length <= 1,
                onClick: () => handleCloseOther(tab.path),
              },
              { type: 'divider' },
              {
                key: 'closeAll',
                icon: <CloseCircleOutlined />,
                label: 'Đóng tất cả tab',
                danger: true,
                onClick: handleCloseAll,
              },
            ],
          };

          const navItem = navigationItems.find((item) => item.path === tab.path);

          return (
            <Dropdown key={tab.path} menu={contextMenu} trigger={['contextMenu']}>
              <div
                role="tab"
                aria-selected={active}
                data-active={active}
                className="dctd-nav-tab group select-none shrink-0"
                onClick={() => navigate(tab.path)}
              >
                {navItem?.icon && (
                  <span
                    className={`dctd-tab-icon shrink-0 flex items-center transition-transform duration-200 group-hover:scale-110 ${
                      active ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {navItem.icon}
                  </span>
                )}
                <span className="max-w-52 truncate tracking-[-0.01em]">{tab.label}</span>
                <span
                  role="button"
                  aria-label={`Đóng tab ${tab.label}`}
                  className="dctd-tab-close"
                  onClick={(event) => handleClose(tab.path, event)}
                  title="Đóng tab"
                >
                  ×
                </span>
              </div>
            </Dropdown>
          );
        })}
      </div>

      {/* Overflow Ellipsis Button "..." */}
      <Dropdown menu={moreMenu} trigger={['click']} placement="bottomRight" overlayClassName="min-w-[220px]">
        <button
          type="button"
          aria-label="Danh sách tab & tùy chọn đóng tab"
          className="flex size-7.5 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:border-slate-300/80 hover:shadow-xs border border-transparent active:scale-95 transition-all duration-150 self-center mr-2 ml-1.5"
          title="Tất cả tab đang mở (...)"
        >
          <EllipsisOutlined className="text-base" />
        </button>
      </Dropdown>
    </div>
  );
}
