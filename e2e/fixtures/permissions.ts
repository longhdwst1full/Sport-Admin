/**
 * Bộ quyền dùng cho e2e. Giá trị phải khớp code quyền trong
 * `src/app/router/app-routes.tsx` và `src/app/navigation/navigation.config.tsx`.
 */
export const PERMISSION_SETS = {
  superAdmin: [
    'report.operation.view',
    'report.revenue.view',
    'report.inventory.view',
    'catalog.product.view',
    'catalog.product.manage',
    'catalog.brand.view',
    'catalog.flash_sale.view',
    'catalog.review.moderate',
    'inventory.stock.view',
    'inventory.stock.adjust',
    'cms.content.view',
    'order.view',
    'order.manage',
    'fulfillment.view',
    'payment.view',
    'customer.view',
    'org.branch.view',
    'iam.user.view',
    'iam.role.view',
    'iam.audit.view',
    'system.parameter.view',
  ],
  /** Chỉ xem sản phẩm — dùng để test ẩn menu và chặn route. */
  catalogViewer: ['catalog.product.view'],
  /** Vận hành đơn hàng, không có quyền catalog. */
  orderOperator: ['order.view', 'order.manage', 'fulfillment.view'],
  none: [] as string[],
} as const;

export type PermissionSetName = keyof typeof PERMISSION_SETS;
