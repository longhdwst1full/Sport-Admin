import { Tag, Tooltip } from 'antd';
import type { CarrierShipmentStatus } from '@/generated/api/fulfillments/fulfillments.schemas';
import { carrierShipmentStatusPresentation } from '../constants/fulfillment.constants';

/** Badge trạng thái vận đơn GHN tự tạo; lỗi gần nhất hiện trong tooltip. Không render khi không áp dụng. */
export function CarrierShipmentStatusTag({ status, error }: { status?: string | null; error?: string | null }) {
  if (!status) return null;
  // WORKAROUND: giữ prop dạng string để dung nạp giá trị lạ/legacy từ BE và fallback về mã thô thay vì vỡ UI.
  const presentation = carrierShipmentStatusPresentation[status as CarrierShipmentStatus] ?? { label: status, color: 'default' };
  const tag = <Tag color={presentation.color}>{presentation.label}</Tag>;
  return status === 'CREATE_FAILED' && error ? <Tooltip title={error}>{tag}</Tooltip> : tag;
}
