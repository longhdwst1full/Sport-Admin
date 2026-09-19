import {
  AuditOutlined,
  CopyOutlined,
  EyeOutlined,
  HistoryOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { AdminTable } from '@/foundation/table';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { ManagementPage } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import { useListAdminAuditLogs } from '@/generated/api/audit/audit';
import type { AuditLogDto } from '@/generated/api/audit/models';
import { getApiErrorMessage } from '@/lib/api/error';

const { RangePicker } = DatePicker;
const PAGE_SIZE = 25;

function JsonSnapshot({ value }: { value: unknown }) {
  const { message } = App.useApp();
  if (!value)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có snapshot" />;

  const jsonString = JSON.stringify(value, null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(jsonString);
    message.success('Đã sao chép JSON payload');
  };

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10">
        <Tooltip title="Sao chép JSON">
          <Button
            size="small"
            icon={<CopyOutlined />}
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

export function AuditPage() {
  const [action, setAction] = useState('');
  const [requestId, setRequestId] = useState('');
  const [entityType, setEntityType] = useState<string>();
  const [range, setRange] = useState<[string, string]>();
  const [selected, setSelected] = useState<AuditLogDto>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const [page, setPage] = useState(0);
  const [debouncedAction] = useDebounce(action.trim(), 350);
  const [debouncedRequestId] = useDebounce(requestId.trim(), 350);

  useEffect(() => {
    setCursorHistory([undefined]);
    setPage(0);
  }, [debouncedAction, debouncedRequestId, entityType, range]);

  const query = useListAdminAuditLogs({
    limit: PAGE_SIZE,
    cursor: cursorHistory[page],
    action: debouncedAction || undefined,
    requestId: debouncedRequestId || undefined,
    entityType,
    from: range?.[0],
    to: range?.[1],
  });

  const items = query.data?.items ?? [];

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Bảo mật & Truy vết hệ thống"
        title="Nhật ký Audit Log"
        description="Toàn bộ hành vi ghi và thay đổi trạng thái dữ liệu trên hệ thống PostgreSQL đều được ghi nhận bất biến."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void query.refetch()}>
            Làm mới
          </Button>
        }
        metrics={[
          {
            key: 'page-events',
            label: 'Sự kiện trên trang',
            value: items.length,
            icon: <HistoryOutlined />,
            tone: 'blue',
          },
          {
            key: 'privacy',
            label: 'Bảo vệ dữ liệu',
            value: 'Đã che thông tin',
            icon: <LockOutlined />,
            tone: 'green',
          },
          {
            key: 'scope',
            label: 'Phạm vi truy vết',
            value: 'Toàn hệ thống',
            icon: <SafetyCertificateOutlined />,
            tone: 'green',
          },
          {
            key: 'page-idx',
            label: 'Trang truy vấn',
            value: `Trang ${page + 1}`,
            icon: <AuditOutlined />,
            tone: 'orange',
          },
        ]}
        filters={
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              allowClear
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Hành động, ví dụ catalog.price"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            />
            <Select
              allowClear
              placeholder="Loại dữ liệu"
              value={entityType}
              onChange={setEntityType}
              options={[
                'USER',
                'USER_ROLE_ASSIGNMENT',
                'PRODUCT',
                'PRODUCT_VARIANT',
                'PRODUCT_PRICE',
                'INVENTORY_BALANCE',
                'MEDIA_ASSET',
              ].map((value) => ({ value, label: value }))}
            />
            <Input
              allowClear
              placeholder="Request ID"
              value={requestId}
              onChange={(event) => setRequestId(event.target.value)}
            />
            <RangePicker
              showTime
              className="w-full"
              onChange={(dates) =>
                setRange(
                  dates?.[0] && dates[1]
                    ? [dates[0].toISOString(), dates[1].toISOString()]
                    : undefined,
                )
              }
            />
          </div>
        }
      >
        {query.isError && (
          <Alert
            className="mb-4"
            showIcon
            type="error"
            message="Không tải được nhật ký"
            description={getApiErrorMessage(query.error, 'Vui lòng thử lại.')}
            action={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
          />
        )}

        <AdminTable
          rowKey="id"
          loading={query.isPending}
          dataSource={items}
          pagination={false}
          scroll={{ x: 980 }}
          locale={{ emptyText: 'Chưa có sự kiện phù hợp bộ lọc' }}
          columns={[
            {
              title: 'Thời gian',
              dataIndex: 'createdAt',
              width: 170,
              render: (value: string) => (
                <span className="text-xs font-mono text-slate-600">
                  {new Intl.DateTimeFormat('vi-VN', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  }).format(new Date(value))}
                </span>
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
                    <Tag className="mt-1 font-mono text-[10px] bg-slate-100 border-slate-200">
                      {row.entityType}
                    </Tag>
                  </div>
                </div>
              ),
            },
            {
              title: 'Người thực hiện',
              render: (_, row) => (
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">
                    {row.actorDisplayName ?? row.actorType}
                  </span>
                  <div className="text-[11px] font-mono text-slate-400">
                    {row.actorUserId ?? 'Hệ thống tự động'}
                  </div>
                </div>
              ),
            },
            {
              title: 'Lý do thay đổi',
              dataIndex: 'reason',
              render: (value) => (
                <span className="text-xs text-slate-600">{value || '—'}</span>
              ),
            },
            {
              title: '',
              align: 'right' as const,
              width: 80,
              render: (_, row) => (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setSelected(row)}
                  className="text-xs"
                >
                  Xem
                </Button>
              ),
            },
          ]}
        />

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <Typography.Text type="secondary" className="text-xs">
            Trang {page + 1}
          </Typography.Text>
          <Space>
            <Button
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
              size="small"
            >
              Trang trước
            </Button>
            <Button
              type="primary"
              disabled={!query.data?.nextCursor}
              onClick={() => {
                const next = query.data?.nextCursor ?? undefined;
                setCursorHistory((history) => [...history.slice(0, page + 1), next]);
                setPage((value) => value + 1);
              }}
              size="small"
            >
              Trang sau
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void query.refetch()}
              size="small"
            />
          </Space>
        </div>

        <Drawer
          width={640}
          open={Boolean(selected)}
          title={
            <div className="flex items-center gap-2">
              <AuditOutlined className="text-emerald-600" />
              <span>Chi tiết nhật ký: {selected?.action}</span>
            </div>
          }
          onClose={() => setSelected(undefined)}
        >
          {selected && (
            <div className="space-y-5 text-xs">
              <Descriptions size="small" bordered column={1} className="rounded-xl overflow-hidden">
                <Descriptions.Item label="Thời gian">
                  {new Date(selected.createdAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
                <Descriptions.Item label="Hành động">
                  <span className="font-mono font-bold text-slate-800">{selected.action}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Đối tượng">
                  {selected.entityType} ({selected.entityId ?? 'N/A'})
                </Descriptions.Item>
                <Descriptions.Item label="Người thực hiện">
                  {selected.actorDisplayName} ({selected.actorType})
                </Descriptions.Item>
                <Descriptions.Item label="Lý do">{selected.reason || '—'}</Descriptions.Item>
                <Descriptions.Item label="Request ID">
                  <span className="font-mono">{selected.requestId || '—'}</span>
                </Descriptions.Item>
              </Descriptions>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Dữ liệu trước thay đổi (Before)
                </h4>
                <JsonSnapshot value={selected.before} />
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Dữ liệu sau thay đổi (After)
                </h4>
                <JsonSnapshot value={selected.after} />
              </div>
            </div>
          )}
        </Drawer>
      </ManagementPage>
    </PageTransition>
  );
}
