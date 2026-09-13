import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Avatar, Button, Input, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { useListAdminProducts } from '@/generated/api/catalog/catalog';
import { ManagementPage } from '@/foundation/management';
import { ProductFormDrawer } from './product-form-drawer';
import { ProductWorkflowDrawer } from './product-workflow-drawer';
import { getApiErrorMessage } from '@/lib/api/error';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  PUBLISHED: { color: 'green', label: 'Đang bán' },
  DRAFT: { color: 'blue', label: 'Nháp' },
  ARCHIVED: { color: 'default', label: 'Lưu trữ' },
};

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  useEffect(() => setPage(1), [debouncedSearch]);
  const query = useListAdminProducts({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
  });

  return (
    <>
      <ManagementPage
        eyebrow="Catalog"
        title="Sản phẩm"
        description="Quản lý danh mục sản phẩm, biến thể, giá và trạng thái xuất bản."
        actions={
          <PermissionGate permission="catalog.product.manage">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              className="!rounded-xl !font-semibold"
              onClick={() => setCreateOpen(true)}
            >
              Thêm sản phẩm
            </Button>
          </PermissionGate>
        }
        metrics={[
          {
            key: 'total',
            label: 'Tổng sản phẩm',
            value: query.data?.meta.total ?? 0,
            icon: <span className="text-base">📦</span>,
            tone: 'blue',
          },
          {
            key: 'page',
            label: 'Hiển thị trên trang',
            value: query.data?.items.length ?? 0,
            icon: <span className="text-base">📋</span>,
            tone: 'green',
          },
          {
            key: 'pageSize',
            label: 'Kích thước trang',
            value: pageSize,
            icon: <span className="text-base">⚙️</span>,
          },
          {
            key: 'currentPage',
            label: 'Trang hiện tại',
            value: `${page} / ${Math.ceil((query.data?.meta.total ?? 0) / pageSize) || 1}`,
            icon: <span className="text-base">📄</span>,
            tone: 'orange',
          },
        ]}
        filters={
          <div className="flex flex-wrap gap-3">
            <Input.Search
              allowClear
              value={search}
              placeholder="Tên, SKU hoặc thương hiệu..."
              className="max-w-md"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button
              icon={<ReloadOutlined />}
              className="!rounded-xl"
              onClick={() => void query.refetch()}
            >
              Làm mới
            </Button>
          </div>
        }
      >
        {query.isError && (
          <QueryErrorAlert
            message="Không tải được danh sách sản phẩm"
            description={getApiErrorMessage(query.error, 'Vui lòng thử lại.')}
            onRetry={() => void query.refetch()}
          />
        )}
        <Table
          rowKey="id"
          loading={query.isPending}
          dataSource={query.data?.items ?? []}
          pagination={{
            current: query.data?.meta.page ?? page,
            pageSize: query.data?.meta.limit ?? pageSize,
            total: query.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => (
              <span className="text-xs text-slate-500">{total} sản phẩm</span>
            ),
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1);
              setPageSize(nextPageSize);
            },
          }}
          columns={[
            {
              title: 'Sản phẩm',
              dataIndex: 'name',
              render: (_, row) => (
                <div className="flex items-center gap-3">
                  <Avatar
                    shape="square"
                    size={48}
                    src={row.imageUrl ?? undefined}
                    className="!rounded-xl !border !border-slate-100 !shadow-soft"
                  >
                    {row.name.slice(0, 1)}
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-800">{row.name}</div>
                    <div className="truncate text-xs text-slate-400">
                      {row.productNo} · {row.brand ?? '—'} · {row.primaryCategory ?? '—'}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: 'Giá đã VAT',
              dataIndex: 'minPrice',
              align: 'right',
              render: (value: string | null | undefined) => (
                <span className="font-semibold text-slate-800">
                  {value ? money.format(Number(value)) : <span className="text-slate-400">—</span>}
                </span>
              ),
            },
            {
              title: 'Loại',
              dataIndex: 'productType',
              align: 'center',
              render: (value: string) => (
                <Tag
                  className="!rounded-full !border-0 !px-3 !text-xs !font-medium"
                  color={value === 'BUNDLE' ? 'purple' : 'default'}
                >
                  {value === 'BUNDLE' ? 'Combo' : 'Thường'}
                </Tag>
              ),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              align: 'center',
              render: (value: string) => {
                const config = STATUS_CONFIG[value] ?? { color: 'default', label: value };
                return (
                  <Tag
                    className="!rounded-full !border-0 !px-3 !text-xs !font-medium"
                    color={config.color}
                  >
                    {config.label}
                  </Tag>
                );
              },
            },
            {
              title: 'Ver',
              dataIndex: 'version',
              align: 'center',
              width: 60,
              render: (value: number) => (
                <span className="text-xs text-slate-400">v{value}</span>
              ),
            },
            {
              title: '',
              key: 'actions',
              align: 'right',
              width: 100,
              render: (_, row) => (
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  className="!rounded-lg !text-slate-500 hover:!bg-slate-100 hover:!text-admin-600"
                  onClick={() => setSelectedSlug(row.slug)}
                >
                  Chi tiết
                </Button>
              ),
            },
          ]}
        />
      </ManagementPage>
      <ProductFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={setSelectedSlug}
      />
      <ProductWorkflowDrawer slug={selectedSlug} onClose={() => setSelectedSlug(undefined)} />
    </>
  );
}
