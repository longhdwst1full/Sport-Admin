import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { ProductListTable } from '../components/product-list-table';
import { ProductListToolbar } from '../components/product-list-toolbar';
import { ProductWorkspaceDrawer } from '../components/product-workspace-drawer';
import { useProductFormPrefetch } from '../hooks/use-product-form-prefetch';
import { useProductList } from '../hooks/use-product-list';
import { useProductListActions } from '../hooks/use-product-list-actions';

export function ProductsPage() {
  // Một workspace cho cả Tạo (không slug) và Sửa (có slug). `session` tăng mỗi lần mở để drawer
  // remount với state + khoá idempotency mới; đóng giữ nguyên `session` cho animation đóng.
  const [workspace, setWorkspace] = useState<{ open: boolean; slug?: string; session: number }>({
    open: false,
    session: 0,
  });
  const openWorkspace = (slug?: string) =>
    setWorkspace((current) => ({ open: true, slug, session: current.session + 1 }));
  const list = useProductList();
  const prefetchProductForm = useProductFormPrefetch();
  const actions = useProductListActions();
  const total = list.query.data?.meta.total ?? 0;

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
              // Nạp danh mục/thương hiệu ngay khi người dùng rê chuột lên nút: form mở ra là có sẵn
              // dữ liệu thay vì để họ nhìn ô chọn quay vòng.
              onMouseEnter={prefetchProductForm}
              onFocus={prefetchProductForm}
              onClick={() => openWorkspace()}
            >
              Thêm sản phẩm
            </Button>
          </PermissionGate>
        }
        metrics={[
          {
            key: 'total',
            label: 'Tổng sản phẩm',
            value: total,
            icon: <span className="text-base">📦</span>,
            tone: 'blue',
          },
          {
            key: 'page',
            label: 'Hiển thị trên trang',
            value: list.rows.length,
            icon: <span className="text-base">📋</span>,
            tone: 'green',
          },
          {
            key: 'pageSize',
            label: 'Kích thước trang',
            value: list.pageSize,
            icon: <span className="text-base">⚙️</span>,
          },
          {
            key: 'currentPage',
            label: 'Trang hiện tại',
            value: `${list.page} / ${Math.ceil(total / list.pageSize) || 1}`,
            icon: <span className="text-base">📄</span>,
            tone: 'orange',
          },
        ]}
        filters={
          <ProductListToolbar
            name={list.name}
            sku={list.sku}
            productNo={list.productNo}
            category={list.category}
            categoryOptions={list.categoryOptions}
            categoriesLoading={list.categoriesLoading}
            onNameChange={list.setName}
            onSkuChange={list.setSku}
            onProductNoChange={list.setProductNo}
            onCategoryChange={list.setCategory}
            refreshing={list.query.isFetching}
            onRefresh={() => void list.query.refetch()}
          />
        }
      >
        {list.query.isError && (
          <QueryErrorAlert
            error={list.query.error}
            message="Không tải được danh sách sản phẩm"
            retry={() => void list.query.refetch()}
          />
        )}
        <ProductListTable
          rows={list.rows}
          loading={list.query.isPending}
          page={list.query.data?.meta.page ?? list.page}
          pageSize={list.query.data?.meta.limit ?? list.pageSize}
          total={total}
          canManage={actions.canManage}
          visibilityBusyId={actions.visibilityBusyId}
          archiveBusyId={actions.archiveBusyId}
          onPageChange={list.onPageChange}
          onOpen={openWorkspace}
          onToggleVisibility={actions.toggleVisibility}
          onArchive={actions.confirmArchive}
          onPublish={actions.confirmPublish}
          publishBusyId={actions.publishBusyId}
        />
      </ManagementPage>

      <ProductWorkspaceDrawer
        key={workspace.session}
        open={workspace.open}
        slug={workspace.slug}
        onClose={() => setWorkspace((current) => ({ ...current, open: false }))}
      />
    </>
  );
}
