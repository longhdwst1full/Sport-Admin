import { Button, Space } from 'antd';
import { PermissionGate } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management';
import { PRODUCT_STATUS_PRESENTATION } from '../constants/product-status.constants';
import type { ProductWorkspace } from '../hooks/use-product-workspace';

/**
 * Trạng thái + lệnh vòng đời ở header workspace (chỉ khi Sửa).
 * PERMISSION: nút chỉ hiện khi có `catalog.product.publish`; API vẫn kiểm quyền và version.
 */
export function ProductWorkspaceHeaderActions({ workspace }: { workspace: ProductWorkspace }) {
  const { product, isArchived } = workspace;
  if (!product) return null;
  return (
    <Space wrap>
      <StatusTag status={product.status} presentations={PRODUCT_STATUS_PRESENTATION} />
      <PermissionGate permission="catalog.product.publish">
        {product.status === 'DRAFT' && (
          <Button
            type="primary"
            disabled={!workspace.canPublish}
            loading={workspace.publishPending}
            onClick={workspace.confirmPublish}
          >
            Xuất bản
          </Button>
        )}
        <Button danger={!isArchived} loading={workspace.lifecyclePending} onClick={workspace.confirmLifecycle}>
          {isArchived ? 'Đưa về bản nháp' : 'Lưu trữ'}
        </Button>
      </PermissionGate>
    </Space>
  );
}
