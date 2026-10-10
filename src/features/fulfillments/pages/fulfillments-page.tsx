import { useMemo, useState } from 'react';
import { CarOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useListAdminFulfillments } from '@/generated/api/fulfillments/fulfillments';
import { FulfillmentStatus } from '@/generated/api/fulfillments/fulfillments.schemas';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, FilterBar, RefreshButton } from '@/foundation/table';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
// `orders` không còn import gì từ `fulfillments` (OrderDetailDrawer nhận panel qua prop),
// nên import qua barrel công khai ở đây không còn tạo vòng phụ thuộc giữa hai feature.
import { OrderDetailDrawer } from '@/features/orders';
import { FulfillmentTable } from '../components/fulfillment-table';
import { FulfillmentStatusTag } from '../components/fulfillment-status-tag';
import { FulfillmentWorkflowPanel } from '../components/fulfillment-workflow-panel';
import { ACTIONABLE_FULFILLMENT_STATUSES, fulfillmentStatusOptions } from '../constants/fulfillment.constants';

/** Ô tìm, trạng thái và trang nằm trên URL (`search`, `status`, `page`) để F5/Back/gửi link giữ nguyên. */
export function FulfillmentsPage() {
  const search = useUrlSearch(['search']);
  const { url } = search;
  const status = url.getEnum('status', FulfillmentStatus);
  const page = url.getNumber('page', 1);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();

  const fulfillments = useListAdminFulfillments({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    search: url.get('search'),
    status,
  });
  const rows = useMemo(() => fulfillments.data?.items ?? [], [fulfillments.data]);

  const actionableCount = rows.filter((row) => ACTIONABLE_FULFILLMENT_STATUSES.has(row.status)).length;
  const failedCount = rows.filter((row) => row.status === 'DELIVERY_FAILED').length;

  return (
    <>
      <ManagementPage
        eyebrow="Vận hành kho"
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
              value={search.values.search}
              onChange={search.setter('search')}
              placeholder="Mã giao vận, mã đơn, tracking, tên, SĐT hoặc email người nhận"
            />
            <Select
              allowClear
              className="min-w-48"
              value={status}
              onChange={(value?: FulfillmentStatus) => url.patch({ status: value, page: undefined })}
              placeholder="Trạng thái"
              options={fulfillmentStatusOptions}
            />
          </FilterBar>
        }
      >
        {fulfillments.isError && (
          <QueryErrorAlert
            message="Không tải được danh sách giao vận"
            error={fulfillments.error}
            retry={() => void fulfillments.refetch()}
          />
        )}
        <FulfillmentTable
          rows={rows}
          loading={fulfillments.isLoading || fulfillments.isFetching}
          page={page}
          total={fulfillments.data?.total ?? 0}
          onPageChange={(next) => url.set('page', next > 1 ? next : undefined)}
          onOpenOrder={setSelectedOrderId}
        />
      </ManagementPage>
      <OrderDetailDrawer
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(undefined)}
        renderFulfillmentPanel={(orderId) => <FulfillmentWorkflowPanel orderId={orderId} />}
        renderShipmentStatus={(shipmentStatus) => <FulfillmentStatusTag status={shipmentStatus} />}
      />
    </>
  );
}
