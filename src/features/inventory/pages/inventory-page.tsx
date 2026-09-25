import { AuditOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, SwapOutlined, UploadOutlined, WarningOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Tabs, Tooltip } from 'antd';
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
import { OpeningStockImportDrawer } from '../components/opening-stock-import-drawer';
import { StockAdjustmentDrawer } from '../components/stock-adjustment-drawer';
import { StockAdjustmentPanel } from '../components/stock-adjustment-panel';
import { StockTransferCreateDrawer } from '../components/stock-transfer-create-drawer';
import { StockTransferPanel } from '../components/stock-transfer-panel';

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [openingImportOpen, setOpeningImportOpen] = useState(false);
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListStockTransfersQueryKey() }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Quản trị kho vận"
        title="Tồn kho & Sổ kho"
        description="Theo dõi tồn khả dụng theo từng kho, đối soát phiếu điều chỉnh và audit sổ kho bất biến từ cơ sở dữ liệu."
        actions={
          <div className="flex flex-wrap gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void refresh()}
                loading={isRefreshing}
                aria-label="Làm mới"
              />
            </Tooltip>
            <PermissionGate permission="inventory.stock.adjust">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdjustment()}>
                Tạo phiếu điều chỉnh
              </Button>
            </PermissionGate>
            <PermissionGate permission="inventory.stock.adjust">
              <Button icon={<UploadOutlined />} onClick={() => setOpeningImportOpen(true)}>
                Nhập tồn đầu từ file
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
          // Bốn chỉ số lấy từ `summarizeInventoryBalances`: tính trên toàn bộ dòng khớp bộ lọc
          // đang áp, không phụ thuộc trang đang xem.
          {
            key: 'available',
            label: 'Có thể bán ngay',
            value: metrics.available,
            icon: <SwapOutlined />,
            tone: 'green',
            hint: 'Toàn bộ dòng khớp bộ lọc',
          },
          {
            key: 'low',
            label: 'Sắp hết hàng',
            value: metrics.low,
            icon: <WarningOutlined />,
            tone: 'orange',
            hint: 'Toàn bộ dòng khớp bộ lọc',
          },
          {
            key: 'out',
            label: 'Đã hết hàng',
            value: metrics.out,
            icon: <AuditOutlined />,
            tone: 'red',
            hint: 'Toàn bộ dòng khớp bộ lọc',
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

        {openingImportOpen && (
          <OpeningStockImportDrawer
            open
            onClose={() => {
              setOpeningImportOpen(false);
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
