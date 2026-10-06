import { AppstoreOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  useActivateAdminCategory,
  useDeactivateAdminCategory,
  useDeleteAdminCategory,
  useListAdminCategories,
} from '@/generated/api/catalog/catalog';
import type { CategoryDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { invalidateReferenceData } from '@/shared/constants/query-cache-policy';
import { CategoryFormDrawer } from '../components/master-data-form-drawers';
import { MasterDataListPage } from '../components/master-data-list-page';

export function CategoriesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const categoriesQuery = useListAdminCategories();

  // Gồm cả danh sách chọn danh mục đang hoạt động (cache dài), giống brands-page.
  const refresh = () => invalidateReferenceData(queryClient, 'categories');

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

  return (
    <MasterDataListPage<CategoryDto>
      title="Danh mục"
      description="Quản trị cấu trúc cây ngành hàng thể thao hiển thị trên Storefront."
      entity="danh mục"
      permission="catalog.category.manage"
      totalMetric={{ key: 'categories', label: 'Tổng danh mục', icon: <AppstoreOutlined />, tone: 'orange' }}
      activeMetric={{ key: 'active-categories', label: 'Danh mục kích hoạt' }}
      query={categoriesQuery}
      scrollX={860}
      columns={[
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
          align: 'center',
          render: (d: number) => (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
              Cấp {d}
            </span>
          ),
        },
        { title: 'Thứ tự', dataIndex: 'sortOrder', width: 100, align: 'center' },
      ]}
      toggleDescription="Danh mục con sẽ được nâng lên làm con của danh mục cha."
      onToggleStatus={(row) =>
        (row.status === 'ACTIVE' ? deactivateCategory : activateCategory).mutate({
          id: row.id,
          data: { expectedVersion: row.version },
        })
      }
      deleteConfirm={{
        title: 'Xoá danh mục này?',
        description:
          'Danh mục con được nâng lên cha; danh mục gốc bị xoá thì con của nó thành gốc.',
      }}
      onDelete={(row) =>
        deleteCategory.mutate({ id: row.id, data: { expectedVersion: row.version } })
      }
      deletingId={deleteCategory.isPending ? deleteCategory.variables?.id : undefined}
      renderDrawer={({ open, selected, onClose }) => (
        <CategoryFormDrawer
          open={open}
          category={selected}
          categories={categoriesQuery.data?.items ?? []}
          onClose={onClose}
        />
      )}
    />
  );
}
