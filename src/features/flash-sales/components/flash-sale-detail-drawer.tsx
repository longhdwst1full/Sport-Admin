import { useMemo, useState } from 'react';
import { formatDateTime } from '@/lib/format/datetime';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { App, Button, Popconfirm, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  changeAdminFlashSaleStatus,
  getGetAdminFlashSaleQueryKey,
  getListAdminFlashSalesQueryKey,
  removeAdminFlashSaleItem,
  useGetAdminFlashSale,
} from '@/generated/api/promotions/promotions';
import type {
  FlashSaleCampaignDetailDto,
  FlashSaleCampaignStatus,
  FlashSaleItemDto,
} from '@/generated/api/promotions/promotions.schemas';
import { useCan } from '@/core/auth/permissions';
import { getApiErrorMessage } from '@/lib/api/error';
import { FLASH_SALE_TRANSITIONS, flashSaleStatusPresentation } from '../constants/flash-sale.constants';
import { DetailDrawer } from '@/foundation/overlay';
import { useSaveFlashSale } from '../hooks/use-save-flash-sale';
import { FlashSaleFormDrawer } from './flash-sale-form-drawer';

const ITEM_COLUMNS: ColumnsType<FlashSaleItemDto> = [
  col.text<FlashSaleItemDto>('sku', 'SKU', {
    width: 160,
    render: (sku: string) => (
      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{sku}</span>
    ),
  }),
  col.text<FlashSaleItemDto>('productName', 'Sản phẩm', {
    width: undefined,
    render: (name: string, row) => (
      <span className="flex min-w-0 items-center gap-2">
        <span className="line-clamp-1 text-xs font-bold text-slate-800 sm:text-sm">{name}</span>
        {row.status !== 'ACTIVE' && <Tag className="!m-0">Đã gỡ</Tag>}
      </span>
    ),
  }),
  col.money<FlashSaleItemDto>('salePrice', 'Giá flash', { className: 'font-black text-amber-600' }),
  col.money<FlashSaleItemDto>('regularPrice', 'Giá thường', { width: 130, className: 'text-xs text-slate-400 line-through' }),
  col.number<FlashSaleItemDto>('quota', 'Số suất', { width: 90 }),
  col.number<FlashSaleItemDto>('soldQuantity', 'Đã bán', { width: 90 }),
  col.number<FlashSaleItemDto>('availableQuantity', 'Còn lại', {
    width: 90,
    render: (available: number) => (
      <Tag color={available > 0 ? 'green' : 'default'} className="!m-0 !rounded-md !font-bold">
        {available}
      </Tag>
    ),
  }),
];

export function FlashSaleDetailDrawer({
  campaignId,
  onClose,
}: {
  campaignId?: string;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('catalog.flash_sale.manage');
  const [editOpen, setEditOpen] = useState(false);

  const detail = useGetAdminFlashSale(campaignId ?? '', {
    query: { enabled: Boolean(campaignId) },
  });
  const campaign = detail.data;
  // UX: API từ chối sửa chiến dịch đã ENDED/CANCELLED nên không mở form cho trạng thái kết thúc.
  const editable = Boolean(campaign && canManage && FLASH_SALE_TRANSITIONS[campaign.status].length > 0);

  const allowedTransitions = useMemo(
    () => (campaign ? (FLASH_SALE_TRANSITIONS[campaign.status] ?? []) : []),
    [campaign],
  );

  async function refresh(updated: FlashSaleCampaignDetailDto) {
    queryClient.setQueryData(getGetAdminFlashSaleQueryKey(updated.id), updated);
    await queryClient.invalidateQueries({ queryKey: getListAdminFlashSalesQueryKey() });
  }

  const saveMutation = useSaveFlashSale(() => setEditOpen(false));

  const statusMutation = useMutation({
    mutationFn: (status: FlashSaleCampaignStatus) => {
      if (!campaign) throw new Error('Chưa tải được chiến dịch');
      return changeAdminFlashSaleStatus(campaign.id, {
        expectedVersion: campaign.version,
        status,
      });
    },
    onSuccess: async (updated) => {
      await refresh(updated);
      void message.success('Đã cập nhật trạng thái chiến dịch');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: ({ itemId, version }: { itemId: string; version: string }) => {
      if (!campaign) throw new Error('Chưa tải được chiến dịch');
      return removeAdminFlashSaleItem(campaign.id, itemId, { expectedVersion: version });
    },
    onSuccess: async (updated) => {
      await refresh(updated);
      void message.success('Đã gỡ suất bán');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const mutateRemove = removeMutation.mutate;
  const itemColumns = useMemo<ColumnsType<FlashSaleItemDto>>(
    () =>
      canManage
        ? [
            ...ITEM_COLUMNS,
            col.actions<FlashSaleItemDto>(
              (row) => (
                <Popconfirm
                  title="Gỡ suất bán này?"
                  description="Đã phát sinh giao dịch thì suất chỉ được ngừng bán, không xoá."
                  okText="Gỡ"
                  cancelText="Huỷ"
                  onConfirm={() => mutateRemove({ itemId: row.id, version: row.version })}
                >
                  <span className="inline-flex">
                    <TableActionButton danger label={`Gỡ suất ${row.sku}`} icon={<DeleteOutlined />} />
                  </span>
                </Popconfirm>
              ),
              { title: '', width: 56 },
            ),
          ]
        : ITEM_COLUMNS,
    [canManage, mutateRemove],
  );

  return (
    <DetailDrawer
      open={Boolean(campaignId)}
      onClose={onClose}
      size="lg"
      classNames={{ body: 'bg-slate-50' }}
      loading={detail.isLoading}
      error={detail.isError ? detail.error : undefined}
      onRetry={() => void detail.refetch()}
      status={campaign ? <StatusTag status={campaign.status} presentations={flashSaleStatusPresentation} /> : undefined}
      title={
        campaign ? (
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 border border-amber-500/20">
              {campaign.code}
            </span>
            <span className="text-base font-bold text-slate-800">{campaign.name}</span>
          </div>
        ) : (
          'Chi tiết chiến dịch Flash Sale'
        )
      }
      actions={
        editable ? (
          <Button
            type="primary"
            icon={<EditOutlined />}
            className="!rounded-xl !font-semibold"
            onClick={() => setEditOpen(true)}
          >
            Sửa chiến dịch & suất bán
          </Button>
        ) : undefined
      }
    >
      {campaign && (
        <div className="space-y-6">
          {/* Campaign Overview Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">
                  Tổng <strong className="text-slate-800 font-bold">{campaign.itemCount}</strong> suất bán
                </span>
              </div>

              {/* Status Transitions */}
              {canManage && allowedTransitions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Chuyển trạng thái:</span>
                  {allowedTransitions.map((status) => (
                    <Popconfirm
                      key={status}
                      title={`Chuyển chiến dịch sang ${flashSaleStatusPresentation[status].label}?`}
                      okText="Xác nhận"
                      cancelText="Huỷ"
                      onConfirm={() => statusMutation.mutate(status)}
                    >
                      <Button
                        size="small"
                        className="!rounded-lg !text-xs !font-semibold"
                        loading={statusMutation.isPending}
                      >
                        {flashSaleStatusPresentation[status].label}
                      </Button>
                    </Popconfirm>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Info Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CalendarOutlined className="text-base" />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Thời gian bắt đầu</span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatDateTime(campaign.startsAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                  <ClockCircleOutlined className="text-base" />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Thời gian kết thúc</span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatDateTime(campaign.endsAt)}
                  </span>
                </div>
              </div>
            </div>

            {campaign.description && (
              <div className="mt-3.5 rounded-xl bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-600 border border-slate-100">
                <span className="font-bold text-slate-700">Mô tả: </span>
                {campaign.description}
              </div>
            )}
          </div>

          {/* Suất bán Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FireOutlined className="text-amber-500 text-base" />
                <h3 className="text-sm font-bold text-slate-800 m-0">Danh sách suất bán Flash Sale</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {campaign.items?.length ?? 0}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <AdminTable
                rowKey="id"
                size="middle"
                dataSource={campaign.items}
                pagination={false}
                loading={detail.isFetching}
                locale={{ emptyText: 'Chưa có suất bán nào trong chiến dịch.' }}
                columns={itemColumns}
              />
            </div>
          </div>

        </div>
      )}
      {editOpen && campaign && (
        <FlashSaleFormDrawer
          open
          campaign={campaign}
          submitting={saveMutation.isPending}
          onCancel={() => setEditOpen(false)}
          onSubmit={(submit) => saveMutation.mutate({ submit, existing: campaign })}
        />
      )}
    </DetailDrawer>
  );
}
