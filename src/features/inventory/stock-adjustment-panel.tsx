import { EyeOutlined } from '@ant-design/icons';
import { Button, Card, Drawer, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { useGetStockAdjustment, useListStockAdjustments } from '@/generated/api/inventory/inventory';

const adjustmentTypeLabel: Record<string, string> = {
  CORRECTION: 'Điều chỉnh',
  OPENING_BALANCE: 'Tồn đầu kỳ',
  MANUAL_RECEIPT: 'Nhập thủ công',
};

export function StockAdjustmentPanel() {
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const query = useListStockAdjustments({ limit: 25, ...(cursor ? { cursor } : {}) });
  const detail = useGetStockAdjustment(selectedId ?? '', { query: { enabled: Boolean(selectedId) } });

  return (
    <Card bordered={false}>
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <Table
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items ?? []}
        pagination={false}
        locale={{ emptyText: 'Chưa có phiếu điều chỉnh tồn.' }}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Số phiếu', dataIndex: 'adjustmentNo', width: 250, render: (value) => <Typography.Text code>{value}</Typography.Text> },
          { title: 'Kho', dataIndex: 'warehouseCode', width: 150 },
          { title: 'Loại phiếu', dataIndex: 'adjustmentType', width: 140, render: (value) => adjustmentTypeLabel[value] ?? value },
          { title: 'Chứng từ nguồn', dataIndex: 'externalReference', width: 170, render: (value) => value || '—' },
          { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (value) => <Tag color="green">{value}</Tag> },
          { title: 'Số dòng', dataIndex: 'itemCount', align: 'right', width: 100 },
          { title: 'Lý do', dataIndex: 'reason' },
          { title: 'Người tạo', dataIndex: 'createdByDisplayName', width: 170 },
          { title: 'Thời điểm', dataIndex: 'postedAt', width: 180, render: (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) },
          { title: 'Thao tác', key: 'actions', width: 100, render: (_, row) => <Button type="link" icon={<EyeOutlined />} onClick={() => setSelectedId(row.id)}>Xem</Button> },
        ]}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button disabled={history.length === 0 || query.isFetching} onClick={() => { const previous = [...history]; setCursor(previous.pop() || undefined); setHistory(previous); }}>Trang trước</Button>
        <Button disabled={!query.data?.nextCursor || query.isFetching} onClick={() => { setHistory((items) => [...items, cursor ?? '']); setCursor(query.data?.nextCursor ?? undefined); }}>Trang sau</Button>
      </div>
      <Drawer title={detail.data ? `Phiếu ${detail.data.adjustmentNo}` : 'Chi tiết phiếu'} width={720} open={Boolean(selectedId)} onClose={() => setSelectedId(undefined)} loading={detail.isPending}>
        {detail.isError && <QueryErrorAlert error={detail.error} retry={() => void detail.refetch()} />}
        {detail.data && (
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{detail.data.warehouseCode}</strong>
                <Tag>{adjustmentTypeLabel[detail.data.adjustmentType] ?? detail.data.adjustmentType}</Tag>
                <Tag color="blue">{detail.data.reasonCode}</Tag>
              </div>
              <div className="mt-2 text-slate-600">{detail.data.reason}</div>
              {detail.data.externalReference && (
                <div className="mt-2 text-sm text-slate-600">
                  Chứng từ: <Typography.Text code>{detail.data.externalReference}</Typography.Text>
                  {detail.data.sourceName ? ` · ${detail.data.sourceName}` : ''}
                </div>
              )}
              <div className="mt-2 text-xs text-slate-500">Tạo bởi {detail.data.createdByDisplayName}</div>
            </div>
            <Table rowKey="id" size="small" pagination={false} dataSource={detail.data.items} columns={[
              { title: 'SKU', dataIndex: 'sku', render: (value, row) => <div><strong>{value}</strong><div className="text-xs text-slate-500">{row.productName}</div></div> },
              { title: 'Trước', dataIndex: 'expectedOnHand', align: 'right' },
              { title: 'Thay đổi', dataIndex: 'quantityDelta', align: 'right', render: (value: number) => value > 0 ? `+${value}` : value },
              { title: 'Sau', dataIndex: 'actualOnHand', align: 'right' },
            ]} />
          </div>
        )}
      </Drawer>
    </Card>
  );
}
