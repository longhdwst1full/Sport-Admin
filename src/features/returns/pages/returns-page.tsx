import { useMemo, type ReactNode } from 'react';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { ClockCircleOutlined, DollarOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, FilterBar, RefreshButton } from '@/foundation/table';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { useGetAdminReturnQueueSummary, useListAdminReturns } from '@/generated/api/returns/returns';
import { ReturnStatus } from '@/generated/api/returns/returns.schemas';
import { ReturnDetailDrawer } from '../components/return-detail-drawer';
import { ReturnTable } from '../components/return-table';
import { returnStatusOptions } from '../constants/return.constants';

/**
 * Hàng đợi đổi trả. Bộ lọc trạng thái và phiếu đang mở nằm trên URL để nhân viên gửi link cho nhau
 * và F5 không mất vị trí; ô đếm lấy từ API tổng hợp (cùng phạm vi chi nhánh), không đếm trên trang.
 */
export function ReturnsPage() {
  const url = useUrlFilters();
  const status = url.getEnum('status', ReturnStatus);
  const openId = url.get('id');
  const search = useSearchState();
  const [page, setPage] = useListPageReset([search.debounced, status]);

  const summary = useGetAdminReturnQueueSummary({ query: { retry: false } });
  const list = useListAdminReturns({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    status,
    search: search.debounced,
  });
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const counts = summary.data;

  const metric = (key: string, label: string, value: number | undefined, icon: ReactNode, tone: 'blue' | 'orange' | 'red' | 'green') => ({
    key,
    label,
    value: value ?? 0,
    icon,
    tone,
  });

  return (
    <>
      <ManagementPage
        eyebrow="Hậu mãi"
        title="Đổi trả & hoàn tiền"
        description="Duyệt yêu cầu trả, nhận và kiểm hàng, hoàn tiền có chứng từ để đối chiếu."
        metrics={[
          metric('decision', 'Chờ duyệt', counts?.awaitingDecision, <ClockCircleOutlined />, 'orange'),
          metric('receipt', 'Chờ nhận hàng', counts?.awaitingReceipt, <InboxOutlined />, 'blue'),
          metric('refund', 'Chờ hoàn tiền', counts?.awaitingRefund, <DollarOutlined />, 'green'),
          metric('overdue', 'Lượt hoàn chờ > 24 giờ', counts?.overdueRefunds, <WarningOutlined />, 'red'),
        ]}
        filters={(
          <FilterBar
            actions={(
              <RefreshButton
                loading={list.isFetching}
                onRefresh={() => Promise.all([list.refetch(), summary.refetch()])}
              />
            )}
          >
            <SearchInput
              className="min-w-64 flex-1"
              value={search.value}
              onChange={search.setValue}
              placeholder="Mã phiếu, mã đơn, tên hoặc SĐT khách"
            />
            <Select
              allowClear
              className="min-w-48"
              value={status}
              onChange={(value?: string) => url.set('status', value)}
              placeholder="Trạng thái"
              options={returnStatusOptions}
            />
          </FilterBar>
        )}
      >
        {list.isError && (
          <QueryErrorAlert
            message="Không tải được danh sách phiếu trả"
            error={list.error}
            retry={() => void list.refetch()}
          />
        )}
        <ReturnTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          page={page}
          total={list.data?.total ?? 0}
          onPageChange={setPage}
          onOpen={(id) => url.set('id', id)}
        />
      </ManagementPage>
      <ReturnDetailDrawer returnId={openId} onClose={() => url.set('id', undefined)} />
    </>
  );
}
