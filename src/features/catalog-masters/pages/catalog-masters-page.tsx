import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Input, Popconfirm, Tabs } from 'antd';
import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { PageTransition } from '@/foundation/layout/page-transition';
import {
  getListAdminBrandsQueryKey,
  getListAdminCategoriesQueryKey,
  deleteAdminBrand,
  useActivateAdminBrand,
  useActivateAdminCategory,
  useDeactivateAdminBrand,
  useDeactivateAdminCategory,
  useDeleteAdminCategory,
  useListAdminBrands,
  useListAdminCategories,
} from '@/generated/api/catalog/catalog';
import type { BrandDto, CategoryDto } from '@/generated/api/catalog/models';
import { useCan } from '@/core/auth/permissions';
import { getApiErrorMessage } from '@/lib/api/error';
import { BrandFormDrawer, CategoryFormDrawer } from '../components/master-data-form-drawers';
import { filterCatalogMasters } from '../model/catalog-masters.mapper';

const MASTER_STATUSES = {
  ACTIVE: { color: 'green', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Đã ngừng' },
};

export function CatalogMastersPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'brands' | 'categories'>();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 250);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandDto>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto>();

  // SECURITY: brand và category là hai quyền xem tách rời ở backend. Không có quyền thì không
  // gọi endpoint (tránh 403 rác) và ẩn luôn tab tương ứng.
  const canViewBrands = useCan('catalog.brand.view');
  const canViewCategories = useCan('catalog.category.view');
  // Tab mặc định phải là tab đầu tiên người dùng được xem, nếu không màn hình sẽ trống.
  const activeTab = tab ?? (canViewBrands ? 'brands' : 'categories');
  const brandsQuery = useListAdminBrands({ query: { enabled: canViewBrands } });
  const categoriesQuery = useListAdminCategories({ query: { enabled: canViewCategories } });

  const brands = useMemo(
    () => filterCatalogMasters(brandsQuery.data?.items ?? [], debouncedSearch),
    [brandsQuery.data?.items, debouncedSearch],
  );
  const categories = useMemo(
    () => filterCatalogMasters(categoriesQuery.data?.items ?? [], debouncedSearch),
    [categoriesQuery.data?.items, debouncedSearch],
  );

  const refreshBrands = () =>
    queryClient.invalidateQueries({ queryKey: getListAdminBrandsQueryKey() });
  const refreshCategories = () =>
    queryClient.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() });

  const brandLifecycleOptions = {
    mutation: {
      onSuccess: async () => {
        await refreshBrands();
        void message.success('Đã cập nhật trạng thái thương hiệu.');
      },
      onError: (error: unknown) =>
        void message.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái.')),
    },
  };
  const activateBrand = useActivateAdminBrand(brandLifecycleOptions);
  const deactivateBrand = useDeactivateAdminBrand(brandLifecycleOptions);

  /**
   * Xoá thật, khác với nút Ngừng. Backend từ chối khi thương hiệu còn gắn sản phẩm,
   * nên thông báo lỗi trả về đã nói rõ vì sao không xoá được.
   */
  const deleteBrand = useMutation({
    mutationFn: ({ id, expectedVersion }: { id: string; expectedVersion: number }) =>
      deleteAdminBrand(id, { expectedVersion }),
    onSuccess: async () => {
      await refreshBrands();
      void message.success('Đã xoá thương hiệu.');
    },
    onError: (error: unknown) =>
      void message.error(getApiErrorMessage(error, 'Không thể xoá thương hiệu.')),
  });

  const categoryLifecycleOptions = {
    mutation: {
      onSuccess: async () => {
        await refreshCategories();
        void message.success('Đã cập nhật trạng thái danh mục.');
      },
      onError: (error: unknown) =>
        void message.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái danh mục.')),
    },
  };
  const activateCategory = useActivateAdminCategory(categoryLifecycleOptions);
  const deactivateCategory = useDeactivateAdminCategory(categoryLifecycleOptions);
  const deleteCategory = useDeleteAdminCategory(categoryLifecycleOptions);

  const openCreate = () => {
    if (tab === 'brands') {
      setSelectedBrand(undefined);
      setBrandDrawerOpen(true);
    } else {
      setSelectedCategory(undefined);
      setCategoryDrawerOpen(true);
    }
  };

  const activeBrandsCount = (brandsQuery.data?.items ?? []).filter(
    (b) => b.status === 'ACTIVE',
  ).length;
  const activeCategoriesCount = (categoriesQuery.data?.items ?? []).filter(
    (c) => c.status === 'ACTIVE',
  ).length;

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Dữ liệu danh mục gốc"
        title="Thương hiệu & Danh mục"
        description="Quản trị cấu trúc cây ngành hàng thể thao và thương hiệu ủy quyền chính hãng trên hệ thống."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void (tab === 'brands' ? brandsQuery.refetch() : categoriesQuery.refetch())}
            >
              Làm mới
            </Button>
            <PermissionGate
              permission={tab === 'brands' ? 'catalog.brand.manage' : 'catalog.category.manage'}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                {tab === 'brands' ? 'Thêm thương hiệu' : 'Thêm danh mục'}
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
            value: activeBrandsCount,
            icon: <CheckCircleOutlined />,
            tone: 'green',
          },
          {
            key: 'categories',
            label: 'Tổng danh mục',
            value: categoriesQuery.data?.total ?? 0,
            icon: <AppstoreOutlined />,
            tone: 'orange',
          },
          {
            key: 'active-categories',
            label: 'Danh mục kích hoạt',
            value: activeCategoriesCount,
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
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setTab(key as typeof tab)}
          items={[
            canViewBrands && {
              key: 'brands',
              label: `Thương hiệu (${brandsQuery.data?.total ?? 0})`,
              children: brandsQuery.isError ? (
                <QueryErrorAlert error={brandsQuery.error} retry={() => void brandsQuery.refetch()} />
              ) : (
                <AdminTable
                  rowKey="id"
                  loading={brandsQuery.isPending}
                  dataSource={brands}
                  scroll={{ x: 800 }}
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  columns={[
                    {
                      title: 'Mã',
                      dataIndex: 'code',
                      width: 140,
                      render: (value) => (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                          {value}
                        </span>
                      ),
                    },
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
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      width: 150,
                      render: (value: string) => (
                        <StatusTag
                          status={value}
                          presentations={MASTER_STATUSES as Record<string, { label: string; color: string }>}
                        />
                      ),
                    },
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
                                setSelectedBrand(row);
                                setBrandDrawerOpen(true);
                              }}
                            />
                            <Popconfirm
                              title={
                                row.status === 'ACTIVE'
                                  ? 'Ngừng thương hiệu?'
                                  : 'Kích hoạt thương hiệu?'
                              }
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
                                loading={
                                  deleteBrand.isPending && deleteBrand.variables?.id === row.id
                                }
                              />
                            </Popconfirm>
                          </TableActions>
                        </PermissionGate>
                      ),
                    },
                  ]}
                />
              ),
            },
            canViewCategories && {
              key: 'categories',
              label: `Danh mục (${categoriesQuery.data?.total ?? 0})`,
              children: categoriesQuery.isError ? (
                <QueryErrorAlert
                  error={categoriesQuery.error}
                  retry={() => void categoriesQuery.refetch()}
                />
              ) : (
                <AdminTable
                  rowKey="id"
                  loading={categoriesQuery.isPending}
                  dataSource={categories}
                  scroll={{ x: 860 }}
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  columns={[
                    {
                      title: 'Mã',
                      dataIndex: 'code',
                      width: 140,
                      render: (value) => (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                          {value}
                        </span>
                      ),
                    },
                    {
                      title: 'Tên danh mục',
                      dataIndex: 'name',
                      render: (value, row) => (
                        <div style={{ paddingLeft: row.depth * 18 }}>
                          <strong className="text-slate-800">{value}</strong>
                          <div className="text-xs text-slate-400 font-mono">/{row.slug}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Cấp',
                      dataIndex: 'depth',
                      width: 90,
                      align: 'center' as const,
                      render: (d: number) => (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
                          Cấp {d}
                        </span>
                      ),
                    },
                    {
                      title: 'Thứ tự',
                      dataIndex: 'sortOrder',
                      width: 100,
                      align: 'center' as const,
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      width: 150,
                      render: (value: string) => (
                        <StatusTag
                          status={value}
                          presentations={MASTER_STATUSES as Record<string, { label: string; color: string }>}
                        />
                      ),
                    },
                    {
                      title: '',
                      key: 'actions',
                      width: 130,
                      align: 'right' as const,
                      render: (_, row: CategoryDto) => (
                        <PermissionGate permission="catalog.category.manage">
                          <TableActions>
                            <TableActionButton
                              label={`Sửa danh mục ${row.name}`}
                              icon={<EditOutlined />}
                              onClick={() => {
                                setSelectedCategory(row);
                                setCategoryDrawerOpen(true);
                              }}
                            />
                            <Popconfirm
                              title={
                                row.status === 'ACTIVE'
                                  ? 'Ngừng danh mục?'
                                  : 'Kích hoạt danh mục?'
                              }
                              description="Danh mục con sẽ được nâng lên làm con của danh mục cha."
                              onConfirm={() =>
                                row.status === 'ACTIVE'
                                  ? deactivateCategory.mutate({
                                      id: row.id,
                                      data: { expectedVersion: row.version },
                                    })
                                  : activateCategory.mutate({
                                      id: row.id,
                                      data: { expectedVersion: row.version },
                                    })
                              }
                            >
                              <TableActionButton
                                label={row.status === 'ACTIVE' ? 'Ngừng danh mục' : 'Kích hoạt danh mục'}
                                danger={row.status === 'ACTIVE'}
                                icon={<PoweroffOutlined />}
                              />
                            </Popconfirm>
                            <Popconfirm
                              title="Xoá danh mục này?"
                              description="Danh mục con được nâng lên cha; danh mục gốc bị xoá thì con của nó thành gốc."
                              okButtonProps={{ danger: true }}
                              onConfirm={() =>
                                deleteCategory.mutate({
                                  id: row.id,
                                  data: { expectedVersion: row.version },
                                })
                              }
                            >
                              <TableActionButton
                                label={`Xóa danh mục ${row.name}`}
                                danger
                                icon={<DeleteOutlined />}
                                loading={
                                  deleteCategory.isPending &&
                                  deleteCategory.variables?.id === row.id
                                }
                              />
                            </Popconfirm>
                          </TableActions>
                        </PermissionGate>
                      ),
                    },
                  ]}
                />
              ),
            },
          ].filter((item) => item !== false)}
        />

        <BrandFormDrawer
          open={brandDrawerOpen}
          brand={selectedBrand}
          onClose={() => setBrandDrawerOpen(false)}
        />
        <CategoryFormDrawer
          open={categoryDrawerOpen}
          category={selectedCategory}
          categories={categoriesQuery.data?.items ?? []}
          onClose={() => setCategoryDrawerOpen(false)}
        />
      </ManagementPage>
    </PageTransition>
  );
}
