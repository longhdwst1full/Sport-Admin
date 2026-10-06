import type { StatusPresentation } from '@/foundation/management';
import type { OrganizationStatus } from '@/generated/api/organization/organization.schemas';

export const ORGANIZATION_STATUSES: Record<OrganizationStatus, StatusPresentation> = {
  ACTIVE: { color: 'green', label: 'Đang hoạt động' },
  INACTIVE: { color: 'default', label: 'Ngừng hoạt động' },
};

// SECURITY: mọi endpoint branch/kho khai báo đồng thời org.branch.manage và org.warehouse.manage,
// nên UI phải yêu cầu đủ cả hai; thiếu một quyền mà vẫn hiện nút thì thao tác chắc chắn 403.
export const BRANCH_WAREHOUSE_MANAGE = ['org.branch.manage', 'org.warehouse.manage'] as const;
