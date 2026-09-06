import {
  AuditOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Tabs } from 'antd';
import { useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import {
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
} from '@/generated/api/inventory/inventory';
import type { InventoryBalanceDto } from '@/generated/api/inventory/models';
import { InventoryBalancePanel } from './inventory-balance-panel';
import { InventoryMovementPanel } from './inventory-movement-panel';
import { StockAdjustmentDrawer } from './stock-adjustment-drawer';
import { StockAdjustmentPanel } from './stock-adjustment-panel';

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<InventoryBalanceDto>();
  const [metrics, setMetrics] = useState({ total: 0, low: 0, out: 0, available: 0 });

  const openAdjustment = (balance?: InventoryBalanceDto) => {
    setSelectedBalance(balance);
    setAdjustmentOpen(true);
  };
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
    ]);
  };

  return (
    <ManagementPage
      eyebrow="Inventory control"
      title="Tồn kho & sổ kho"
      description="Theo dõi tồn khả dụng theo kho, phiếu điều chỉnh và ledger bất biến từ cùng nguồn dữ liệu PostgreSQL."
      dataNotice="Không sửa trực tiếp số lượng sản phẩm. Mọi biến động tồn phải tạo chứng từ và dòng movement có thể truy vết."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>Làm mới dữ liệu</Button>
          <PermissionGate permission="inventory.stock.adjust">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdjustment()}>
              Tạo phiếu điều chỉnh
            </Button>
          </PermissionGate>
        </div>
      }
      metrics={[
        { key: 'sku', label: 'Dòng tồn', value: metrics.total, icon: <InboxOutlined /> },
        { key: 'available', label: 'Có thể bán trên trang', value: metrics.available, icon: <SwapOutlined />, tone: 'green' },
        { key: 'low', label: 'Sắp hết trên trang', value: metrics.low, icon: <WarningOutlined />, tone: 'orange' },
        { key: 'out', label: 'Hết hàng trên trang', value: metrics.out, icon: <AuditOutlined />, tone: 'blue' },
      ]}
    >
      <Tabs
        destroyInactiveTabPane={false}
        items={[
          {
            key: 'balances',
            label: 'Tồn theo kho',
            children: <InventoryBalancePanel onAdjust={openAdjustment} onMetricsChange={setMetrics} />,
          },
          { key: 'movements', label: 'Sổ kho', children: <InventoryMovementPanel /> },
          { key: 'adjustments', label: 'Phiếu điều chỉnh', children: <StockAdjustmentPanel /> },
        ]}
      />
      {adjustmentOpen && (
        <StockAdjustmentDrawer
          open
          balance={selectedBalance}
          onClose={() => {
            setAdjustmentOpen(false);
            setSelectedBalance(undefined);
          }}
        />
      )}
    </ManagementPage>
  );
}
