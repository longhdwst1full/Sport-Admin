import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Input, InputNumber, Progress, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminTable } from '@/foundation/table';
import {
  getGetStocktakeQueryKey,
  getListStocktakesQueryKey,
  useRecordStocktakeCounts,
} from '@/generated/api/inventory/inventory';
import type { StocktakeDetailDto, StocktakeItemDto } from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { FormDrawer } from '@/foundation/overlay';

type CountEntry = { countedQuantity: number | null; note: string };

/**
 * Nhập số đếm thực tế cho phiếu còn Đang đếm.
 *
 * Màn này cố tình KHÔNG hiển thị tồn hệ thống: API cũng không trả về khi phiếu còn nháp. Thấy số
 * kỳ vọng lúc đang đếm sẽ kéo người đếm về khớp với nó thay vì đếm thật, mà ở đây người đếm cũng
 * chính là người duyệt nên không còn ai bắt được lỗi đó.
 *
 * INVARIANT: ô trống là CHƯA ĐẾM, không phải đếm ra 0. Chỉ những dòng có số mới được gửi lên, và
 * muốn ghi nhận ô rỗng thì phải nhập số 0 một cách có chủ đích.
 */
export function StocktakeCountDrawer({
  stocktake,
  open,
  onClose,
}: {
  stocktake?: StocktakeDetailDto;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<Record<string, CountEntry>>({});
  // Chỉ những SKU người dùng sửa trong phiên này mới được gửi lên. Gửi lại cả dòng đã lưu từ
  // trước sẽ khiến backend coi là đếm lại và dời `countedAt`, làm mất phần bù cho các phát sinh
  // nằm giữa hai lần lưu.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!open || !stocktake) return;
    setEntries(Object.fromEntries(stocktake.items.map((item) => [
      item.sku,
      { countedQuantity: item.countedQuantity ?? null, note: item.note ?? '' },
    ])));
    setTouched(new Set());
  }, [open, stocktake]);

  const filled = useMemo(
    () => Object.values(entries).filter(({ countedQuantity }) => countedQuantity !== null).length,
    [entries],
  );
  const total = stocktake?.items.length ?? 0;

  const mutation = useRecordStocktakeCounts({
    mutation: {
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListStocktakesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetStocktakeQueryKey(result.id) }),
        ]);
        void message.success(`Đã lưu số đếm (${result.countedCount}/${result.itemCount} dòng).`);
        onClose();
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể lưu số đếm.')),
    },
  });

  const save = () => {
    if (!stocktake) return;
    const items = Object.entries(entries).flatMap(([sku, entry]) =>
      touched.has(sku) && entry.countedQuantity !== null
        ? [{ sku, countedQuantity: entry.countedQuantity, note: entry.note.trim() || undefined }]
        : [],
    );
    if (items.length === 0) {
      void message.warning('Chưa có thay đổi nào để lưu.');
      return;
    }
    mutation.mutate({ id: stocktake.id, data: { version: stocktake.version, items } });
  };

  const update = useCallback((sku: string, patch: Partial<CountEntry>) => {
    setEntries((current) => ({ ...current, [sku]: { ...current[sku], ...patch } }));
    setTouched((current) => new Set(current).add(sku));
  }, []);

  const columns = useMemo<ColumnsType<StocktakeItemDto>>(() => [
    { title: 'SKU', dataIndex: 'sku', width: 160, render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: 'Sản phẩm', dataIndex: 'productName', ellipsis: true },
    {
      title: 'Số đếm thực tế',
      key: 'countedQuantity',
      width: 170,
      render: (_, row) => (
        <InputNumber
          className="w-full"
          min={0}
          precision={0}
          placeholder="Chưa đếm"
          value={entries[row.sku]?.countedQuantity ?? null}
          onChange={(value) => update(row.sku, { countedQuantity: value === null ? null : Number(value) })}
          aria-label={`Số đếm cho ${row.sku}`}
        />
      ),
    },
    {
      title: 'Ghi chú',
      key: 'note',
      width: 220,
      render: (_, row) => (
        <Input
          maxLength={500}
          placeholder="Tuỳ chọn"
          value={entries[row.sku]?.note ?? ''}
          onChange={(event) => update(row.sku, { note: event.target.value })}
          aria-label={`Ghi chú cho ${row.sku}`}
        />
      ),
    },
    {
      title: '',
      key: 'countState',
      width: 110,
      render: (_, row) => entries[row.sku]?.countedQuantity === null
        ? <Tag>Chưa đếm</Tag>
        : <Tag color="blue">Đã đếm</Tag>,
    },
  ], [entries, update]);

  return (
    <FormDrawer
      title={stocktake ? `Nhập số đếm — ${stocktake.stocktakeNo}` : 'Nhập số đếm'}
      size="lg"
      open={open}
      onClose={onClose}
      onSubmit={save}
      submitting={mutation.isPending}
      submitText="Lưu số đếm"
      isDirty={() => touched.size > 0}
      footerExtra={
        <Progress
          className="!mb-0 w-40"
          percent={total === 0 ? 0 : Math.round((filled / total) * 100)}
          size="small"
          format={() => `${filled}/${total}`}
        />
      }
    >
      <Alert
        className="mb-4"
        type="warning"
        showIcon
        message="Ô trống nghĩa là chưa đếm, không phải đếm ra 0"
        description="Nếu vị trí đó thực sự không còn hàng, hãy nhập số 0. Phiếu chỉ nộp được khi mọi dòng đã có số đếm. Tồn hệ thống được ẩn để số đếm phản ánh đúng hàng trên kệ."
      />
      <AdminTable
        rowKey="sku"
        dataSource={stocktake?.items ?? []}
        pagination={false}
        scroll={{ x: 760, y: 520 }}
        locale={{ emptyText: 'Phiếu không có dòng nào.' }}
        columns={columns}
      />
    </FormDrawer>
  );
}
