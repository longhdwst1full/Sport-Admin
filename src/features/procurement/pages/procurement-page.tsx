import { FileDoneOutlined, ShopOutlined, ShoppingOutlined, SwapOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
import { ManagementPage } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { GoodsReceiptPanel } from '../components/goods-receipt-panel';
import { PurchaseOrderPanel } from '../components/purchase-order-panel';
import { SupplierPanel } from '../components/supplier-panel';
import { SupplierReturnPanel } from '../components/supplier-return-panel';

const PROCUREMENT_TABS = [
  { key: 'suppliers', label: <span><ShopOutlined /> Nhà cung cấp</span>, children: <SupplierPanel /> },
  { key: 'purchase-orders', label: <span><ShoppingOutlined /> Đơn mua hàng</span>, children: <PurchaseOrderPanel /> },
  { key: 'goods-receipts', label: <span><FileDoneOutlined /> Phiếu nhập</span>, children: <GoodsReceiptPanel /> },
  { key: 'supplier-returns', label: <span><SwapOutlined /> Trả nhà cung cấp</span>, children: <SupplierReturnPanel /> },
];
const TAB_KEYS = PROCUREMENT_TABS.map((tab) => tab.key);

/**
 * Tab đang mở nằm trên URL (`tab`). Chỉ tab đang chọn được mount — tab ẩn không tải danh sách — và
 * đổi tab thì xoá bộ lọc/trang của tab cũ vì bốn tab dùng chung tên tham số (`q`, `status`, `page`).
 */
export function ProcurementPage() {
  const url = useUrlFilters();
  const tab = url.getEnum('tab', TAB_KEYS) ?? 'suppliers';
  return <PageTransition><ManagementPage
    eyebrow="Mua hàng & cung ứng"
    title="Quản lý nhập hàng"
    description="Quản lý nhà cung cấp, đơn mua hàng, phiếu nhập và hàng trả nhà cung cấp theo đúng luồng duyệt và sổ kho."
  >
    <Tabs
      destroyOnHidden
      activeKey={tab}
      onChange={(key) => url.patch({ tab: key === 'suppliers' ? undefined : key, q: undefined, status: undefined, type: undefined, page: undefined })}
      items={PROCUREMENT_TABS}
    />
  </ManagementPage></PageTransition>;
}
