import { Alert, Divider, Drawer, Form, Tabs } from 'antd';
import { DetailSkeleton } from '@/foundation/feedback/page-skeleton';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ProductType } from '@/generated/api/catalog/catalog.schemas';
import { parseEnum } from '@/shared/utils/parse-enum';
import { useProductWorkspace, type ProductWorkspace } from '../hooks/use-product-workspace';
import { PRODUCT_FORM_TABS, PRODUCT_TAB_LABELS, type ProductFormTab } from '../model/product-form-tabs';
import { ProductBasicInfoTab } from './product-form/product-basic-info-tab';
import { ProductBundleManager } from './product-form/product-bundle-manager';
import { ProductMediaTab } from './product-form/product-media-tab';
import { ProductOpeningStockTab } from './product-form/product-opening-stock-tab';
import { ProductReviewTab } from './product-form/product-review-tab';
import { ProductSpecificationsTab } from './product-form/product-specifications-tab';
import { ProductStockPanel } from './product-form/product-stock-panel';
import { ProductVariantsManager } from './product-form/product-variants-manager';
import { ProductVariantsTab } from './product-form/product-variants-tab';
import { ProductWorkspaceFooter } from './product-workspace-footer';
import { ProductWorkspaceHeaderActions } from './product-workspace-header-actions';

/**
 * Workspace sản phẩm — **một** drawer duy nhất cho Tạo và Sửa, cùng ba tab (`PRODUCT_FORM_TABS`).
 *
 * Hợp nhất ở bố cục, không ở API:
 * - Tạo: một lệnh `createAdminProduct` (sản phẩm, SKU, giá, ảnh, thông số trong một transaction), rồi phiếu
 *   tồn đầu của Inventory. Tạo xong, workspace chuyển tại chỗ sang chế độ Sửa của sản phẩm vừa tạo.
 * - Sửa: nút Lưu gửi `updateAdminProduct` (thông tin + thông số); SKU, giá, ảnh, combo ghi ngay qua
 *   operation riêng; xuất bản/lưu trữ là lệnh vòng đời ở header.
 *
 * Nơi dùng phải đổi `key` mỗi lần mở để có phiên mới (state + khoá idempotency), xem `useProductWorkspace`.
 */
export function ProductWorkspaceDrawer({
  open,
  slug,
  onClose,
}: {
  open: boolean;
  /** Có thì mở ở chế độ Sửa. */
  slug?: string;
  onClose: () => void;
}) {
  const workspace = useProductWorkspace({ open, slug });
  const { product, isEdit, detail, mutationPending } = workspace;

  return (
    <Drawer
      title={isEdit ? (product ? `${product.name} · ${product.productNo}` : 'Sản phẩm') : 'Tạo sản phẩm'}
      extra={<ProductWorkspaceHeaderActions workspace={workspace} />}
      width="100%"
      // Một độ rộng cho Tạo và Sửa: đủ cho bảng SKU và lịch giá cạnh nhau.
      styles={{ wrapper: { maxWidth: 1040 }, body: { background: 'var(--color-surface-sunken)' } }}
      push={false}
      open={open}
      onClose={() => { if (!mutationPending) onClose(); }}
      closable={!mutationPending}
      maskClosable={!mutationPending}
      keyboard={!mutationPending}
      destroyOnHidden
      footer={<ProductWorkspaceFooter workspace={workspace} onClose={onClose} />}
    >
      {isEdit && detail.isPending ? (
        <DetailSkeleton />
      ) : isEdit && detail.isError ? (
        <QueryErrorAlert error={detail.error} message="Không tải được sản phẩm" retry={() => void detail.refetch()} />
      ) : (
        /*
          `component={false}`: Form chỉ cấp layout, không render <form>. Các khối lưu ngay (thêm SKU, combo,
          lịch giá) có <form> riêng; lồng <form> trong <form> làm Enter ở ô con submit nhầm cả sản phẩm.
          Một `useForm` duy nhất trải qua các tab — đổi tab không lưu gì cả.
        */
        <Form component={false} layout="vertical" disabled={mutationPending || workspace.isArchived}>
          <Tabs
            activeKey={workspace.activeTab}
            onChange={(key) => {
              const tab = parseEnum(PRODUCT_FORM_TABS, key);
              if (tab) workspace.setActiveTab(tab);
            }}
            items={PRODUCT_FORM_TABS.map((tab) => ({
              key: tab,
              label: PRODUCT_TAB_LABELS[tab],
              children: <ProductWorkspaceTabContent tab={tab} workspace={workspace} />,
            }))}
          />
        </Form>
      )}
    </Drawer>
  );
}

/**
 * Tab gộp chỉ ghép các component khối sẵn có. Khối nào đã tự có tiêu đề (FormSection) thì không thêm
 * tiêu đề nữa, để mỗi khối chỉ có một tiêu đề nhìn thấy; chỉ khối không có tiêu đề riêng mới thêm Divider.
 */
function ProductWorkspaceTabContent({ tab, workspace }: { tab: ProductFormTab; workspace: ProductWorkspace }) {
  const { form, product, lookups, productType, refreshProduct } = workspace;
  switch (tab) {
    case 'info':
      return (
        <div className="space-y-4">
          <ProductBasicInfoTab
            form={form}
            product={product}
            brands={lookups.brands}
            categories={lookups.categories}
            onBrandSearch={lookups.onBrandSearch}
            onCategorySearch={lookups.onCategorySearch}
          />
          <ProductMediaTab form={form} product={product} disabled={workspace.mutationPending} onMediaChanged={refreshProduct} />
          <ProductSpecificationsTab
            form={form}
            attributes={lookups.attributes}
            loading={lookups.attributesQuery.isPending}
            errors={workspace.specificationErrors}
          />
        </div>
      );
    case 'variants':
      return (
        <div className="space-y-4">
          {product ? (
            <ProductVariantsManager product={product} onChanged={refreshProduct} />
          ) : (
            <ProductVariantsTab
              form={form}
              variantFields={workspace.variantFields}
              productType={productType}
              canManagePrice={workspace.canManagePrice}
            />
          )}
          {product ? (
            <ProductStockPanel
              product={product}
              pendingOpeningStock={workspace.pendingOpeningStock}
              onOpeningStockRecorded={workspace.clearPendingOpeningStock}
            />
          ) : (
            <ProductOpeningStockTab
              form={form}
              productType={productType}
              canAdjustStock={workspace.canAdjustStock}
              initialBranchId={workspace.initialBranchId}
              hasOpeningStock={workspace.hasOpeningStock}
              branches={lookups.branches}
              warehouses={lookups.warehouses}
              onBranchSearch={lookups.onBranchSearch}
              onWarehouseSearch={lookups.onWarehouseSearch}
            />
          )}
          {/* Combo chỉ có nghĩa với sản phẩm BUNDLE; sản phẩm thường không hiện khối này ở cả Tạo lẫn Sửa. */}
          {workspace.effectiveProductType === ProductType.BUNDLE &&
            (product ? (
              <ProductBundleManager product={product} onChanged={refreshProduct} />
            ) : (
              // Thông báo lúc Tạo không có tiêu đề riêng nên thêm Divider; khi Sửa, ProductBundleManager đã có FormSection.
              <div>
                <Divider orientation="left" orientationMargin={0}>
                  Combo
                </Divider>
                <Alert
                  type="info"
                  showIcon
                  message="Khai thành phần combo ngay sau khi tạo"
                  description="Thành phần gắn với SKU combo thật, nên cần tạo sản phẩm trước. Tạo xong, workspace chuyển sang chế độ sửa và mục này cho khai thành phần."
                />
              </div>
            ))}
        </div>
      );
    case 'review':
      return (
        <ProductReviewTab
          form={form}
          brandLabel={workspace.brandLabel}
          categoryLabels={workspace.categoryLabels}
          branchLabel={workspace.branchLabel}
          product={product}
          readiness={workspace.setupStatus.data}
        />
      );
  }
}
