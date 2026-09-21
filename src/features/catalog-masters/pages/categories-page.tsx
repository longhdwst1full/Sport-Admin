import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Input, Popconfirm, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { PageTransition } from '@/foundation/layout/page-transition';
import {
  getListAdminCategoriesQueryKey,
  useActivateAdminCategory,
  useDeactivateAdminCategory,
  useDeleteAdminCategory,
  useListAdminCategories,
} from '@/generated/api/catalog/catalog';
import type { CategoryDto } from '@/generated/api/catalog/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { CategoryFormDrawer } from '../components/master-data-form-drawers';
import { masterCodeColumn, masterStatusColumn } from '../components/master-columns';
import { filterCatalogMasters } from '../model/catalog-masters.mapper';

export function CategoriesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 250);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CategoryDto>();

  const categoriesQuery = useListAdminCategories();
  const categories = useMemo(
    () => filterCatalogMasters(categoriesQuery.data?.items ?? [], debouncedSearch),
    [categoriesQuery.data?.items, debouncedSearch],
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() });

  const lifecycleOptions = {
    mutation: {
      onSuccess: async () => {
        await refresh();
        void message.success('Đã cập nhật trạng thái danh mục.');
      },
      onError: (error: unknown) =>
        void message.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái danh mục.')),
    },
  };
  const activateCategory = useActivateAdminCategory(lifecycleOptions);
  const deactivateCategory = useDeactivateAdminCategory(lifecycleOptions);
  const deleteCategory = useDeleteAdminCategory(lifecycleOptions);

  const activeCount = (categoriesQuery.data?.items ?? []).filter(
    (c) => c.status === 'ACTIVE',
  ).length;

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Dữ liệu danh mục gốc"
        title="Danh mục"
        description="Quản trị cấu trúc cây ngành hàng thể thao hiển thị trên Storefront."
        actions={
          <div className="flex flex-wrap gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void categoriesQuery.refetch()}
                loading={categoriesQuery.isFetching}
                aria-label="Làm mới"
              />
            </Tooltip>
            <PermissionGate permission="catalog.category.manage">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setSelected(undefined);
                  setDrawerOpen(true);
                }}
              >
                Thêm danh mục
              </Button>
            </PermissionGate>
          </div>
        }
        metrics={[
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
        {categoriesQuery.isError ? (
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
              masterCodeColumn<CategoryDto>(),
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
              masterStatusColumn<CategoryDto>(),
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
                          setSelected(row);
                          setDrawerOpen(true);
                        }}
                      />
                      <Popconfirm
                        title={row.status === 'ACTIVE' ? 'Ngừng danh mục?' : 'Kích hoạt danh mục?'}
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
                            deleteCategory.isPending && deleteCategory.variables?.id === row.id
                          }
                        />
                      </Popconfirm>
                    </TableActions>
                  </PermissionGate>
                ),
              },
            ]}
          />
        )}

        <CategoryFormDrawer
          open={drawerOpen}
          category={selected}
          categories={categoriesQuery.data?.items ?? []}
          onClose={() => setDrawerOpen(false)}
        />
      </ManagementPage>
    </PageTransition>
  );
}
