import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/layouts/admin-layout';
import { PermissionRoute } from '@/core/auth/permission-route';
import { AuthenticatedRoute } from '@/core/auth/authenticated-route';

const LoginPage = lazy(() =>
  import('@/features/auth').then((module) => ({ default: module.LoginPage })),
);
const ChangePasswordPage = lazy(() =>
  import('@/features/auth').then((module) => ({
    default: module.ChangePasswordPage,
  })),
);

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
const BrandsPage = lazy(() =>
  import('@/features/catalog-masters').then((module) => ({
    default: module.BrandsPage,
  })),
);
const AttributesPage = lazy(() =>
  import('@/features/catalog-masters').then((module) => ({
    default: module.AttributesPage,
  })),
);
const CategoriesPage = lazy(() =>
  import('@/features/catalog-masters').then((module) => ({
    default: module.CategoriesPage,
  })),
);
const InventoryPage = lazy(() =>
  import('@/features/inventory').then((module) => ({
    default: module.InventoryPage,
  })),
);
const ContentPage = lazy(() =>
  import('@/features/content').then((module) => ({
    default: module.ContentPage,
  })),
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
          element={
            <PermissionRoute
              permission={[
                'report.operation.view',
                'report.revenue.view',
                'report.inventory.view',
              ]}
            >
              <DashboardPage />
            </PermissionRoute>
          }
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
          path="content"
          element={
            <PermissionRoute permission="cms.content.view">
              <ContentPage />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
