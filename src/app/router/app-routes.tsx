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
const CatalogMastersPage = lazy(() =>
  import('@/features/catalog-masters').then((module) => ({
    default: module.CatalogMastersPage,
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
          element={
            <PermissionRoute permission="system.module.view">
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
          path="catalog-masters"
          element={
            <PermissionRoute permission="catalog.brand.view">
              <CatalogMastersPage />
            </PermissionRoute>
          }
        />
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
            <PermissionRoute permission="content.post.view">
              <ContentPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reviews"
          element={
            <PermissionRoute permission="review.moderate">
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
