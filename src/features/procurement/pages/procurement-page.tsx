import { FileDoneOutlined, ShopOutlined, ShoppingOutlined, SwapOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
import { ManagementPage } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import { GoodsReceiptPanel } from '../components/goods-receipt-panel';
import { PurchaseOrderPanel } from '../components/purchase-order-panel';
import { SupplierPanel } from '../components/supplier-panel';
import { SupplierReturnPanel } from '../components/supplier-return-panel';

export function ProcurementPage() {
  return <PageTransition><ManagementPage
    eyebrow="Mua hàng & cung ứng"
    title="Quản lý nhập hàng"
    description="Quản lý nhà cung cấp, đơn mua hàng, phiếu nhập và hàng trả nhà cung cấp theo đúng luồng duyệt và sổ kho."
  >
    <Tabs destroyInactiveTabPane={false} items={[
      { key: 'suppliers', label: <span><ShopOutlined /> Nhà cung cấp</span>, children: <SupplierPanel /> },
      { key: 'purchase-orders', label: <span><ShoppingOutlined /> Đơn mua hàng</span>, children: <PurchaseOrderPanel /> },
      { key: 'goods-receipts', label: <span><FileDoneOutlined /> Phiếu nhập</span>, children: <GoodsReceiptPanel /> },
      { key: 'supplier-returns', label: <span><SwapOutlined /> Trả nhà cung cấp</span>, children: <SupplierReturnPanel /> },
    ]} />
  </ManagementPage></PageTransition>;
}

