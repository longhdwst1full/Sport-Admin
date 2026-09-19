import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Layout,
  Menu,
  Tag,
  Tooltip,
  type MenuProps,
} from 'antd';
import {
  BellOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
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
import { BrandLogo } from '@/foundation/brand/brand-logo';
import { PageContainer } from '@/foundation/layout/page-container';
import { NavigationTabs } from '@/layouts/components/navigation-tabs';
import { UserDropdown } from '@/layouts/components/user-dropdown';
import { CommandPalette } from '@/layouts/components/command-palette';

const { Content, Header, Sider } = Layout;

export function AdminLayout() {
  const collapsed = useAppSelector((state) => state.layout.sidebarCollapsed);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = usePermissions();

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
  const groupedItems = Object.entries(NAVIGATION_GROUP_LABELS)
    .map(([group, label]) => ({
      type: 'group' as const,
      key: group,
      label,
      children: visibleItems
        .filter((item) => item.group === group)
        .map((item) => ({ key: item.path, icon: item.icon, label: item.label })),
    }))
    .filter((group) => group.children.length > 0) satisfies MenuProps['items'];

  return (
    <Layout className="h-[100dvh] min-h-[100vh] overflow-hidden bg-slate-50">
      {/* ── Command Palette (Cmd+K) ──────────────────────────── */}
      <CommandPalette />

      {/* ── Header ───────────────────────────────────────────── */}
      <Header className="dctd-glass-strong !flex !h-[72px] !items-center !border-b !border-slate-200/60 !px-0">
        {/* Logo area */}
        <div
          className={`flex h-full shrink-0 items-center border-r border-slate-200/60 px-3 md:px-4 transition-[width] duration-300 ease-smooth-out ${
            isMobile
              ? 'w-auto'
              : collapsed
                ? 'w-[80px] justify-center'
                : 'w-[260px]'
          }`}
        >
          {isMobile && (
            <Button
              type="text"
              size="small"
              icon={<MenuOutlined className="text-slate-600" />}
              onClick={() => dispatch(toggleSidebar())}
              className="mr-2 !text-slate-600"
              aria-label="Toggle menu"
            />
          )}
          <button
            type="button"
            aria-label="Về trang tổng quan"
            className="rounded-xl p-1 transition-all duration-200 hover:bg-slate-50 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500/40"
            onClick={() => navigate('/')}
          >
            <BrandLogo compact={isMobile || collapsed} />
          </button>
        </div>

        {/* Navigation tabs + right actions */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 px-2 sm:px-5">
          <NavigationTabs navigationItems={visibleItems} />

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {import.meta.env.DEV && (
              <Tag
                className="!mr-0 !rounded-lg !border-amber-200 !bg-amber-50 !px-2.5 !text-[11px] !font-semibold !text-amber-700"
              >
                DEV
              </Tag>
            )}

            {/* Notifications */}
            <Tooltip title="Thông báo">
              <Badge dot offset={[-4, 4]}>
                <Button
                  type="text"
                  shape="circle"
                  aria-label="Thông báo"
                  icon={<BellOutlined />}
                  className="!text-slate-500 hover:!bg-slate-100 hover:!text-slate-800"
                />
              </Badge>
            </Tooltip>

            {/* Divider */}
            <div className="mx-1.5 h-7 w-px bg-slate-200" />

            {/* User dropdown */}
            <UserDropdown />
          </div>
        </div>
      </Header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <Layout className="relative h-[calc(100dvh-72px)] min-h-0 overflow-hidden">
        {/* Mobile backdrop overlay */}
        {isMobile && !collapsed && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => dispatch(setSidebarCollapsed(true))}
          />
        )}

        {/* ── Sidebar ──────────────────────────────────────── */}
        <Sider
          width={260}
          collapsedWidth={isMobile ? 0 : 80}
          collapsed={collapsed}
          theme="light"
          breakpoint="lg"
          onCollapse={(nextCollapsed) => {
            if (nextCollapsed !== collapsed) dispatch(setSidebarCollapsed(nextCollapsed));
          }}
          className={`!flex !h-full !flex-col !border-r !border-slate-200/60 !bg-white transition-all duration-300 ${
            isMobile && !collapsed ? '!fixed !inset-y-0 !left-0 !z-50 !shadow-2xl' : ''
          }`}
          style={{ boxShadow: '1px 0 12px rgb(15 23 42 / 0.02)' }}
        >
          <div className="flex h-full min-h-0 flex-col py-3">
            {/* Menu */}
            <Menu
              mode="inline"
              inlineCollapsed={collapsed}
              className="dctd-side-menu dctd-sidebar-scroll min-h-0 flex-1 overflow-y-auto !border-e-0 !bg-white px-2"
              selectedKeys={[location.pathname]}
              onClick={({ key }) => {
                navigate(key);
                if (isMobile) dispatch(setSidebarCollapsed(true));
              }}
              items={groupedItems}
            />

            {/* DEV notice */}
            {!collapsed && import.meta.env.DEV && (
              <div className="mx-3 mb-3 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-3 text-xs text-amber-700">
                <span className="mr-1 inline-block size-1.5 rounded-full bg-amber-400" />
                Frontend đang bypass permission
              </div>
            )}

            {/* Collapse toggle */}
            <Tooltip title={collapsed ? 'Mở rộng menu' : undefined} placement="right">
              <Button
                type="text"
                className="!mx-3 !flex !items-center !justify-center !rounded-xl !text-slate-400 hover:!bg-slate-100 hover:!text-slate-600"
                aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => dispatch(toggleSidebar())}
              >
                {!collapsed && <span className="text-sm">Thu gọn</span>}
              </Button>
            </Tooltip>
          </div>
        </Sider>

        {/* ── Content ────────────────────────────────────────── */}
        <Layout className="h-full min-h-0 min-w-0">
          <Content className="h-full min-h-0 overflow-auto bg-gradient-to-b from-slate-50 via-slate-50/80 to-slate-100/50 p-3.5 sm:p-5 lg:p-8">
            <PageContainer>
              <div className="dctd-page-enter" key={location.pathname}>
                <Outlet />
              </div>
            </PageContainer>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
