import { useMemo, useState } from 'react';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { CarOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Select } from 'antd';
import { useListAdminFulfillments } from '@/generated/api/fulfillments/fulfillments';
import type { FulfillmentStatus } from '@/generated/api/fulfillments/fulfillments.schemas';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { FilterBar, RefreshButton } from '@/foundation/table';
import { getApiErrorMessage } from '@/lib/api/error';
// `orders` không còn import gì từ `fulfillments` (OrderDetailDrawer nhận panel qua prop),
// nên import qua barrel công khai ở đây không còn tạo vòng phụ thuộc giữa hai feature.
import { OrderDetailDrawer } from '@/features/orders';
import { FulfillmentTable } from '../components/fulfillment-table';
import { FulfillmentWorkflowPanel } from '../components/fulfillment-workflow-panel';
import {
  ACTIONABLE_FULFILLMENT_STATUSES,
  FULFILLMENT_PAGE_SIZE,
  fulfillmentStatusOptions,
} from '../constants/fulfillment.constants';

export function FulfillmentsPage() {
  const search = useSearchState();
  const debouncedSearch = search.debounced;
  const [status, setStatus] = useState<FulfillmentStatus>();
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [page, setPage] = useListPageReset([debouncedSearch, status]);

  const fulfillments = useListAdminFulfillments({
    page,
    limit: FULFILLMENT_PAGE_SIZE,
    search: debouncedSearch,
    status,
  });
  const rows = useMemo(() => fulfillments.data?.items ?? [], [fulfillments.data]);

  const actionableCount = rows.filter((row) =>
    (ACTIONABLE_FULFILLMENT_STATUSES as readonly string[]).includes(row.status),
  ).length;
  const failedCount = rows.filter((row) => row.status === 'DELIVERY_FAILED').length;

  return (
    <>
      <ManagementPage
        eyebrow="Warehouse operations"
        title="Giao vận"
        description="Hàng đợi xử lý tại kho: lấy hàng, đóng gói, bàn giao và nhận hàng hoàn."
        metrics={[
          {
            key: 'total',
            label: 'Phiếu phù hợp',
            value: fulfillments.data?.total ?? 0,
            icon: <CarOutlined />,
            tone: 'blue',
          },
          {
            key: 'actionable',
            label: 'Chờ xử lý trên trang',
            value: actionableCount,
            icon: <InboxOutlined />,
            tone: 'orange',
          },
          {
            key: 'failed',
            label: 'Giao thất bại trên trang',
            value: failedCount,
            icon: <WarningOutlined />,
            tone: 'red',
          },
        ]}
        filters={
          <FilterBar
            actions={<RefreshButton onRefresh={fulfillments.refetch} loading={fulfillments.isFetching} />}
          >
            <SearchInput
              className="w-full sm:!w-[360px]"
              value={search.value}
              onChange={search.setValue}
              placeholder="Mã giao vận, mã đơn, tracking, tên, SĐT hoặc email người nhận"
            />
            <Select
              allowClear
              className="min-w-48"
              value={status}
              onChange={setStatus}
              placeholder="Trạng thái"
              options={fulfillmentStatusOptions}
            />
          </FilterBar>
        }
      >
        {fulfillments.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được danh sách giao vận"
            description={getApiErrorMessage(fulfillments.error)}
          />
        )}
        <FulfillmentTable
          rows={rows}
          loading={fulfillments.isLoading || fulfillments.isFetching}
          page={page}
          total={fulfillments.data?.total ?? 0}
          onPageChange={setPage}
          onOpenOrder={setSelectedOrderId}
        />
      </ManagementPage>
      <OrderDetailDrawer
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(undefined)}
        renderFulfillmentPanel={(orderId) => <FulfillmentWorkflowPanel orderId={orderId} />}
      />
    </>
  );
}
