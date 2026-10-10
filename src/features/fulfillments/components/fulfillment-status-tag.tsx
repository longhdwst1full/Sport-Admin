import { StatusTag } from '@/foundation/management';
import type { FulfillmentStatus } from '@/generated/api/fulfillments/fulfillments.schemas';
import { parseEnum } from '@/shared/utils/parse-enum';
import { fulfillmentStatusPresentation } from '../constants/fulfillment.constants';

const FULFILLMENT_STATUSES = Object.keys(fulfillmentStatusPresentation) as FulfillmentStatus[];

/**
 * Trạng thái phiếu giao vận. Nhận string vì `OrderShipmentDto.status` ở domain orders là string thô;
 * giá trị ngoài `FulfillmentStatus` không render (không lộ mã tiếng Anh).
 */
export function FulfillmentStatusTag({ status }: { status: string }) {
  const known = parseEnum(FULFILLMENT_STATUSES, status);
  return known ? <StatusTag status={known} presentations={fulfillmentStatusPresentation} /> : null;
}
