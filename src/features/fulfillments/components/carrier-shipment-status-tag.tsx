import { Tag, Tooltip } from 'antd';
import { carrierShipmentStatusPresentation } from '../constants/fulfillment.constants';

/** Badge trạng thái vận đơn GHN tự tạo; lỗi gần nhất hiện trong tooltip. Không render khi không áp dụng. */
export function CarrierShipmentStatusTag({ status, error }: { status?: string | null; error?: string | null }) {
  if (!status) return null;
  const presentation = carrierShipmentStatusPresentation[status] ?? { label: status, color: 'default' };
  const tag = <Tag color={presentation.color}>{presentation.label}</Tag>;
  return status === 'CREATE_FAILED' && error ? <Tooltip title={error}>{tag}</Tooltip> : tag;
}
