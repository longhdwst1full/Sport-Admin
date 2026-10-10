import { Tooltip } from 'antd';
import { StatusTag, type StatusPresentation } from '@/foundation/management';
import type { CarrierShipmentStatus } from '@/generated/api/fulfillments/fulfillments.schemas';
import { parseEnum } from '@/shared/utils/parse-enum';
import { carrierShipmentStatusPresentation } from '../constants/fulfillment.constants';

const UNKNOWN_PRESENTATION: Record<'UNKNOWN', StatusPresentation> = {
  UNKNOWN: { label: 'Không xác định', color: 'neutral' },
};

/** Badge trạng thái vận đơn GHN tự tạo; lỗi gần nhất hiện trong tooltip. Không render khi không áp dụng. */
export function CarrierShipmentStatusTag({ status, error }: { status?: string | null; error?: string | null }) {
  if (!status) return null;
  // WORKAROUND: giữ prop dạng string để dung nạp giá trị lạ/legacy từ BE; mã lạ hiện nhãn trung tính thay vì mã thô.
  const known = parseEnum(Object.keys(carrierShipmentStatusPresentation) as CarrierShipmentStatus[], status);
  const tag = known ? (
    <StatusTag status={known} presentations={carrierShipmentStatusPresentation} />
  ) : (
    <StatusTag status="UNKNOWN" presentations={UNKNOWN_PRESENTATION} />
  );
  return known === 'CREATE_FAILED' && error ? (
    <Tooltip title={error}>
      <span className="inline-flex">{tag}</span>
    </Tooltip>
  ) : (
    tag
  );
}
