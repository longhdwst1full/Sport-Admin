import type { StatusPresentation } from '@/foundation/management';
import { AttributeDataType, AttributeStatus } from '@/generated/api/catalog/catalog.schemas';
import { toOptions } from '@/shared/utils/options';

/** Brand và Category dùng chung một họ trạng thái ACTIVE/INACTIVE ở backend. */
export const MASTER_STATUSES: Record<'ACTIVE' | 'INACTIVE', StatusPresentation> = {
  ACTIVE: { color: 'green', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Đã ngừng' },
};

export const ATTRIBUTE_STATUSES: Record<AttributeStatus, StatusPresentation> = {
  [AttributeStatus.ACTIVE]: { color: 'green', label: 'Đang dùng' },
  [AttributeStatus.INACTIVE]: { color: 'default', label: 'Ngừng' },
};

export const ATTRIBUTE_TYPE_LABEL: Record<AttributeDataType, string> = {
  [AttributeDataType.TEXT]: 'Chữ',
  [AttributeDataType.NUMBER]: 'Số (có đơn vị)',
  [AttributeDataType.BOOLEAN]: 'Có / Không',
  [AttributeDataType.OPTION]: 'Chọn từ danh sách',
};

export const ATTRIBUTE_TYPE_OPTIONS = toOptions(ATTRIBUTE_TYPE_LABEL);
