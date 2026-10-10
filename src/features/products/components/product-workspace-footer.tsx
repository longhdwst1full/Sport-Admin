import { Button } from 'antd';
import { PermissionGate } from '@/core/auth/permissions';
import { PRODUCT_FORM_TABS, PRODUCT_TAB_LABELS } from '../model/product-form-tabs';
import type { ProductWorkspace } from '../hooks/use-product-workspace';

/** Footer workspace: bước hiện tại, điều hướng tab và nút Lưu/Tạo. */
export function ProductWorkspaceFooter({ workspace, onClose }: { workspace: ProductWorkspace; onClose: () => void }) {
  const { isEdit, activeTab, previousTab, nextTab, mutationPending } = workspace;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-slate-500">
        {`Bước ${PRODUCT_FORM_TABS.indexOf(activeTab) + 1}/${PRODUCT_FORM_TABS.length} · ${PRODUCT_TAB_LABELS[activeTab]}`}
        {isEdit && ' · SKU, giá, ảnh, combo lưu ngay khi thao tác; nút Lưu lưu thông tin và thông số.'}
      </span>
      <div className="flex gap-2">
        <Button disabled={mutationPending} onClick={onClose}>
          {isEdit ? 'Đóng' : 'Huỷ'}
        </Button>
        {previousTab && (
          <Button disabled={mutationPending} onClick={() => workspace.setActiveTab(previousTab)}>
            Quay lại
          </Button>
        )}
        {nextTab && (
          <Button type={isEdit ? 'default' : 'primary'} disabled={mutationPending} onClick={() => workspace.setActiveTab(nextTab)}>
            Tiếp tục
          </Button>
        )}
        {/* Sửa: Lưu ở mọi tab vì mọi trường đã có giá trị. Tạo: chỉ ở tab cuối, sau bảng kiểm tra. */}
        {(isEdit || !nextTab) && (
          <PermissionGate permission="catalog.product.manage">
            <Button
              type="primary"
              loading={mutationPending}
              disabled={workspace.isArchived || (isEdit && !workspace.product)}
              onClick={() => void workspace.submitWithTabValidation()}
            >
              {isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </PermissionGate>
        )}
      </div>
    </div>
  );
}
