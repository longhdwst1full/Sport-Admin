import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { getApiErrorMessage } from '@/lib/api/error';
import { ProductFormDrawer } from '../components/product-form-drawer';
import { ProductListTable } from '../components/product-list-table';
import { ProductListToolbar } from '../components/product-list-toolbar';
import { ProductWorkflowDrawer } from '../components/product-workflow-drawer';
import { useProductList } from '../hooks/use-product-list';
import { useProductListActions } from '../hooks/use-product-list-actions';

export function ProductsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const list = useProductList();
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
          />
        }
      >
        {list.query.isError && (
          <QueryErrorAlert
            message="Không tải được danh sách sản phẩm"
            description={getApiErrorMessage(list.query.error, 'Vui lòng thử lại.')}
            onRetry={() => void list.query.refetch()}
          />
        )}
        <ProductListTable
          rows={list.rows}
          loading={list.query.isPending}
          fetching={list.query.isFetching}
          page={list.query.data?.meta.page ?? list.page}
          pageSize={list.query.data?.meta.limit ?? list.pageSize}
          total={total}
          canManage={actions.canManage}
          visibilityBusyId={actions.visibilityBusyId}
          archiveBusyId={actions.archiveBusyId}
          onPageChange={list.onPageChange}
          onOpen={setSelectedSlug}
          onToggleVisibility={actions.toggleVisibility}
          onArchive={actions.confirmArchive}
          onRefresh={() => void list.query.refetch()}
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
