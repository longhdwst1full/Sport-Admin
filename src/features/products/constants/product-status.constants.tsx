import { CheckCircleOutlined } from '@ant-design/icons';
import type { StatusPresentation } from '@/foundation/management';
import type { ProductStatus, ProductVariantStatus } from '@/generated/api/catalog/catalog.schemas';

/** Nhãn + tone trạng thái sản phẩm, dùng chung cho bảng danh sách và header workspace. */
export const PRODUCT_STATUS_PRESENTATION: Record<ProductStatus, StatusPresentation> = {
  PUBLISHED: { color: 'success', label: 'Đang bán', icon: <CheckCircleOutlined className="text-emerald-600" /> },
  DRAFT: { color: 'neutral', label: 'Nháp' },
  ARCHIVED: { color: 'neutral', label: 'Lưu trữ' },
};

/**
 * Trạng thái khung giá (`ProductPriceWindowDto.status`). CONTRACT: OpenAPI đang khai `string` thay vì enum
 * (`PRODUCT_PRICE_STATUS` của API) nên map theo mã; mã lạ hiện `—` thay vì mã thô.
 */
export const PRODUCT_PRICE_STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  SCHEDULED: { color: 'info', label: 'Đã lên lịch' },
  ACTIVE: { color: 'success', label: 'Đang áp dụng' },
  EXPIRED: { color: 'danger', label: 'Hết hiệu lực' },
  CANCELLED: { color: 'neutral', label: 'Đã huỷ' },
};

/** Trạng thái SKU (biến thể). */
export const PRODUCT_VARIANT_STATUS_PRESENTATION: Record<ProductVariantStatus, StatusPresentation> = {
  ACTIVE: { color: 'success', label: 'Đang bán' },
  INACTIVE: { color: 'neutral', label: 'Đã lưu trữ' },
};
