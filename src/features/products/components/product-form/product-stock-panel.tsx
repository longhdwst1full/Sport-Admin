import { InboxOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Tag } from 'antd';
import { PermissionGate, useCan } from '@/core/auth/permissions';
import { FormSection } from '@/foundation/layout/form-section';
import { AdminTable } from '@/foundation/table';
import { ProductType, type ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';
import {
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
  useCreateStockAdjustment,
  useListInventoryBalances,
} from '@/generated/api/inventory/inventory';
import type { CreateStockAdjustmentDto, InventoryBalanceDto } from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage } from '@/lib/api/error';

/** Phiếu tồn đầu chưa ghi được sau khi sản phẩm đã tạo; giữ nguyên payload và khoá để ghi lại. */
export interface PendingOpeningStock {
  idempotencyKey: string;
  data: CreateStockAdjustmentDto;
  error: string;
}

/**
 * Khối Tồn kho (tab "SKU, giá & tồn kho") ở chế độ Sửa.
 *
 * Chỉ xem tồn theo SKU; điều chỉnh/nhập thêm là nghiệp vụ của màn Tồn kho (phiếu có lý do và audit
 * riêng). Nếu phiếu tồn đầu lúc tạo bị lỗi, hiện nút ghi lại ở đây.
 */
export function ProductStockPanel({
  product,
  pendingOpeningStock,
  onOpeningStockRecorded,
}: {
  product: ProductDetailDto;
  pendingOpeningStock?: PendingOpeningStock;
  onOpeningStockRecorded: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canViewStock = useCan('inventory.stock.view');
  const skus = new Set(product.variants.map(({ sku }) => sku));
  // API chỉ tìm theo SKU/tên sản phẩm; lọc lại theo đúng SKU của sản phẩm này để khỏi lẫn sản phẩm trùng tên.
  const balances = useListInventoryBalances(
    { search: product.name.slice(0, 100), page: 1, limit: 100 },
    { query: { enabled: canViewStock && product.productType === ProductType.STANDARD } },
  );
  const rows = (balances.data?.items ?? []).filter(({ sku }) => skus.has(sku));

  // IDEMPOTENCY: ghi lại bằng đúng khoá của lần đầu. Nếu lần đầu thực ra đã ghi (mất response), Inventory
  // trả kết quả cũ thay vì cộng tồn lần hai.
  const retry = useCreateStockAdjustment({
    request: { headers: { 'Idempotency-Key': pendingOpeningStock?.idempotencyKey ?? '' } },
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
        ]);
        onOpeningStockRecorded();
        void message.success('Đã ghi tồn đầu.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Vẫn chưa ghi được tồn đầu.')),
    },
  });

  if (product.productType === ProductType.BUNDLE) {
    return (
      <Alert
        type="info"
        showIcon
        message="Combo không có tồn vật lý riêng"
        description="Tồn bán được của combo tính từ SKU thành phần có ở cùng một kho."
      />
    );
  }

  return (
    <div className="space-y-4">
      {pendingOpeningStock && (
        <Alert
          type="warning"
          showIcon
          message="Sản phẩm đã tạo nhưng chưa ghi được tồn đầu"
          description={`${pendingOpeningStock.error} — Kho ${pendingOpeningStock.data.warehouseCode}, ${pendingOpeningStock.data.items.length} SKU.`}
          action={(
            <PermissionGate permission="inventory.stock.adjust">
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={retry.isPending}
                onClick={() => retry.mutate({ data: pendingOpeningStock.data })}
              >
                Thử ghi tồn đầu lại
              </Button>
            </PermissionGate>
          )}
        />
      )}

      <FormSection
        title="Tồn theo kho"
        description="Chỉ xem. Nhập thêm, điều chỉnh hoặc chuyển kho ở màn Tồn kho để có phiếu và lý do."
        icon={<InboxOutlined />}
      >
        {canViewStock ? (
          <AdminTable<InventoryBalanceDto>
            size="small"
            rowKey="id"
            pagination={false}
            loading={balances.isPending}
            dataSource={rows}
            locale={{ emptyText: 'Chưa có tồn ở kho nào' }}
            columns={[
              { title: 'SKU', dataIndex: 'sku' },
              { title: 'Kho', dataIndex: 'warehouseCode' },
              { title: 'Tồn thực', dataIndex: 'onHand', align: 'right' },
              { title: 'Đang giữ', dataIndex: 'reserved', align: 'right' },
              {
                title: 'Khả dụng',
                dataIndex: 'available',
                align: 'right',
                render: (value: number) => <Tag color={value > 0 ? 'green' : 'default'}>{value}</Tag>,
              },
            ]}
          />
        ) : (
          <Alert type="info" showIcon message="Tài khoản chưa có quyền xem tồn kho" />
        )}
      </FormSection>
    </div>
  );
}
