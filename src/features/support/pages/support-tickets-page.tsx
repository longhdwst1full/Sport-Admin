import { useMemo } from 'react';
import { Select } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, FilterBar, RefreshButton } from '@/foundation/table';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { BranchSelect } from '@/features/organization';
import { SupportTicketDetailDrawer } from '../components/support-ticket-detail-drawer';
import { SupportTicketTable } from '../components/support-ticket-table';
import { SupportTicketPriority, SupportTicketStatus } from '@/generated/api/support/support.schemas';
import {
  supportTicketPriorityOptions,
  supportTicketStatusOptions,
} from '../constants/support.constants';
import { useSupportAssigneeOptions } from '../hooks/use-support-assignee-options';
import { useSupportTickets } from '../hooks/use-support-tickets';

/**
 * Hàng đợi hỗ trợ. Bộ lọc (trừ ô tìm kiếm) và ticket đang mở nằm trên URL để nhân viên gửi link cho
 * nhau và F5 không mất vị trí; phân trang/lọc chạy ở server.
 */
export function SupportTicketsPage() {
  const url = useUrlFilters();
  const status = url.getEnum('status', SupportTicketStatus);
  const priority = url.getEnum('priority', SupportTicketPriority);
  const assigneeId = url.get('assignee');
  const branchId = url.get('branch');
  const openId = url.get('id');
  const search = useSearchState();
  const [page, setPage] = useListPageReset([search.debounced, status, priority, assigneeId, branchId]);
  const assignees = useSupportAssigneeOptions(true, branchId);

  const list = useSupportTickets({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    status,
    priority,
    assigneeUserId: assigneeId,
    branchId,
    search: search.debounced,
  });
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);

  return (
    <>
      <ManagementPage
        eyebrow="Chăm sóc khách hàng"
        title="Hàng đợi hỗ trợ"
        description="Tiếp nhận, giao việc, trả lời và đóng yêu cầu hỗ trợ của khách hàng."
        filters={(
          <FilterBar actions={<RefreshButton onRefresh={list.refetch} loading={list.isFetching} />}>
            <SearchInput
              className="min-w-64 flex-1"
              value={search.value}
              onChange={search.setValue}
              placeholder="Mã phiếu, tiêu đề, tên hoặc SĐT khách"
            />
            <Select
              allowClear
              className="min-w-40"
              value={status}
              onChange={(value?: string) => url.set('status', value)}
              placeholder="Trạng thái"
              options={supportTicketStatusOptions}
            />
            <Select
              allowClear
              className="min-w-36"
              value={priority}
              onChange={(value?: string) => url.set('priority', value)}
              placeholder="Ưu tiên"
              options={supportTicketPriorityOptions}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              className="min-w-48"
              value={assigneeId}
              onChange={(value?: string) => url.set('assignee', value)}
              placeholder="Người xử lý"
              loading={assignees.loading}
              options={assignees.options}
            />
            <BranchSelect
              allowClear
              className="min-w-48"
              value={branchId}
              onChange={(value) => url.set('branch', value)}
            />
          </FilterBar>
        )}
      >
        {list.isError && (
          <QueryErrorAlert error={list.error} message="Không tải được hàng đợi hỗ trợ" retry={() => void list.refetch()} />
        )}
        <SupportTicketTable
          rows={rows}
          loading={list.isLoading}
          page={page}
          total={list.data?.total ?? 0}
          emptyText="Không có phiếu hỗ trợ phù hợp bộ lọc."
          onPageChange={setPage}
          onOpen={(id) => url.set('id', id)}
        />
      </ManagementPage>
      <SupportTicketDetailDrawer ticketId={openId} onClose={() => url.set('id', undefined)} />
    </>
  );
}
