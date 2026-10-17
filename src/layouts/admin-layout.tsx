import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Dropdown,
  Layout,
  Menu,
  Tag,
  Tooltip,
  type MenuProps,
} from 'antd';
import {
  AppstoreOutlined,
  BankOutlined,
  BellOutlined,
  CommentOutlined,
  ControlOutlined,
  DashboardOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  InboxOutlined,
  LogoutOutlined,
  MenuOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  canSeeNavigationItem,
  NAVIGATION_GROUP_LABELS,
  NAVIGATION_ITEMS,
} from '@/app/navigation/navigation.config';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setSidebarCollapsed, toggleSidebar } from '@/app/store/layout.slice';
import { usePermissions } from '@/core/auth/permissions';
import { useAuth } from '@/core/auth/auth-context';
import { CopilotLauncher, CopilotPageContextProvider } from '@/features/assistant-copilot';
import { MfaSelfEnrollmentEntry } from '@/features/auth';
import { BrandLogo } from '@/foundation/brand/brand-logo';
import { PageContainer } from '@/foundation/layout/page-container';
import { NavigationTabs } from '@/layouts/components/navigation-tabs';
import { CommandPalette } from '@/layouts/components/command-palette';
import { getInitials } from '@/shared/utils';

const { Content, Header, Sider } = Layout;
const NOTIFICATIONS_PATH = '/notifications';

// Modal cài đặt (Tabs/Card/Descriptions) chỉ mở theo thao tác: tải lần đầu khi bấm, không nằm trong bundle khởi động.
const SettingsModal = lazy(() =>
  import('@/layouts/components/settings-modal').then((module) => ({ default: module.SettingsModal })),
);

export function AdminLayout() {
  const collapsed = useAppSelector((state) => state.layout.sidebarCollapsed);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const auth = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMounted, setSettingsMounted] = useState(false);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        dispatch(setSidebarCollapsed(true));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  const visibleItems = NAVIGATION_ITEMS.filter(
    (item) => canSeeNavigationItem(item, permissions),
  );

  const activeGroup = visibleItems.find((item) => item.path === location.pathname)?.group;
  const allSubKeys = Object.keys(NAVIGATION_GROUP_LABELS)
    .filter((g) => g !== 'overview')
    .map((g) => `sub-${g}`);
  const [openKeys, setOpenKeys] = useState<string[]>(() => allSubKeys);

  // Chuyển sang màn thuộc nhóm đang đóng thì mở nhóm đó; điều chỉnh ngay lúc render (RULE-HOOK-01).
  const [syncedGroup, setSyncedGroup] = useState(activeGroup);
  if (activeGroup !== syncedGroup) {
    setSyncedGroup(activeGroup);
    if (activeGroup && activeGroup !== 'overview' && !openKeys.includes(`sub-${activeGroup}`)) {
      setOpenKeys([...openKeys, `sub-${activeGroup}`]);
    }
  }

  const GROUP_ICONS: Record<string, React.ReactNode> = {
    overview: <DashboardOutlined />,
    sales: <ShoppingCartOutlined />,
    catalog: <AppstoreOutlined />,
    operations: <InboxOutlined />,
    experience: <CommentOutlined />,
    organization: <BankOutlined />,
    system: <ControlOutlined />,
  };

  const menuItems: MenuProps['items'] = Object.entries(NAVIGATION_GROUP_LABELS)
    .map(([group, label]) => {
      const children = visibleItems
        .filter((item) => item.group === group)
        .map((item) => ({
          key: item.path,
          icon: item.icon,
          label: item.label,
        }));

      if (children.length === 0) return null;

      if (group === 'overview' && children.length === 1) {
        return children[0];
      }

      return {
        key: `sub-${group}`,
        icon: GROUP_ICONS[group] ?? <ControlOutlined />,
        label,
        children,
      };
    })
    .filter(Boolean) as MenuProps['items'];

  const user = auth.currentUser;
  // Chưa có hồ sơ (đang tải hoặc dev bypass) thì hiện nhãn trung tính, không mượn tên người thật.
  const displayName = user?.displayName ?? 'Tài khoản quản trị';
  const employeeCode = user?.userId ? `NV${String(user.userId).padStart(6, '0')}` : undefined;
  const initials = getInitials(displayName);
  const signOut = () => void auth.signOut();
  const userMenu: MenuProps = {
    items: [{ key: 'sign-out', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true }],
    onClick: signOut,
  };
  // PERMISSION: chuông chỉ là lối tắt tới màn Thông báo email; ẩn khi route đó không được phép xem.
  const canOpenNotifications = visibleItems.some((item) => item.path === NOTIFICATIONS_PATH);

  return (
    <CopilotPageContextProvider>
    <Layout className="h-screen max-h-screen overflow-hidden bg-white">
      {/* ── Command Palette (Cmd+K) ──────────────────────────── */}
      <CommandPalette />

      {/* ── Body (Sidebar + Main) ─────────────────────────────── */}
      <Layout className="relative h-full min-h-0 overflow-hidden">
        {/* Mobile backdrop overlay */}
        {isMobile && !collapsed && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => dispatch(setSidebarCollapsed(true))}
          />
        )}

        {/* ── Sidebar (JARVIS Style) ──────────────────────────── */}
        <Sider
          width={240}
          collapsedWidth={isMobile ? 0 : 64}
          collapsed={collapsed}
          theme="dark"
          breakpoint="lg"
          onCollapse={(nextCollapsed) => {
            if (nextCollapsed !== collapsed) dispatch(setSidebarCollapsed(nextCollapsed));
          }}
          className={`dctd-dark-sidebar !flex !h-full !flex-col !border-r !border-slate-800/80 transition-all duration-300 ${
            isMobile && !collapsed ? '!fixed !inset-y-0 !left-0 !z-50 !shadow-2xl' : ''
          }`}
        >
          <div className="flex h-full min-h-0 flex-col">
            {/* ── Logo area (h-11 = 44px) ────────────────────── */}
            <div
              className={`flex shrink-0 items-center border-b border-slate-800/80 px-3 h-[44px] ${
                collapsed ? 'justify-center' : 'justify-between'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isMobile && (
                  <Button
                    type="text"
                    size="small"
                    icon={<MenuOutlined className="!text-slate-400" />}
                    onClick={() => dispatch(toggleSidebar())}
                    className="!text-slate-400 hover:!text-white shrink-0"
                    aria-label="Thu gọn/mở rộng menu"
                  />
                )}
                <button
                  type="button"
                  aria-label="Về trang tổng quan"
                  className="rounded-lg p-0.5 transition-all duration-200 hover:opacity-80 focus-visible:outline-none"
                  onClick={() => navigate('/')}
                >
                  <BrandLogo compact={isMobile || collapsed} dark />
                </button>
              </div>

              {/* Collapse button `<<` or `>>` (JARVIS Style) */}
              {!isMobile && !collapsed && (
                <button
                  type="button"
                  onClick={() => dispatch(toggleSidebar())}
                  className="flex size-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  title="Thu gọn menu"
                  aria-label="Thu gọn menu"
                >
                  <DoubleLeftOutlined className="text-xs" />
                </button>
              )}
            </div>

            {/* ── Menu ──────────────────────────────────────── */}
            <Menu
              mode="inline"
              inlineCollapsed={collapsed}
              className="dctd-side-menu dctd-dark-menu dctd-sidebar-scroll min-h-0 flex-1 overflow-y-auto !border-e-0 px-2 py-2"
              selectedKeys={[location.pathname]}
              openKeys={collapsed ? undefined : openKeys}
              onOpenChange={(keys) => setOpenKeys(keys)}
              onClick={({ key }) => {
                navigate(key);
                if (isMobile) dispatch(setSidebarCollapsed(true));
              }}
              items={menuItems}
            />

            {/* ── DEV notice ────────────────────────────────── */}
            {/* Chỉ báo khi bypass thật sự bật; `VITE_DEV_BYPASS_PERMISSIONS=false` thì dev đang thử quyền thật. */}
            {!collapsed && auth.developmentBypass && (
              <div className="mx-3 mb-2 rounded border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400">
                <span className="mr-1.5 inline-block size-1.5 rounded-full bg-amber-400" />
                Đang bỏ qua phân quyền (DEV)
              </div>
            )}

            {/* ── Sidebar footer: user + logout (JARVIS Style) ── */}
            <div className="shrink-0 border-t border-slate-800/80 p-2">
              <div className={`dctd-sidebar-user ${collapsed ? '!flex-col !gap-1 !px-0' : ''}`}>
                <Avatar
                  size={collapsed ? 30 : 32}
                  className="!flex !items-center !justify-center !text-xs !font-bold shrink-0"
                  style={{
                    background: 'var(--ba-action-gradient)',
                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  {initials}
                </Avatar>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-slate-200">
                      {displayName}
                    </div>
                    {employeeCode && (
                      <div className="truncate text-[10.5px] text-slate-400 font-mono">
                        {employeeCode}
                      </div>
                    )}
                  </div>
                )}
                {/* UX: thu gọn vẫn giữ nút đăng xuất (xuống dòng dưới avatar) để không mất lối thoát. */}
                <Tooltip title="Đăng xuất" placement={collapsed ? 'right' : 'top'}>
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex size-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400 shrink-0"
                    aria-label="Đăng xuất"
                  >
                    <LogoutOutlined className="text-sm" />
                  </button>
                </Tooltip>
              </div>

              {/* Unfold button when collapsed */}
              {!isMobile && collapsed && (
                <button
                  type="button"
                  onClick={() => dispatch(toggleSidebar())}
                  className="mt-1 flex w-full items-center justify-center rounded py-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  title="Mở rộng menu"
                  aria-label="Mở rộng menu"
                >
                  <DoubleRightOutlined className="text-xs" />
                </button>
              )}
            </div>
          </div>
        </Sider>

        {/* ── Main Content Column ───────────────────────────────── */}
        <Layout className="h-full min-h-0 min-w-0 flex flex-col">
          {/* ── Header (JARVIS Workspace Tab Bar) ──────────────── */}
          <Header className="!flex !h-[46px] !items-stretch !border-b !border-[var(--ba-shell-header-border)] !bg-[var(--ba-shell-header-bg)] !px-0 !leading-none shadow-none z-10 shrink-0 select-none">
            {/* Sidebar toggle button (when collapsed on any screen) */}
            {collapsed && (
              <Button
                type="text"
                size="small"
                icon={<MenuOutlined className="text-slate-600 text-sm" />}
                onClick={() => dispatch(toggleSidebar())}
                className="ml-2 self-center !text-slate-600 hover:!bg-slate-200/70"
                aria-label="Mở thanh bên"
                title="Mở thanh bên"
              />
            )}

            {/* Navigation tabs + right actions */}
            <div className="flex min-w-0 flex-1 items-stretch justify-between">
              <NavigationTabs navigationItems={visibleItems} />

              <div className="flex shrink-0 items-center gap-1.5 border-l border-slate-300/80 pl-2.5 pr-3 bg-[var(--ba-shell-toolbar-bg)]">
                {import.meta.env.DEV && (
                  <Tag
                    className="!mr-1 !rounded !border-amber-200 !bg-amber-50 !px-1.5 !py-0 !text-[10px] !font-semibold !text-amber-700"
                  >
                    DEV
                  </Tag>
                )}

                {/* Copilot: tự ẩn khi thiếu assistant.use hoặc assistant.tool.execute */}
                <CopilotLauncher className="!mr-1" />

                {/* Search icon button */}
                <Tooltip title="Tìm kiếm nhanh (Ctrl+K)">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    aria-label="Tìm kiếm nhanh"
                    icon={<SearchOutlined />}
                    onClick={() =>
                      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
                    }
                    className="!text-slate-500 hover:!bg-slate-200/70 hover:!text-slate-800"
                  />
                </Tooltip>

                {/* Chưa có nguồn đếm thông báo cho người dùng: chuông chỉ dẫn tới màn email outbox, không hiện số giả. */}
                {canOpenNotifications && (
                  <Tooltip title="Thông báo email">
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      aria-label="Thông báo email"
                      icon={<BellOutlined />}
                      onClick={() => navigate(NOTIFICATIONS_PATH)}
                      className="!text-slate-500 hover:!bg-slate-200/70 hover:!text-slate-800"
                    />
                  </Tooltip>
                )}

                {/* Settings gear icon */}
                <Tooltip title="Cài đặt hệ thống">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    aria-label="Cài đặt hệ thống"
                    icon={<SettingOutlined />}
                    onClick={() => {
                      setSettingsMounted(true);
                      setSettingsOpen(true);
                    }}
                    className="!text-slate-500 hover:!bg-slate-200/70 hover:!text-slate-800"
                  />
                </Tooltip>

                <MfaSelfEnrollmentEntry />

                {/* Menu tài khoản ở header: lối đăng xuất khi sidebar ẩn hẳn (mobile, collapsedWidth = 0). */}
                <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
                  <button
                    type="button"
                    aria-label="Tài khoản"
                    className="flex items-center gap-2 pl-2 border-l border-slate-300/80"
                  >
                    <Avatar
                      size={28}
                      className="!flex !items-center !justify-center !text-[11px] !font-bold shrink-0 cursor-pointer"
                      style={{
                        background: 'var(--ba-action-gradient)',
                        boxShadow: '0 1px 4px rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      {initials}
                    </Avatar>
                    <span className="hidden xl:inline text-xs font-semibold text-slate-700 max-w-28 truncate">
                      {displayName}
                    </span>
                  </button>
                </Dropdown>
              </div>
            </div>
          </Header>

          {/* ── Content Area (Internal scroll strictly within 100vh) ── */}
          <Content className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[var(--ba-shell-content-bg)] p-3.5 sm:p-5 lg:p-6">
            <PageContainer>
              <div className="dctd-page-enter flex min-h-0 flex-1 flex-col" key={location.pathname}>
                <Outlet />
              </div>
            </PageContainer>
          </Content>
        </Layout>
      </Layout>


      {/* ── Settings Modal ─────────────────────────────────────── */}
      {settingsMounted && (
        <Suspense fallback={null}>
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </Layout>
    </CopilotPageContextProvider>
  );
}
