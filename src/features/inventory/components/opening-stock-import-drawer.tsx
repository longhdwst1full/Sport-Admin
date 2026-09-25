import { InboxOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Drawer, Progress, Select, Space, Typography, Upload } from 'antd';
import { useRef, useState } from 'react';
import { AdminTable } from '@/foundation/table';
import { exportTableToCsv } from '@/foundation/export/export-table';
import { searchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import {
  createStockAdjustment,
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
} from '@/generated/api/inventory/inventory';
import { StockAdjustmentReason, StockAdjustmentType } from '@/generated/api/inventory/models';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  chunkOpeningStock,
  parseOpeningStockCsv,
  type OpeningStockLine,
  type OpeningStockParseResult,
} from '../model/opening-stock-import';

/**
 * Nhập tồn đầu hàng loạt từ CSV cho MỘT kho, ghi bằng phiếu OPENING_BALANCE theo lô 100 dòng.
 *
 * IDEMPOTENCY: mỗi lô có `Idempotency-Key` cố định theo lần chọn file (`<batchId>-<số lô>`), nên bấm
 * "Tiếp tục" sau khi lỗi mạng sẽ replay các lô đã ghi thay vì ghi trùng. API chỉ cho OPENING_BALANCE
 * khi SKU chưa có biến động tại kho, và một lô là all-or-nothing: một SKU sai làm cả lô bị từ chối.
 */
export function OpeningStockImportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [warehouseCode, setWarehouseCode] = useState<string>();
  const [fileName, setFileName] = useState<string>();
  const [parsed, setParsed] = useState<OpeningStockParseResult>();
  const [completedChunks, setCompletedChunks] = useState(0);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [failure, setFailure] = useState<string>();
  const batchId = useRef(crypto.randomUUID());
  const warehouses = useSearchActiveAdminWarehouses({ page: 1, limit: 50 }, { query: { enabled: open } });

  const chunks = parsed ? chunkOpeningStock(parsed.lines) : [];
  const finished = chunks.length > 0 && completedChunks === chunks.length;

  const reset = () => {
    setParsed(undefined);
    setFileName(undefined);
    setCompletedChunks(0);
    setFailure(undefined);
    batchId.current = crypto.randomUUID();
  };

  const readFile = async (file: File) => {
    reset();
    setFileName(file.name);
    setParsed(parseOpeningStockCsv(await file.text()));
    return false;
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const rows: Array<{ sku: string; quantity: string; name: string }> = [];
      for (let page = 1; ; page += 1) {
        const result = await searchActiveAdminProductVariants({ page, limit: 50 });
        rows.push(...result.items.map((item) => ({ sku: item.code, quantity: '', name: item.label })));
        if (!result.meta.hasMore) break;
      }
      exportTableToCsv({
        filename: 'mau-ton-dau.csv',
        columns: [
          { key: 'sku', label: 'sku' },
          { key: 'quantity', label: 'so_luong' },
          { key: 'name', label: 'ten_san_pham' },
        ],
        data: rows,
      });
    } catch (error) {
      void message.error(getApiErrorMessage(error, 'Không tải được danh sách SKU.'));
    } finally {
      setDownloading(false);
    }
  };

  const submit = async () => {
    if (!warehouseCode || !parsed) return;
    setRunning(true);
    setFailure(undefined);
    try {
      for (let index = completedChunks; index < chunks.length; index += 1) {
        try {
          await createStockAdjustment(
            {
              warehouseCode,
              adjustmentType: StockAdjustmentType.OPENING_BALANCE,
              reasonCode: StockAdjustmentReason.INITIAL_STOCK,
              reason: `Nhập tồn đầu từ file ${fileName ?? ''} (lô ${index + 1}/${chunks.length})`.trim(),
              items: chunks[index].map(({ sku, quantity }) => ({ sku, quantityDelta: quantity })),
            },
            { headers: { 'Idempotency-Key': `${batchId.current}-${index}` } },
          );
          setCompletedChunks(index + 1);
        } catch (error) {
          const rows = chunks[index].map(({ row }) => row);
          setFailure(`Lô ${index + 1} (dòng ${rows[0]}–${rows[rows.length - 1]}): ${getApiErrorMessage(error)}`);
          return;
        }
      }
      void message.success(`Đã ghi tồn đầu ${parsed.lines.length} SKU vào kho ${warehouseCode}.`);
    } finally {
      setRunning(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
      ]);
    }
  };

  const canSubmit = Boolean(warehouseCode) && Boolean(parsed?.lines.length) && parsed?.errors.length === 0 && !finished;

  return (
    <Drawer
      width={720}
      open={open}
      title="Nhập tồn đầu từ file"
      onClose={() => { if (!running) { reset(); onClose(); } }}
      maskClosable={!running}
      destroyOnClose
      footer={(
        <div className="flex justify-end gap-2">
          <Button disabled={running} onClick={() => { reset(); onClose(); }}>Đóng</Button>
          <Button type="primary" loading={running} disabled={!canSubmit} onClick={() => void submit()}>
            {completedChunks > 0 && !finished ? 'Tiếp tục ghi' : 'Ghi tồn đầu'}
          </Button>
        </div>
      )}
    >
      <Space direction="vertical" size="large" className="w-full">
        <Alert
          type="info"
          showIcon
          message="Chỉ dùng cho SKU chưa có biến động tại kho đã chọn"
          description="File CSV gồm cột sku và so_luong (Excel: Lưu thành → CSV UTF-8). Tồn của SKU đã có nhập/xuất phải chỉnh bằng phiếu điều chỉnh thường."
        />
        <Space wrap>
          <Select
            className="min-w-64"
            placeholder="Chọn kho"
            value={warehouseCode}
            disabled={running || completedChunks > 0}
            loading={warehouses.isPending}
            options={warehouses.data?.items.map((item) => ({ value: item.code, label: `${item.label} (${item.code})` }))}
            onChange={setWarehouseCode}
          />
          <Button loading={downloading} onClick={() => void downloadTemplate()}>Tải file mẫu (toàn bộ SKU)</Button>
        </Space>
        <Upload.Dragger accept=".csv,text/csv" maxCount={1} showUploadList={false} disabled={running} beforeUpload={readFile}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p>{fileName ? `Đã chọn: ${fileName}` : 'Kéo thả hoặc bấm để chọn file CSV'}</p>
        </Upload.Dragger>

        {parsed && parsed.errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            message={`${parsed.errors.length} dòng lỗi — sửa file rồi chọn lại`}
            description={(
              <ul className="m-0 max-h-48 overflow-auto pl-4">
                {parsed.errors.map(({ row, message: text }) => <li key={row}>Dòng {row}: {text}</li>)}
              </ul>
            )}
          />
        )}
        {failure && <Alert type="error" showIcon message="Dừng ghi" description={`${failure}. Sửa dữ liệu hoặc bấm "Tiếp tục ghi" để thử lại từ lô này; các lô đã ghi không bị ghi lại.`} />}
        {parsed && parsed.lines.length > 0 && (
          <>
            <Typography.Text>
              {parsed.lines.length} SKU hợp lệ · {chunks.length} lô
            </Typography.Text>
            {chunks.length > 0 && (completedChunks > 0 || running) && (
              <Progress percent={Math.round((completedChunks / chunks.length) * 100)} status={failure ? 'exception' : finished ? 'success' : 'active'} />
            )}
            <AdminTable<OpeningStockLine>
              rowKey="row"
              size="small"
              dataSource={parsed.lines}
              pagination={{ pageSize: 20 }}
              columns={[
                { title: 'Dòng', dataIndex: 'row', width: 80 },
                { title: 'SKU', dataIndex: 'sku' },
                { title: 'Số lượng', dataIndex: 'quantity', align: 'right', width: 120 },
              ]}
            />
          </>
        )}
      </Space>
    </Drawer>
  );
}
