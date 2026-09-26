import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Input, Popconfirm, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { PageTransition } from '@/foundation/layout/page-transition';
import {
  getListAdminBrandsQueryKey,
  deleteAdminBrand,
  useActivateAdminBrand,
  useDeactivateAdminBrand,
  useListAdminBrands,
} from '@/generated/api/catalog/catalog';
import type { BrandDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { BrandFormDrawer } from '../components/master-data-form-drawers';
import { masterCodeColumn, masterStatusColumn } from '../components/master-columns';
import { filterCatalogMasters } from '../model/catalog-masters.mapper';

export function BrandsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 250);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<BrandDto>();

  const brandsQuery = useListAdminBrands();
  const brands = useMemo(
    () => filterCatalogMasters(brandsQuery.data?.items ?? [], debouncedSearch),
    [brandsQuery.data?.items, debouncedSearch],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListAdminBrandsQueryKey() });

  const lifecycleOptions = {
    mutation: {
      onSuccess: async () => {
        await refresh();
        void message.success('Đã cập nhật trạng thái thương hiệu.');
      },
      onError: (error: unknown) =>
        void message.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái.')),
    },
  };
  const activateBrand = useActivateAdminBrand(lifecycleOptions);
  const deactivateBrand = useDeactivateAdminBrand(lifecycleOptions);

  /**
   * Xoá thật, khác với nút Ngừng. Backend từ chối khi thương hiệu còn gắn sản phẩm,
   * nên thông báo lỗi trả về đã nói rõ vì sao không xoá được.
   */
  const deleteBrand = useMutation({
    mutationFn: ({ id, expectedVersion }: { id: string; expectedVersion: number }) =>
      deleteAdminBrand(id, { expectedVersion }),
    onSuccess: async () => {
      await refresh();
      void message.success('Đã xoá thương hiệu.');
    },
    onError: (error: unknown) =>
      void message.error(getApiErrorMessage(error, 'Không thể xoá thương hiệu.')),
  });

  const activeCount = (brandsQuery.data?.items ?? []).filter((b) => b.status === 'ACTIVE').length;

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Dữ liệu danh mục gốc"
        title="Thương hiệu"
        description="Quản trị danh sách thương hiệu ủy quyền chính hãng trên hệ thống."
        actions={
          <div className="flex flex-wrap gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void brandsQuery.refetch()}
                loading={brandsQuery.isFetching}
                aria-label="Làm mới"
              />
            </Tooltip>
            <PermissionGate permission="catalog.brand.manage">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setSelected(undefined);
                  setDrawerOpen(true);
                }}
              >
                Thêm thương hiệu
              </Button>
            </PermissionGate>
          </div>
        }
        metrics={[
          {
            key: 'brands',
            label: 'Tổng thương hiệu',
            value: brandsQuery.data?.total ?? 0,
            icon: <TagsOutlined />,
            tone: 'blue',
          },
          {
            key: 'active-brands',
            label: 'Thương hiệu đang bán',
            value: activeCount,
            icon: <CheckCircleOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <Input.Search
              allowClear
              className="w-80"
              value={search}
              placeholder="Tìm theo mã, tên hoặc slug..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      >
        {brandsQuery.isError ? (
          <QueryErrorAlert error={brandsQuery.error} retry={() => void brandsQuery.refetch()} />
        ) : (
          <AdminTable
            rowKey="id"
            loading={brandsQuery.isPending}
            dataSource={brands}
            scroll={{ x: 800 }}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            columns={[
              masterCodeColumn<BrandDto>(),
              {
                title: 'Tên thương hiệu',
                dataIndex: 'name',
                render: (value) => <strong className="text-slate-800">{value}</strong>,
              },
              {
                title: 'Slug',
                dataIndex: 'slug',
                render: (val) => <span className="font-mono text-xs text-slate-500">{val}</span>,
              },
              masterStatusColumn<BrandDto>(),
              {
                title: '',
                key: 'actions',
                width: 130,
                align: 'right' as const,
                render: (_, row: BrandDto) => (
                  <PermissionGate permission="catalog.brand.manage">
                    <TableActions>
                      <TableActionButton
                        label={`Sửa thương hiệu ${row.name}`}
                        icon={<EditOutlined />}
                        onClick={() => {
                          setSelected(row);
                          setDrawerOpen(true);
                        }}
                      />
                      <Popconfirm
                        title={row.status === 'ACTIVE' ? 'Ngừng thương hiệu?' : 'Kích hoạt thương hiệu?'}
                        description="Thao tác dùng version hiện tại để tránh xung đột dữ liệu."
                        onConfirm={() =>
                          row.status === 'ACTIVE'
                            ? deactivateBrand.mutate({
                                id: row.id,
                                data: { expectedVersion: row.version },
                              })
                            : activateBrand.mutate({
                                id: row.id,
                                data: { expectedVersion: row.version },
                              })
                        }
                      >
                        <TableActionButton
                          label={row.status === 'ACTIVE' ? 'Ngừng thương hiệu' : 'Kích hoạt thương hiệu'}
                          danger={row.status === 'ACTIVE'}
                          icon={<PoweroffOutlined />}
                        />
                      </Popconfirm>
                      <Popconfirm
                        title="Xoá hẳn thương hiệu?"
                        description="Chỉ xoá được khi chưa có sản phẩm nào gắn thương hiệu này. Thao tác không hoàn tác được."
                        okText="Xoá"
                        okButtonProps={{ danger: true }}
                        onConfirm={() =>
                          deleteBrand.mutate({ id: row.id, expectedVersion: row.version })
                        }
                      >
                        <TableActionButton
                          label={`Xóa thương hiệu ${row.name}`}
                          danger
                          icon={<DeleteOutlined />}
                          loading={deleteBrand.isPending && deleteBrand.variables?.id === row.id}
                        />
                      </Popconfirm>
                    </TableActions>
                  </PermissionGate>
                ),
              },
            ]}
          />
        )}

        <BrandFormDrawer
          open={drawerOpen}
          brand={selected}
          onClose={() => setDrawerOpen(false)}
        />
      </ManagementPage>
    </PageTransition>
  );
}
