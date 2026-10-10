import { TagsOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import type { ColumnType } from 'antd/es/table';
import {
  deleteAdminBrand,
  useActivateAdminBrand,
  useDeactivateAdminBrand,
  useListAdminBrands,
} from '@/generated/api/catalog/catalog';
import type { BrandDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { invalidateReferenceData } from '@/shared/constants/query-cache-policy';
import { BrandFormDrawer } from '../components/master-data-form-drawers';
import { MasterDataListPage } from '../components/master-data-list-page';

const BRAND_COLUMNS: ColumnType<BrandDto>[] = [
  {
    title: 'Tên thương hiệu',
    dataIndex: 'name',
    render: (value: string) => <strong className="text-slate-800">{value}</strong>,
  },
  {
    title: 'Slug',
    dataIndex: 'slug',
    render: (value: string) => <span className="font-mono text-xs text-slate-500">{value}</span>,
  },
];

const BRAND_DELETE_CONFIRM = {
  title: 'Xoá hẳn thương hiệu?',
  description: 'Chỉ xoá được khi chưa có sản phẩm nào gắn thương hiệu này. Thao tác không hoàn tác được.',
  okText: 'Xoá',
};

export function BrandsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const brandsQuery = useListAdminBrands();

  // Gồm cả danh sách chọn thương hiệu đang hoạt động (cache dài): xoá thẳng bằng hàm API không có mutationKey.
  const refresh = () => invalidateReferenceData(queryClient, 'brands');

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

  return (
    <MasterDataListPage<BrandDto>
      title="Thương hiệu"
      description="Quản trị danh sách thương hiệu ủy quyền chính hãng trên hệ thống."
      entity="thương hiệu"
      permission="catalog.brand.manage"
      totalMetric={{ key: 'brands', label: 'Tổng thương hiệu', icon: <TagsOutlined />, tone: 'blue' }}
      activeMetric={{ key: 'active-brands', label: 'Thương hiệu đang bán' }}
      query={brandsQuery}
      scrollX={800}
      columns={BRAND_COLUMNS}
      toggleDescription="Thao tác dùng version hiện tại để tránh xung đột dữ liệu."
      onToggleStatus={(row) =>
        (row.status === 'ACTIVE' ? deactivateBrand : activateBrand).mutate({
          id: row.id,
          data: { expectedVersion: row.version },
        })
      }
      deleteConfirm={BRAND_DELETE_CONFIRM}
      onDelete={(row) => deleteBrand.mutate({ id: row.id, expectedVersion: row.version })}
      deletingId={deleteBrand.isPending ? deleteBrand.variables?.id : undefined}
      renderDrawer={({ open, selected, onClose }) => (
        <BrandFormDrawer open={open} brand={selected} onClose={onClose} />
      )}
    />
  );
}
