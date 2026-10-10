import {
  AuditOutlined,
  CopyOutlined,
  EyeOutlined,
  HistoryOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { App, Button, DatePicker, Descriptions, Empty, Select, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { PageTransition } from '@/foundation/layout/page-transition';
import { ManagementPage } from '@/foundation/management';
import { DetailDrawer } from '@/foundation/overlay';
import {
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  AdminTable,
  CursorPagination,
  FilterBar,
  RefreshButton,
  TableActionButton,
  col,
} from '@/foundation/table';
import { useListAdminAuditLogs } from '@/generated/api/audit/audit';
import type { AuditLogDto } from '@/generated/api/audit/audit.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { ENTITY_TYPE_OPTIONS, entityTypeLabel } from '../constants/audit.constants';

const { RangePicker } = DatePicker;

/** Cột dữ liệu của bảng nhật ký; cột "Xem" ghép trong component vì cần handler mở drawer. */
const AUDIT_COLUMNS: ColumnsType<AuditLogDto> = [
  {
    title: 'Thời gian',
    dataIndex: 'createdAt',
    width: 170,
    render: (value: string) => (
      <span className="text-xs font-mono text-slate-600">{formatDateTime(value)}</span>
    ),
  },
  {
    title: 'Hành động',
    dataIndex: 'action',
    render: (value: string, row) => (
      <div>
        <Typography.Text strong className="text-xs text-slate-800">
          {value}
        </Typography.Text>
        <div>
          <Tag className="mt-1 text-[10px]">{entityTypeLabel(row.entityType)}</Tag>
        </div>
      </div>
    ),
  },
  {
    title: 'Người thực hiện',
    key: 'actor',
    render: (_, row) => (
      <div className="text-xs">
        <span className="font-semibold text-slate-800">{row.actorDisplayName ?? row.actorType}</span>
        <div className="text-[11px] font-mono text-slate-400">{row.actorUserId ?? 'Hệ thống tự động'}</div>
      </div>
    ),
  },
  col.text<AuditLogDto>('reason', 'Lý do thay đổi'),
];

function JsonSnapshot({ value }: { value: unknown }) {
  const { message } = App.useApp();
  if (!value) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có snapshot" />;

  const jsonString = JSON.stringify(value, null, 2);
  const copyJson = () =>
    void navigator.clipboard.writeText(jsonString).then(
      () => message.success('Đã sao chép JSON'),
      () => message.error('Không sao chép được'),
    );

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10">
        <Tooltip title="Sao chép JSON">
          <Button
            size="small"
            icon={<CopyOutlined />}
            aria-label="Sao chép JSON"
            onClick={copyJson}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          />
        </Tooltip>
      </div>
      <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-emerald-300 font-mono">
        {jsonString}
      </pre>
    </div>
  );
}

/**
 * Nhật ký audit (chỉ đọc). Bộ lọc nằm trên URL (`action`, `requestId`, `entity`, `from`, `to`) để
 * F5/gửi link giữ nguyên; phân trang theo con trỏ nên lịch sử con trỏ sống trong màn và về trang đầu
 * khi lọc đổi.
 */
export function AuditPage() {
  const search = useUrlSearch(['action', 'requestId']);
  const { url } = search;
  const entityType = url.get('entity');
  const from = url.get('from');
  const to = url.get('to');
  const [selected, setSelected] = useState<AuditLogDto>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const [page, setPage] = useListPageReset(
    [url.get('action'), url.get('requestId'), entityType, from, to],
    { initialPage: 0, onReset: () => setCursorHistory([undefined]) },
  );

  const query = useListAdminAuditLogs({
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    cursor: cursorHistory[page],
    action: url.get('action'),
    requestId: url.get('requestId'),
    entityType,
    from,
    to,
  });

  const items = query.data?.items ?? [];
  const columns = useMemo<ColumnsType<AuditLogDto>>(
    () => [
      ...AUDIT_COLUMNS,
      col.actions<AuditLogDto>(
        (row) => <TableActionButton label="Xem chi tiết" icon={<EyeOutlined />} onClick={() => setSelected(row)} />,
        { title: '', width: 80, fixed: undefined },
      ),
    ],
    [],
  );

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Bảo mật & Truy vết hệ thống"
        title="Nhật ký Audit Log"
        description="Toàn bộ hành vi ghi và thay đổi trạng thái dữ liệu trên hệ thống đều được ghi nhận bất biến."
        metrics={[
          { key: 'page-events', label: 'Sự kiện trên trang', value: items.length, icon: <HistoryOutlined />, tone: 'blue' },
          { key: 'privacy', label: 'Bảo vệ dữ liệu', value: 'Đã che thông tin', icon: <LockOutlined />, tone: 'green' },
          { key: 'scope', label: 'Phạm vi truy vết', value: 'Toàn hệ thống', icon: <SafetyCertificateOutlined />, tone: 'green' },
          { key: 'page-idx', label: 'Trang truy vấn', value: `Trang ${page + 1}`, icon: <AuditOutlined />, tone: 'orange' },
        ]}
        filters={
          <FilterBar actions={<RefreshButton onRefresh={query.refetch} loading={query.isFetching} />}>
            <SearchInput
              placeholder="Hành động, ví dụ catalog.price"
              value={search.values.action}
              onChange={search.setter('action')}
            />
            <Select
              allowClear
              className="min-w-48"
              placeholder="Loại dữ liệu"
              value={entityType}
              onChange={(value?: string) => url.set('entity', value)}
              options={ENTITY_TYPE_OPTIONS}
            />
            <SearchInput
              placeholder="Mã request"
              value={search.values.requestId}
              onChange={search.setter('requestId')}
            />
            <RangePicker
              showTime
              value={from && to ? [dayjs(from), dayjs(to)] : null}
              onChange={(dates) =>
                url.patch(
                  dates?.[0] && dates[1]
                    ? { from: dates[0].toISOString(), to: dates[1].toISOString() }
                    : { from: undefined, to: undefined },
                )
              }
            />
          </FilterBar>
        }
      >
        {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}

        <AdminTable
          rowKey="id"
          loading={query.isPending}
          dataSource={items}
          pagination={false}
          scroll={{ x: 980 }}
          emptyEntity="sự kiện"
          columns={columns}
        />

        <CursorPagination
          pageIndex={page}
          rowCount={items.length}
          totalLabel="sự kiện"
          hasPrevious={page > 0}
          hasNext={Boolean(query.data?.nextCursor)}
          loading={query.isFetching}
          onFirst={() => setPage(0)}
          onPrevious={() => setPage((value) => value - 1)}
          onNext={() => {
            const next = query.data?.nextCursor ?? undefined;
            setCursorHistory((history) => [...history.slice(0, page + 1), next]);
            setPage((value) => value + 1);
          }}
        />

        <DetailDrawer
          size="md"
          open={Boolean(selected)}
          title={`Chi tiết nhật ký: ${selected?.action ?? ''}`}
          onClose={() => setSelected(undefined)}
        >
          {selected && (
            <div className="space-y-5 text-xs">
              <Descriptions size="small" bordered column={1} className="rounded-xl overflow-hidden">
                <Descriptions.Item label="Thời gian">{formatDateTime(selected.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Hành động">
                  <span className="font-mono font-bold text-slate-800">{selected.action}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Đối tượng">
                  {entityTypeLabel(selected.entityType)} ({selected.entityId ?? '—'})
                </Descriptions.Item>
                <Descriptions.Item label="Người thực hiện">
                  {selected.actorDisplayName ?? '—'} ({selected.actorType})
                </Descriptions.Item>
                <Descriptions.Item label="Lý do">{selected.reason || '—'}</Descriptions.Item>
                <Descriptions.Item label="Mã request">
                  <span className="font-mono">{selected.requestId || '—'}</span>
                </Descriptions.Item>
              </Descriptions>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Dữ liệu trước thay đổi</h4>
                <JsonSnapshot value={selected.before} />
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Dữ liệu sau thay đổi</h4>
                <JsonSnapshot value={selected.after} />
              </div>
            </div>
          )}
        </DetailDrawer>
      </ManagementPage>
    </PageTransition>
  );
}
