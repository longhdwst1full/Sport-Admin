import {
  AppstoreOutlined,
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Input, Popconfirm, Space, Table, Tabs } from 'antd';
import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import {
  getListAdminBrandsQueryKey,
  getListAdminCategoriesQueryKey,
  useActivateAdminBrand,
  useActivateAdminCategory,
  useDeactivateAdminBrand,
  useDeactivateAdminCategory,
  useListAdminBrands,
  useListAdminCategories,
} from '@/generated/api/catalog/catalog';
import type { BrandDto, CategoryDto } from '@/generated/api/catalog/models';
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
  const [tab, setTab] = useState<'brands' | 'categories'>('brands');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 250);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandDto>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto>();

  const brandsQuery = useListAdminBrands();
  const categoriesQuery = useListAdminCategories();

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
        dataNotice="Mã định danh không thể thay đổi sau khi tạo. Dữ liệu được bảo toàn bất biến phục vụ báo cáo doanh thu."
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
          activeKey={tab}
          onChange={(key) => setTab(key as typeof tab)}
          items={[
            {
              key: 'brands',
              label: `Thương hiệu (${brandsQuery.data?.total ?? 0})`,
              children: brandsQuery.isError ? (
                <QueryErrorAlert error={brandsQuery.error} retry={() => void brandsQuery.refetch()} />
              ) : (
                <Table
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
                      title: 'Thao tác',
                      key: 'actions',
                      width: 200,
                      align: 'right' as const,
                      render: (_, row: BrandDto) => (
                        <PermissionGate permission="catalog.brand.manage">
                          <Space size="small">
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setSelectedBrand(row);
                                setBrandDrawerOpen(true);
                              }}
                            >
                              Sửa
                            </Button>
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
                              <Button
                                size="small"
                                danger={row.status === 'ACTIVE'}
                                icon={<PoweroffOutlined />}
                              >
                                {row.status === 'ACTIVE' ? 'Ngừng' : 'Bật'}
                              </Button>
                            </Popconfirm>
                          </Space>
                        </PermissionGate>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'categories',
              label: `Danh mục (${categoriesQuery.data?.total ?? 0})`,
              children: categoriesQuery.isError ? (
                <QueryErrorAlert
                  error={categoriesQuery.error}
                  retry={() => void categoriesQuery.refetch()}
                />
              ) : (
                <Table
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
                      title: 'Thao tác',
                      key: 'actions',
                      width: 200,
                      align: 'right' as const,
                      render: (_, row: CategoryDto) => (
                        <PermissionGate permission="catalog.category.manage">
                          <Space size="small">
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setSelectedCategory(row);
                                setCategoryDrawerOpen(true);
                              }}
                            >
                              Sửa
                            </Button>
                            <Popconfirm
                              title={
                                row.status === 'ACTIVE'
                                  ? 'Ngừng danh mục?'
                                  : 'Kích hoạt danh mục?'
                              }
                              description="Cần tắt các danh mục con trước khi ngừng danh mục cha."
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
                              <Button
                                size="small"
                                danger={row.status === 'ACTIVE'}
                                icon={<PoweroffOutlined />}
                              >
                                {row.status === 'ACTIVE' ? 'Ngừng' : 'Bật'}
                              </Button>
                            </Popconfirm>
                          </Space>
                        </PermissionGate>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
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
