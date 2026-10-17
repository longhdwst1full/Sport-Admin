import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PermissionRoute } from '@/core/auth/permission-route';
import { AuthenticatedRoute } from '@/core/auth/authenticated-route';
import { usePermissions } from '@/core/auth/permissions';
import { canSeeNavigationItem, NAVIGATION_ITEMS_DATA } from '@/shared/constants/navigation';
// Các barrel nhiều trang tự export từng trang dạng React.lazy (một chunk mỗi trang) — không bọc lazy lần nữa.
import { ChangePasswordPage, LoginPage } from '@/features/auth';
import { AttributesPage, BrandsPage, CategoriesPage } from '@/features/catalog-masters';
import {
  BannersPage,
  ContentPage,
  SocialDashboardPage,
  TikTokCallbackPage,
} from '@/features/content';

// Khung admin (menu, tab, command palette, copilot) chỉ tải sau đăng nhập; /login không kéo theo.
const AdminLayout = lazy(async () => {
  const [layout, policy] = await Promise.all([
    import('@/layouts/admin-layout'),
    import('@/app/config/reference-data-policy-gate'),
  ]);
  return {
    default: () => (
      <policy.ReferenceDataPolicyGate>
        <layout.AdminLayout />
      </policy.ReferenceDataPolicyGate>
    ),
  };
});

const DashboardPage = lazy(() =>
  import('@/features/dashboard').then((module) => ({
    default: module.DashboardPage,
  })),
);
const ProductsPage = lazy(() =>
  import('@/features/products').then((module) => ({
    default: module.ProductsPage,
  })),
);
const InventoryPage = lazy(() =>
  import('@/features/inventory').then((module) => ({
    default: module.InventoryPage,
  })),
);
const ProcurementPage = lazy(() =>
  import('@/features/procurement').then((module) => ({ default: module.ProcurementPage })),
);
const ReviewsPage = lazy(() =>
  import('@/features/reviews').then((module) => ({
    default: module.ReviewsPage,
  })),
);
const OrdersPage = lazy(() =>
  import('@/features/orders').then((module) => ({
    default: module.OrdersPage,
  })),
);
const FulfillmentsPage = lazy(() =>
  import('@/features/fulfillments').then((module) => ({ default: module.FulfillmentsPage })),
);
const ReturnsPage = lazy(() =>
  import('@/features/returns').then((module) => ({ default: module.ReturnsPage })),
);
const SupportTicketsPage = lazy(() =>
  import('@/features/support').then((module) => ({ default: module.SupportTicketsPage })),
);
const KnowledgePage = lazy(() =>
  import('@/features/assistant-knowledge').then((module) => ({ default: module.KnowledgePage })),
);
const FlashSalesPage = lazy(() =>
  import('@/features/flash-sales').then((module) => ({ default: module.FlashSalesPage })),
);
const SystemParametersPage = lazy(() =>
  import('@/features/system-parameters').then((module) => ({
    default: module.SystemParametersPage,
  })),
);
const PaymentsPage = lazy(() =>
  import('@/features/payments').then((module) => ({ default: module.PaymentsPage })),
);
const CustomersPage = lazy(() =>
  import('@/features/customers').then((module) => ({
    default: module.CustomersPage,
  })),
);
const OrganizationPage = lazy(() =>
  import('@/features/organization').then((module) => ({
    default: module.OrganizationPage,
  })),
);
const AccessPage = lazy(() =>
  import('@/features/access').then((module) => ({
    default: module.AccessPage,
  })),
);
const RolesPage = lazy(() =>
  import('@/features/roles').then((module) => ({
    default: module.RolesPage,
  })),
);
const AuditPage = lazy(() =>
  import('@/features/audit').then((module) => ({ default: module.AuditPage })),
);
const MediaLibraryPage = lazy(() =>
  import('@/features/media').then((module) => ({ default: module.MediaLibraryPage })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications').then((module) => ({
    default: module.NotificationsPage,
  })),
);

/**
 * Trang chủ `/` là đích mặc định sau đăng nhập và của mọi đường dẫn lạ. Người không có quyền báo cáo
 * (vd. nhân viên vận hành) được đưa tới màn đầu tiên trong menu mà họ được thấy, thay vì kẹt ở màn 403.
 */
function HomeRoute() {
  const granted = usePermissions();
  const home = NAVIGATION_ITEMS_DATA.find((item) => item.path === '/');
  if (home && !canSeeNavigationItem(home, granted)) {
    const firstAllowed = NAVIGATION_ITEMS_DATA.find(
      (item) => item.path !== '/' && canSeeNavigationItem(item, granted),
    );
    if (firstAllowed) return <Navigate to={firstAllowed.path} replace />;
  }
  return (
    // Bảng điều khiển ghép ba nhóm báo cáo, mỗi nhóm một quyền riêng ở API.
    <PermissionRoute permission={['report.operation.view', 'report.revenue.view', 'report.inventory.view']}>
      <DashboardPage />
    </PermissionRoute>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route
        path="change-password"
        element={
          <AuthenticatedRoute>
            <ChangePasswordPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        element={
          <AuthenticatedRoute>
            <AdminLayout />
          </AuthenticatedRoute>
        }
      >
        <Route
          index
          // Bảng điều khiển ghép ba nhóm báo cáo, mỗi nhóm một quyền riêng ở API. Gác bằng
          // `system.module.view` như trước làm người có quyền xem báo cáo vào được trang
          // nhưng mọi widget đều nhận 403.
          element={<HomeRoute />}
        />
        <Route
          path="products"
          element={
            <PermissionRoute permission="catalog.product.view">
              <ProductsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="brands"
          element={
            <PermissionRoute permission="catalog.brand.view">
              <BrandsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="categories"
          element={
            <PermissionRoute permission="catalog.category.view">
              <CategoriesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="attributes"
          element={
            <PermissionRoute permission="catalog.product.view">
              <AttributesPage />
            </PermissionRoute>
          }
        />
        {/* Đường dẫn cũ của màn ghép Thương hiệu & danh mục; giữ để link/bookmark cũ không gãy. */}
        <Route path="catalog-masters" element={<Navigate to="/brands" replace />} />
        <Route
          path="inventory"
          element={
            <PermissionRoute permission="inventory.stock.view">
              <InventoryPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement"
          element={
            <PermissionRoute permission="purchase.order.view">
              <ProcurementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="content"
          element={
            <PermissionRoute permission="cms.content.view">
              <ContentPage />
            </PermissionRoute>
          }
        />
        <Route
          path="banners"
          element={
            <PermissionRoute permission="cms.content.view">
              <BannersPage />
            </PermissionRoute>
          }
        />
        {/* Redirect OAuth của TikTok (TIKTOK_REDIRECT_URI = origin Admin + TIKTOK_CALLBACK_PATH). */}
        <Route
          path="content/social/tiktok/callback"
          element={
            <PermissionRoute permission="social.post.publish">
              <TikTokCallbackPage />
            </PermissionRoute>
          }
        />
        <Route
          path="social-dashboard"
          element={
            <PermissionRoute permission="cms.content.view">
              <SocialDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reviews"
          element={
            <PermissionRoute permission="catalog.review.moderate">
              <ReviewsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="orders"
          element={
            <PermissionRoute permission="order.view">
              <OrdersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="fulfillments"
          element={
            <PermissionRoute permission="fulfillment.view">
              <FulfillmentsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="returns"
          element={
            <PermissionRoute permission="return.view">
              <ReturnsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="support-tickets"
          element={
            <PermissionRoute permission="support.ticket.view">
              <SupportTicketsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="assistant-knowledge"
          element={
            <PermissionRoute permission="assistant.knowledge.manage">
              <KnowledgePage />
            </PermissionRoute>
          }
        />
        <Route
          path="flash-sales"
          element={
            <PermissionRoute permission="catalog.flash_sale.view">
              <FlashSalesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="system-parameters"
          element={
            <PermissionRoute permission="system.parameter.view">
              <SystemParametersPage />
            </PermissionRoute>
          }
        />
        <Route path="shipping-consultations" element={<Navigate to="/orders" replace />} />
        <Route
          path="payments"
          element={
            <PermissionRoute permission="payment.view">
              <PaymentsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="customers"
          element={
            <PermissionRoute permission="customer.view">
              <CustomersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="organization"
          element={
            <PermissionRoute permission="org.branch.view">
              <OrganizationPage />
            </PermissionRoute>
          }
        />
        <Route
          path="access"
          element={
            <PermissionRoute permission="iam.user.view">
              <AccessPage />
            </PermissionRoute>
          }
        />
        <Route
          path="roles"
          element={
            <PermissionRoute permission="iam.role.view">
              <RolesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="audit"
          element={
            <PermissionRoute permission="iam.audit.view">
              <AuditPage />
            </PermissionRoute>
          }
        />
        <Route
          path="media"
          element={
            <PermissionRoute permission="media.asset.view">
              <MediaLibraryPage />
            </PermissionRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <PermissionRoute permission="system.parameter.view">
              <NotificationsPage />
            </PermissionRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
