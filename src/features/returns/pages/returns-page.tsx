import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ClockCircleOutlined, DollarOutlined, InboxOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Select, Tooltip } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { ManagementPage } from '@/foundation/management';
import { useGetAdminReturnQueueSummary, useListAdminReturns } from '@/generated/api/returns/returns';
import { ListAdminReturnsStatus } from '@/generated/api/returns/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { ReturnDetailDrawer } from '../components/return-detail-drawer';
import { ReturnTable } from '../components/return-table';
import { RETURN_PAGE_SIZE, returnStatusPresentation } from '../constants/return.constants';

const statusOptions = Object.entries(returnStatusPresentation).map(([value, { label }]) => ({ value, label }));

function parseStatus(value: string | null): ListAdminReturnsStatus | undefined {
  return value && value in ListAdminReturnsStatus ? (value as ListAdminReturnsStatus) : undefined;
}

/**
 * Hàng đợi đổi trả. Bộ lọc trạng thái và phiếu đang mở nằm trên URL để nhân viên gửi link cho nhau
 * và F5 không mất vị trí; ô đếm lấy từ API tổng hợp (cùng phạm vi chi nhánh), không đếm trên trang.
 */
export function ReturnsPage() {
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get('status'));
  const openId = params.get('id') ?? undefined;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 350);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const summary = useGetAdminReturnQueueSummary({ query: { retry: false } });
  const list = useListAdminReturns({
    page,
    limit: RETURN_PAGE_SIZE,
    status,
    search: debouncedSearch || undefined,
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
        eyebrow="After-sales"
        title="Đổi trả & hoàn tiền"
        description="Duyệt yêu cầu trả, nhận và kiểm hàng, hoàn tiền có chứng từ để đối chiếu."
        metrics={[
          metric('decision', 'Chờ duyệt', counts?.awaitingDecision, <ClockCircleOutlined />, 'orange'),
          metric('receipt', 'Chờ nhận hàng', counts?.awaitingReceipt, <InboxOutlined />, 'blue'),
          metric('refund', 'Chờ hoàn tiền', counts?.awaitingRefund, <DollarOutlined />, 'green'),
          metric('overdue', 'Lượt hoàn chờ > 24 giờ', counts?.overdueRefunds, <WarningOutlined />, 'red'),
        ]}
        filters={(
          <div className="flex w-full flex-wrap gap-3">
            <Input.Search
              allowClear
              className="min-w-64 flex-1"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã phiếu, mã đơn, tên hoặc SĐT khách"
            />
            <Select
              allowClear
              className="min-w-48"
              value={status}
              onChange={(value?: string) => updateParam('status', value)}
              placeholder="Trạng thái"
              options={statusOptions}
            />
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                aria-label="Làm mới"
                loading={list.isFetching}
                onClick={() => {
                  void list.refetch();
                  void summary.refetch();
                }}
              />
            </Tooltip>
          </div>
        )}
      >
        {list.isError && (
          <Alert className="mb-5" type="error" showIcon message="Không tải được danh sách phiếu trả" description={getApiErrorMessage(list.error)} />
        )}
        <ReturnTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          page={page}
          total={list.data?.total ?? 0}
          onPageChange={setPage}
          onOpen={(id) => updateParam('id', id)}
        />
      </ManagementPage>
      <ReturnDetailDrawer returnId={openId} onClose={() => updateParam('id')} />
    </>
  );
}
