import { lazy } from 'react';

// `recharts` nặng ~390 kB. Tách khỏi chunk của trang để thẻ số liệu và bảng phía trên vẽ được ngay;
// đồ thị tự tải sau và dùng đúng `Skeleton` như trạng thái đang tải dữ liệu nên không nhảy layout.
export const RevenueAreaChart = lazy(() => import('./dashboard-charts')
  .then((module) => ({ default: module.RevenueAreaChart })));
export const OrderStatusPieChart = lazy(() => import('./dashboard-charts')
  .then((module) => ({ default: module.OrderStatusPieChart })));
export const CompletedOrdersBarChart = lazy(() => import('./dashboard-charts')
  .then((module) => ({ default: module.CompletedOrdersBarChart })));
