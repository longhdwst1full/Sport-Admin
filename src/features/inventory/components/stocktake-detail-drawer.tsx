import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Descriptions, Space, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { usePermissions } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management';
import { DetailDrawer, useConfirmWithReason } from '@/foundation/overlay';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col } from '@/foundation/table';
import {
  getGetStocktakeQueryKey,
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStocktakesQueryKey,
  useApproveStocktake,
  useCancelStocktake,
  useGetStocktake,
  useSubmitStocktake,
} from '@/generated/api/inventory/inventory';
import type { StocktakeItemDto } from '@/generated/api/inventory/inventory.schemas';
import {
  availableStocktakeActions,
  getStocktakeErrorMessage,
  isSelfApprovalError,
  stocktakeApproveGate,
} from '../model/stocktake-actions.policy';
import { formatStocktakeTime, stocktakeScopeLabel, stocktakeStatusMeta } from '../constants/stocktake.constants';
import { StocktakeCountDrawer } from './stocktake-count-drawer';

const varianceTag = (value?: number | null) => {
  if (value === null || value === undefined) return <Tag>Chưa đếm</Tag>;
  if (value === 0) return <Tag color="green">Khớp</Tag>;
  return <Tag color={value > 0 ? 'blue' : 'red'}>{value > 0 ? `Thừa ${value}` : `Thiếu ${Math.abs(value)}`}</Tag>;
};

const STOCKTAKE_ITEM_COLUMNS: ColumnsType<StocktakeItemDto> = [
  { title: 'SKU', dataIndex: 'sku', width: 150, render: (value) => <Typography.Text code>{value}</Typography.Text> },
  { title: 'Sản phẩm', dataIndex: 'productName', ellipsis: true },
  col.number<StocktakeItemDto>('systemQuantity', 'Tồn hệ thống', { width: 120 }),
  { title: 'Đếm thực tế', dataIndex: 'countedQuantity', width: 115, align: 'right', render: (value) => value ?? <Tag>Chưa đếm</Tag> },
  { title: 'Chênh lệch', dataIndex: 'varianceQuantity', width: 125, render: varianceTag },
  col.number<StocktakeItemDto>('currentOnHand', 'Tồn hiện tại', { width: 115 }),
  {
    title: 'Ghi sổ',
    dataIndex: 'postingDelta',
    width: 130,
    align: 'right',
    render: (value: number | null, row) => {
      if (value === null || value === undefined) return '—';
      return (
        <Space size={4}>
          {row.drifted && <Tooltip title="Có phát sinh sau khi đếm; số này đã cộng bù"><Tag color="orange">bù</Tag></Tooltip>}
          <span>{value === 0 ? '—' : value > 0 ? `+${value}` : value}</span>
        </Space>
      );
    },
  },
  col.text<StocktakeItemDto>('note', 'Ghi chú', { width: 160, ellipsis: true }),
];

export function StocktakeDetailDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const detail = useGetStocktake(id ?? '', { query: { enabled: Boolean(id) } });
  const stocktake = detail.data;
  const permissions = usePermissions();
  const actions = stocktake ? availableStocktakeActions(stocktake.status, permissions) : [];
  const approveGate = stocktakeApproveGate(stocktake?.status ?? 'DRAFT', stocktake?.canApprove);
  const [countOpen, setCountOpen] = useState(false);
  const confirmWithReason = useConfirmWithReason();

  const refresh = async (stocktakeId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListStocktakesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetStocktakeQueryKey(stocktakeId) }),
      queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
    ]);
  };

  const handler = (fallback: string) => ({
    onSuccess: async (result: { id: string }) => { await refresh(result.id); },
    onError: (error: unknown) => {
      void message.error(getStocktakeErrorMessage(error, fallback));
      // Quyền duyệt đã đổi so với bản đang xem: tải lại để nút phản ánh canApprove mới.
      if (isSelfApprovalError(error) && id) void refresh(id);
    },
  });

  const submit = useSubmitStocktake({
    mutation: {
      ...handler('Không thể nộp phiếu kiểm kê.'),
      onSuccess: async (result) => { await refresh(result.id); void message.success('Đã nộp phiếu, kiểm tra chênh lệch trước khi duyệt.'); },
    },
  });
  const approve = useApproveStocktake({
    mutation: {
      ...handler('Không thể duyệt phiếu kiểm kê.'),
      onSuccess: async (result) => { await refresh(result.id); void message.success(`Đã ghi chênh lệch của ${result.stocktakeNo} vào sổ kho.`); },
    },
  });
  const cancel = useCancelStocktake({
    mutation: {
      ...handler('Không thể huỷ phiếu kiểm kê.'),
      onSuccess: async (result) => {
        await refresh(result.id);
        void message.success('Đã huỷ phiếu kiểm kê.');
      },
    },
  });

  const pending = submit.isPending || approve.isPending || cancel.isPending;
  const drifted = stocktake?.driftedCount ?? 0;
  const postingLines = (stocktake?.items ?? []).filter((item) => (item.postingDelta ?? 0) !== 0).length;

  /**
   * Duyệt là một chiều: sổ kho append-only nên không có un-approve. Bắt xác nhận và nói rõ số dòng
   * sắp ghi, thay vì để một cú bấm nhầm thành bút toán vĩnh viễn.
   */
  const confirmApprove = () => {
    if (!stocktake) return;
    modal.confirm({
      title: `Duyệt và ghi sổ ${stocktake.stocktakeNo}?`,
      okText: 'Duyệt và ghi sổ',
      cancelText: 'Xem lại',
      okButtonProps: { danger: drifted > 0 },
      content: (
        <div className="space-y-2">
          <p>{postingLines === 0
            ? 'Phiếu không có chênh lệch nào; duyệt sẽ ghi nhận là đã kiểm và tồn khớp, không sinh bút toán.'
            : `Sẽ ghi ${postingLines} bút toán điều chỉnh vào sổ kho.`}</p>
          {drifted > 0 && (
            <p className="text-red-600">
              {drifted} dòng đã phát sinh giao dịch sau khi đếm. Hệ thống đã bù phần phát sinh đó vào số ghi sổ,
              nhưng nếu bạn đếm ra giấy rồi nhập bù muộn thì nên đếm lại các dòng này trước.
            </p>
          )}
          <p className="text-slate-500">Không thể hoàn tác: sổ kho là bút toán bất biến, sai phải lập phiếu bù.</p>
        </div>
      ),
      onOk: () => approve.mutateAsync({ id: stocktake.id, data: { version: stocktake.version } }).then(() => undefined),
    });
  };

  const confirmCancel = () => {
    if (!stocktake) return;
    confirmWithReason({
      title: `Huỷ phiếu kiểm kê ${stocktake.stocktakeNo}?`,
      consequence: 'Phiếu đã huỷ không đếm tiếp được; muốn kiểm lại thì tạo phiếu mới.',
      okText: 'Huỷ phiếu',
      placeholder: 'Lý do huỷ, tối thiểu 3 ký tự',
      minLength: 3,
      maxLength: 1000,
      onOk: (reason) => cancel.mutateAsync({ id: stocktake.id, data: { version: stocktake.version, reason } }),
    });
  };

  return (
    <>
      <DetailDrawer
        title={stocktake ? `Phiếu kiểm kê ${stocktake.stocktakeNo}` : 'Phiếu kiểm kê'}
        status={stocktake && <StatusTag status={stocktake.status} presentations={stocktakeStatusMeta} />}
        open={Boolean(id)}
        onClose={onClose}
        loading={detail.isPending}
        error={detail.isError ? detail.error : undefined}
        onRetry={() => void detail.refetch()}
        actions={stocktake && (
          <Space>
            {actions.includes('cancel') && <Button danger disabled={pending} onClick={confirmCancel}>Huỷ phiếu</Button>}
            {actions.includes('count') && <Button disabled={pending} onClick={() => setCountOpen(true)}>Nhập số đếm</Button>}
            {actions.includes('submit') && (
              <Tooltip title={stocktake.countedCount < stocktake.itemCount ? 'Phải đếm đủ mọi dòng trước khi nộp' : undefined}>
                <Button
                  type="primary"
                  loading={submit.isPending}
                  disabled={pending || stocktake.countedCount < stocktake.itemCount}
                  onClick={() => submit.mutate({ id: stocktake.id, data: { version: stocktake.version } })}
                >
                  Nộp phiếu
                </Button>
              </Tooltip>
            )}
            {actions.includes('approve') && (
              <Tooltip title={approveGate.tooltip}>
                <Button type="primary" loading={approve.isPending} disabled={pending || approveGate.disabled} onClick={confirmApprove}>
                  Duyệt và ghi sổ
                </Button>
              </Tooltip>
            )}
          </Space>
        )}
      >
        {stocktake && (
          <>
            <Descriptions className="mb-4" size="small" column={3} bordered items={[
              { key: 'warehouse', label: 'Kho', children: stocktake.warehouseCode },
              { key: 'scope', label: 'Phạm vi', children: stocktakeScopeLabel[stocktake.scopeType] },
              { key: 'progress', label: 'Đã đếm', children: `${stocktake.countedCount}/${stocktake.itemCount}` },
              { key: 'snapshot', label: 'Chụp tồn lúc', children: formatStocktakeTime(stocktake.snapshotAt) },
              { key: 'creator', label: 'Người tạo', children: stocktake.createdByDisplayName },
              { key: 'submitted', label: 'Nộp lúc', children: formatStocktakeTime(stocktake.submittedAt) },
              { key: 'posted', label: 'Ghi sổ lúc', children: formatStocktakeTime(stocktake.postedAt) },
              { key: 'approver', label: 'Người duyệt', children: stocktake.approvedByDisplayName ?? '—' },
            ]} />

            {stocktake.status === 'DRAFT' && (
              <Alert
                className="mb-4"
                type="info"
                showIcon
                message="Đang đếm — tồn hệ thống và chênh lệch được ẩn"
                description="Số liệu chỉ hiện sau khi nộp phiếu, để lần đếm không bị ảnh hưởng bởi con số hệ thống kỳ vọng."
              />
            )}
            {drifted > 0 && (
              <Alert
                className="mb-4"
                type="warning"
                showIcon
                message={`${drifted} dòng có phát sinh kho sau khi đếm`}
                description="Số ghi sổ đã cộng bù phần phát sinh sau thời điểm đếm, nên tồn cuối vẫn đúng. Chỉ cần đếm lại nếu bạn ghi số ra giấy rồi mới nhập vào hệ thống muộn hơn."
              />
            )}
            {stocktake.status === 'CANCELLED' && stocktake.cancelReason && (
              <Alert className="mb-4" type="error" showIcon message="Phiếu đã huỷ" description={stocktake.cancelReason} />
            )}

            <AdminTable
              rowKey="id"
              dataSource={stocktake.items}
              pagination={false}
              scroll={{ x: 880, y: 420 }}
              columns={STOCKTAKE_ITEM_COLUMNS}
            />
          </>
        )}
      </DetailDrawer>

      <StocktakeCountDrawer stocktake={stocktake} open={countOpen} onClose={() => setCountOpen(false)} />
    </>
  );
}
