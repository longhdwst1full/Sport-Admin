import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DetailDrawer } from '@/foundation/overlay';
import { AdminTable, col } from '@/foundation/table';
import { useGetStockAdjustment } from '@/generated/api/inventory/inventory';
import type { StockAdjustmentItemDto } from '@/generated/api/inventory/inventory.schemas';
import { adjustmentReasonText, adjustmentTypeText } from '../constants/inventory.constants';

const ADJUSTMENT_ITEM_COLUMNS: ColumnsType<StockAdjustmentItemDto> = [
  { title: 'SKU', dataIndex: 'sku', render: (value, row) => <div><strong>{value}</strong><div className="text-xs text-slate-500">{row.productName}</div></div> },
  col.number<StockAdjustmentItemDto>('expectedOnHand', 'Trước', { width: undefined }),
  { title: 'Thay đổi', dataIndex: 'quantityDelta', align: 'right', render: (value: number) => value > 0 ? `+${value}` : value },
  col.number<StockAdjustmentItemDto>('actualOnHand', 'Sau', { width: undefined }),
];

/** Chi tiết một phiếu điều chỉnh tồn (chỉ đọc: phiếu ghi sổ ngay khi tạo, không sửa/huỷ). */
export function StockAdjustmentDetailDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const detail = useGetStockAdjustment(id ?? '', { query: { enabled: Boolean(id) } });
  const adjustment = detail.data;

  return (
    <DetailDrawer
      size="md"
      title={adjustment ? `Phiếu ${adjustment.adjustmentNo}` : 'Chi tiết phiếu'}
      open={Boolean(id)}
      onClose={onClose}
      loading={detail.isPending}
      error={detail.isError ? detail.error : undefined}
      onRetry={() => void detail.refetch()}
    >
      {adjustment && (
        <div className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{adjustment.warehouseCode}</strong>
              <Tag>{adjustmentTypeText(adjustment.adjustmentType)}</Tag>
              <Tag>{adjustmentReasonText(adjustment.reasonCode)}</Tag>
            </div>
            <div className="mt-2 text-slate-600">{adjustment.reason}</div>
            {adjustment.externalReference && (
              <div className="mt-2 text-sm text-slate-600">
                Chứng từ: <Typography.Text code>{adjustment.externalReference}</Typography.Text>
                {adjustment.sourceName ? ` · ${adjustment.sourceName}` : ''}
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">Tạo bởi {adjustment.createdByDisplayName}</div>
          </div>
          <AdminTable rowKey="id" size="small" pagination={false} dataSource={adjustment.items} columns={ADJUSTMENT_ITEM_COLUMNS} />
        </div>
      )}
    </DetailDrawer>
  );
}
