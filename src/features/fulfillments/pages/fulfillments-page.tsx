import { useEffect, useMemo, useState } from 'react';
import { CarOutlined, InboxOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Select, Tooltip } from 'antd';
import { useDebounce } from 'use-debounce';
import { useListAdminFulfillments } from '@/generated/api/fulfillments/fulfillments';
import type { ListAdminFulfillmentsStatus } from '@/generated/api/fulfillments/models';
import { ManagementPage } from '@/foundation/management';
import { getApiErrorMessage } from '@/lib/api/error';
import { OrderDetailDrawer } from '@/features/orders';
import { FulfillmentTable } from '../components/fulfillment-table';
import {
  ACTIONABLE_FULFILLMENT_STATUSES,
  FULFILLMENT_PAGE_SIZE,
  fulfillmentStatusPresentation,
} from '../constants/fulfillment.constants';

const statusOptions = Object.entries(fulfillmentStatusPresentation).map(([value, { label }]) => ({
  value,
  label,
}));

export function FulfillmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListAdminFulfillmentsStatus>();
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [debouncedSearch] = useDebounce(search.trim(), 350);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const fulfillments = useListAdminFulfillments({
    page,
    limit: FULFILLMENT_PAGE_SIZE,
    search: debouncedSearch || undefined,
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
          <div className="flex w-full flex-wrap gap-3">
            <Input.Search
              allowClear
              className="min-w-64 flex-1"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã giao vận, mã đơn, tracking, tên, SĐT hoặc email người nhận"
            />
            <Select
              allowClear
              className="min-w-48"
              value={status}
              onChange={setStatus}
              placeholder="Trạng thái"
              options={statusOptions}
            />
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void fulfillments.refetch()}
                loading={fulfillments.isFetching}
                aria-label="Làm mới"
              />
            </Tooltip>
          </div>
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
      <OrderDetailDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(undefined)} />
    </>
  );
}
