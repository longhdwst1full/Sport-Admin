import { useState } from 'react';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { PlusOutlined, ThunderboltOutlined, TrophyOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { useListAdminFlashSales } from '@/generated/api/promotions/promotions';
import { FlashSaleCampaignStatus } from '@/generated/api/promotions/promotions.schemas';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, FilterBar, RefreshButton } from '@/foundation/table';
import { FlashSaleFormDrawer } from '../components/flash-sale-form-drawer';
import { FlashSaleDetailDrawer } from '../components/flash-sale-detail-drawer';
import { FlashSaleTable } from '../components/flash-sale-table';
import { flashSaleStatusOptions } from '../constants/flash-sale.constants';
import { useSaveFlashSale } from '../hooks/use-save-flash-sale';

/** Ô tìm, trạng thái và trang nằm trên URL (`search`, `status`, `page`) để F5/Back/gửi link giữ nguyên lọc. */
export function FlashSalesPage() {
  const canManage = useCan('catalog.flash_sale.manage');
  const search = useUrlSearch(['search']);
  const { url } = search;
  const status = url.getEnum('status', FlashSaleCampaignStatus);
  const page = url.getNumber('page', 1);
  const [selectedId, setSelectedId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);

  const campaigns = useListAdminFlashSales({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    search: url.get('search'),
    status,
  });
  const rows = campaigns.data?.items ?? [];

  // UX: tạo xong đóng drawer, về trang 1 của danh sách (đã invalidate) để thấy chiến dịch mới.
  const createMutation = useSaveFlashSale(() => {
    setCreateOpen(false);
    url.set('page', undefined);
  });

  return (
    <>
      <ManagementPage
        eyebrow="Khuyến mãi & tiếp thị"
        title="Flash Sale"
        description="Chiến dịch giảm giá theo khung giờ với số suất giới hạn cho từng SKU."
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
          <FilterBar
            actions={
              <>
                <RefreshButton onRefresh={campaigns.refetch} loading={campaigns.isFetching} />
                {canManage && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                    Tạo chiến dịch
                  </Button>
                )}
              </>
            }
          >
            <SearchInput
              value={search.values.search}
              onChange={search.setter('search')}
              placeholder="Mã hoặc tên chiến dịch"
            />
            <Select
              allowClear
              className="min-w-44"
              value={status}
              onChange={(value?: FlashSaleCampaignStatus) => url.patch({ status: value, page: undefined })}
              placeholder="Trạng thái"
              options={flashSaleStatusOptions}
            />
          </FilterBar>
        }
      >
        {campaigns.isError && (
          <QueryErrorAlert
            message="Không tải được danh sách chiến dịch"
            error={campaigns.error}
            retry={() => void campaigns.refetch()}
          />
        )}
        <FlashSaleTable
          rows={rows}
          loading={campaigns.isLoading || campaigns.isFetching}
          page={page}
          total={campaigns.data?.total ?? 0}
          onPageChange={(next) => url.set('page', next > 1 ? next : undefined)}
          onOpen={setSelectedId}
        />
      </ManagementPage>

      <FlashSaleDetailDrawer campaignId={selectedId} onClose={() => setSelectedId(undefined)} />

      {/* Mount theo lượt mở để form và bảng suất luôn bắt đầu sạch. */}
      {createOpen && (
        <FlashSaleFormDrawer
          open
          submitting={createMutation.isPending}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(submit) => createMutation.mutate({ submit })}
        />
      )}
    </>
  );
}
