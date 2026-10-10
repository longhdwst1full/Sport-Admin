import type { StatusPresentation } from '@/foundation/management';
import { OrganizationStatus } from '@/generated/api/organization/organization.schemas';
import { toOptions } from '@/shared/utils/options';

export const ORGANIZATION_STATUSES: Record<OrganizationStatus, StatusPresentation> = {
  [OrganizationStatus.ACTIVE]: { color: 'success', label: 'Đang hoạt động' },
  [OrganizationStatus.INACTIVE]: { color: 'neutral', label: 'Ngừng hoạt động' },
};

export const ORGANIZATION_STATUS_OPTIONS = toOptions(ORGANIZATION_STATUSES);

// SECURITY: mọi endpoint branch/kho khai báo đồng thời org.branch.manage và org.warehouse.manage,
// nên UI phải yêu cầu đủ cả hai; thiếu một quyền mà vẫn hiện nút thì thao tác chắc chắn 403.
export const BRANCH_WAREHOUSE_MANAGE = ['org.branch.manage', 'org.warehouse.manage'] as const;
