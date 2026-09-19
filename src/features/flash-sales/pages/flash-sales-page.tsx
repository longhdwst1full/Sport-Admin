import { useEffect, useState } from 'react';
import { PlusOutlined, ReloadOutlined, ThunderboltOutlined, TrophyOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Select } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import {
  createAdminFlashSale,
  getListAdminFlashSalesQueryKey,
  upsertAdminFlashSaleItem,
  useListAdminFlashSales,
} from '@/generated/api/promotions/promotions';
import type { ListAdminFlashSalesStatus } from '@/generated/api/promotions/models';
import { useCan } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  FlashSaleCreateDrawer,
  type CreateCampaignValues,
  type StagedItem,
} from '../components/flash-sale-create-drawer';
import { FlashSaleDetailDrawer } from '../components/flash-sale-detail-drawer';
import { FlashSaleTable } from '../components/flash-sale-table';
import { FLASH_SALE_PAGE_SIZE, flashSaleStatusPresentation } from '../constants/flash-sale.constants';

const statusOptions = Object.entries(flashSaleStatusPresentation).map(([value, { label }]) => ({
  value,
  label,
}));

export function FlashSalesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('catalog.flash_sale.manage');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListAdminFlashSalesStatus>();
  const [selectedId, setSelectedId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search.trim(), 350);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const campaigns = useListAdminFlashSales({
    page,
    limit: FLASH_SALE_PAGE_SIZE,
    search: debouncedSearch || undefined,
    status,
  });
  const rows = campaigns.data?.items ?? [];

  /**
   * API không có lệnh tạo chiến dịch kèm suất bán trong một giao dịch, nên tạo
   * chiến dịch trước rồi thêm từng suất. Chiến dịch sinh ra ở trạng thái nháp và
   * chưa hiển thị cho khách, nên nếu một suất lỗi thì chỉ cần thêm lại suất đó —
   * không có rủi ro bán sai giá.
   */
  const createMutation = useMutation({
    mutationFn: async ({
      campaign,
      items,
    }: {
      campaign: CreateCampaignValues;
      items: StagedItem[];
    }) => {
      const created = await createAdminFlashSale({
        code: campaign.code.trim().toUpperCase(),
        name: campaign.name.trim(),
        description: campaign.description?.trim() || undefined,
        startsAt: campaign.window[0].toISOString(),
        endsAt: campaign.window[1].toISOString(),
      });

      const failed: string[] = [];
      for (const item of items) {
        try {
          await upsertAdminFlashSaleItem(created.id, {
            productVariantId: item.productVariantId,
            salePrice: item.salePrice.toFixed(2),
            quota: item.quota,
            ...(item.perCustomerLimit ? { perCustomerLimit: item.perCustomerLimit } : {}),
          });
        } catch {
          failed.push(item.sku);
        }
      }
      return { created, added: items.length - failed.length, failed };
    },
    onSuccess: async ({ created, added, failed }) => {
      await queryClient.invalidateQueries({ queryKey: getListAdminFlashSalesQueryKey() });
      setCreateOpen(false);
      setSelectedId(created.id);
      if (failed.length > 0) {
        void message.warning(
          `Đã tạo chiến dịch và thêm ${added} suất. Chưa thêm được: ${failed.join(', ')}.`,
        );
        return;
      }
      void message.success(
        added > 0
          ? `Đã tạo chiến dịch nháp kèm ${added} suất bán`
          : 'Đã tạo chiến dịch ở trạng thái nháp',
      );
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <ManagementPage
        eyebrow="Marketing operations"
        title="Flash Sale"
        description="Chiến dịch giảm giá theo khung giờ với quota giới hạn cho từng SKU."
        metrics={[
          {
            key: 'total',
            label: 'Chiến dịch phù hợp',
            value: campaigns.data?.total ?? 0,
            icon: <ThunderboltOutlined />,
            tone: 'blue',
          },
          {
            key: 'active',
            label: 'Đang chạy trên trang',
            value: rows.filter((row) => row.status === 'ACTIVE').length,
            icon: <TrophyOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <div className="flex w-full flex-wrap gap-3">
            <Input.Search
              allowClear
              className="min-w-64 flex-1"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã hoặc tên chiến dịch"
            />
            <Select
              allowClear
              className="min-w-44"
              value={status}
              onChange={setStatus}
              placeholder="Trạng thái"
              options={statusOptions}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void campaigns.refetch()}>
              Làm mới
            </Button>
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                Tạo chiến dịch
              </Button>
            )}
          </div>
        }
      >
        {campaigns.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được danh sách chiến dịch"
            description={getApiErrorMessage(campaigns.error)}
          />
        )}
        <FlashSaleTable
          rows={rows}
          loading={campaigns.isLoading || campaigns.isFetching}
          page={page}
          total={campaigns.data?.total ?? 0}
          onPageChange={setPage}
          onOpen={setSelectedId}
        />
      </ManagementPage>

      <FlashSaleDetailDrawer campaignId={selectedId} onClose={() => setSelectedId(undefined)} />

      <FlashSaleCreateDrawer
        open={createOpen}
        submitting={createMutation.isPending}
        onCancel={() => setCreateOpen(false)}
        onSubmit={(campaign, items) => createMutation.mutate({ campaign, items })}
      />
    </>
  );
}
