import { useState } from 'react';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { PlusOutlined, ThunderboltOutlined, TrophyOutlined } from '@ant-design/icons';
import { Alert, Button, Select } from 'antd';
import { useListAdminFlashSales } from '@/generated/api/promotions/promotions';
import type { FlashSaleCampaignStatus } from '@/generated/api/promotions/promotions.schemas';
import { useCan } from '@/core/auth/permissions';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { FilterBar, RefreshButton } from '@/foundation/table';
import { getApiErrorMessage } from '@/lib/api/error';
import { FlashSaleCreateDrawer } from '../components/flash-sale-create-drawer';
import { FlashSaleDetailDrawer } from '../components/flash-sale-detail-drawer';
import { FlashSaleTable } from '../components/flash-sale-table';
import { FLASH_SALE_PAGE_SIZE, flashSaleStatusOptions } from '../constants/flash-sale.constants';
import { useCreateFlashSale } from '../hooks/use-create-flash-sale';

export function FlashSalesPage() {
  const canManage = useCan('catalog.flash_sale.manage');
  const search = useSearchState();
  const debouncedSearch = search.debounced;
  const [status, setStatus] = useState<FlashSaleCampaignStatus>();
  const [selectedId, setSelectedId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useListPageReset([debouncedSearch, status]);

  const campaigns = useListAdminFlashSales({
    page,
    limit: FLASH_SALE_PAGE_SIZE,
    search: debouncedSearch,
    status,
  });
  const rows = campaigns.data?.items ?? [];

  const createMutation = useCreateFlashSale((id) => {
    setCreateOpen(false);
    setSelectedId(id);
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
              value={search.value}
              onChange={search.setValue}
              placeholder="Mã hoặc tên chiến dịch"
            />
            <Select
              allowClear
              className="min-w-44"
              value={status}
              onChange={setStatus}
              placeholder="Trạng thái"
              options={flashSaleStatusOptions}
            />
          </FilterBar>
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
