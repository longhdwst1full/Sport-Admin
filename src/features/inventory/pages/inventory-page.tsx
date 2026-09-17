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
import { PermissionGate, useCan } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import {
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
  getListStockTransfersQueryKey,
} from '@/generated/api/inventory/inventory';
import type { InventoryBalanceDto } from '@/generated/api/inventory/models';
import { InventoryBalancePanel } from '../components/inventory-balance-panel';
import { InventoryMovementPanel } from '../components/inventory-movement-panel';
import { StockAdjustmentDrawer } from '../components/stock-adjustment-drawer';
import { StockAdjustmentPanel } from '../components/stock-adjustment-panel';
import { StockTransferCreateDrawer } from '../components/stock-transfer-create-drawer';
import { StockTransferPanel } from '../components/stock-transfer-panel';

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<InventoryBalanceDto>();
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string>();
  const [metrics, setMetrics] = useState({ total: 0, low: 0, out: 0, available: 0 });
  // SECURITY: xem phiếu chuyển kho là quyền riêng với xem tồn; thiếu quyền thì ẩn hẳn tab thay vì
  // để panel gọi API rồi hiển thị lỗi 403.
  const canViewTransfers = useCan('inventory.transfer.view');

  const openAdjustment = (balance?: InventoryBalanceDto) => {
    setSelectedBalance(balance);
    setAdjustmentOpen(true);
  };

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListStockTransfersQueryKey() }),
    ]);
  };

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Quản trị kho vận"
        title="Tồn kho & Sổ kho"
        description="Theo dõi tồn khả dụng theo từng kho, đối soát phiếu điều chỉnh và audit sổ kho bất biến từ cơ sở dữ liệu."
        dataNotice="Không sửa trực tiếp số lượng tồn sản phẩm. Mọi biến động tồn đều phải tạo chứng từ và phát sinh movement truy vết."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
              Làm mới dữ liệu
            </Button>
            <PermissionGate permission="inventory.stock.adjust">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdjustment()}>
                Tạo phiếu điều chỉnh
              </Button>
            </PermissionGate>
            <PermissionGate permission="inventory.transfer.create">
              <Button icon={<SwapOutlined />} onClick={() => setTransferOpen(true)}>
                Tạo phiếu chuyển kho
              </Button>
            </PermissionGate>
          </div>
        }
        metrics={[
          {
            key: 'sku',
            label: 'Dòng tồn kho',
            value: metrics.total,
            icon: <InboxOutlined />,
            tone: 'blue',
          },
          // Ba chỉ số dưới đếm trên trang đang xem vì API tồn kho chưa có bộ lọc/tổng hợp theo
          // trạng thái. Ghi rõ phạm vi còn hơn để người đọc tưởng đó là số toàn hệ thống.
          {
            key: 'available',
            label: 'Có thể bán ngay',
            value: metrics.available,
            icon: <SwapOutlined />,
            tone: 'green',
            hint: 'Cộng trên trang đang xem',
          },
          {
            key: 'low',
            label: 'Sắp hết hàng',
            value: metrics.low,
            icon: <WarningOutlined />,
            tone: 'orange',
            hint: 'Đếm trên trang đang xem',
          },
          {
            key: 'out',
            label: 'Đã hết hàng',
            value: metrics.out,
            icon: <AuditOutlined />,
            tone: 'red',
            hint: 'Đếm trên trang đang xem',
          },
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
            { key: 'movements', label: 'Sổ kho (Ledger)', children: <InventoryMovementPanel /> },
            { key: 'adjustments', label: 'Phiếu điều chỉnh', children: <StockAdjustmentPanel /> },
            canViewTransfers && {
              key: 'transfers',
              label: 'Phiếu chuyển kho',
              children: (
                <StockTransferPanel
                  selectedId={selectedTransferId}
                  onSelectedIdChange={setSelectedTransferId}
                />
              ),
            },
          ].filter((item) => item !== false)}
        />

        {adjustmentOpen && (
          <StockAdjustmentDrawer
            open
            balance={selectedBalance}
            onClose={() => {
              setAdjustmentOpen(false);
              setSelectedBalance(undefined);
              void refresh();
            }}
          />
        )}

        {transferOpen && (
          <StockTransferCreateDrawer
            open
            onClose={() => setTransferOpen(false)}
            onCreated={() => void refresh()}
          />
        )}
      </ManagementPage>
    </PageTransition>
  );
}
