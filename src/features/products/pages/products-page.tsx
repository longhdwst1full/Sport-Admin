import { CheckCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { App, Avatar, Button, Input, Select, Switch, Table, Tag, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { PermissionGate, useCan } from '@/core/auth/permissions';
import {
  deleteAdminProduct,
  getListAdminProductsQueryKey,
  updateAdminProduct,
  useListAdminCategories,
  useListAdminProducts,
} from '@/generated/api/catalog/catalog';
import type { ProductSummaryDto } from '@/generated/api/catalog/models';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { ProductFormDrawer } from '../components/product-form-drawer';
import { ProductWorkflowDrawer } from '../components/product-workflow-drawer';
import { getApiErrorMessage } from '@/lib/api/error';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const STATUS_CONFIG: Record<string, { color: string; label: string; icon?: React.ReactNode }> = {
  PUBLISHED: { color: 'green', label: 'Đang bán', icon: <CheckCircleOutlined className="text-emerald-600" /> },
  DRAFT: { color: 'blue', label: 'Nháp' },
  ARCHIVED: { color: 'default', label: 'Lưu trữ' },
};

export function ProductsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('catalog.product.manage');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [productNo, setProductNo] = useState('');
  const [category, setCategory] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // Mỗi ô là một điều kiện riêng và cộng dồn bằng AND ở backend, nên nhập nhiều ô
  // sẽ thu hẹp kết quả chứ không mở rộng như ô tìm kiếm gộp trước đây.
  const [debouncedName] = useDebounce(name.trim(), 350);
  const [debouncedSku] = useDebounce(sku.trim(), 350);
  const [debouncedProductNo] = useDebounce(productNo.trim(), 350);
  useEffect(
    () => setPage(1),
    [debouncedName, debouncedSku, debouncedProductNo, category],
  );
  const query = useListAdminProducts({
    page,
    limit: pageSize,
    name: debouncedName || undefined,
    sku: debouncedSku || undefined,
    productNo: debouncedProductNo || undefined,
    category,
  });

  const categories = useListAdminCategories();
  // Danh mục con thụt vào theo depth để thấy được quan hệ cha - con trong một Select phẳng.
  const categoryOptions = useMemo(
    () =>
      (categories.data?.items ?? [])
        .filter((item) => item.status === 'ACTIVE')
        .map((item) => ({
          value: item.slug,
          label: `${'\u00A0\u00A0'.repeat(item.depth)}${item.name}`,
        })),
    [categories.data],
  );

  // Cờ hiển thị tách khỏi trạng thái vòng đời: ẩn tạm một sản phẩm đang bán không cần đẩy về nháp.
  const visibilityMutation = useMutation({
    mutationFn: ({ row, next }: { row: ProductSummaryDto; next: boolean }) =>
      updateAdminProduct(row.id, { expectedVersion: row.version, isPublished: next }),
    onSuccess: async (_result, { next }) => {
      await queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      void message.success(next ? 'Đã hiện sản phẩm trên website' : 'Đã ẩn sản phẩm khỏi website');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (row: ProductSummaryDto) =>
      deleteAdminProduct(row.id, { expectedVersion: row.version }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      void message.success('Đã chuyển sản phẩm sang lưu trữ');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  function confirmDelete(row: ProductSummaryDto) {
    modal.confirm({
      title: `Xoá sản phẩm ${row.name}?`,
      content: (
        <div className="space-y-2 text-sm text-slate-500">
          <p>
            Sản phẩm chuyển sang trạng thái <strong>Lưu trữ</strong> và biến mất khỏi trang bán.
          </p>
          <p>
            Không xoá hẳn khỏi database vì các đơn hàng đã phát sinh còn tham chiếu tới sản phẩm
            này; xoá cứng sẽ làm hỏng lịch sử đơn hàng.
          </p>
        </div>
      ),
      okText: 'Xoá',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: () => deleteMutation.mutateAsync(row),
    });
  }

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
            <Input
              allowClear
              value={name}
              placeholder="Tên sản phẩm"
              className="!w-56"
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              allowClear
              value={sku}
              placeholder="SKU"
              className="!w-40"
              onChange={(event) => setSku(event.target.value)}
            />
            <Input
              allowClear
              value={productNo}
              placeholder="Mã sản phẩm"
              className="!w-40"
              onChange={(event) => setProductNo(event.target.value)}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              className="min-w-56"
              placeholder="Lọc theo danh mục"
              value={category}
              onChange={setCategory}
              loading={categories.isPending}
              options={categoryOptions}
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
            pageSizeOptions: ['10', '20', '50', '100'],
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
                  <StatusTag
                    status={value}
                    presentations={{
                      [value]: config,
                    }}
                  />
                );
              },
            },
            {
              title: 'Hiện trên web',
              key: 'isPublished',
              align: 'center',
              width: 120,
              render: (_value: unknown, row: ProductSummaryDto) => (
                <Tooltip
                  title={
                    row.status === 'PUBLISHED'
                      ? 'Bật/tắt hiển thị trên website'
                      : 'Chỉ sản phẩm đã xuất bản mới hiện trên website'
                  }
                >
                  <span>
                    <Switch
                      size="small"
                      checked={row.isPublished}
                      // Sản phẩm chưa xuất bản thì cờ này không có tác dụng gì.
                      disabled={row.status !== 'PUBLISHED' || !canManage}
                      loading={
                        visibilityMutation.isPending &&
                        visibilityMutation.variables?.row.id === row.id
                      }
                      onChange={(next) => visibilityMutation.mutate({ row, next })}
                    />
                  </span>
                </Tooltip>
              ),
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
                <div className="flex items-center justify-end gap-1">
                  <Tooltip title="Chi tiết">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      className="!rounded-lg !text-slate-500 hover:!bg-slate-100 hover:!text-admin-600"
                      onClick={() => setSelectedSlug(row.slug)}
                    />
                  </Tooltip>
                  {canManage && row.status !== 'ARCHIVED' && (
                    <Tooltip title="Xoá / Lưu trữ">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        className="!rounded-lg"
                        loading={deleteMutation.isPending}
                        onClick={() => confirmDelete(row)}
                      />
                    </Tooltip>
                  )}
                </div>
              ),
            },
          ]}
        />
        <div className="mt-2 flex items-center justify-between">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            className="!text-slate-500 hover:!text-emerald-600"
            onClick={() => void query.refetch()}
          >
            Làm mới danh sách
          </Button>
        </div>
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
