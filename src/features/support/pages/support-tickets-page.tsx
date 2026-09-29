import { useMemo, useState } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import { Button, Input, Select, Tooltip } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { SupportBranchSelect } from '../components/support-branch-select';
import { SupportTicketDetailDrawer } from '../components/support-ticket-detail-drawer';
import { SupportTicketTable } from '../components/support-ticket-table';
import { SupportTicketPriority, SupportTicketStatus } from '@/generated/api/support/support.schemas';
import {
  SUPPORT_TICKET_PAGE_SIZE,
  supportTicketPriorityOptions,
  supportTicketStatusOptions,
} from '../constants/support.constants';
import { useSupportAssigneeOptions } from '../hooks/use-support-assignee-options';
import { useSupportTickets } from '../hooks/use-support-tickets';

function parseEnum<T extends string>(values: Record<string, T>, value: string | null): T | undefined {
  return value && value in values ? (value as T) : undefined;
}

/**
 * Hàng đợi hỗ trợ. Bộ lọc (trừ ô tìm kiếm) và ticket đang mở nằm trên URL để nhân viên gửi link cho
 * nhau và F5 không mất vị trí; phân trang/lọc chạy ở server.
 */
export function SupportTicketsPage() {
  const [params, setParams] = useSearchParams();
  const status = parseEnum(SupportTicketStatus, params.get('status'));
  const priority = parseEnum(SupportTicketPriority, params.get('priority'));
  const assigneeId = params.get('assignee') ?? undefined;
  const branchId = params.get('branch') ?? undefined;
  const openId = params.get('id') ?? undefined;
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  const [page, setPage] = useListPageReset([debouncedSearch, status, priority, assigneeId, branchId]);
  const assignees = useSupportAssigneeOptions(true);

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = useSupportTickets({
    page,
    limit: SUPPORT_TICKET_PAGE_SIZE,
    status,
    priority,
    assigneeUserId: assigneeId,
    branchId,
    search: debouncedSearch || undefined,
  });
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);

  return (
    <>
      <ManagementPage
        eyebrow="Customer care"
        title="Hàng đợi hỗ trợ"
        description="Tiếp nhận, giao việc, trả lời và đóng yêu cầu hỗ trợ của khách hàng."
        filters={(
          <div className="flex w-full flex-wrap gap-3">
            <Input.Search
              allowClear
              className="min-w-64 flex-1"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã ticket, tiêu đề, tên hoặc SĐT khách"
            />
            <Select
              allowClear
              className="min-w-40"
              value={status}
              onChange={(value?: string) => updateParam('status', value)}
              placeholder="Trạng thái"
              options={supportTicketStatusOptions}
            />
            <Select
              allowClear
              className="min-w-36"
              value={priority}
              onChange={(value?: string) => updateParam('priority', value)}
              placeholder="Ưu tiên"
              options={supportTicketPriorityOptions}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              className="min-w-48"
              value={assigneeId}
              onChange={(value?: string) => updateParam('assignee', value)}
              placeholder="Người xử lý"
              loading={assignees.loading}
              options={assignees.options}
            />
            <SupportBranchSelect
              className="min-w-48"
              value={branchId}
              onChange={(value) => updateParam('branch', value)}
            />
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                aria-label="Làm mới"
                loading={list.isFetching}
                onClick={() => void list.refetch()}
              />
            </Tooltip>
          </div>
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
          emptyText="Không có ticket phù hợp bộ lọc."
          onPageChange={setPage}
          onOpen={(id) => updateParam('id', id)}
        />
      </ManagementPage>
      <SupportTicketDetailDrawer ticketId={openId} onClose={() => updateParam('id')} />
    </>
  );
}
